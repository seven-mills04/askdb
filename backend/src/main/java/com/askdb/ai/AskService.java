package com.askdb.ai;

import com.askdb.ai.AskDtos.AskResponse;
import com.askdb.ai.LlmClient.Message;
import com.askdb.common.ApiException;
import com.askdb.config.AppProperties;
import com.askdb.connection.ConnectionTarget;
import com.askdb.connection.DbType;
import com.askdb.query.QueryDtos.QueryResult;
import com.askdb.query.QueryExecutor;
import com.askdb.query.QueryFailedException;
import com.askdb.query.SchemaReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Plain English to SQL. For one question:
 *
 *   1. Describe the database to the model (tables, columns, links, a few sample rows).
 *   2. Ask it for ONE SELECT statement that answers the question.
 *   3. Run that SQL through QueryExecutor, the same safe path as hand-written SQL.
 *   4. If the SQL fails, show the model its own error and let it fix it (limited retries).
 *   5. Ask the model to put the result into one or two plain sentences.
 *
 * The model's SQL is untrusted input. It never bypasses the guard, the read-only
 * transaction or the limits.
 */
@Service
public class AskService {

    public static final int MAX_ATTEMPTS = 3; // first try + up to two repairs
    static final String CANNOT_ANSWER = "CANNOT_ANSWER";

    private static final long SCHEMA_CACHE_MS = 10 * 60 * 1000;
    private static final int SUMMARY_ROWS = 20;
    private static final Pattern CODE_FENCE = Pattern.compile("```(?:[a-zA-Z]*\\r?\\n)?(.*?)```", Pattern.DOTALL);
    private static final Pattern QUERY_START = Pattern.compile("\\b(select|with)\\b", Pattern.CASE_INSENSITIVE);

    private static final String SQL_PROMPT = """
            You turn questions into SQL for a %s database.

            Rules:
            - Reply with exactly one %s SELECT statement and nothing else. No explanation, no markdown.
            - Use only the tables and columns in the schema below. Never invent names.
            - Read-only: never write INSERT, UPDATE, DELETE, DROP or anything that changes data.
            - Give result columns clear lowercase names with AS.
            - Add LIMIT 100 unless the question asks for a specific number of rows or a single total.
            - "Recent", "latest" or "last month" are relative to the newest date in the data, not today.
            - If the question can't be answered from this schema, reply with: CANNOT_ANSWER: <short reason>

            Schema:
            %s""";

    private static final String SUMMARY_PROMPT = """
            You explain database query results to a non-technical person.
            Answer the question in one or two short sentences using only the numbers in the result.
            Don't mention SQL, tables or columns. Don't guess at reasons. Plain text only.""";

    private record CachedSchema(String text, long expiresAt) {}

    private final LlmClient llm;
    private final SchemaReader schemaReader;
    private final QueryExecutor queryExecutor;
    private final boolean summaries;
    private final ConcurrentHashMap<ConnectionTarget, CachedSchema> schemaCache = new ConcurrentHashMap<>();

    public AskService(LlmClient llm, SchemaReader schemaReader, QueryExecutor queryExecutor, AppProperties props) {
        this.llm = llm;
        this.schemaReader = schemaReader;
        this.queryExecutor = queryExecutor;
        this.summaries = props.ai().summaries();
    }

    public AskResponse ask(ConnectionTarget target, String rawQuestion) {
        if (!llm.isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Plain-English questions are turned off: no AI key is configured on the server.");
        }
        String question = rawQuestion.strip();
        String dialect = target.type() == DbType.POSTGRES ? "PostgreSQL" : "MySQL";

        List<Message> messages = new ArrayList<>();
        messages.add(new Message("system", SQL_PROMPT.formatted(dialect, dialect, schemaFor(target))));
        messages.add(new Message("user", question));

        String lastError = "";
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            String reply = llm.chat(messages);
            String sql = extractSql(reply);
            try {
                QueryResult result = queryExecutor.run(target, sql);
                return new AskResponse(question, sql, attempt, summarize(question, result), result);
            } catch (QueryFailedException ex) {
                lastError = ex.getMessage();
                // Self-repair: hand the model its own SQL plus the error, and ask for a fixed query.
                messages.add(new Message("assistant", reply));
                messages.add(new Message("user",
                        "That query failed with: " + lastError + "\nReply with a corrected SELECT only."));
            }
        }
        throw new QueryFailedException(
                "Couldn't produce a working query after " + MAX_ATTEMPTS + " tries. Last error: " + lastError);
    }

    /**
     * Models sometimes wrap SQL in ``` fences or add a sentence before it. This pulls out
     * just the SQL, or throws a 422 error if the model said the question can't be answered.
     */
    static String extractSql(String reply) {
        String text = reply.strip();
        if (text.toUpperCase(Locale.ROOT).startsWith(CANNOT_ANSWER)) {
            String reason = text.substring(CANNOT_ANSWER.length()).replaceFirst("^[:\\s]+", "").strip();
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    reason.isEmpty() ? "That question doesn't match the data in this database." : reason);
        }
        Matcher fenced = CODE_FENCE.matcher(text);
        if (fenced.find()) {
            text = fenced.group(1).strip();
        }
        Matcher start = QUERY_START.matcher(text);
        return start.find() ? text.substring(start.start()).strip() : text;
    }

    /** A nice-to-have: if the summary fails for any reason, the user still gets their table. */
    private String summarize(String question, QueryResult result) {
        if (!summaries || result.rowCount() == 0) {
            return null;
        }
        try {
            StringBuilder table = new StringBuilder(String.join(" | ", result.columns())).append('\n');
            result.rows().stream().limit(SUMMARY_ROWS).forEach(row -> {
                List<String> cells = new ArrayList<>();
                for (Object value : row) {
                    cells.add(shorten(String.valueOf(value), 60));
                }
                table.append(String.join(" | ", cells)).append('\n');
            });
            if (result.rowCount() > SUMMARY_ROWS) {
                table.append("(").append(result.rowCount() - SUMMARY_ROWS).append(" more rows not shown)\n");
            }
            String reply = llm.chat(List.of(
                    new Message("system", SUMMARY_PROMPT),
                    new Message("user", "Question: " + question + "\n\nResult:\n" + table)));
            return shorten(reply.strip(), 400);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    /** Reading a schema means several round trips to the database, so remember it for ten minutes. */
    private String schemaFor(ConnectionTarget target) {
        long now = System.currentTimeMillis();
        CachedSchema cached = schemaCache.get(target);
        if (cached != null && cached.expiresAt() > now) {
            return cached.text();
        }
        String text = schemaReader.describeForPrompt(target);
        if (schemaCache.size() > 200) {
            schemaCache.clear(); // crude but safe upper bound on memory
        }
        schemaCache.put(target, new CachedSchema(text, now + SCHEMA_CACHE_MS));
        return text;
    }

    private static String shorten(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
    }
}

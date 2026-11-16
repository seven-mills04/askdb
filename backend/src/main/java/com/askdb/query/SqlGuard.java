package com.askdb.query;

import java.util.List;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.Statements;
import net.sf.jsqlparser.statement.select.Select;
import org.springframework.stereotype.Component;

/**
 * First line of defence: only a single SELECT statement may run.
 *
 * The SQL is parsed into a syntax tree with JSqlParser rather than checked with string
 * matching. That way "DROP TABLE" inside a string literal or a comment is not a false
 * alarm, and tricks like "SELECT 1; DROP TABLE users" are seen for what they are: two
 * statements.
 *
 * This is not the only protection. QueryExecutor also runs every query inside a
 * read-only transaction, so the database itself refuses writes.
 */
@Component
public class SqlGuard {

    public static final int MAX_LENGTH = 10_000;

    /** Returns the cleaned SQL if it is one read-only SELECT; otherwise throws a 400 error. */
    public String check(String sql) {
        if (sql == null || sql.isBlank()) {
            throw new QueryFailedException("Query is empty.");
        }
        if (sql.length() > MAX_LENGTH) {
            throw new QueryFailedException("Query is too long (max " + MAX_LENGTH + " characters).");
        }

        String cleaned = sql.strip();
        while (cleaned.endsWith(";")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1).stripTrailing();
        }

        List<Statement> statements;
        try {
            Statements parsed = CCJSqlParserUtil.parseStatements(cleaned);
            statements = parsed.getStatements();
        } catch (JSQLParserException | RuntimeException ex) {
            throw new QueryFailedException("Couldn't understand that SQL. Check for a typo, an unclosed quote or bracket.");
        }

        if (statements == null || statements.isEmpty()) {
            throw new QueryFailedException("Query is empty.");
        }
        if (statements.size() > 1) {
            throw new QueryFailedException("Only one statement can be run at a time.");
        }
        if (!(statements.get(0) instanceof Select)) {
            throw new QueryFailedException("Only SELECT queries are allowed. AskDB never changes your data.");
        }
        return cleaned;
    }
}

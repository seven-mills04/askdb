package com.askdb;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.askdb.ai.AskDtos.AskResponse;
import com.askdb.ai.AskService;
import com.askdb.ai.LlmClient;
import com.askdb.ai.LlmClient.Message;
import com.askdb.common.ApiException;
import com.askdb.connection.ConnectionTarget;
import com.askdb.connection.DbType;
import com.askdb.query.QueryDtos.QueryResult;
import com.askdb.query.QueryExecutor;
import com.askdb.query.QueryFailedException;
import com.askdb.query.SchemaReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/**
 * The AI and the database are replaced with fakes (Mockito), so these tests are free,
 * fast and give the same result every time.
 */
class AskServiceTest {

    private static final ConnectionTarget TARGET =
            new ConnectionTarget(DbType.POSTGRES, "localhost", 5432, "tunebase", "reader", "secret");
    private static final QueryResult ONE_ROW =
            new QueryResult(List.of("artists"), List.of(List.<Object>of(60)), 1, false, 3);

    private LlmClient llm;
    private QueryExecutor executor;
    private AskService service;
    private final List<List<Message>> conversations = new ArrayList<>();

    @BeforeEach
    void setUp() {
        llm = mock(LlmClient.class);
        executor = mock(QueryExecutor.class);
        SchemaReader schemaReader = mock(SchemaReader.class);
        when(llm.isConfigured()).thenReturn(true);
        when(schemaReader.describeForPrompt(any())).thenReturn("TABLE artists (60 rows)");
        service = new AskService(llm, schemaReader, executor, TestProps.defaults());
    }

    /** Makes the fake AI give these replies in order, and records what it was sent each time. */
    private void aiReplies(String... replies) {
        List<String> queue = new ArrayList<>(Arrays.asList(replies));
        when(llm.chat(anyList())).thenAnswer(call -> {
            List<Message> sent = call.getArgument(0);
            conversations.add(List.copyOf(sent));
            return queue.remove(0);
        });
    }

    @Test
    void questionBecomesSqlAndASummary() {
        aiReplies("SELECT COUNT(*) AS artists FROM artists", "There are 60 artists.");
        when(executor.run(TARGET, "SELECT COUNT(*) AS artists FROM artists")).thenReturn(ONE_ROW);

        AskResponse answer = service.ask(TARGET, "  How many artists are there?  ");

        assertEquals("How many artists are there?", answer.question());
        assertEquals("SELECT COUNT(*) AS artists FROM artists", answer.sql());
        assertEquals(1, answer.attempts());
        assertEquals("There are 60 artists.", answer.summary());
        assertNull(answer.summaryNote());
        assertEquals(ONE_ROW, answer.result());

        List<Message> firstCall = conversations.get(0);
        assertTrue(firstCall.get(0).content().contains("TABLE artists"), "schema goes into the prompt");
        assertTrue(firstCall.get(0).content().contains("PostgreSQL"), "dialect goes into the prompt");
        assertEquals("How many artists are there?", firstCall.get(1).content());
    }

    @Test
    void brokenSqlIsSentBackToTheAiToFix() {
        aiReplies("SELECT nope FROM artists", "SELECT COUNT(*) FROM artists", "There are 60 artists.");
        when(executor.run(TARGET, "SELECT nope FROM artists"))
                .thenThrow(new QueryFailedException("column \"nope\" does not exist"));
        when(executor.run(TARGET, "SELECT COUNT(*) FROM artists")).thenReturn(ONE_ROW);

        AskResponse answer = service.ask(TARGET, "How many artists?");

        assertEquals(2, answer.attempts());
        assertEquals("SELECT COUNT(*) FROM artists", answer.sql());
        List<Message> repairCall = conversations.get(1);
        assertTrue(repairCall.get(repairCall.size() - 1).content().contains("does not exist"),
                "the database error is shown to the AI");
    }

    @Test
    void givesUpAfterMaxAttempts() {
        aiReplies("DELETE FROM users", "DELETE FROM users", "DELETE FROM users");
        when(executor.run(any(), eq("DELETE FROM users")))
                .thenThrow(new QueryFailedException("Only SELECT queries are allowed."));

        QueryFailedException ex = assertThrows(QueryFailedException.class, () -> service.ask(TARGET, "delete all users"));

        assertTrue(ex.getMessage().contains("Only SELECT"));
        verify(executor, times(AskService.MAX_ATTEMPTS)).run(any(), any());
    }

    @Test
    void connectionProblemsAreNotRetried() {
        aiReplies("SELECT 1");
        when(executor.run(any(), any())).thenThrow(ApiException.badRequest("Couldn't connect to the database"));

        assertThrows(ApiException.class, () -> service.ask(TARGET, "anything at all"));
        verify(llm, times(1)).chat(anyList());
    }

    @Test
    void aiCanSayTheQuestionDoesNotFit() {
        aiReplies("CANNOT_ANSWER: there is no weather data");

        ApiException ex = assertThrows(ApiException.class, () -> service.ask(TARGET, "What's the weather in Delhi?"));

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, ex.getStatus());
        assertEquals("there is no weather data", ex.getMessage());
        verify(executor, never()).run(any(), any());
    }

    @Test
    void summaryFailureStillReturnsTheResult() {
        List<String> queue = new ArrayList<>(List.of("SELECT COUNT(*) FROM artists"));
        when(llm.chat(anyList())).thenAnswer(call -> {
            if (queue.isEmpty()) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "busy");
            }
            return queue.remove(0);
        });
        when(executor.run(any(), any())).thenReturn(ONE_ROW);

        AskResponse answer = service.ask(TARGET, "How many artists?");

        assertNull(answer.summary());
        assertTrue(answer.summaryNote().contains("busy"), "the user is told why there is no summary");
        assertEquals(ONE_ROW, answer.result());
    }

    @Test
    void noAiKeyMeansA503BeforeAnythingElse() {
        when(llm.isConfigured()).thenReturn(false);

        ApiException ex = assertThrows(ApiException.class, () -> service.ask(TARGET, "How many artists?"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        verify(llm, never()).chat(anyList());
    }
}

package com.askdb.ai;

import com.askdb.query.QueryDtos.QueryResult;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AskDtos {

    private AskDtos() {}

    public record AskRequest(@NotBlank @Size(min = 3, max = 500) String question) {}

    /**
     * @param sql      the query the AI wrote (always shown to the user)
     * @param attempts 1 if the first query worked; higher if the AI had to fix its own SQL
     * @param summary     one or two sentences answering the question, or null if unavailable
     * @param summaryNote why there is no summary, when there isn't one; null otherwise
     */
    public record AskResponse(String question, String sql, int attempts, String summary, String summaryNote,
                              QueryResult result) {}
}

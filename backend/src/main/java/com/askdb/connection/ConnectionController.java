package com.askdb.connection;

import com.askdb.ai.AskDtos.AskRequest;
import com.askdb.ai.AskDtos.AskResponse;
import com.askdb.ai.AskService;
import com.askdb.ai.RateLimiter;
import com.askdb.connection.ConnectionDtos.ConnectionRequest;
import com.askdb.connection.ConnectionDtos.ConnectionSummary;
import com.askdb.connection.ConnectionDtos.TestResult;
import com.askdb.history.HistoryService;
import com.askdb.history.HistoryService.HistoryItem;
import com.askdb.query.QueryDtos.QueryRequest;
import com.askdb.query.QueryDtos.QueryResult;
import com.askdb.query.QueryDtos.SchemaResponse;
import com.askdb.query.QueryExecutor;
import com.askdb.query.SchemaReader;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/connections")
public class ConnectionController {

    private final ConnectionService connectionService;
    private final SchemaReader schemaReader;
    private final QueryExecutor queryExecutor;
    private final AskService askService;
    private final RateLimiter rateLimiter;
    private final HistoryService historyService;

    public ConnectionController(ConnectionService connectionService, SchemaReader schemaReader,
                                QueryExecutor queryExecutor, AskService askService, RateLimiter rateLimiter,
                                HistoryService historyService) {
        this.connectionService = connectionService;
        this.schemaReader = schemaReader;
        this.queryExecutor = queryExecutor;
        this.askService = askService;
        this.rateLimiter = rateLimiter;
        this.historyService = historyService;
    }

    @GetMapping
    public List<ConnectionSummary> list(@AuthenticationPrincipal Long userId) {
        return connectionService.list(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConnectionSummary create(@AuthenticationPrincipal Long userId, @Valid @RequestBody ConnectionRequest body) {
        return connectionService.create(userId, body);
    }

    @PostMapping("/test")
    public TestResult test(@Valid @RequestBody ConnectionRequest body) {
        connectionService.test(body);
        return new TestResult(true, "Connection works.");
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long userId, @PathVariable long id) {
        connectionService.delete(userId, id);
        historyService.clear(userId, id);
    }

    @GetMapping("/{id}/schema")
    public SchemaResponse schema(@AuthenticationPrincipal Long userId, @PathVariable long id) {
        ConnectionTarget target = connectionService.resolve(userId, id);
        return new SchemaResponse(target.database(), target.type(), schemaReader.read(target));
    }

    @PostMapping("/{id}/query")
    public QueryResult query(@AuthenticationPrincipal Long userId, @PathVariable long id,
                             @Valid @RequestBody QueryRequest body) {
        // Guard first: unsafe SQL is rejected before we even open a connection.
        QueryResult result = queryExecutor.run(connectionService.resolve(userId, id), body.sql());
        historyService.record(userId, id, null, body.sql().strip(), result.rowCount());
        return result;
    }

    /** Plain-English question in, SQL + rows + a one-line answer out. */
    @PostMapping("/{id}/ask")
    public AskResponse ask(@AuthenticationPrincipal Long userId, @PathVariable long id,
                           @Valid @RequestBody AskRequest body) {
        ConnectionTarget target = connectionService.resolve(userId, id);
        rateLimiter.check(userId);
        AskResponse answer = askService.ask(target, body.question());
        historyService.record(userId, id, answer.question(), answer.sql(), answer.result().rowCount());
        return answer;
    }

    @GetMapping("/{id}/history")
    public List<HistoryItem> history(@AuthenticationPrincipal Long userId, @PathVariable long id) {
        connectionService.resolve(userId, id); // 404 if this connection isn't the user's
        return historyService.recent(userId, id);
    }

    @DeleteMapping("/{id}/history")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearHistory(@AuthenticationPrincipal Long userId, @PathVariable long id) {
        historyService.clear(userId, id);
    }
}

package com.askdb.history;

import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HistoryService {

    public record HistoryItem(Long id, String question, String sql, int rowCount, Instant createdAt) {}

    private static final Logger log = LoggerFactory.getLogger(HistoryService.class);

    private final QueryHistoryRepository history;

    public HistoryService(QueryHistoryRepository history) {
        this.history = history;
    }

    /** History is a convenience: if saving it fails, the user should still get their result. */
    public void record(Long userId, long connectionId, String question, String sql, int rowCount) {
        try {
            history.save(new QueryHistory(userId, connectionId, question, sql, rowCount));
        } catch (RuntimeException ex) {
            log.warn("Could not save query history", ex);
        }
    }

    public List<HistoryItem> recent(Long userId, long connectionId) {
        return history.findTop30ByUserIdAndConnectionIdOrderByCreatedAtDesc(userId, connectionId).stream()
                .map(h -> new HistoryItem(h.getId(), h.getQuestion(), h.getSqlText(), h.getRowCount(), h.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void clear(Long userId, long connectionId) {
        history.deleteByUserIdAndConnectionId(userId, connectionId);
    }
}

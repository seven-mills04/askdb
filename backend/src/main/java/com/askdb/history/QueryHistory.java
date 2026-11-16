package com.askdb.history;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

/** One question or query a user ran. Only the SQL and a row count are kept, never the result data. */
@Entity
@Table(name = "query_history", indexes = @Index(name = "idx_history_user_connection", columnList = "user_id, connection_id, created_at"))
public class QueryHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "connection_id", nullable = false)
    private Long connectionId;

    /** The plain-English question, or null when the user typed SQL themselves. */
    @Column(length = 500)
    private String question;

    @Column(name = "sql_text", nullable = false, length = 10000)
    private String sqlText;

    @Column(name = "row_count", nullable = false)
    private int rowCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected QueryHistory() {
        // required by JPA
    }

    public QueryHistory(Long userId, Long connectionId, String question, String sqlText, int rowCount) {
        this.userId = userId;
        this.connectionId = connectionId;
        this.question = question;
        this.sqlText = sqlText;
        this.rowCount = rowCount;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getConnectionId() {
        return connectionId;
    }

    public String getQuestion() {
        return question;
    }

    public String getSqlText() {
        return sqlText;
    }

    public int getRowCount() {
        return rowCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

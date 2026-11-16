package com.askdb.query;

import com.askdb.config.AppProperties;
import com.askdb.connection.ConnectionTarget;
import com.askdb.query.QueryDtos.QueryResult;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Runs one query against a user's database. Four independent layers keep it safe:
 *
 *   1. SqlGuard             - parsed with JSqlParser; must be a single SELECT
 *   2. read-only transaction - the database itself refuses INSERT/UPDATE/DELETE/DDL
 *   3. timeout              - a slow query is cancelled
 *   4. row cap              - a huge result can't flood the server or the browser
 *
 * SQL written by the AI (Phase 1) goes through exactly this path too.
 */
@Service
public class QueryExecutor {

    private final SqlGuard guard;
    private final JdbcConnector connector;
    private final AppProperties props;

    public QueryExecutor(SqlGuard guard, JdbcConnector connector, AppProperties props) {
        this.guard = guard;
        this.connector = connector;
        this.props = props;
    }

    public QueryResult run(ConnectionTarget target, String sql) {
        String cleanSql = guard.check(sql);
        int maxRows = props.query().maxRows();
        int timeout = props.query().timeoutSeconds();
        long start = System.nanoTime();

        try (Connection connection = connector.open(target)) {
            connection.setReadOnly(true);
            connection.setAutoCommit(false); // read-only mode applies per transaction, so start one

            try (Statement statement = connection.createStatement()) {
                statement.setQueryTimeout(timeout);
                statement.setMaxRows(maxRows + 1); // one extra row tells us whether there was more
                statement.setFetchSize(maxRows + 1);

                try (ResultSet rs = statement.executeQuery(cleanSql)) {
                    ResultSetMetaData meta = rs.getMetaData();
                    int columnCount = meta.getColumnCount();

                    List<String> columns = new ArrayList<>(columnCount);
                    for (int i = 1; i <= columnCount; i++) {
                        columns.add(meta.getColumnLabel(i));
                    }

                    List<List<Object>> rows = new ArrayList<>();
                    boolean truncated = false;
                    while (rs.next()) {
                        if (rows.size() == maxRows) {
                            truncated = true;
                            break;
                        }
                        List<Object> row = new ArrayList<>(columnCount);
                        for (int i = 1; i <= columnCount; i++) {
                            row.add(toJsonValue(rs.getObject(i)));
                        }
                        rows.add(row);
                    }

                    long elapsedMs = (System.nanoTime() - start) / 1_000_000;
                    return new QueryResult(columns, rows, rows.size(), truncated, elapsedMs);
                }
            } finally {
                rollbackQuietly(connection); // nothing to save; always leave the transaction clean
            }
        } catch (SQLTimeoutException ex) {
            throw new QueryFailedException("Query took longer than " + timeout + "s and was stopped.");
        } catch (SQLException ex) {
            // PostgreSQL reports a cancelled query with SQL state 57014.
            if ("57014".equals(ex.getSQLState())) {
                throw new QueryFailedException("Query took longer than " + timeout + "s and was stopped.");
            }
            throw new QueryFailedException(JdbcConnector.firstLine(ex.getMessage()));
        }
    }

    private static void rollbackQuietly(Connection connection) {
        try {
            connection.rollback();
        } catch (SQLException ignored) {
            // The connection is about to be closed anyway; don't hide the real error.
        }
    }

    /** Numbers and booleans stay as they are; everything else (dates, UUIDs, ...) is sent as text. */
    private static Object toJsonValue(Object value) {
        if (value == null || value instanceof Boolean) {
            return value;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.stripTrailingZeros().scale() <= 0 ? decimal.toBigInteger() : decimal.doubleValue();
        }
        if (value instanceof Number) {
            return value;
        }
        if (value instanceof byte[] bytes) {
            return "[" + bytes.length + " bytes]";
        }
        return value.toString();
    }
}

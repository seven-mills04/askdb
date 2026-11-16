package com.askdb.query;

import com.askdb.common.ApiException;
import com.askdb.config.AppProperties;
import com.askdb.connection.ConnectionTarget;
import com.askdb.connection.DbType;
import com.askdb.query.QueryDtos.ColumnInfo;
import com.askdb.query.QueryDtos.TableInfo;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Describes a database: its tables, columns, primary keys, foreign keys and row counts.
 * Uses JDBC's DatabaseMetaData, which works the same way for PostgreSQL and MySQL.
 */
@Service
public class SchemaReader {

    private static final int MAX_TABLES = 100;
    private static final int MAX_PROMPT_TABLES = 40;
    private static final int SAMPLE_ROWS = 3;
    private static final int SAMPLE_CELL_LENGTH = 40;

    private final JdbcConnector connector;
    private final AppProperties props;

    public SchemaReader(JdbcConnector connector, AppProperties props) {
        this.connector = connector;
        this.props = props;
    }

    /** For the sidebar in the UI. */
    public List<TableInfo> read(ConnectionTarget target) {
        try (Connection connection = connector.open(target)) {
            connection.setReadOnly(true);
            return readTables(connection, target.type());
        } catch (SQLException ex) {
            throw ApiException.badRequest("Couldn't read the database structure: " + JdbcConnector.firstLine(ex.getMessage()));
        }
    }

    /**
     * For the AI: the same information as plain text, plus a few sample rows per table.
     * Sample rows matter. Seeing that "plan" holds 'free' / 'premium' / 'family' lets the
     * model write WHERE plan = 'premium' instead of guessing the spelling.
     */
    public String describeForPrompt(ConnectionTarget target) {
        try (Connection connection = connector.open(target)) {
            connection.setReadOnly(true);
            StringBuilder out = new StringBuilder();
            List<TableInfo> tables = readTables(connection, target.type());
            for (TableInfo table : tables.subList(0, Math.min(tables.size(), MAX_PROMPT_TABLES))) {
                out.append("TABLE ").append(table.name());
                if (table.rowCount() != null) {
                    out.append(" (").append(table.rowCount()).append(" rows)");
                }
                out.append('\n');
                for (ColumnInfo column : table.columns()) {
                    out.append("  ").append(column.name()).append(' ').append(column.type());
                    if (column.primaryKey()) {
                        out.append(" PRIMARY KEY");
                    }
                    if (column.references() != null) {
                        out.append(" -> ").append(column.references());
                    }
                    out.append('\n');
                }
                appendSampleRows(out, connection, target.type(), table.name());
                out.append('\n');
            }
            return out.toString().strip();
        } catch (SQLException ex) {
            throw ApiException.badRequest("Couldn't read the database structure: " + JdbcConnector.firstLine(ex.getMessage()));
        }
    }

    private List<TableInfo> readTables(Connection connection, DbType type) throws SQLException {
        DatabaseMetaData meta = connection.getMetaData();
        // PostgreSQL groups tables by schema ("public"); MySQL groups them by catalog (the database).
        String catalog = connection.getCatalog();
        String schema = type == DbType.POSTGRES ? connection.getSchema() : null;

        List<String> tableNames = new ArrayList<>();
        try (ResultSet rs = meta.getTables(catalog, schema, "%", new String[] {"TABLE"})) {
            while (rs.next() && tableNames.size() < MAX_TABLES) {
                tableNames.add(rs.getString("TABLE_NAME"));
            }
        }
        tableNames.sort(String.CASE_INSENSITIVE_ORDER);

        List<TableInfo> tables = new ArrayList<>();
        for (String table : tableNames) {
            tables.add(new TableInfo(table, countRows(connection, type, table),
                    readColumns(meta, catalog, schema, table)));
        }
        return tables;
    }

    private List<ColumnInfo> readColumns(DatabaseMetaData meta, String catalog, String schema, String table)
            throws SQLException {
        Set<String> primaryKeys = new HashSet<>();
        try (ResultSet rs = meta.getPrimaryKeys(catalog, schema, table)) {
            while (rs.next()) {
                primaryKeys.add(rs.getString("COLUMN_NAME"));
            }
        }

        Map<String, String> foreignKeys = new HashMap<>(); // column -> "other_table.other_column"
        try (ResultSet rs = meta.getImportedKeys(catalog, schema, table)) {
            while (rs.next()) {
                foreignKeys.put(rs.getString("FKCOLUMN_NAME"),
                        rs.getString("PKTABLE_NAME") + "." + rs.getString("PKCOLUMN_NAME"));
            }
        }

        List<ColumnInfo> columns = new ArrayList<>();
        try (ResultSet rs = meta.getColumns(catalog, schema, table, "%")) {
            while (rs.next()) {
                String name = rs.getString("COLUMN_NAME");
                columns.add(new ColumnInfo(
                        name,
                        rs.getString("TYPE_NAME").toLowerCase(),
                        primaryKeys.contains(name),
                        rs.getInt("NULLABLE") != DatabaseMetaData.columnNoNulls,
                        foreignKeys.get(name)));
            }
        }
        return columns;
    }

    /** Returns null instead of failing the whole schema if one table can't be counted in time. */
    private Long countRows(Connection connection, DbType type, String table) {
        try (Statement statement = connection.createStatement()) {
            statement.setQueryTimeout(props.query().timeoutSeconds());
            try (ResultSet rs = statement.executeQuery("SELECT COUNT(*) FROM " + type.quote(table))) {
                return rs.next() ? rs.getLong(1) : null;
            }
        } catch (SQLException ex) {
            return null;
        }
    }

    /** Best effort: a table whose rows can't be read is simply described without samples. */
    private void appendSampleRows(StringBuilder out, Connection connection, DbType type, String table) {
        try (Statement statement = connection.createStatement()) {
            statement.setQueryTimeout(props.query().timeoutSeconds());
            statement.setMaxRows(SAMPLE_ROWS);
            try (ResultSet rs = statement.executeQuery("SELECT * FROM " + type.quote(table) + " LIMIT " + SAMPLE_ROWS)) {
                int columnCount = rs.getMetaData().getColumnCount();
                StringBuilder rows = new StringBuilder();
                while (rs.next()) {
                    List<String> cells = new ArrayList<>();
                    for (int i = 1; i <= columnCount; i++) {
                        String cell = String.valueOf(rs.getObject(i));
                        cells.add(cell.length() > SAMPLE_CELL_LENGTH ? cell.substring(0, SAMPLE_CELL_LENGTH) + "…" : cell);
                    }
                    rows.append("    ").append(String.join(" | ", cells)).append('\n');
                }
                if (!rows.isEmpty()) {
                    out.append("  sample rows:\n").append(rows);
                }
            }
        } catch (SQLException ex) {
            // ignore: samples are optional
        }
    }
}

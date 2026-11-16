package com.askdb.query;

import com.askdb.connection.DbType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class QueryDtos {

    private QueryDtos() {}

    public record QueryRequest(@NotBlank @Size(max = 10_000) String sql) {}

    public record QueryResult(
            List<String> columns, List<List<Object>> rows, int rowCount, boolean truncated, long elapsedMs) {}

    public record ColumnInfo(String name, String type, boolean primaryKey, boolean nullable, String references) {}

    /** rowCount is null if counting that table failed or timed out. */
    public record TableInfo(String name, Long rowCount, List<ColumnInfo> columns) {}

    public record SchemaResponse(String database, DbType type, List<TableInfo> tables) {}
}

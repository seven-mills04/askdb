package com.askdb;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.askdb.common.ApiException;
import com.askdb.query.SqlGuard;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SqlGuardTest {

    private final SqlGuard guard = new SqlGuard();

    @ParameterizedTest
    @ValueSource(strings = {
            "SELECT 1",
            "select * from artists;",
            "SELECT name FROM artists WHERE genre = 'Rock' ORDER BY name LIMIT 5",
            "WITH t AS (SELECT 1 AS x) SELECT x FROM t",
            "SELECT 'drop table users; --' AS harmless_string",
            "SELECT a.name, COUNT(*) AS n FROM artists a JOIN albums b ON b.artist_id = a.id GROUP BY a.name",
    })
    void allowsSingleSelects(String sql) {
        guard.check(sql);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "   ",
            "DELETE FROM users",
            "DROP TABLE users",
            "INSERT INTO users (id) VALUES (1)",
            "UPDATE users SET plan = 'premium'",
            "TRUNCATE TABLE users",
            "CREATE TABLE x (id INT)",
            "SELECT 1; DROP TABLE users",
            "SELECT 1; SELECT 2",
            "this is not sql",
            "SELECT 'unclosed",
    })
    void blocksWritesMultipleStatementsAndJunk(String sql) {
        assertThrows(ApiException.class, () -> guard.check(sql));
    }

    @Test
    void stripsTrailingSemicolons() {
        assertEquals("SELECT 1", guard.check("  SELECT 1 ;; "));
    }
}

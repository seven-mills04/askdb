package com.askdb;

import com.askdb.config.AppProperties;
import com.askdb.connection.DbType;
import java.util.List;

/** Builds settings by hand for unit tests that don't start Spring. */
final class TestProps {

    static final String JWT_SECRET = "unit-test-jwt-secret-0123456789-abcdef";

    private TestProps() {}

    static AppProperties with(String jwtSecret, long expiryMinutes, String encryptionSecret) {
        return new AppProperties(
                new AppProperties.Jwt(jwtSecret, expiryMinutes),
                encryptionSecret,
                new AppProperties.Query(500, 5),
                List.of("http://localhost:5173"),
                false,
                new AppProperties.Demo(false, "demo", DbType.POSTGRES, "localhost", 5432, "demo", "u", "p"),
                new AppProperties.Ai("http://localhost:9/v1", "test-key", "test-model", 5, true, 15));
    }

    static AppProperties defaults() {
        return with(JWT_SECRET, 60, "unit-test-encryption-secret");
    }
}

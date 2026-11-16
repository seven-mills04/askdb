package com.askdb.config;

import com.askdb.connection.DbType;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of every "askdb.*" setting in application.properties. */
@ConfigurationProperties(prefix = "askdb")
public record AppProperties(
        Jwt jwt,
        String encryptionSecret,
        Query query,
        List<String> corsOrigins,
        boolean blockPrivateHosts,
        Demo demo,
        Ai ai) {

    public record Jwt(String secret, long expiryMinutes) {}

    public record Query(int maxRows, int timeoutSeconds) {}

    /** The AI service. Any provider with an OpenAI-compatible API works; the default is Groq. */
    public record Ai(
            String baseUrl,
            String apiKey,
            String model,
            int timeoutSeconds,
            boolean summaries,
            int requestsPerMinute) {}

    public record Demo(
            boolean enabled,
            String name,
            DbType type,
            String host,
            int port,
            String database,
            String username,
            String password) {}
}

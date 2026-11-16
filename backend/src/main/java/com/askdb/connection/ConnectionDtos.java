package com.askdb.connection;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class ConnectionDtos {

    private ConnectionDtos() {}

    /**
     * Host and database name are restricted to plain characters on purpose: they become part
     * of a JDBC URL, and characters like ? & / could be used to smuggle in driver options.
     */
    public record ConnectionRequest(
            @NotBlank @Size(max = 80) String name,
            @NotNull DbType type,
            @NotBlank @Size(max = 255)
            @Pattern(regexp = "[A-Za-z0-9.-]+", message = "may only contain letters, digits, dots and hyphens")
            String host,
            @Min(1) @Max(65535) int port,
            @NotBlank @Size(max = 128)
            @Pattern(regexp = "[A-Za-z0-9_$-]+", message = "may only contain letters, digits, _ $ and -")
            String database,
            @NotBlank @Size(max = 128) String username,
            @NotNull @Size(max = 256) String password) {}

    /** What the client sees. Note: no password field, encrypted or not. */
    public record ConnectionSummary(
            long id, String name, DbType type, String host, int port, String database, String username, boolean demo) {}

    public record TestResult(boolean ok, String message) {}
}

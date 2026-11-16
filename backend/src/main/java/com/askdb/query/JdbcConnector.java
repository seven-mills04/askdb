package com.askdb.query;

import com.askdb.common.ApiException;
import com.askdb.config.AppProperties;
import com.askdb.connection.ConnectionTarget;
import com.askdb.connection.DbType;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;
import org.springframework.stereotype.Component;

/** Opens short-lived JDBC connections to users' databases. */
@Component
public class JdbcConnector {

    private static final int CONNECT_TIMEOUT_SECONDS = 5;

    private final AppProperties props;

    public JdbcConnector(AppProperties props) {
        this.props = props;
    }

    /**
     * A new connection per request keeps this simple. With many users, the next step would
     * be a small connection pool per saved connection.
     */
    public Connection open(ConnectionTarget target) {
        int socketTimeout = props.query().timeoutSeconds() + 5;
        Properties p = new Properties();
        p.setProperty("user", target.username());
        p.setProperty("password", target.password());

        if (target.type() == DbType.POSTGRES) {
            p.setProperty("connectTimeout", String.valueOf(CONNECT_TIMEOUT_SECONDS)); // seconds
            p.setProperty("socketTimeout", String.valueOf(socketTimeout));           // seconds
            p.setProperty("ApplicationName", "AskDB");
        } else {
            p.setProperty("connectTimeout", String.valueOf(CONNECT_TIMEOUT_SECONDS * 1000)); // milliseconds
            p.setProperty("socketTimeout", String.valueOf(socketTimeout * 1000));           // milliseconds
            // Switch off MySQL driver features that could read files from the AskDB server.
            p.setProperty("allowLoadLocalInfile", "false");
            p.setProperty("allowUrlInLocalInfile", "false");
            p.setProperty("autoDeserialize", "false");
        }

        try {
            return DriverManager.getConnection(
                    target.type().jdbcUrl(target.host(), target.port(), target.database()), p);
        } catch (SQLException ex) {
            throw ApiException.badRequest("Couldn't connect to the database: " + firstLine(ex.getMessage()));
        }
    }

    /** Opens a connection and immediately closes it. Throws a 400 error if that fails. */
    public void test(ConnectionTarget target) {
        try (Connection connection = open(target)) {
            if (!connection.isValid(CONNECT_TIMEOUT_SECONDS)) {
                throw ApiException.badRequest("Connected, but the database didn't respond.");
            }
        } catch (SQLException ex) {
            throw ApiException.badRequest("Couldn't connect to the database: " + firstLine(ex.getMessage()));
        }
    }

    static String firstLine(String message) {
        if (message == null || message.isBlank()) {
            return "unknown error";
        }
        return message.strip().lines().findFirst().orElse("unknown error");
    }
}

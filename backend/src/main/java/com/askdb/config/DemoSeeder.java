package com.askdb.config;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Builds the Tunebase demo data inside AskDB's own database, for hosts that give you only
 * one database (Render's free plan). Switched on with ASKDB_DEMO_SEED=true.
 *
 * The demo goes into its own schema, "tunebase", and gets its own login, askdb_demo, that can
 * read that schema and nothing else. So a question asked against the demo can never see
 * AskDB's users or saved connections, which live in the "public" schema next to it.
 *
 * Runs once: on later starts it sees the data is already there and only refreshes the login.
 */
@Component
@ConditionalOnProperty(name = "askdb.demo.seed", havingValue = "true")
public class DemoSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoSeeder.class);
    private static final String SCHEMA = "tunebase";
    private static final String SEED_FILE = "demo/tunebase.sql";

    private final DataSource dataSource;
    private final AppProperties props;

    public DemoSeeder(DataSource dataSource, AppProperties props) {
        this.dataSource = dataSource;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false); // all or nothing: a half-built demo is worse than none
            if (alreadyBuilt(connection)) {
                log.info("Demo data already present in schema '{}'.", SCHEMA);
            } else {
                log.info("Building the demo data in schema '{}'. This takes a little while on first start.", SCHEMA);
                String script = new ClassPathResource(SEED_FILE).getContentAsString(StandardCharsets.UTF_8);
                try (Statement statement = connection.createStatement()) {
                    statement.execute("CREATE SCHEMA IF NOT EXISTS " + SCHEMA);
                    statement.execute("SET LOCAL search_path TO " + SCHEMA); // the seed file creates tables in the current schema
                    statement.execute(script);
                }
            }
            grantReadOnlyLogin(connection);
            connection.commit();
            log.info("Demo data ready.");
        } catch (Exception ex) {
            // The rest of AskDB works without the demo, so a failure here must not stop the app.
            log.error("Could not build the demo data; the demo connection will not work.", ex);
        }
    }

    private static boolean alreadyBuilt(Connection connection) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("SELECT to_regclass(?) IS NOT NULL")) {
            statement.setString(1, SCHEMA + ".plays");
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() && rs.getBoolean(1);
            }
        }
    }

    /** Creates (or updates) the demo login so it can read the demo schema and nothing else. */
    private void grantReadOnlyLogin(Connection connection) throws SQLException {
        String user = props.demo().username();
        if (!user.matches("[a-z_][a-z0-9_]*")) {
            throw new IllegalStateException("The demo username may only contain lowercase letters, digits and _.");
        }
        // Role and password can't be sent as query parameters, so the password is quoted by hand.
        String password = "'" + props.demo().password().replace("'", "''") + "'";

        boolean exists;
        try (PreparedStatement statement = connection.prepareStatement("SELECT 1 FROM pg_roles WHERE rolname = ?")) {
            statement.setString(1, user);
            try (ResultSet rs = statement.executeQuery()) {
                exists = rs.next();
            }
        }

        try (Statement statement = connection.createStatement()) {
            statement.execute((exists ? "ALTER" : "CREATE") + " ROLE " + user + " WITH LOGIN PASSWORD " + password);
            statement.execute("GRANT USAGE ON SCHEMA " + SCHEMA + " TO " + user);
            statement.execute("GRANT SELECT ON ALL TABLES IN SCHEMA " + SCHEMA + " TO " + user);
            // Its queries look in the demo schema first, and run read-only even before AskDB's own checks.
            statement.execute("ALTER ROLE " + user + " SET search_path = " + SCHEMA);
            statement.execute("ALTER ROLE " + user + " SET default_transaction_read_only = on");
        }
    }
}

package com.askdb.connection;

import com.askdb.common.ApiException;
import com.askdb.config.AppProperties;
import com.askdb.connection.ConnectionDtos.ConnectionRequest;
import com.askdb.connection.ConnectionDtos.ConnectionSummary;
import com.askdb.query.JdbcConnector;
import com.askdb.security.CryptoService;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConnectionService {

    /** The built-in demo database is shown to every user under this id. */
    public static final long DEMO_ID = 0;

    private final DbConnectionRepository connections;
    private final CryptoService crypto;
    private final JdbcConnector connector;
    private final AppProperties props;

    public ConnectionService(DbConnectionRepository connections, CryptoService crypto, JdbcConnector connector,
                             AppProperties props) {
        this.connections = connections;
        this.crypto = crypto;
        this.connector = connector;
        this.props = props;
    }

    public List<ConnectionSummary> list(Long userId) {
        List<ConnectionSummary> out = new ArrayList<>();
        AppProperties.Demo demo = props.demo();
        if (demo.enabled()) {
            out.add(new ConnectionSummary(DEMO_ID, demo.name(), demo.type(), "built-in", demo.port(),
                    demo.database(), "read-only", true));
        }
        for (DbConnection c : connections.findByUserIdOrderByCreatedAtAsc(userId)) {
            out.add(toSummary(c));
        }
        return out;
    }

    /** Checks the details actually work before saving them, then stores the password encrypted. */
    @Transactional
    public ConnectionSummary create(Long userId, ConnectionRequest req) {
        connector.test(toTarget(req));
        DbConnection saved = connections.save(new DbConnection(userId, req.name().trim(), req.type(), req.host(),
                req.port(), req.database(), req.username(), crypto.encrypt(req.password())));
        return toSummary(saved);
    }

    public void test(ConnectionRequest req) {
        connector.test(toTarget(req));
    }

    @Transactional
    public void delete(Long userId, long id) {
        DbConnection c = connections.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Connection not found."));
        connections.delete(c);
    }

    /** Turns a connection id into usable connection details, checking it belongs to this user. */
    public ConnectionTarget resolve(Long userId, long id) {
        if (id == DEMO_ID) {
            AppProperties.Demo d = props.demo();
            if (!d.enabled()) {
                throw ApiException.notFound("The demo database is turned off.");
            }
            return new ConnectionTarget(d.type(), d.host(), d.port(), d.database(), d.username(), d.password());
        }
        DbConnection c = connections.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Connection not found."));
        return new ConnectionTarget(c.getType(), c.getHost(), c.getPort(), c.getDatabase(), c.getUsername(),
                crypto.decrypt(c.getPasswordEncrypted()));
    }

    private ConnectionTarget toTarget(ConnectionRequest req) {
        if (props.blockPrivateHosts()) {
            rejectPrivateHost(req.host());
        }
        return new ConnectionTarget(req.type(), req.host(), req.port(), req.database(), req.username(), req.password());
    }

    /**
     * On a public deployment, users must not be able to point AskDB at machines on the
     * server's own network (e.g. "localhost" or 10.x.x.x). This is known as SSRF protection.
     */
    private static void rejectPrivateHost(String host) {
        try {
            for (InetAddress address : InetAddress.getAllByName(host)) {
                if (address.isLoopbackAddress() || address.isSiteLocalAddress() || address.isLinkLocalAddress()
                        || address.isAnyLocalAddress()) {
                    throw ApiException.badRequest("That host points to a private network address, which isn't allowed.");
                }
            }
        } catch (UnknownHostException ex) {
            throw ApiException.badRequest("Couldn't find a server called '" + host + "'.");
        }
    }

    private static ConnectionSummary toSummary(DbConnection c) {
        return new ConnectionSummary(c.getId(), c.getName(), c.getType(), c.getHost(), c.getPort(), c.getDatabase(),
                c.getUsername(), false);
    }
}

package com.askdb.connection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** A database connection a user has saved. The password is stored encrypted (see CryptoService). */
@Entity
@Table(name = "db_connections")
public class DbConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "db_type", nullable = false, length = 20)
    private DbType type;

    @Column(nullable = false, length = 255)
    private String host;

    @Column(nullable = false)
    private int port;

    @Column(name = "database_name", nullable = false, length = 128)
    private String database;

    @Column(nullable = false, length = 128)
    private String username;

    @Column(name = "password_encrypted", nullable = false, length = 1024)
    private String passwordEncrypted;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected DbConnection() {
        // required by JPA
    }

    public DbConnection(Long userId, String name, DbType type, String host, int port, String database,
                        String username, String passwordEncrypted) {
        this.userId = userId;
        this.name = name;
        this.type = type;
        this.host = host;
        this.port = port;
        this.database = database;
        this.username = username;
        this.passwordEncrypted = passwordEncrypted;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public DbType getType() {
        return type;
    }

    public String getHost() {
        return host;
    }

    public int getPort() {
        return port;
    }

    public String getDatabase() {
        return database;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordEncrypted() {
        return passwordEncrypted;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

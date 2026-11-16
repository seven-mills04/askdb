package com.askdb.connection;

/** Everything needed to open a connection, with the password already decrypted. Never stored or returned to the client. */
public record ConnectionTarget(DbType type, String host, int port, String database, String username, String password) {}

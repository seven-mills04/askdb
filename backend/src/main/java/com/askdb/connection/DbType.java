package com.askdb.connection;

/** The kinds of database AskDB can connect to. */
public enum DbType {
    POSTGRES("jdbc:postgresql://%s:%d/%s", '"'),
    MYSQL("jdbc:mysql://%s:%d/%s", '`');

    private final String urlTemplate;
    private final char identifierQuote;

    DbType(String urlTemplate, char identifierQuote) {
        this.urlTemplate = urlTemplate;
        this.identifierQuote = identifierQuote;
    }

    public String jdbcUrl(String host, int port, String database) {
        return urlTemplate.formatted(host, port, database);
    }

    /** Wraps a table/column name in the right quote character: "name" for PostgreSQL, `name` for MySQL. */
    public String quote(String identifier) {
        String q = String.valueOf(identifierQuote);
        return q + identifier.replace(q, q + q) + q;
    }
}

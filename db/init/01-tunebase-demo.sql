-- Local Docker only: Postgres runs this the first time its container starts.
-- It creates a separate "tunebase" database, fills it from the shared seed file,
-- and gives the askdb_demo login read-only access to it.
-- (On Render the backend does the same job itself; see DemoSeeder.java.)

CREATE ROLE askdb_demo LOGIN PASSWORD 'demo_readonly';   -- local demo credentials
CREATE DATABASE tunebase;
\connect tunebase

\i /askdb-seed/tunebase.sql

GRANT CONNECT ON DATABASE tunebase TO askdb_demo;
GRANT USAGE ON SCHEMA public TO askdb_demo;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO askdb_demo;
ALTER ROLE askdb_demo SET default_transaction_read_only = on;   -- belt and braces: even a write attempt is refused

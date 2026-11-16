#!/bin/sh
# Starts AskDB inside its container.
#
# Render hands over the database address as one URL:
#     postgresql://user:password@host:port/database
# Spring (and the demo connection) want the parts separately, so this splits the URL up
# before starting Java. Locally, Docker Compose sets the parts directly and this is skipped.
set -e

if [ -n "$DATABASE_URL" ]; then
  rest=${DATABASE_URL#*://}          # user:password@host:port/database?options
  creds=${rest%%@*}                  # user:password
  rest=${rest#*@}                    # host:port/database?options
  hostport=${rest%%/*}               # host:port   (Render's private URLs leave out the port)
  database=${rest#*/}
  database=${database%%\?*}
  host=${hostport%%:*}
  port=${hostport#*:}
  [ "$port" = "$hostport" ] && port=5432

  export ASKDB_DB_URL="jdbc:postgresql://$host:$port/$database"
  export ASKDB_DB_USER="${creds%%:*}"
  export ASKDB_DB_PASSWORD="${creds#*:}"

  # The demo data lives in the same database (see DemoSeeder.java), behind its own login.
  export ASKDB_DEMO_HOST="${ASKDB_DEMO_HOST:-$host}"
  export ASKDB_DEMO_PORT="${ASKDB_DEMO_PORT:-$port}"
  export ASKDB_DEMO_DATABASE="${ASKDB_DEMO_DATABASE:-$database}"
fi

exec java $JAVA_OPTS -jar "${APP_JAR:-/app/app.jar}"

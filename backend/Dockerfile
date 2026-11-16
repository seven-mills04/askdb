# Stage 1: build the jar with Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

# Stage 2: run it on a small Java runtime image (no Maven, no source code)
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/askdb.jar app.jar
COPY docker-entrypoint.sh .
# Strip Windows line endings in case the file was checked out on Windows, then make it runnable.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Sized for small hosts (Render's free plan has 512 MB): cap the heap at 70% of the container's
# memory, use the simplest garbage collector, and favour a quick start over peak speed.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1"

EXPOSE 8080
ENTRYPOINT ["./docker-entrypoint.sh"]

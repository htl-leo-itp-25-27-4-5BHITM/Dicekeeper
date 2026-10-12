# Stage 1: Build
FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml ./
RUN mvn -P '!dev' dependency:go-offline -B

COPY src src
RUN mvn -P '!dev' package -DskipTests -Dexec.skip=true -B

# Stage 2: Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/quarkus-app /app

# Create uploads directory
RUN mkdir -p /app/uploads/profiles /app/uploads/maps

EXPOSE 8080

ENV JAVA_OPTS="-Xms128m -Xmx512m"

ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]

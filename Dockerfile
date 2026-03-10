# Stage 1: Build
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

COPY src src
RUN ./mvnw package -DskipTests -Dexec.skip=true -B

# Stage 2: Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/quarkus-app /app

# Create uploads directory
RUN mkdir -p /app/uploads/profiles /app/uploads/maps

EXPOSE 8080

ENV JAVA_OPTS="-Xms128m -Xmx512m"

ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]

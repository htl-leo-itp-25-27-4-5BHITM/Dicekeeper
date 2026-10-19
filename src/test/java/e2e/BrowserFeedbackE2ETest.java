package e2e;

import ability.Ability;
import background.Background;
import characterclass.CharacterClass;
import characterclass.GermanContent;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.io.File;
import java.net.URL;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Full-stack browser test of the play-test feedback: real backend (H2), real frontend, several
 * users in separate browser contexts (logged in through {@link TestCookieAuthMechanism}).
 *
 * <p>Runs only with {@code -De2e=true} because it needs Node.js and a Chromium for Playwright:
 * {@code mvn test -De2e=true -Dtest=BrowserFeedbackE2ETest -Dpw.chromium=/path/to/chrome}.</p>
 */
@QuarkusTest
@EnabledIfSystemProperty(named = "e2e", matches = "true")
class BrowserFeedbackE2ETest {

    @TestHTTPResource("/")
    URL baseUrl;

    @Test
    void playTestFeedbackScenarios() throws Exception {
        seedReferenceData();

        ProcessBuilder pb = new ProcessBuilder("node", "tests/e2e-fullstack/feedback.e2e.mjs")
                .directory(new File(System.getProperty("user.dir")))
                .redirectErrorStream(true)
                .redirectOutput(Paths.get("target", "e2e-output.log").toFile());
        pb.environment().put("BASE_URL", baseUrl.toString().replaceAll("/$", ""));
        pb.environment().put("SCREENSHOT_DIR", Paths.get("target", "e2e-screenshots").toAbsolutePath().toString());
        String chromium = System.getProperty("pw.chromium");
        if (chromium != null) {
            pb.environment().put("PW_CHROMIUM", chromium);
        }
        Process process = pb.start();
        if (!process.waitFor(15, TimeUnit.MINUTES)) {
            process.destroyForcibly();
            throw new AssertionError("Browser tests timed out");
        }
        String output = java.nio.file.Files.readString(Paths.get("target", "e2e-output.log"));
        System.out.println(output);
        assertEquals(0, process.exitValue(), "Browser scenarios failed:\n" + output);
    }

    private void seedReferenceData() {
        QuarkusTransaction.requiringNew().run(() -> {
            if (CharacterClass.count("name", "Barbar") == 0) {
                CharacterClass.deleteAll();
                Background.deleteAll();
                // Same rows as import.sql: classes 1..10 and one background
                for (long id = 1; id <= 10; id++) {
                    GermanContent.Entry e = GermanContent.CLASSES.get(id);
                    CharacterClass c = new CharacterClass();
                    c.name = e.germanName();
                    c.description = e.description();
                    c.persist();
                }
                GermanContent.Entry acolyte = GermanContent.BACKGROUNDS.get(1L);
                Background b = new Background();
                b.name = acolyte.germanName();
                b.description = acolyte.description();
                b.skills = "Insight, Religion";
                b.persist();
            }
            if (character.Character.count("ownerPlayerId is null and name = ?1", "Elara Mondschein") == 0) {
                // A character from the time before characters had owners
                character.Character legacy = new character.Character();
                legacy.name = "Elara Mondschein";
                legacy.classId = CharacterClass.<CharacterClass>find("name", "Barde").firstResult().id;
                legacy.level = 1;
                legacy.race = "Elf";
                legacy.persist();
            }
            if (Ability.count() == 0) {
                for (String name : List.of("Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma")) {
                    Ability a = new Ability();
                    a.name = name;
                    a.description = Map.of().toString();
                    a.persist();
                }
            }
        });
    }
}

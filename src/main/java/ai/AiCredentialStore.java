package ai;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Hält die API-Keys, die Nutzer selbst eingeben (Bring-your-own-key).
 *
 * Absichtlich nur im Arbeitsspeicher: Keys landen nie in der Datenbank, in Logs oder im Browser
 * (der Browser bekommt nur die letzten vier Zeichen als Hinweis). Nach einem Neustart oder nach
 * Ablauf der TTL muss man sich neu verbinden. Wenn die KI später fester Teil der App wird, kann
 * diese Klasse durch eine verschlüsselte, persistente Variante ersetzt werden.
 */
@ApplicationScoped
public class AiCredentialStore {

    public record StoredKey(String apiKey, Instant connectedAt, String hint) {
    }

    private final Map<String, Map<AiProviderId, StoredKey>> keysBySubject = new ConcurrentHashMap<>();

    @ConfigProperty(name = "dicekeeper.ai.key-ttl", defaultValue = "PT12H")
    Duration ttl;

    public void put(String subject, AiProviderId provider, String apiKey) {
        StoredKey stored = new StoredKey(apiKey, Instant.now(), hint(apiKey));
        keysBySubject.compute(subject, (s, existing) -> {
            Map<AiProviderId, StoredKey> map = existing == null ? new EnumMap<>(AiProviderId.class) : existing;
            map.put(provider, stored);
            return map;
        });
    }

    public Optional<StoredKey> get(String subject, AiProviderId provider) {
        Map<AiProviderId, StoredKey> map = keysBySubject.get(subject);
        if (map == null) {
            return Optional.empty();
        }
        synchronized (map) {
            StoredKey stored = map.get(provider);
            if (stored == null) {
                return Optional.empty();
            }
            if (stored.connectedAt().plus(ttl).isBefore(Instant.now())) {
                map.remove(provider);
                return Optional.empty();
            }
            return Optional.of(stored);
        }
    }

    public void remove(String subject, AiProviderId provider) {
        Map<AiProviderId, StoredKey> map = keysBySubject.get(subject);
        if (map != null) {
            synchronized (map) {
                map.remove(provider);
            }
        }
    }

    /** Für Account-Löschung oder Logout: alle Keys eines Nutzers verwerfen. */
    public void removeAll(String subject) {
        keysBySubject.remove(subject);
    }

    private static String hint(String apiKey) {
        if (apiKey.length() <= 8) {
            return "••••";
        }
        return "••••" + apiKey.substring(apiKey.length() - 4);
    }
}

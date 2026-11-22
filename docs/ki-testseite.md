# KI-Testseite (nur für die Entwicklung)

Versteckte Seite zum Ausprobieren der KI-Anbindung: **`/#/dev/ki-test`** (nicht verlinkt, Login nötig).

## Anmelden bei OpenAI / Claude

ChatGPT Plus und Claude Pro/Max sind Abos für die Apps der Anbieter; fremde Apps können sich damit nicht
per OAuth anmelden. Darum verbindet man sich mit einem **eigenen API-Key** (Bring-your-own-key):

- Claude: Key unter https://console.anthropic.com/settings/keys anlegen
- OpenAI: Key unter https://platform.openai.com/api-keys anlegen

Der Key wird beim Verbinden einmal geprüft (Modell-Liste abfragen) und danach nur im Arbeitsspeicher des
Servers gehalten (Standard 12 h, `AI_KEY_TTL`). Er landet nie in der Datenbank, in Logs oder im Browser.
Nach einem Neustart muss man sich neu verbinden. Die Kosten laufen über das Konto beim Anbieter.

## Aktivieren

| Umgebung | Schalter |
|---|---|
| lokal (`quarkus dev`) | automatisch an |
| dev.dicekeeper.net / prod | aus; nur mit Umgebungsvariable `AI_PLAYGROUND_ENABLED=true` |

Ist die Seite aus, antworten alle `/api/dev/ai/*`-Endpunkte mit 404.

## Aufbau

Bleibt für die echten KI-Features bestehen (`src/main/java/ai/`):

- `AiGateway`: einzige Stelle, über die KI-Aufrufe laufen (Prompt-Auswahl, Eingabe-Limits, Anbieterwahl)
- `provider/AnthropicProviderClient`, `provider/OpenAiProviderClient`: offizielle SDKs, Antworten werden gestreamt
- `AiPrompts` + `AiAssistantMode`: System-Prompts für `GENERAL`, `CAMPAIGN_CREATION` (Kampagne erstellen)
  und `SESSION_HELP` (Regeln & Improvisation während der Session), Regelbasis D&D 5e 2024
- `AiCredentialStore`: Keys im Speicher, später durch eine verschlüsselte, persistente Variante ersetzbar

Standardmodell bei Claude ist `claude-opus-5-5`, bei OpenAI das neueste GPT-Modell, das der Key anbietet.
Auf der Testseite kann man Modell und Modus umschalten.

## Löschen, wenn wir die Seite nicht mehr brauchen

1. `src/main/java/ai/playground/` löschen
2. `src/main/resources/META-INF/resources/app/dev/` löschen
3. In `app/main.js` die Route mit dem Kommentar `DEV-ONLY` entfernen
4. `src/test/java/ai/AiPlaygroundResourceTest.java` löschen
5. In `application.properties` die drei Zeilen `dicekeeper.ai-playground.enabled` entfernen
6. Diese Datei löschen

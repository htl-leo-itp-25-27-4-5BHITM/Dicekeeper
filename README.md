---

## Projektteam

### Frontend

- Simeon Hörtenhuber
- Tanja Hochhuber

### Backend

- Daniel Mahringer
- Niklas Satzinger

---

## Projektauftraggeber

- Dietmar Steiner
- Christian Aberger
- Dejan Sivak

---

## Ausgangssituation

Pen-&-Paper-Rollenspiele wie *Dungeons & Dragons* leben davon, dass ein Dungeon Master (DM) die Geschichte erzählt, Quests vorbereitet und flexibel auf Spielerentscheidungen reagiert. Diese Rolle ist äußerst kreativ, aber auch zeitintensiv und erfordert viel Erfahrung.

Gleichzeitig schreckt genau das viele Spielergruppen ab: Wenn niemand Lust oder Zeit hat, Dungeon Master zu sein, kann ein Abenteuer gar nicht erst stattfinden. Besonders Neueinsteiger sind dadurch oft überfordert.

---

## Problemstellung

Aktuell fehlen Dungeon Mastern digitale Helfer, die sie bei der Organisation und Durchführung einer Spielsitzung unterstützen. Zwar gibt es einzelne Tools (z. B. Würfel-Simulatoren oder Regel-Nachschlagewerke), aber kaum ein System, das diese sinnvoll kombiniert und um moderne Technologien wie KI und Sprachsteuerung erweitert.

Es fehlt also eine Lösung, die:

- **Kampfszenen übersichtlich verwaltet** (Interaktiv, Health Bars, Boss-Kämpfe),
- **Questideen und Geschichten** dynamisch entstehen lässt,
- **Regelwerke schnell verfügbar macht** und bei Fragen unterstützt,
- **Audio-Eingaben** erkennt und verarbeitet,
- und sowohl **vor Ort als auch online** (z. B. über Discord) nutzbar ist.

---

## Ziele

Mit Dicekeeper soll ein modernes Tool entstehen, das Dungeon Mastern bei der Spielleitung unterstützt und so den Einstieg erleichtert und gleichzeitig erfahrenen DMs mehr Freiraum für die eigentliche Kreativität gibt.

Dicekeeper ist eine **Web-App**, die Dungeon Mastern folgende Möglichkeiten bietet:

- **Kampfübersicht** mit Initiative-Tracker, Health Bars und strukturierter Darstellung für alle Spieler.
- **Drei Ansichten**: DM-Ansicht (volle Kontrolle), Spieler-Ansicht (reduziert), sowie eine **Übersichtsansicht** (für z. B. einen zentralen Bildschirm im Raum).
- **Quest- und Storyunterstützung**: KI-gestützte Ideen oder Presets für Geschichten.
- **Karten- und NPC-Verwaltung**: Visualisierungen von Orten und Charakteren.
- **Regelwerk-Schnellhilfe**: Unterstützung bei Regelfragen direkt im Spiel.
- **Audioauswertung**: Sprachsteuerung, damit der Dungeon Master nicht ständig tippen oder klicken muss.
- **Optimierung für Mobile/Tablet**, damit Spieler nicht zwingend mit Laptops am Tisch sitzen müssen.

Langfristig ist auch eine **Discord-Integration** geplant, damit Gruppen online zusammenspielen können.

---

## Abgrenzung

Dicekeeper **ersetzt nicht den Dungeon Master**, sondern versteht sich als **Assistenzsystem**. Der kreative Kern bleibt beim DM, Dicekeeper liefert Unterstützung, Struktur und Inspiration.

---

## Risiken

- **KI-Ausgaben**: Story- oder Regelfragen können fehlerhaft interpretiert werden.
- **Audioerkennung**: Probleme bei Spracherkennung oder Hintergrundgeräuschen.
- **API-Kosten**: Nutzung der OpenAI API kann laufende Kosten verursachen.
- **Komplexität**: Hohe Feature-Dichte erfordert gute Planung und Umsetzung.

---

## Möglichkeiten / Vorteile

- **Einstieg erleichtern**: Neue Gruppen können leichter starten, auch wenn niemand Erfahrung als Dungeon Master hat.
- **Entlastung für erfahrene DMs**: Mehr Fokus auf das Erzählen und Interagieren, weniger auf Verwaltung.
- **Strukturierte Kämpfe**: Große Combats können übersichtlicher abgewickelt werden.
- **Flexibilität**: Unterstützung sowohl am Spieltisch als auch online über Discord.
- **Open Source Potenzial**: Möglichkeit, Dicekeeper nach Projektabschluss öffentlich bereitzustellen und von einer Community weiterentwickeln zu lassen.

---

## Toolstack

- **Frontend:** React.js
- **Backend:** Quarkus, Quinoa
- **Integration:** Discord.js
- **Datenbank:** MariaDB
- **Authentifizierung:** Keycloak
- **KI-Features:** OpenAI API

---

## Lokale Entwicklung mit Keycloak

Für die lokale Entwicklung kann Dicekeeper die produktive PostgreSQL- und Keycloak-Instanz per `kubectl port-forward` aus dem Schul-Cluster verwenden.

### Voraussetzungen

- Zugriff auf den richtigen Kubernetes-Cluster und Namespace
- funktionierendes `kubectl`
- eine lokale `.env` Datei im Projektverzeichnis

### Verwendete lokale Ports

- PostgreSQL: `localhost:5432`
- Keycloak: `localhost:8000`
- Dicekeeper lokal: `http://localhost:8080`

### Port-Forward starten

Das Skript [scripts/port-forward-start.sh](/Users/blauregen/School/SEW/Dicekeeper/scripts/port-forward-start.sh) startet jetzt beide Port-Forwards:

- `svc/postgres` auf `5432`
- `svc/keycloak` auf `8000`

Direkt starten mit:

```bash
./scripts/port-forward-start.sh
```

Oder wie bisher über Quarkus Dev Mode:

```bash
./mvnw quarkus:dev
```

### Benötigte `.env` Werte

Beispiel:

```env
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8000/realms/dicekeeper
KEYCLOAK_CLIENT_ID=dicekeeper-web
KEYCLOAK_CLIENT_SECRET=...
KEYCLOAK_STATE_SECRET=...
```

### Keycloak Client Einstellungen für lokal

Der Keycloak-Client muss Redirects für die lokale App erlauben. Mindestens diese URLs sollten im Client eingetragen sein:

- Valid redirect URIs: `http://localhost:8080/api/auth/callback`
- Valid post logout redirect URIs: `http://localhost:8080/*`
- Web origins: `http://localhost:8080`

Dicekeeper verwendet bewusst einen festen OIDC-Callback statt dynamischer Redirect-URIs. Dadurch muss im Keycloak-Client lokal genau `http://localhost:8080/api/auth/callback` erlaubt sein.

### Login Flow lokal testen

1. `kubectl` Verbindung prüfen.
2. `./scripts/port-forward-start.sh` oder `./mvnw quarkus:dev` starten.
3. [http://localhost:8080](http://localhost:8080) öffnen.
4. Auf Login klicken.
5. Nach erfolgreichem Keycloak-Login wirst du zurück zu Dicekeeper geleitet und der Player wird automatisch synchronisiert.

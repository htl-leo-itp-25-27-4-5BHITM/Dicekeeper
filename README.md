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

Für die lokale Entwicklung läuft der Browser-Login standardmäßig über `http://localhost:8000`. Dieses lokale Endpoint ist ein kleiner Reverse-Proxy auf das gemeinsame Keycloak unter `https://auth.dicekeeper.net`, damit lokale Authentifizierung konsequent auf `localhost` bleibt. PostgreSQL kann weiterhin per `kubectl port-forward` aus dem Schul-Cluster verwendet werden.

### Voraussetzungen

- Zugriff auf den richtigen Kubernetes-Cluster und Namespace
- funktionierendes `kubectl`
- eine lokale `.env` Datei im Projektverzeichnis

### Verwendete lokale Ports

- PostgreSQL: `localhost:5432`
- Keycloak (optional): `localhost:8000`
- Dicekeeper lokal: `http://localhost:8080`

### Port-Forward starten

Das Skript [scripts/port-forward-start.sh](/Users/blauregen/School/SEW/Dicekeeper/scripts/port-forward-start.sh) startet standardmäßig:

- `svc/postgres` auf `5432`
- einen lokalen Keycloak-Proxy auf `localhost:8000`

Direkt starten mit:

```bash
./scripts/port-forward-start.sh
```

Falls du statt des lokalen Proxys einen rohen Keycloak-Port-Forward auf `localhost:8000` willst, aktiviere ihn explizit:

```bash
PORT_FORWARD_KEYCLOAK=1 ./scripts/port-forward-start.sh
```

Oder wie bisher über Quarkus Dev Mode:

```bash
./mvnw quarkus:dev
```

### Benötigte `.env` Werte

Beispiel:

```env
DEV_KEYCLOAK_AUTH_SERVER_URL=http://localhost:8000/realms/dicekeeper
KEYCLOAK_CLIENT_ID=dicekeeper-web
KEYCLOAK_CLIENT_SECRET=...
KEYCLOAK_STATE_SECRET=...
```

Wenn du stattdessen gegen eine andere lokale Keycloak-Instanz oder einen anderen Port entwickeln willst, passe `DEV_KEYCLOAK_AUTH_SERVER_URL` entsprechend an, zum Beispiel auf `http://localhost:8180/realms/dicekeeper`.

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

## Development Deployment auf dev.dicekeeper.net

Neben Production auf `dicekeeper.net` gibt es eine getrennte Kubernetes-Umgebung fuer den Branch `develop`.

- `main` deployed Production mit den bisherigen Manifests unter [k8s](/Users/blauregen/School/SEW/Dicekeeper/k8s)
- `develop` deployed Development mit den Manifests unter [k8s/dev](/Users/blauregen/School/SEW/Dicekeeper/k8s/dev)
- Development nutzt eigene Kubernetes-Objekte: `dicekeeper-dev`, `imagor-dev`, `dicekeeper-dev-uploads`
- Keycloak bleibt im gemeinsamen Realm `dicekeeper`, aber Development nutzt einen eigenen Client, standardmaessig `dicekeeper-dev-web`

### Cloudflare DNS

Lege in Cloudflare einen DNS-Eintrag fuer `dev.dicekeeper.net` an, der auf dieselbe Infrastruktur zeigt wie `dicekeeper.net`.
Wenn `dicekeeper.net` ueber den Cloudflare Proxy laeuft, sollte `dev.dicekeeper.net` gleich konfiguriert werden.

### GitHub Secrets fuer develop

Diese Secrets werden nur fuer den `develop`-Deploy gebraucht:

```text
DEV_DB_PASSWORD
DEV_KEYCLOAK_CLIENT_SECRET
DEV_KEYCLOAK_STATE_SECRET
```

Optional koennen diese Werte ueberschrieben werden; sonst nutzt die Action die Defaults:

```text
DEV_DB_USERNAME=dicekeeper_dev
DEV_DB_JDBC_URL=jdbc:postgresql://postgres:5432/dicekeeper_dev
DEV_KEYCLOAK_AUTH_SERVER_URL=http://keycloak:8080/realms/dicekeeper
DEV_KEYCLOAK_CLIENT_ID=dicekeeper-dev-web
DEV_IMAGOR_SECRET=<faellt auf IMAGOR_SECRET zurueck>
```

Die Dev-Datenbank muss einmalig in PostgreSQL existieren:

```sql
CREATE USER dicekeeper_dev WITH PASSWORD '...';
CREATE DATABASE dicekeeper_dev WITH OWNER dicekeeper_dev ENCODING 'UTF8' CONNECTION LIMIT -1;
```

### Keycloak Client fuer Development

Im Realm `dicekeeper` sollte ein eigener confidential Client fuer Development angelegt werden:

- Client ID: `dicekeeper-dev-web`
- Valid redirect URIs: `https://dev.dicekeeper.net/api/auth/callback`
- Valid post logout redirect URIs: `https://dev.dicekeeper.net/*`
- Web origins: `https://dev.dicekeeper.net`
- Standard flow: enabled
- Client authentication: enabled
- Service accounts roles: disabled or no roles assigned

Das erzeugte Client Secret wird als GitHub Secret `DEV_KEYCLOAK_CLIENT_SECRET` hinterlegt.
Die Keycloak Admin API ist im Dev-Deployment deaktiviert, damit der Dev-Client keine Benutzer aus dem gemeinsamen Realm loeschen kann.

## Imagor auf Kubernetes

Für Bild-Resizing und WebP-Ausgabe läuft `imagor` im Cluster als eigener Service statt im Dicekeeper-Container.

- Manifest-Dateien: [k8s/imagor-deployment.yaml](/Users/blauregen/School/SEW/Dicekeeper/k8s/imagor-deployment.yaml) und [k8s/imagor-service.yaml](/Users/blauregen/School/SEW/Dicekeeper/k8s/imagor-service.yaml)
- Ingress-Pfad: `https://dicekeeper.net/imagor/...`
- Originale Uploads kommen weiterhin aus dem gemeinsamen PVC `dicekeeper-uploads`
- Verarbeitete Varianten werden im `imagor`-Pod in einem `emptyDir` zwischengespeichert

Die Docker-Doku aus dem `imagor`-Projekt wurde dabei direkt auf Kubernetes übersetzt:

- `docker run -p 8000:8000 ...` wird in Kubernetes zu `containerPort: 8000` plus eigenem `Service`
- Docker-Umgebungsvariablen wie `FILE_LOADER_BASE_DIR` oder `IMAGOR_UNSAFE` bleiben in Kubernetes einfach `env:` Einträge im Pod
- Docker-Volumes werden zu `volumeMounts` und `volumes`

Wichtige gesetzte Variablen:

- `SERVER_PATH_PREFIX=/imagor`, damit der Service sauber unter dem Ingress-Pfad läuft
- `FILE_LOADER_BASE_DIR=/mnt`, damit URLs wie `/imagor/.../uploads/maps/datei.png` direkt auf `/mnt/uploads/...` aufgelöst werden
- `HTTP_LOADER_DISABLE=1`, damit keine beliebigen externen Bild-URLs geladen werden
- `IMAGOR_UNSAFE=1`, weil Dicekeeper aktuell noch keine signierten `imagor`-URLs erzeugt

Beispiel für eine Karten-URL im Cluster:

```text
/imagor/unsafe/fit-in/1200x900/filters:format(webp):quality(85)/uploads/maps/campaign-123.png
```

Lokal auf `localhost` verwendet das Frontend weiter direkt `/uploads/...`, damit die Entwicklung auch ohne laufenden `imagor`-Container funktioniert.

# Dicekeeper: anpassbarer DM-Arbeitsbereich

## Umsetzung und technische Entscheidung

Der untersuchte Stand verwendet **Quarkus mit nativen JavaScript-ES-Modulen**, kein Angular. Es gibt keine Angular-Komponenten, Angular-Abhängigkeiten oder `angular.json`. Die bestehende DM-Ansicht liegt in `src/main/resources/META-INF/resources/app/views/GMView.js`; Kartenfunktionen in `components/mapCanvas.js`; Live-Ereignisse werden über `services/campaignEvents.js` per SSE empfangen.

`dockview-angular` ist deshalb kein direkt einsetzbares Paket für diesen Projektstand. Der frameworkunabhängige Dockview-Kern wäre grundsätzlich geeignet: https://dockview.dev/docs/overview/introduction/ und https://dockview.dev/docs/releases/migrating/migrating-to-v7/. Die Paketabfrage scheiterte in der Arbeitsumgebung mit `ENOTFOUND registry.npmjs.org`. Es wurde keine ungetestete CDN-Abhängigkeit eingebaut und kein Angular-Framework nachgerüstet.

Stattdessen ist eine **lokale, abhängigkeitsfreie Docking-Implementierung** integriert. Sie verwendet Pointer Events, Flexbox, ResizeObserver und localStorage. Sie ist kein Dockview-Adapter. Die Trennung zwischen Layoutmodell und Panel-Integration ermöglicht einen späteren Austausch des Layout-Engines.

## Bedienung

1. Eine bestehende Kampagne in der normalen Dungeon-Master-Ansicht öffnen. Die Werkzeugleiste erscheint automatisch oberhalb der fünf bestehenden Bereiche.
2. Einen **Tab ziehen**. In der Mitte eines anderen Bereichs entsteht ein gemeinsamer Tab-Bereich; an dessen linkem, rechtem, oberem oder unterem Rand entsteht eine Teilung. Eine grüne Vorschau zeigt das Ziel. Mit Escape lässt sich die Aktion abbrechen.
3. Die **Trennleisten** zwischen Bereichen ziehen, um die Größen anzupassen. Mindestgrößen gelten für die gesamte Gruppe. Fokussierte Trennleisten lassen sich auch mit den Pfeiltasten bedienen.
4. Über **⋯ → Als Fenster lösen** ein Panel herauslösen. Das Fenster an seinem sichtbaren Griff **⠿** oder einer freien Stelle der Titelleiste verschieben; am Rand oder an den Ecken skalieren. Der Griff kann auch fokussiert und mit Pfeiltasten bewegt werden.
5. Über **⋯ → Wieder andocken** ein schwebendes Panel zurückholen. Alternativ seinen Tab in einen vorhandenen Bereich ziehen. Ein Drop auf ein schwebendes Fenster fügt einen Tab hinzu.
6. Über **⋯ → Zielbereich / Docking-Position / Panel verschieben** lassen sich dieselben Panel-Anordnungen ohne Drag & Drop vornehmen, etwa per Tastatur oder Touch.
7. **×** blendet das aktive Panel aus. Unter **Panels** können einzelne oder alle Panels wieder geöffnet werden. Alle fünf Panels dürfen geschlossen werden; ein leerer Arbeitsbereich bietet weiterhin die Panel-Auswahl.
8. Die letzte Anordnung wird automatisch gespeichert. **Layout speichern** legt zusätzlich einen persönlichen Schnappschuss an. Dieser lässt sich über **Benutzerdefiniert** in der Layout-Auswahl wieder laden. **Zurücksetzen** stellt das Standardlayout her und bewahrt den persönlichen Schnappschuss.

Beispiele: Für eine besonders große Karte **Erkundung** wählen und die Trennleiste anpassen. Für Würfel neben Spielern im Würfel-Menü das Ziel **Spieler**, Position **Rechts**, anschließend **Panel verschieben** wählen. Für den Chat hinter den Entscheidungen **Gruppenentscheidungen** als Ziel und **Als Tab** wählen.

## Layout-Vorlagen

| Vorlage | Anordnung |
| --- | --- |
| Standard | Große Karte links; Entscheidungen über Chat in der Mitte; Spieler über Würfeln rechts. |
| Kampf | Karte links oben; Entscheidungen und Chat darunter als Tabs; Spieler und Würfel rechts mit viel Platz. |
| Erkundung | Karte mit zunächst 74 % Breitenanteil; Entscheidungen/Chat und Spieler/Würfel in zwei seitlichen Tab-Gruppen. |
| Benutzerdefiniert | Persönlicher, explizit gespeicherter Schnappschuss, einschließlich geschlossener Panels und Fensterpositionen. |

Die tatsächlichen Größen berücksichtigen Mindestgrößen. Sehr kleine Arbeitsbereiche können innerhalb der DM-Ansicht scrollen, anstatt Bedienelemente unbenutzbar zu verkleinern. Unter 700 px startet eine separate kompakte Anordnung mit allen Panels als Tabs. Desktop- und kompakte Anordnung werden getrennt gespeichert; beim Zurückwechseln bleibt das Desktoplayout erhalten. Frei angeordnete Fenster werden an die verfügbare Fläche angepasst.

## Zustand und Lebenszyklus

- Die existierenden fünf Panel-DOM-Elemente werden einmal übernommen und anschließend nur zwischen Layout-Hüllen bewegt. Die Panel-Inhalte werden nicht per HTML kopiert oder neu initialisiert.
- Geschlossene Panels bleiben in einem versteckten, mit dem Dokument verbundenen Bereich. Bestehende `getElementById`-Zugriffe und SSE-Aktualisierungen erreichen sie weiterhin.
- Karteninstanz, Zoom, Navigation, Event-Handler, Chatinhalt und Eingaben, Würfelauswahl und Spielzustandsvariablen bleiben innerhalb der geöffneten DM-Ansicht erhalten. Auch ein Vorlagenwechsel verändert keine Spiellogik.
- Spieleraktionen, Lebenspunkte, Zugsteuerung, Kartenmarker, Vollbildkarte mit ihren Werkzeugen, Tischansicht, Entscheidungen und Würfel verwenden weiterhin die vorhandenen Handler und API-Endpunkte.
- Die vorhandene Chatfunktion bleibt unverändert. Es wurde kein neuer Chat-Backend-Service eingeführt.
- Layoutänderungen öffnen keine neue SSE-Verbindung. Route-Cleanup beendet den Arbeitsbereich, temporäre Pointer-Listener, ResizeObserver und die bereits bestehende Live-Verbindung. Der Escape-Listener der Vollbildkarte wird nun ebenfalls entfernt.

Layout-Speicherung persistiert **nur die Darstellung**, keine Spielstände, Chatnachrichten oder Eingabeentwürfe. Deren Erhalt beim Neuladen folgt weiterhin dem bisherigen Verhalten der Anwendung. Während des Verschiebens oder Schließens bleiben sie erhalten.

## Speicherung und Fehlerbehandlung

Die Schlüssel lauten `dicekeeper.dm.workspace.v1.<playerId>.<desktop|compact>.<last|custom>`. Damit sind persönliche Anordnungen je Benutzer und Gerätegröße getrennt. Das Layout gilt kampagnenübergreifend für denselben Benutzer im selben Browser und Origin.

Gespeicherte Daten enthalten eine Versionsnummer, den Split-Baum, Tab-Gruppen und aktive Tabs, schwebende Fenster und ausgeblendete Panel-IDs. Die Validierung prüft bekannte Panels, genau ein Vorkommen jedes Panels, eindeutige Gruppen-IDs, aktive Tabs, begrenzte Baumtiefe, endliche Größen/Positionen und gültige Teilungsverhältnisse. Defekte, zu große oder veraltete Daten fallen auf ein gültiges Standardlayout zurück.

Ist localStorage gesperrt oder voll, bleibt die laufende Ansicht bedienbar und meldet die fehlende Speicherbarkeit. Während derselben Ansicht werden Desktop- und kompakte Anordnungen zusätzlich im Arbeitsspeicher gehalten.

## Neue und geänderte Dateien

| Datei | Änderung |
| --- | --- |
| `src/main/resources/META-INF/resources/app/views/GMView.js` | Bestehende DM-Ansicht an Arbeitsbereich anbinden; Cleanup ergänzen. Spielhandler bleiben erhalten. |
| `src/main/resources/META-INF/resources/app/components/dmWorkspace.js` | Toolbar, Tabs, Drag-Vorschau, Split-Größen, Fenster, Panel-Menüs, Lifecycle und DOM-Übernahme. |
| `src/main/resources/META-INF/resources/app/services/dmLayout.js` | Reines Layoutmodell, Vorlagen, Mindestgrößen, Verschieben/Entfernen und Speicherprüfung. |
| `src/main/resources/META-INF/resources/app/dmWorkspace.css` | Dunkelgrüne Layout-Hüllen, kompakte Titel, Griffe, Menüs, Vorschau und responsive Darstellung. |
| `src/main/resources/META-INF/resources/index.html` | Neue Layout-Styles einbinden. |
| `tests/js/dmLayout.test.js` | Vorlagen, 100 aufeinanderfolgende Verschiebungen, leere und schwebende Gruppen, defekte Speicherstände. |
| `tests/js/dmWorkspace.test.js` | Integration mit GMView: DOM-/Kartenidentität, Entwürfe, Zoom, Würfel- und HP-Handler, Live-Ereignisse, Fenster, Pointer-Vorschau, Abbruch und Größen, Benutzertrennung, mobile Umschaltung und Cleanup. |
| `tests/e2e/dm-workspace.spec.js` | Vier Browserabläufe für echte Geometrie, Dragging, Vorlagen, Eingaben, Live-Ereignisse, Speicherung, Fenster und mobile Ansicht. API und SSE werden kontrolliert simuliert. |
| `tests/e2e/fixtures/dm-workspace.html` | Testeinstieg für die unveränderte echte GMView; keine Panel-Demo. |
| `scripts/serve-client.mjs` | Portabler statischer Testserver mit Node statt einer zusätzlichen Python-Abhängigkeit. |
| `playwright.config.js` | Node-Testserver, optionale Browserkanal-Auswahl und optionaler serverloser Dateitransport für die neuen DM-Tests. |
| `docs/dm-workspace.md` | Diese Bedienungs- und Integrationsdokumentation. |

Es gibt keine neuen npm-Abhängigkeiten und keine Backend- oder Datenbankschemaänderungen.

## Verifikation

`npm run test:js`: **68 Tests in 11 Testdateien bestanden**, einschließlich aller vorherigen 46 Tests. Die GM-Integrationstests verwenden die echte GMView und Layoutmodule mit simulierten API-/Live-Diensten und einer instrumentierten Karteninstanz; jsdom prüft keine gerenderte Browsergeometrie.

Browserprüfung auf einem Rechner mit verfügbarem Playwright-Browser:

```powershell
npx playwright test tests/e2e/dm-workspace.spec.js
```

Optional mit installiertem Edge:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npx playwright test tests/e2e/dm-workspace.spec.js
```

Falls lokale Server nicht erlaubt sind, unterstützen ausschließlich die neuen DM-Tests alternativ `$env:PLAYWRIGHT_OFFLINE = '1'`: Testdateien werden dann direkt aus dem Repository an den Browser geliefert; API und SSE bleiben simuliert.

**Verbleibende Prüfgrenze in der aktuellen Arbeitsumgebung:** Lokale Socket-Zugriffe wurden verweigert. Auch beim serverlosen Versuch konnte Edge wegen Windows-Zugriffs-/IPC-Fehlern nicht starten (`80070005`, `TransactNamedPipe`). Die vier Browsertests sind daher noch nicht erfolgreich ausgeführt; ein visueller Test sowie ein Durchlauf mit echtem Backend und mehreren echten Spielern stehen aus. Es wird kein bestandener vollständiger End-to-End-Test behauptet.

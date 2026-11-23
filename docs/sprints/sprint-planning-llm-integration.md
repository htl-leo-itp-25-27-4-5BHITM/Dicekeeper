# Sprint Planning – LLM-Integration & Agent Skills

**Projekt:** Dicekeeper
**Datum:** 21.10.2026

## Sprint-Ziel

Dungeon Master können ein LLM (Claude und/oder ChatGPT) mit Dicekeeper verbinden – per Browser-Login mit der eigenen Subscription oder alternativ per API-Key – und mit der KI direkt prompten. Zusätzlich werden Agent Skills über eine `llm.txt` angeboten, mit denen sich D&D-Stories generieren lassen.

---

## User Stories

### US-1: Login mit LLM-Subscription (Browser-Login)

> **Als** Dungeon Master **möchte ich** mich mit meiner bestehenden LLM-Subscription anmelden können (Claude und/oder ChatGPT), **damit** ich die KI ohne eigenen API-Key nutzen kann.

**Akzeptanzkriterien**

- [ ] In den Settings gibt es die Option „Mit Claude anmelden" und „Mit ChatGPT anmelden"
- [ ] Der Login läuft über den Browser (OAuth-/Redirect-Flow des Anbieters)
- [ ] Nach erfolgreichem Login ist der Account in den Settings als „verbunden" sichtbar
- [ ] Die Verbindung kann wieder getrennt werden (Logout / Disconnect)
- [ ] Tokens werden sicher serverseitig gespeichert und nicht im Frontend ausgegeben

**Tasks**

- [ ] Recherche: Welche Login-Möglichkeiten bieten Anthropic und OpenAI für Drittanbieter-Apps?
- [ ] Browser-Login-Flow implementieren (Redirect, Callback, Token-Speicherung)
- [ ] Settings-UI: Anbieter verbinden / trennen, Status anzeigen
- [ ] Tests für Login- und Disconnect-Flow

---

### US-2: API-Key als Alternative

> **Als** Dungeon Master **möchte ich** in den Settings alternativ einfach meinen API-Key hinterlegen können, **damit** ich die KI auch ohne Browser-Login nutzen kann.

**Akzeptanzkriterien**

- [ ] In den Settings gibt es ein Feld für einen API-Key (pro Anbieter: Claude / ChatGPT)
- [ ] Der Key wird beim Speichern validiert (Test-Request)
- [ ] Der Key wird verschlüsselt gespeichert und danach nur maskiert angezeigt (z. B. `sk-…abcd`)
- [ ] Der Key kann geändert und gelöscht werden
- [ ] Ist sowohl Login als auch API-Key vorhanden, ist klar definiert, welcher verwendet wird

**Tasks**

- [ ] Settings-UI: Eingabefeld, Speichern, Löschen, maskierte Anzeige
- [ ] Backend: verschlüsselte Speicherung pro User
- [ ] Validierung des Keys gegen die jeweilige API
- [ ] Tests

---

### US-3: Mit der KI prompten

> **Als** Dungeon Master **möchte ich** direkt in Dicekeeper mit der KI prompten können, **damit** ich mir bei der Vorbereitung und während der Session helfen lassen kann.

**Akzeptanzkriterien**

- [ ] Es gibt eine Prompt-Eingabe (Chat-Ansicht) für den Dungeon Master
- [ ] Die Anfrage läuft über den verbundenen Account bzw. den hinterlegten API-Key
- [ ] Antworten werden angezeigt (idealerweise gestreamt)
- [ ] Ist kein LLM verbunden, erscheint ein Hinweis mit Link zu den Settings
- [ ] Fehler (ungültiger Key, Limit erreicht, Netzwerkfehler) werden verständlich angezeigt

**Tasks**

- [ ] Backend: einheitliche Schnittstelle für Claude und ChatGPT (Provider-Abstraktion)
- [ ] Frontend: Chat-/Prompt-Komponente
- [ ] Fehlerbehandlung & Hinweis bei fehlender Verbindung
- [ ] Tests

---

### US-4: Agent Skills über `llm.txt`

> **Als** Dungeon Master **möchte ich** auf der Startseite einen „Prompt for Agent Skills" finden, **mit dem** ich mir D&D-Stories generieren lassen kann.

**Akzeptanzkriterien**

- [ ] Dicekeeper stellt eine `llm.txt` bereit, in der die verfügbaren Skills beschrieben sind
- [ ] Auf der Startseite gibt es einen sichtbaren Bereich „Prompt for Agent Skills"
- [ ] Der Prompt kann mit einem Klick kopiert bzw. direkt verwendet werden
- [ ] Mit dem Prompt kann ein Agent (z. B. Claude, ChatGPT) D&D-Stories generieren
- [ ] Die `llm.txt` ist öffentlich unter einer festen URL erreichbar (z. B. `/llm.txt`)

**Tasks**

- [ ] Skills definieren (z. B. Story generieren, NPCs erstellen, Encounter planen)
- [ ] `llm.txt` erstellen und ausliefern
- [ ] Startseite: Bereich mit Prompt + Copy-Button
- [ ] Testen mit Claude und ChatGPT, ob die Skills korrekt erkannt werden

---

## Definition of Done

- [ ] Akzeptanzkriterien erfüllt
- [ ] Code reviewed und gemerged
- [ ] Tests geschrieben und grün
- [ ] Keine API-Keys oder Tokens im Code oder in Logs
- [ ] Feature im Sprint Review demonstrierbar

## Offene Fragen / Risiken

- Bieten Anthropic und OpenAI überhaupt einen offiziellen Login mit der Consumer-Subscription für Drittanbieter-Apps an? Falls nicht → API-Key als Hauptweg.
- Wer trägt die Kosten bei API-Key-Nutzung? (→ immer der User mit seinem eigenen Key)
- Welches Format soll die `llm.txt` genau haben (Orientierung am `llms.txt`-Standard)?
- Welche Skills sind für den ersten Sprint am wichtigsten?

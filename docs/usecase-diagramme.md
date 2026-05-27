# Dicekeeper - Use-Case-Diagramme

Diese Datei enthaelt zwei Use-Case-Diagramme fuer Dicekeeper:

- [Aktueller Stand](usecase-aktueller-stand.puml): Funktionen, die im Projekt aktuell umgesetzt bzw. im Code sichtbar sind.
- [Sollzustand 5. Klasse](usecase-sollzustand-5-klasse.puml): geplante Weiterentwicklung mit KI-Einbindung, Spracherkennung, Discord-Integration und staerkerer Automatisierung.

Die gerenderten SVG-Versionen liegen hier:

- [Aktueller Stand als SVG](usecase-aktueller-stand.svg)
- [Sollzustand 5. Klasse als SVG](usecase-sollzustand-5-klasse.svg)

![Use-Case-Diagramm aktueller Stand](usecase-aktueller-stand.svg)

![Use-Case-Diagramm Sollzustand 5. Klasse](usecase-sollzustand-5-klasse.svg)

## Aktueller Stand

```plantuml
@startuml
title Dicekeeper - Use-Case-Diagramm aktueller Stand
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false
skinparam actorStyle awesome

actor "Gast" as Guest
actor "Spieler" as Player
actor "Dungeon Master" as DM
actor "Tischbildschirm" as TableScreen
actor "Keycloak" as Keycloak <<extern>>

rectangle "Dicekeeper Web-App\naktueller Stand" {
  usecase "Einloggen /\nregistrieren" as UCLogin
  usecase "Profil und Avatar\nverwalten" as UCProfile
  usecase "Benachrichtigungen\nlesen" as UCNotifications

  usecase "Charakter erstellen\noder bearbeiten" as UCCharacter
  usecase "Ability Scores,\nKlasse und Background\nfestlegen" as UCCharacterDetails

  usecase "Kampagnen ansehen" as UCBrowseCampaigns
  usecase "Kampagne beitreten" as UCJoinCampaign
  usecase "Charakter fuer\nKampagne einreichen" as UCSubmitCharacter
  usecase "Kampagne verlassen" as UCLeaveCampaign

  usecase "Spieleransicht\nverwenden" as UCPlayerView
  usecase "Karte ansehen" as UCViewMap
  usecase "Charakterwerte und HP\nanzeigen" as UCViewCharacter
  usecase "Wuerfeln" as UCRollDice
  usecase "Bei Gruppen-\nentscheidungen abstimmen" as UCVote
  usecase "Notizen pflegen" as UCNotes

  usecase "Kampagne erstellen" as UCCreateCampaign
  usecase "Kampagne bearbeiten\noder loeschen" as UCEditCampaign
  usecase "Story, Sichtbarkeit\nund Spielerlimit pflegen" as UCManageCampaignData
  usecase "Karte hochladen\nund zuschneiden" as UCUploadMap
  usecase "Spieler verwalten" as UCManagePlayers
  usecase "Charaktere pruefen,\ngenehmigen oder ablehnen" as UCReviewCharacters
  usecase "Kampagne starten" as UCStartCampaign

  usecase "DM-Cockpit nutzen" as UCCockpit
  usecase "Spielsitzung leiten" as UCGMView
  usecase "Spielzug / Initiative\nsetzen" as UCTurn
  usecase "HP verwalten" as UCHP
  usecase "Kartenmarker und\nGruppen verwalten" as UCMarkers
  usecase "Fog of War\nverwalten" as UCFog
  usecase "Gruppenentscheidungen\nerstellen und abschliessen" as UCDecisions
  usecase "Wuerfelergebnis\nanzeigen oder setzen" as UCDMDice
  usecase "Tischansicht oeffnen" as UCOpenTable

  usecase "Tischansicht anzeigen" as UCTableView
  usecase "Spielstand in Echtzeit\nsynchronisieren" as UCRealtime
}

Guest --> UCLogin
Keycloak --> UCLogin

Player --> UCProfile
Player --> UCNotifications
Player --> UCCharacter
Player --> UCBrowseCampaigns
Player --> UCJoinCampaign
Player --> UCSubmitCharacter
Player --> UCLeaveCampaign
Player --> UCPlayerView

UCCharacter ..> UCCharacterDetails : <<include>>
UCPlayerView ..> UCViewMap : <<include>>
UCPlayerView ..> UCViewCharacter : <<include>>
UCPlayerView ..> UCRollDice : <<include>>
UCPlayerView ..> UCVote : <<include>>
UCPlayerView ..> UCNotes : <<include>>
UCPlayerView ..> UCRealtime : <<include>>

DM --> UCCreateCampaign
DM --> UCEditCampaign
DM --> UCManagePlayers
DM --> UCReviewCharacters
DM --> UCStartCampaign
DM --> UCCockpit
DM --> UCGMView
DM --> UCOpenTable

UCEditCampaign ..> UCManageCampaignData : <<include>>
UCEditCampaign ..> UCUploadMap : <<include>>
UCCockpit ..> UCReviewCharacters : <<include>>
UCCockpit ..> UCMarkers : <<include>>
UCGMView ..> UCTurn : <<include>>
UCGMView ..> UCHP : <<include>>
UCGMView ..> UCMarkers : <<include>>
UCGMView ..> UCFog : <<include>>
UCGMView ..> UCDecisions : <<include>>
UCGMView ..> UCDMDice : <<include>>
UCGMView ..> UCRealtime : <<include>>

TableScreen --> UCTableView
UCOpenTable ..> UCTableView : <<include>>
UCTableView ..> UCRealtime : <<include>>
UCTableView ..> UCFog : <<include>>

@enduml
```

## Sollzustand 5. Klasse

```plantuml
@startuml
title Dicekeeper - Use-Case-Diagramm Sollzustand 5. Klasse
left to right direction
skinparam packageStyle rectangle
skinparam shadowing false
skinparam actorStyle awesome

actor "Spieler" as Player
actor "Dungeon Master" as DM
actor "Tischbildschirm /\nOnline-Gruppe" as SharedView
actor "OpenAI API" as OpenAI <<extern>>
actor "Speech-to-Text\nService" as SpeechService <<extern>>
actor "Discord Server /\nDiscord Bot" as Discord <<extern>>
actor "Regelwerk-\nDatenbank" as Rules <<extern>>

rectangle "Dicekeeper Web-App\nSollzustand in der 5. Klasse" {
  usecase "Kampagne planen\nund vorbereiten" as UCPrepare
  usecase "Story, Questideen\nund Twists generieren" as UCStoryAI
  usecase "NPCs und Orte\nKI-gestuetzt erstellen" as UCNpcAI
  usecase "Begegnungen und\nBosskaempfe balancen" as UCBalanceAI
  usecase "Kampfszene\nverwalten" as UCCombat
  usecase "Initiative, HP,\nZustaende und Effekte\nautomatisieren" as UCCombatAutomation

  usecase "Regelfrage stellen" as UCRuleQuestion
  usecase "Regelstelle suchen\nund Antwort erklaeren" as UCRuleAnswer

  usecase "Sprachbefehle geben" as UCVoiceCommand
  usecase "Audio in Text\numwandeln" as UCTranscribe
  usecase "Befehl interpretieren\nund Aktion ausfuehren" as UCInterpretCommand

  usecase "Session online\nueber Discord spielen" as UCDiscordSession
  usecase "Discord-Kanal mit\nDicekeeper synchronisieren" as UCSyncDiscord
  usecase "Wuerfe und Spielstatus\nin Discord anzeigen" as UCDiscordStatus

  usecase "Spieleransicht mobil\noder am Tablet nutzen" as UCMobilePlayer
  usecase "Per Sprache wuerfeln\noder Aktion ansagen" as UCPlayerVoice
  usecase "Gruppenentscheidungen\ntreffen" as UCPlayerDecision
  usecase "Charakterbogen und\nKarte in Echtzeit nutzen" as UCPlayerRealtime

  usecase "Tisch- oder\nOnline-Uebersicht anzeigen" as UCSharedView
  usecase "Karte, Fog of War,\nInitiative und HP anzeigen" as UCSharedState

  usecase "Sitzung automatisch\nprotokollieren" as UCSessionLog
  usecase "Zusammenfassung und\nnaechste Schritte generieren" as UCSummaryAI
}

DM --> UCPrepare
DM --> UCCombat
DM --> UCRuleQuestion
DM --> UCVoiceCommand
DM --> UCDiscordSession
DM --> UCSessionLog

UCPrepare ..> UCStoryAI : <<include>>
UCPrepare ..> UCNpcAI : <<include>>
UCPrepare ..> UCBalanceAI : <<include>>
UCCombat ..> UCCombatAutomation : <<include>>
UCCombat ..> UCSharedView : <<include>>

UCRuleQuestion ..> UCRuleAnswer : <<include>>
UCVoiceCommand ..> UCTranscribe : <<include>>
UCVoiceCommand ..> UCInterpretCommand : <<include>>
UCInterpretCommand ..> UCCombat : <<extend>>
UCInterpretCommand ..> UCRuleQuestion : <<extend>>

UCDiscordSession ..> UCSyncDiscord : <<include>>
UCDiscordSession ..> UCDiscordStatus : <<include>>

UCSessionLog ..> UCTranscribe : <<include>>
UCSessionLog ..> UCSummaryAI : <<include>>

Player --> UCMobilePlayer
Player --> UCPlayerVoice
Player --> UCPlayerDecision
Player --> UCRuleQuestion

UCMobilePlayer ..> UCPlayerRealtime : <<include>>
UCPlayerVoice ..> UCTranscribe : <<include>>
UCPlayerVoice ..> UCInterpretCommand : <<include>>

SharedView --> UCSharedView
UCSharedView ..> UCSharedState : <<include>>

OpenAI --> UCStoryAI
OpenAI --> UCNpcAI
OpenAI --> UCBalanceAI
OpenAI --> UCRuleAnswer
OpenAI --> UCSummaryAI
SpeechService --> UCTranscribe
Discord --> UCSyncDiscord
Discord --> UCDiscordStatus
Rules --> UCRuleAnswer

@enduml
```

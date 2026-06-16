/**
 * Generated guide content for Dicekeeper.
 *
 * The guide is assembled from small feature descriptors that point to the real
 * routes, UI labels, API-backed workflows, and view files in the application.
 * Adding a new feature later should usually mean adding one descriptor here,
 * not rewriting the guide page.
 */

const routeSources = [
  {
    id: 'landing',
    title: 'Startseite',
    route: '/',
    source: 'views/LandingView.js',
    audience: ['new'],
    purpose: 'Zeigt, was Dicekeeper ist, und führt zur Anmeldung oder Registrierung.',
    labels: ['Kostenlos starten', 'Anmelden', 'Alles was du brauchst', 'So funktioniert’s'],
    capabilities: ['Produktüberblick', 'Login-Einstieg', 'Barrierefreie Farben']
  },
  {
    id: 'login',
    title: 'Account und Anmeldung',
    route: '/login',
    source: 'views/LoginView.js',
    audience: ['new'],
    purpose: 'Verbindet dich mit dem Keycloak-Login. Dort kannst du dich anmelden oder einen neuen Account registrieren.',
    labels: ['Login', 'Register', 'Keycloak'],
    capabilities: ['Account erstellen', 'Anmelden', 'Sitzung wiederherstellen']
  },
  {
    id: 'campaigns',
    title: 'Kampagnenübersicht',
    route: '/campaigns',
    source: 'views/CampaignsView.js',
    audience: ['dm', 'player'],
    purpose: 'Sammelt eigene Kampagnen, beigetretene Kampagnen und öffentliche Spiele an einem Ort.',
    labels: ['Deine Kampagne', '+', 'Öffentlich', 'Public', 'Logout'],
    capabilities: ['Eigene Kampagnen öffnen', 'Öffentliche Kampagnen finden', 'Kampagnen löschen', 'Neue Kampagne starten']
  },
  {
    id: 'campaign-create',
    title: 'Kampagne erstellen',
    route: '/campaign/new',
    source: 'views/CampaignCreateView.js',
    audience: ['dm'],
    purpose: 'Erstellt oder bearbeitet eine Kampagne mit Beschreibung, privater DM-Story, Karten und Sichtbarkeit.',
    labels: ['Titel', 'Max Spieler', 'Beschreibung', 'Story (nur für dich sichtbar)', 'Karte', 'Sichtbarkeit', 'Public', 'Private', 'Speichern'],
    capabilities: ['Titel und Beschreibung pflegen', 'Private DM-Notizen speichern', 'Bis zu 5 Karten hochladen', 'Öffentlich oder privat schalten', 'Maximale Spielerzahl setzen']
  },
  {
    id: 'campaign-detail',
    title: 'Kampagnendetails',
    route: '/campaign/:id',
    source: 'views/CampaignDetailView.js',
    audience: ['dm', 'player'],
    purpose: 'Zeigt Beschreibung, DM, Spieler, Karte und den passenden nächsten Schritt je nach Rolle.',
    labels: ['DM', 'Spieler', 'Max', 'Beigetretene Spieler', 'Kampagnenkarte'],
    capabilities: ['Kampagne ansehen', 'Öffentlicher Kampagne beitreten', 'Rollen erkennen', 'Zum Cockpit oder Spiel weitergehen']
  },
  {
    id: 'character-select',
    title: 'Charakter einer Kampagne zuweisen',
    route: '/campaign/:id/select-character',
    source: 'views/CharacterSelectView.js',
    audience: ['player'],
    purpose: 'Lässt Spieler einen vorhandenen Charakter wählen oder einen neuen Charakter für die Kampagne erstellen.',
    labels: ['Select Your Character', 'Your Characters', 'Create New Character', 'Submit Character'],
    capabilities: ['Vorhandenen Charakter auswählen', 'Neuen Charakter erstellen', 'Charakter zur DM-Prüfung einreichen']
  },
  {
    id: 'character-create',
    title: 'Charakter erstellen',
    route: '/character/create',
    source: 'views/CharacterCreateView.js',
    audience: ['player'],
    purpose: 'Führt durch einen mehrstufigen Charakter-Wizard.',
    labels: ['Basic Information', 'Choose Your Class', 'Choose Your Background', 'Assign Ability Scores', 'Create Character'],
    capabilities: ['Name, Volk und Ausrichtung setzen', 'Klasse wählen', 'Hintergrund und Backstory wählen', 'Ability Scores mit 27 Punkten verteilen', 'Charakter speichern']
  },
  {
    id: 'character-review',
    title: 'Charakterprüfung',
    route: '/campaign/:id/review/:cpId',
    source: 'views/CharacterReviewView.js',
    audience: ['dm'],
    purpose: 'Gibt dem DM die Kontrolle, eingereichte Charaktere zu genehmigen oder mit Notizen zurückzugeben.',
    labels: ['Approve', 'Reject', 'Add notes for the player'],
    capabilities: ['Charakterwerte prüfen', 'Charakter genehmigen', 'Änderungsnotizen senden', 'Spieler per Benachrichtigung informieren']
  },
  {
    id: 'cockpit',
    title: 'DM-Cockpit',
    route: '/campaign/:id/cockpit',
    source: 'views/CockpitView.js',
    audience: ['dm'],
    purpose: 'Bereitet die Sitzung vor, bevor eine Kampagne aktiv gestartet wird.',
    labels: ['Spielleiter', 'Story & Hintergrund', 'Spieler', 'Karte', 'Punkt hinzufügen', 'Kampagne starten', 'Tischansicht'],
    capabilities: ['Spielerstatus prüfen', 'Charaktere freigeben lassen', 'Kartenpunkte vorbereiten', 'Spieler entfernen', 'Tischansicht öffnen', 'Kampagne starten']
  },
  {
    id: 'gm',
    title: 'DM-Spielansicht',
    route: '/campaign/:id/gm',
    source: 'views/GMView.js',
    audience: ['dm'],
    purpose: 'Ist der Live-Spielleitertisch für Karten, Marker, Gruppenentscheidungen, Chat, Würfel und Runden.',
    labels: ['Gruppenentscheidungen', 'Dungeon Master Chat', 'Spieler', 'Würfel', 'Tischansicht', 'Zug beenden'],
    capabilities: ['Kartenmarker platzieren', 'Marker gruppieren und aufteilen', 'Fog of War steuern', 'HP verwalten', 'Nächsten Zug setzen', 'Würfeln oder manuelles Ergebnis setzen', 'Gruppenentscheidungen starten']
  },
  {
    id: 'player',
    title: 'Spieleransicht',
    route: '/campaign/:id/play',
    source: 'views/PlayerView.js',
    audience: ['player'],
    purpose: 'Ist der Live-Spieltisch für Spieler mit Karte, Charakterbogen, Würfeln, Gruppe und Notizen.',
    labels: ['Karte', 'Charakter', 'Würfel', 'Gruppe', 'Notizen', 'Abstimmungen', 'Am Zug'],
    capabilities: ['Karte und sichtbare Marker ansehen', 'Eigenen Charakter prüfen', 'Würfelwürfe senden', 'An Gruppenentscheidungen teilnehmen', 'Turn-Banner sehen', 'Private Notizen automatisch speichern']
  },
  {
    id: 'table',
    title: 'Tischansicht',
    route: '/campaign/:id/table',
    source: 'views/TableView.js',
    audience: ['dm', 'player'],
    purpose: 'Stellt eine große gemeinsame Kartenansicht bereit, zum Beispiel für einen zweiten Bildschirm.',
    labels: ['Tischansicht'],
    capabilities: ['Karte präsentieren', 'Live-Marker anzeigen', 'Gemeinsame Spielsituation teilen']
  },
  {
    id: 'profile',
    title: 'Profil',
    route: '/profile',
    source: 'views/ProfileView.js',
    audience: ['dm', 'player'],
    purpose: 'Verwaltet Namen, Avatar und Kontoeinstellungen.',
    labels: ['Profile', 'Avatar', 'Delete account'],
    capabilities: ['Profilbild hochladen', 'Namen bearbeiten', 'Account verwalten']
  },
  {
    id: 'notifications',
    title: 'Benachrichtigungen',
    route: 'header',
    source: 'components/header.js',
    audience: ['dm', 'player'],
    purpose: 'Hält Spieler und DMs über Charaktereinreichungen, Genehmigungen und Ablehnungen auf dem Laufenden.',
    labels: ['Notifications', 'Mark all as read'],
    capabilities: ['Ungelesene Nachrichten sehen', 'Direkt zum Review springen', 'Alle als gelesen markieren']
  }
];

const guideSections = [
  {
    id: 'overview',
    title: 'Was Dicekeeper macht',
    audience: 'all',
    sourceIds: ['landing', 'campaigns', 'gm', 'player', 'table'],
    summary: 'Dicekeeper ist ein digitaler Pen-and-Paper-Spieltisch. Du organisierst Kampagnen, erstellst Charaktere, prüfst Freigaben, spielst live auf Karten und teilst Würfel, Runden und Gruppenentscheidungen mit der Runde.'
  },
  {
    id: 'account',
    title: 'Account erstellen und anmelden',
    audience: 'new',
    sourceIds: ['landing', 'login', 'profile'],
    steps: [
      'Öffne die Startseite und wähle „Kostenlos starten“ oder „Anmelden“.',
      'Nutze den Keycloak-Dialog, um dich anzumelden oder einen neuen Account zu registrieren.',
      'Nach der Anmeldung legt Dicekeeper dein Spielerprofil an und bringt dich zur Kampagnenübersicht.',
      'Im Profil kannst du später Namen und Avatar pflegen.'
    ]
  },
  {
    id: 'join',
    title: 'Einer Kampagne beitreten',
    audience: 'player',
    sourceIds: ['campaigns', 'campaign-detail', 'character-select', 'character-create', 'notifications'],
    steps: [
      'Öffne „Öffentlich“ in der Kampagnenübersicht und wähle eine Kampagne aus.',
      'Tritt der Kampagne bei. Wenn du noch keinen passenden Charakter hast, wirst du zur Charakterauswahl geführt.',
      'Wähle einen vorhandenen Charakter oder erstelle einen neuen.',
      'Reiche den Charakter ein und warte auf die Freigabe des DM.',
      'Nach der Genehmigung öffnet sich die Kampagne über die Spieleransicht, sobald sie gestartet wurde.'
    ]
  },
  {
    id: 'create-campaign',
    title: 'Eine Kampagne erstellen',
    audience: 'dm',
    sourceIds: ['campaigns', 'campaign-create', 'campaign-detail', 'cockpit'],
    steps: [
      'Wähle in der Kampagnenübersicht den Plus-Button.',
      'Trage Titel, maximale Spielerzahl und eine öffentliche Beschreibung ein.',
      'Nutze „Story (nur für dich sichtbar)“ für private DM-Notizen.',
      'Lade optional bis zu fünf Karten hoch und wähle aus, welche Karte aktiv ist.',
      'Setze die Sichtbarkeit auf Public, wenn Spieler die Kampagne in der öffentlichen Liste finden sollen.',
      'Speichere die Kampagne und öffne danach Detailansicht oder Cockpit.'
    ]
  },
  {
    id: 'dm-manage',
    title: 'Als DM verwalten',
    audience: 'dm',
    sourceIds: ['campaign-detail', 'character-review', 'cockpit', 'notifications'],
    steps: [
      'Prüfe in der Kampagne oder im Cockpit, welche Spieler beigetreten sind.',
      'Öffne ausstehende Charaktere, kontrolliere Werte und Backstory und genehmige sie oder sende Notizen zurück.',
      'Entferne Spieler bei Bedarf aus der Kampagne.',
      'Bereite Kartenpunkte für Gebäude, Quests oder Checkpoints vor.',
      'Starte die Kampagne erst, wenn mindestens ein Spieler beigetreten ist und alle Charaktere genehmigt sind.'
    ]
  },
  {
    id: 'player-play',
    title: 'Als Spieler teilnehmen',
    audience: 'player',
    sourceIds: ['player', 'character-select', 'notifications'],
    steps: [
      'Öffne deine Kampagne aus „Deine Kampagne“.',
      'Sobald der DM gestartet hat und dein Charakter genehmigt ist, kommst du in die Spieleransicht.',
      'Nutze die Karte, um die gemeinsame Position und sichtbare Orte zu verfolgen.',
      'Wechsle mobil über die Tabs zwischen Karte, Charakter, Würfeln und Gruppe.',
      'Stimme bei Gruppenentscheidungen ab und achte auf das „Am Zug“-Banner.',
      'Halte persönliche Notizen fest; sie werden lokal automatisch gespeichert.'
    ]
  },
  {
    id: 'characters',
    title: 'Charaktermanagement',
    audience: 'all',
    sourceIds: ['character-create', 'character-select', 'character-review'],
    steps: [
      'Charaktere entstehen im Wizard: Grunddaten, Klasse, Hintergrund und Ability Scores.',
      'Ability Scores werden mit einem 27-Punkte-System verteilt.',
      'Für Kampagnen muss ein Charakter eingereicht und vom DM freigegeben werden.',
      'Lehnt der DM ab, erhält der Spieler Notizen und kann den Charakter überarbeiten.'
    ]
  },
  {
    id: 'live-tools',
    title: 'Würfel, Runden und aktive Kampagnen',
    audience: 'all',
    sourceIds: ['gm', 'player', 'table'],
    steps: [
      'Der DM startet die Kampagne im Cockpit und öffnet die DM-Spielansicht.',
      'DM und Spieler können Würfeltypen wie d4, d6, d8, d10, d12, d20 und d100 verwenden.',
      'Würfelergebnisse werden live an die Runde gesendet.',
      'Der DM verwaltet HP und setzt den aktiven Zug; Spieler sehen, wer gerade am Zug ist.',
      'Gruppenentscheidungen können erstellt, abgestimmt und aufgelöst werden.',
      'Die Tischansicht eignet sich als große Kartenansicht für einen gemeinsamen Bildschirm.'
    ]
  },
  {
    id: 'maps',
    title: 'Karten, Marker und Sichtbarkeit',
    audience: 'all',
    sourceIds: ['campaign-create', 'cockpit', 'gm', 'player', 'table'],
    steps: [
      'Karten werden beim Erstellen oder Bearbeiten einer Kampagne hochgeladen.',
      'Der DM kann eine aktive Karte auswählen und Marker für Spielergruppen, Orte, Quests und Checkpoints platzieren.',
      'In der DM-Spielansicht können Marker bewegt, gruppiert, aufgeteilt, gelöscht oder rückgängig gemacht werden.',
      'Spieler sehen die Karte und die für sie relevanten Marker in ihrer Spieleransicht.',
      'Fog of War und Live-Updates halten die geteilte Ansicht synchron.'
    ]
  }
];

function byId(id) {
  return routeSources.find(source => source.id === id);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildSection(section) {
  const sources = section.sourceIds.map(byId).filter(Boolean);
  return {
    ...section,
    sources,
    routes: unique(sources.map(source => source.route).filter(route => route !== 'header')),
    labels: unique(sources.flatMap(source => source.labels || [])).slice(0, 10),
    capabilities: unique(sources.flatMap(source => source.capabilities || [])).slice(0, 12)
  };
}

export function getGuideSections() {
  return guideSections.map(buildSection);
}

export function getLandingGuideSteps() {
  return ['account', 'create-campaign', 'characters', 'live-tools']
    .map(id => buildSection(guideSections.find(section => section.id === id)))
    .filter(Boolean)
    .map(section => ({
      id: section.id,
      title: section.title,
      summary: section.steps ? section.steps[0] : section.summary
    }));
}

export function getGuideStats() {
  const builtSections = getGuideSections();
  return {
    sections: guideSections.length,
    roles: 3,
    features: unique(builtSections.flatMap(section => section.capabilities || [])).length,
    steps: builtSections.reduce((count, section) => count + (section.steps ? section.steps.length : 1), 0)
  };
}

# campaign-content Specification

## Purpose

Defines durable DM-managed NPC, place, quest, and lore records within one campaign, including lifecycle, audience, references, persistence, archival, and safe deletion.

## ADDED Requirements

### Requirement: CNT-001 Campaign-owned content and authority
Every campaign-content record SHALL belong to exactly one existing campaign and SHALL have one of the supported kinds `NPC`, `PLACE`, `QUEST`, or `LORE`. Only the authenticated owner-DM of that campaign SHALL be able to create, update, archive, restore, or delete its content. Current campaign members MAY read only the member-visible projection defined by CNT-003; they MUST NOT mutate content. Guests, nonmembers, former members, display clients, and DMs of another campaign MUST NOT receive or mutate the record.

#### Scenario: DM creates supported campaign content
- **WHEN** the authenticated campaign DM submits a valid NPC, place, quest, or lore record for their campaign
- **THEN** the system creates one campaign-owned record and returns its DM-authorized representation

#### Scenario: Member attempts to create content
- **WHEN** an ordinary campaign member attempts to create, edit, archive, restore, or delete campaign content
- **THEN** the system denies the operation and changes no record

#### Scenario: DM targets another campaign
- **WHEN** a DM attempts to mutate content owned by a campaign they do not control
- **THEN** the system denies the operation and returns no private content

#### Scenario: Campaign is missing
- **WHEN** a content operation targets an unknown campaign identifier
- **THEN** the system returns a not-found outcome and creates or changes no content

### Requirement: CNT-002 Typed content fields and validation
Every content record SHALL have a server-assigned identifier, kind, nonblank trimmed name or title, optional descriptive text within a finite configured limit, audience, archival state, creation time, update time, and version. An NPC MAY contain descriptive traits and same-campaign relationship links. A place MAY contain descriptive details and an optional map reference owned by the same campaign. A quest SHALL additionally have progress `PLANNED`, `ACTIVE`, `COMPLETED`, or `FAILED`. Lore SHALL contain DM-authored factual or narrative text. The system MUST reject an unsupported kind, invalid progress value, missing required field, malformed value, or caller-supplied ownership, identifier, version, or timestamp without storing a partial record.

#### Scenario: DM creates a valid quest
- **WHEN** the DM submits a nonblank title, valid text, audience, and supported quest progress
- **THEN** the system stores one quest with server-derived identity, ownership, timestamps, and initial version

#### Scenario: Required content is invalid
- **WHEN** a name or title is blank after trimming, text exceeds the configured limit, or a quest progress value is unsupported
- **THEN** the system rejects the request and stores no partial content

#### Scenario: Caller supplies controlled fields
- **WHEN** a creation or update request supplies another campaign owner, record identifier, timestamp, or version outcome
- **THEN** the system derives those fields itself and does not honor the caller-supplied values

#### Scenario: Unsupported content kind is requested
- **WHEN** a caller attempts to create an item, loot record, inventory, or another unsupported content kind through this capability
- **THEN** the system rejects the request and does not represent deferred item or loot behavior as campaign content

### Requirement: CNT-003 DM-only and member-visible audiences
Every new content record SHALL default to audience `DM_ONLY`. The campaign DM SHALL be able to change the audience to `MEMBERS` or back to `DM_ONLY`. A current campaign member SHALL receive an active `MEMBERS` record only through that campaign's authorized content views; the member projection MUST omit DM-only notes, hidden relationships, unrevealed references, and content from another campaign. Archival or an audience change SHALL remove the record from later member reads without erasing historical event snapshots. Display clients SHALL receive no campaign-content record unless a later change explicitly adds an audience and projection for them.

#### Scenario: DM reads private content
- **WHEN** the campaign DM requests active or archived content for their campaign
- **THEN** the system returns the complete DM-authorized records, including DM-only fields

#### Scenario: Member reads revealed content
- **WHEN** a current member requests campaign content that is active and has audience `MEMBERS`
- **THEN** the system returns only the member-visible fields and references authorized for that member

#### Scenario: Member requests hidden or archived content
- **WHEN** a non-DM member requests a `DM_ONLY` or archived content record
- **THEN** the system returns no record or existence detail beyond the member's authorized projection

#### Scenario: DM hides previously revealed content
- **WHEN** the DM changes a record from `MEMBERS` to `DM_ONLY`
- **THEN** later member reads omit the record while the DM record and existing authorized history snapshots remain intact

#### Scenario: Display client requests campaign content
- **WHEN** the current table or display client requests NPC, place, quest, or lore data
- **THEN** the system returns no campaign-content data through this capability

### Requirement: CNT-004 Updates, quest progress, and concurrent edits
The campaign DM SHALL be able to replace editable content fields and valid same-campaign references while preserving record identity, campaign ownership, and creation time. A quest progress change SHALL use only the supported progress values and MUST NOT imply an encounter result, character advancement, reward, item transfer, or combat-rule outcome. Every accepted update SHALL advance the record version and update time. A stale update based on an older version MUST be rejected rather than silently overwriting a newer DM edit.

#### Scenario: DM updates a content record
- **WHEN** the DM submits a valid update based on the current record version
- **THEN** the system applies the complete update, advances the version and update time, and preserves identity and campaign ownership

#### Scenario: DM changes quest progress
- **WHEN** the DM changes a quest from `PLANNED` to `ACTIVE`, `COMPLETED`, or `FAILED`
- **THEN** the system stores the selected progress without creating a reward, item, advancement, or combat result

#### Scenario: Update contains an invalid field
- **WHEN** any submitted field or reference is invalid
- **THEN** the system rejects the entire update and preserves the prior record and version

#### Scenario: Two edits use the same old version
- **WHEN** one valid update has already advanced the record and a later request submits the previous version
- **THEN** the system rejects the stale request and returns or identifies the current version for reconciliation

### Requirement: CNT-005 Same-campaign references and stable history
Content relationships and optional references to campaign maps, sessions, encounters, members, or characters SHALL resolve only to records authorized within the same campaign. The system MUST reject a missing, unauthorized, wrong-kind, or cross-campaign target without changing either record. A durable session event that references content SHALL retain the content identifier plus the audience-safe name and kind observed when the event was recorded, so later archival or allowed metadata changes do not rewrite history.

#### Scenario: NPC links to a place in the same campaign
- **WHEN** the DM adds a valid relationship from an NPC to an active place owned by the same campaign
- **THEN** the system stores the typed relationship without copying or changing the place

#### Scenario: Content references another campaign
- **WHEN** a relationship or map, session, encounter, member, or character reference belongs to another campaign
- **THEN** the system rejects the operation and discloses no private target data

#### Scenario: Referenced content is renamed later
- **WHEN** a session event already contains an authorized snapshot of a content name and the DM later renames the record
- **THEN** current content reads show the new name while the immutable historical event retains its recorded snapshot

### Requirement: CNT-006 Archival and restoration
Archival SHALL be a reversible DM action that preserves the content identifier, fields, references, versions, and historical links while removing the record from active content lists and member projections. Restoring archived content SHALL require a valid current set of references and SHALL return it to active lists under its stored audience. Archival or restoration MUST NOT rewrite prior session events or create a quest completion, encounter outcome, or recap.

#### Scenario: DM archives active content
- **WHEN** the DM archives an active NPC, place, quest, or lore record
- **THEN** the system preserves the record durably, removes it from active lists, and keeps its historical references resolvable for the DM

#### Scenario: DM restores archived content
- **WHEN** the DM restores an archived record whose required references remain valid
- **THEN** the system returns it to the active collection under its stored audience and advances its version

#### Scenario: Restoration finds an invalid required reference
- **WHEN** restoration would reactivate a record whose required target no longer exists or belongs to the campaign
- **THEN** the system rejects restoration and leaves the record archived

### Requirement: CNT-007 Reference-safe deletion and campaign cleanup
Only the campaign DM SHALL be able to delete campaign content, and explicit destructive-action confirmation SHALL be required. A content record referenced by another active content record, a session, an encounter, or session event history MUST NOT be hard-deleted; the DM SHALL archive it or remove the live references first, while immutable event snapshots remain. An unreferenced record MAY be permanently deleted after confirmation. Campaign deletion SHALL remove all of its content and relationships together with the owning campaign, while failure of required persistent cleanup MUST NOT be reported as complete.

#### Scenario: DM deletes unreferenced content
- **WHEN** the DM confirms deletion of a content record that has no live or historical reference requiring its identity
- **THEN** the system permanently removes the record and its outbound relationships

#### Scenario: DM cancels content deletion
- **WHEN** the DM does not provide the required confirmation
- **THEN** the system preserves the record and all references

#### Scenario: Content remains referenced
- **WHEN** the DM attempts to delete content referenced by another content record, session, encounter, or event history
- **THEN** the system rejects hard deletion, preserves the references and history, and permits archival instead

#### Scenario: Campaign is deleted
- **WHEN** campaign deletion completes with required persistent cleanup
- **THEN** the system removes every campaign-content record and relationship owned by that campaign without affecting another campaign

### Requirement: CNT-008 Persistence and downstream-use boundary
Campaign content, versions, audiences, archival state, and relationships SHALL persist across browser, device, and application restart until allowed deletion or campaign deletion. A downstream recap or AI workflow MAY receive only an explicitly requested, authorization-filtered projection defined by its own accepted capability; campaign content MUST NOT be transmitted to an external provider merely because it exists. This capability SHALL NOT generate content, produce recaps, apply combat rules, manage items or loot, or change player-owned characters.

#### Scenario: Application restarts
- **WHEN** the application restarts while a campaign has active or archived content
- **THEN** the system restores the records, versions, audiences, archival states, and relationships from durable storage

#### Scenario: Future recap requests content inputs
- **WHEN** an authorized later recap workflow asks for session-linked content
- **THEN** this capability provides only the projection and audience permitted by that later contract and does not itself generate a recap

#### Scenario: External service is available
- **WHEN** an AI or other external provider is configured but no separately authorized workflow has selected campaign content
- **THEN** the system sends no campaign-content data to that provider

# Spec Delta

## Purpose

Defines campaign map collections, active-map selection, DM-owned markers and groups, fog visibility, per-map state, undo/reset, deletion, and the exploration-map boundary.

## ADDED Requirements

### Requirement: MAP-001 Campaign map collection and editor authority
A campaign MAY contain no maps and SHALL contain at most five maps. Only the authenticated campaign DM SHALL be able to add, select, or delete a campaign map, before or after campaign start. Map upload and storage SHALL follow `media-assets`. Campaign members and authorized display clients MAY view the active map presentation but MUST NOT mutate the map collection. Guests, public nonmembers, and unrelated authenticated users MUST NOT receive campaign-map data.

#### Scenario: DM adds maps below the limit
- **WHEN** the campaign DM uploads a valid map while the campaign has fewer than five maps
- **THEN** the system appends that map to the campaign collection and makes the new map active

#### Scenario: DM attempts a sixth map
- **WHEN** the campaign already contains five maps and the DM attempts another upload
- **THEN** the system rejects the upload, preserves all five maps and the current selection, and leaves no staged asset

#### Scenario: Campaign has no map
- **WHEN** an authorized campaign view opens a campaign whose map collection is empty
- **THEN** the system shows a no-map state and does not prevent campaign creation or start solely because a map is absent

#### Scenario: Non-DM attempts collection mutation
- **WHEN** a campaign member, nonmember, display client, or guest attempts to add, select, or delete a campaign map
- **THEN** the system denies the operation and leaves the collection and active map unchanged

### Requirement: MAP-002 Active-map selection and per-map state
When a campaign contains maps, exactly one map SHALL be active. A DM selection SHALL use an existing map identifier or index and SHALL become observable to authorized campaign views. Markers, groups, fog exploration, and map-edit undo history SHALL be anchored to the individual map rather than shared across the campaign. Switching maps SHALL restore the selected map's own state without copying, discarding, or exposing state from another map.

#### Scenario: DM switches to another stored map
- **WHEN** the campaign DM selects a different map in the collection
- **THEN** the system makes it active and returns that map with only its own markers, groups, fog exploration, and undo state

#### Scenario: Member observes a map switch
- **WHEN** the active map changes and an authorized member next reads the campaign-map state
- **THEN** the member receives the newly active map's authorized presentation and not the prior map's state

#### Scenario: DM switches back to a prior map
- **WHEN** the DM returns to a map that has existing marker and fog state
- **THEN** the system restores that map's state as it was last committed within the current live-state lifetime

#### Scenario: Selection is invalid
- **WHEN** the DM selects a missing map or an index outside the current collection
- **THEN** the system rejects the selection and preserves the current active map and every map's state

### Requirement: MAP-003 Marker creation, movement, and deletion
Only the campaign DM SHALL be able to create, move, relabel, or delete markers on the active map. Supported marker kinds SHALL be player, player group, structure, quest, and checkpoint. Every marker SHALL have a unique identifier within its map and normalized finite coordinates from 0 through 1. Player markers SHALL reference current campaign players, and non-player labels SHALL contain 1 to 40 characters after trimming. Each successful mutation SHALL affect only the active map and SHALL create one undoable state; invalid or unauthorized mutations MUST change nothing and MUST NOT create undo history.

#### Scenario: DM adds a valid location marker
- **WHEN** the DM adds a structure, quest, or checkpoint marker with a valid label and coordinates on the active map
- **THEN** the system creates one uniquely identified marker on that map and records the prior state for undo

#### Scenario: DM moves an existing marker
- **WHEN** the DM moves a marker on the active map to valid normalized coordinates
- **THEN** the system updates that marker on the same map and records the prior position for undo

#### Scenario: DM deletes an existing marker
- **WHEN** the DM deletes a marker that exists on the active map
- **THEN** the system removes that marker and records the prior map state for undo

#### Scenario: Marker input is invalid
- **WHEN** a marker has an unsupported kind, non-finite or out-of-range coordinates, an invalid label, a duplicate identifier, or a player reference outside the campaign
- **THEN** the system rejects the whole mutation and preserves marker state and undo history

#### Scenario: Member attempts marker mutation
- **WHEN** a non-DM member attempts to create, move, relabel, or delete a marker
- **THEN** the system denies the operation while preserving the member's read-only map view

#### Scenario: No active map exists
- **WHEN** the DM attempts a marker operation while the campaign has no active map
- **THEN** the system rejects the operation and creates no campaign-global marker

### Requirement: MAP-004 Player marker grouping and splitting
Only the campaign DM SHALL be able to group or split markers. Grouping SHALL require at least two existing player or player-group markers on the active map and SHALL preserve each referenced current player exactly once in the resulting group. Splitting SHALL operate on one existing player-group marker and a nonempty valid subset of its players, preserving every player either in the remaining marker or the new split result. Location markers MUST NOT be grouped, and invalid input MUST leave all markers and undo history unchanged.

#### Scenario: DM groups player markers
- **WHEN** the DM groups at least two valid player or player-group markers on the active map
- **THEN** the system replaces them with one group marker containing every referenced player exactly once and records one undoable state

#### Scenario: DM splits part of a player group
- **WHEN** the DM selects one group and a nonempty subset of players belonging to it
- **THEN** the system creates valid marker results for the split and remainder without losing or duplicating a player and records one undoable state

#### Scenario: DM attempts to group a location marker
- **WHEN** a grouping request includes a structure, quest, checkpoint, missing marker, or marker from another map
- **THEN** the system rejects the whole operation and leaves all markers and undo history unchanged

#### Scenario: Split membership is invalid
- **WHEN** a split names no player or names a player not present in the selected group
- **THEN** the system rejects the split and preserves the original group

### Requirement: MAP-005 Fog authority and hidden-map presentation
Fog of War SHALL be scoped to each map and controlled only by the campaign DM. During started play, movement of DM-controlled player or player-group markers MAY reveal areas and accumulate exploration memory for that active map; ordinary members and display clients SHALL be read-only consumers and MUST NOT write or broaden exploration. When fog is enabled, non-DM presentations MUST NOT expose hidden map areas through original or derived media paths, client payloads, alternate map indices, or global upload listing. The DM SHALL retain an unfogged editor view.

#### Scenario: DM reveals an area through player movement
- **WHEN** the campaign is started and the DM moves a player or player-group marker on the active fog-enabled map
- **THEN** the system adds the resulting revealed area to that map's exploration memory and makes the fogged presentation observable to authorized viewers

#### Scenario: Member or display client writes fog data
- **WHEN** a non-DM member or display client attempts to save, clear, replace, or broaden fog exploration
- **THEN** the system denies the mutation and preserves the DM-controlled fog state

#### Scenario: Member views a fog-enabled map
- **WHEN** an authorized non-DM viewer requests the active map while fog is enabled
- **THEN** the system provides the fog-respecting presentation and no usable raw-media path or hidden-area payload

#### Scenario: DM views the map editor
- **WHEN** the authenticated campaign DM opens the active map editor
- **THEN** the system provides the complete map and the controls required to manage markers and fog

#### Scenario: Campaign is not started
- **WHEN** the DM arranges markers before campaign start
- **THEN** the system preserves marker changes without accumulating explored fog merely from setup movement

### Requirement: MAP-006 Map undo, fog reset, and local viewport reset
The campaign DM SHALL be able to undo the most recent successful marker, grouping, or fog mutation on the active map, up to the most recent 20 retained map-edit states for that map. Undo SHALL restore both markers and fog to the selected prior state and SHALL NOT affect another map or non-map live state. The DM SHALL be able to explicitly reset the active map's fog exploration after confirmation while preserving the map asset and markers. A viewer's pan, zoom, or viewport reset SHALL remain local and MUST NOT mutate shared markers, fog, selection, or undo history.

#### Scenario: DM undoes the latest map mutation
- **WHEN** the active map has retained undo history and the DM requests undo
- **THEN** the system restores the immediately preceding markers and fog for that map only

#### Scenario: No undo state is available
- **WHEN** the active map has no retained prior state and the DM requests undo
- **THEN** the system reports that nothing can be undone and changes no shared state

#### Scenario: Undo history exceeds the retained limit
- **WHEN** more than 20 successful map mutations have occurred on one map
- **THEN** the system retains the latest 20 prior states and no longer promises restoration of older states

#### Scenario: DM confirms fog reset
- **WHEN** the DM explicitly confirms reset of the active map's exploration
- **THEN** the system returns that map's fog to fully hidden, preserves its asset and markers, and records the prior fog for undo

#### Scenario: DM cancels fog reset
- **WHEN** the DM does not confirm the destructive fog reset
- **THEN** the system preserves the current exploration and undo history

#### Scenario: Viewer resets pan or zoom
- **WHEN** a DM, member, or display client resets their local map viewport
- **THEN** only that client's pan and zoom return to default and no shared map state changes

### Requirement: MAP-007 Map deletion and active-map recovery
Only the campaign DM SHALL be able to delete a map, and explicit confirmation SHALL be required. Successful deletion SHALL remove that map's media through `media-assets`, discard only that map's markers, fog, and undo history, and preserve every surviving map and its state. If the deleted map was active, the map formerly following it SHALL become active when one exists; otherwise the last surviving map SHALL become active. Deleting the final map SHALL leave no active map. The operation MUST NOT be reported complete when required persistent media cleanup fails.

#### Scenario: DM deletes an inactive map
- **WHEN** the DM confirms deletion of a map that is not active and cleanup succeeds
- **THEN** the system removes that map and its state while preserving the active selection and all surviving map state

#### Scenario: DM deletes the active map
- **WHEN** the DM confirms deletion of the active map and another map survives
- **THEN** the system selects the next map at that position when available or otherwise the last surviving map and returns its own state

#### Scenario: DM deletes the final map
- **WHEN** the DM confirms deletion of the campaign's only map and cleanup succeeds
- **THEN** the campaign has no active map, markers, fog, or undo state for that deleted map

#### Scenario: Map cleanup fails
- **WHEN** required removal of the map asset fails
- **THEN** the system reports an incomplete outcome or durable cleanup obligation and does not claim complete deletion

#### Scenario: Unauthorized caller attempts map deletion
- **WHEN** a non-DM member, display client, nonmember, or guest attempts to delete a map
- **THEN** the system denies deletion and preserves the map, its state, and the active selection

### Requirement: MAP-008 Exploration-map scope boundary
The current `campaign-maps` capability SHALL provide static campaign maps, normalized point markers, player grouping, fog exploration, switching, and presentation. It SHALL NOT claim grid movement, measured distance, terrain or collision rules, line-of-sight calculation, initiative-linked movement, automated combat areas, or other tactical-rule enforcement. Such behavior belongs to separately accepted future combat scope.

#### Scenario: DM uses a map for campaign exploration
- **WHEN** the DM places location and player markers and manages fog on a campaign map
- **THEN** the system supports those presentation and exploration actions without applying unstated tabletop rules

#### Scenario: Caller requests tactical enforcement
- **WHEN** a caller asks the current map capability to validate movement distance, terrain, line of sight, or combat-area rules
- **THEN** the system does not claim that behavior is supported by the current baseline


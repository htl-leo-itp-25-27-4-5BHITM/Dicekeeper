# media-assets Specification

## Purpose

Defines validated avatar and campaign-map uploads, ownership-scoped original and derived delivery, processing fallback, atomic replacement, and complete asset cleanup.

## Requirements

### Requirement: MED-001 Media ownership and mutation authority
Every uploaded media asset SHALL belong to exactly one owning resource: either one player profile avatar or one campaign map. Only the authenticated player may upload or replace their own avatar, and only the authenticated campaign DM may upload or delete maps for that campaign. An accepted upload SHALL create an opaque asset reference controlled by the owning resource; a caller MUST NOT assign an arbitrary server path or attach another resource's asset by submitting a reference directly.

#### Scenario: Player uploads an avatar for their own profile
- **WHEN** an authenticated player submits a valid avatar for their own profile
- **THEN** the system stores it as an asset owned by that profile and updates the profile only through the avatar operation

#### Scenario: DM uploads a campaign map
- **WHEN** the authenticated campaign DM submits a valid map while that campaign can accept another map
- **THEN** the system stores it as an asset owned by that campaign and returns the updated authorized map collection

#### Scenario: Caller targets another resource
- **WHEN** a player attempts to upload, replace, or delete an avatar or map owned by another player or campaign
- **THEN** the system denies the operation and leaves both the owning resource and stored assets unchanged

#### Scenario: Caller supplies an asset path directly
- **WHEN** a profile or campaign update includes a caller-chosen upload path or an asset reference owned by another resource
- **THEN** the system rejects or ignores that field and does not change media ownership

### Requirement: MED-002 Server-side image validation
Dicekeeper SHALL accept avatar and map uploads only when the body is present, the decoded content is a nonempty JPEG or PNG image, the declared media type and file extension agree with the decoded format, the image has positive dimensions, and the upload is within the finite configured byte limit. The system SHALL perform these checks on the server before making the asset reachable or changing an owning resource. SVG, executable content, path-like filenames, malformed images, and files exceeding the configured limit MUST be rejected regardless of browser-side checks.

#### Scenario: Valid JPEG or PNG is uploaded
- **WHEN** an authorized caller submits a nonempty, decodable JPEG or PNG within the configured limit
- **THEN** the system accepts the image validation and continues the owning avatar or map operation

#### Scenario: Filename disguises non-image content
- **WHEN** an uploaded body has a permitted extension but its decoded content is not the matching JPEG or PNG format
- **THEN** the system rejects the upload and creates no reachable asset or resource reference

#### Scenario: Unsupported or active format is uploaded
- **WHEN** a caller submits SVG, executable, or another unsupported media format
- **THEN** the system rejects the upload without storing it as an avatar or map

#### Scenario: Upload is missing, empty, oversized, or has invalid dimensions
- **WHEN** the upload has no body, no decodable pixels, nonpositive dimensions, or exceeds the configured byte limit
- **THEN** the system reports the validation failure and leaves the owning resource unchanged

#### Scenario: Browser-side validation is bypassed
- **WHEN** a caller sends an upload directly without using the browser crop or file picker
- **THEN** the server applies the same authoritative validation and does not rely on the client result

### Requirement: MED-003 Map cropping and atomic upload outcomes
The campaign-map workflow SHALL allow the DM to preview and crop a supported image before upload, including square, wide, and custom positive aspect ratios; it SHALL NOT impose an additional fixed aspect-ratio contract. Canceling crop SHALL upload nothing. A successful upload SHALL make the complete validated image and its resource reference visible as one outcome. A failed validation, crop conversion, storage, or resource update SHALL leave the prior resource state intact and SHALL remove any newly staged file that is not referenced.

#### Scenario: DM confirms a custom crop
- **WHEN** the campaign DM confirms a positive rectangular crop within a valid source image
- **THEN** the system uploads the cropped JPEG or PNG result and preserves that crop as the map asset

#### Scenario: DM cancels cropping
- **WHEN** the campaign DM cancels the crop workflow before upload
- **THEN** the system creates no map asset and does not change the campaign's map collection or selection

#### Scenario: Upload fails before the resource update
- **WHEN** image conversion or persistent storage fails before the avatar or map reference is committed
- **THEN** the system reports failure, leaves the prior resource reference unchanged, and removes any unreferenced staged output

#### Scenario: Resource update fails after staging
- **WHEN** a valid image was staged but its owning profile or campaign cannot be updated
- **THEN** the system reports failure, preserves the previous resource state, and cleans up the unreferenced staged image

### Requirement: MED-004 Authorization-aware media delivery
Original and derived media delivery SHALL enforce the same authorization and visibility as the owning resource on every request. An avatar SHALL be available only to its owner or through an authorized contextual public player summary. A campaign-map original SHALL be available only to the campaign DM; non-DM members and an authorized display client SHALL receive only the map presentation permitted by `campaign-maps`, including its fog boundary. Public campaign previews, unrelated authenticated users, and guests MUST NOT receive campaign-map content or a usable original or derived URL. Dicekeeper MUST NOT expose a general upload inventory to ordinary application callers.

#### Scenario: Authorized workflow requests an avatar
- **WHEN** a player profile owner or authorized shared workflow requests that profile's current avatar
- **THEN** the system returns the avatar or an authorized derived variant without exposing other uploads

#### Scenario: Campaign DM requests an original map
- **WHEN** the authenticated campaign DM requests an original map owned by their campaign
- **THEN** the system returns that original without disclosing assets from another campaign

#### Scenario: Member views a campaign map
- **WHEN** a non-DM member requests the active campaign map through an authorized campaign view
- **THEN** the system returns only the presentation authorized by `campaign-maps` and does not disclose a reusable original-map path that bypasses fog

#### Scenario: Public nonmember requests a map URL
- **WHEN** an authenticated nonmember who can see a public campaign preview requests that campaign's original or derived map
- **THEN** the system denies the media request and returns no map content or storage-path detail

#### Scenario: Guest requests an upload or upload inventory
- **WHEN** a guest requests an avatar, map, transformed image, or list of stored uploads without an authorized resource context
- **THEN** the system returns no media content or inventory

#### Scenario: Asset reference is stale or unknown
- **WHEN** an authorized view references an asset that is missing or no longer owned by that resource
- **THEN** the system reports the asset unavailable without resolving a different file or revealing storage details

### Requirement: MED-005 Derived-image processing and safe fallback
Dicekeeper SHALL permit an authorized caller to request bounded derived variants of a supported original for display size, quality, and supported output format. Authorization SHALL be checked before issuing or serving a signed transformation, and a transformation URL MUST NOT broaden the original's audience. If derived processing is unavailable or a derived image fails to load, the client SHALL fall back only to the same caller's authorized original; if that original is unavailable or unauthorized, the system SHALL show an unavailable or placeholder outcome rather than another asset.

#### Scenario: Authorized derived image succeeds
- **WHEN** an authorized view requests a supported bounded transformation of an available original
- **THEN** the system returns or redirects to the derived representation without changing the original asset

#### Scenario: Transformation parameters are invalid
- **WHEN** a caller requests unsupported output format, quality, dimensions, or source path
- **THEN** the system rejects or safely bounds the request and does not read an arbitrary file

#### Scenario: Image processor is unavailable
- **WHEN** derived-image signing or processing is unavailable for an otherwise authorized original
- **THEN** the view uses that authorized original as its fallback and does not make the resource mutation fail

#### Scenario: Unauthorized caller requests a signed variant
- **WHEN** a caller lacks access to the owning profile or campaign presentation
- **THEN** the system issues no usable transformation and returns no original or derived content

#### Scenario: Both derived and original media are unavailable
- **WHEN** an authorized view cannot load either representation
- **THEN** the system displays an unavailable or placeholder state and does not substitute unrelated media

### Requirement: MED-006 Atomic avatar replacement
Avatar replacement SHALL preserve the current avatar until the new image has passed validation, been stored, and the profile reference has been committed. After that commit, the prior avatar SHALL no longer be served through the profile and SHALL be cleaned up. Failure before commit MUST leave the prior avatar usable; cleanup failure after commit SHALL be recorded for retry and MUST NOT expose the old avatar through the profile.

#### Scenario: Avatar replacement succeeds
- **WHEN** a player replaces their current avatar with a valid image and the profile update commits
- **THEN** the profile references the new asset and the prior asset is removed or queued for guaranteed cleanup

#### Scenario: New avatar storage fails
- **WHEN** validation or storage of the replacement fails before the profile update commits
- **THEN** the system reports failure and preserves the current avatar and profile reference

#### Scenario: Old avatar cleanup fails after replacement
- **WHEN** the new avatar is committed but deletion of the old asset fails
- **THEN** the system records the stale asset for retry, continues to serve only the new avatar through the profile, and does not report the cleanup obligation as completed

### Requirement: MED-007 Asset deletion and dependent cleanup
Deleting a map, campaign, avatar, or account SHALL remove each owned original asset, invalidate or remove its derived variants, and remove every resource reference to it. A shared or unrelated resource MUST NOT be deleted. Persistent cleanup failure SHALL produce an incomplete outcome or durable retry obligation; the system MUST NOT silently report complete destructive cleanup while an owned original remains reachable. Repeating cleanup for an already absent owned file SHALL be safe.

#### Scenario: DM deletes one campaign map
- **WHEN** the campaign DM confirms deletion of a stored map and cleanup succeeds
- **THEN** the system removes that map's original and variants and clears its campaign and map-state references while preserving other maps

#### Scenario: Campaign or account deletion owns assets
- **WHEN** campaign or account cleanup removes resources with maps or an avatar
- **THEN** the system cleans every asset owned by those resources through this contract and preserves other players' and campaigns' assets

#### Scenario: Required original-file cleanup fails
- **WHEN** a destructive workflow cannot remove an owned original asset
- **THEN** the system reports incomplete cleanup or records a durable retry obligation and prevents ordinary authorized delivery of the deleted resource

#### Scenario: Cleanup is retried after the file is already absent
- **WHEN** cleanup retries an asset whose resource reference exists in the obligation but whose file is already absent
- **THEN** the system treats that file step as complete without deleting another path

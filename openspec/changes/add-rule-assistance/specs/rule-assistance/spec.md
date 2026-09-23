# Spec Delta

## Purpose

Defines authenticated D&D 5e (2024) rule questions answered only from a licensed, version-pinned SRD corpus with verifiable citations, explicit uncertainty handling, and no gameplay-state mutation.

## ADDED Requirements

### Requirement: RUL-001 Authenticated rule-question scope
An authenticated Dicekeeper player SHALL be able to submit a plain-text rule question in English or German about D&D 5e (2024). Campaign DM or member status MUST NOT broaden the available corpus or answer authority, and no campaign membership or active session SHALL be required merely to ask a question. Guests MUST NOT use the rule-assistance service. The supported workflow SHALL explain source-backed rules only and MUST NOT make a campaign ruling, select a character option, or execute an action.

#### Scenario: Authenticated player asks an English rule question
- **WHEN** an authenticated player submits a nonblank English question about D&D 5e (2024)
- **THEN** the system evaluates it only against the approved rule corpus and returns one of the explicit answer outcomes defined by this capability

#### Scenario: Authenticated player asks a German rule question
- **WHEN** an authenticated player submits a nonblank German question about D&D 5e (2024)
- **THEN** the system evaluates it against the same approved rules profile and uses the official German companion where the evidence supports that language

#### Scenario: Guest asks a rule question
- **WHEN** an unauthenticated guest submits a rule question
- **THEN** the system denies the request, returns no protected service result, and requires authentication

#### Scenario: Campaign role is supplied with a question
- **WHEN** a caller identifies themselves as a campaign DM or player while asking a rule question
- **THEN** the system derives identity from authentication and does not use the claimed role to change source scope or answer authority

#### Scenario: Caller asks for a ruling or action
- **WHEN** a caller asks the service to choose a DM ruling, select a character option, or execute a gameplay action
- **THEN** the system may explain directly supported rule text but makes no ruling, choice, or product-state mutation

### Requirement: RUL-002 Licensed and version-pinned corpus
Rule assistance SHALL use only immutable copies of the official English and German System Reference Document 5.2.1 documents for the `DND_5E_2024` rules profile. Each corpus source SHALL retain a stable source identifier, language, exact version, official source URL, publication date, CC BY 4.0 license metadata, publisher attribution, content checksum, and retrieval date. D&D Beyond Basic Rules, non-SRD rulebooks, SRD 5.1 or other editions, user-uploaded rules, web-search results, and generated text MUST NOT enter the authoritative corpus. A future SRD or corrected source SHALL require an explicit reviewed corpus version before it can answer requests and MUST NOT silently replace stored source meaning.

#### Scenario: Approved corpus is available
- **WHEN** the English and German SRD 5.2.1 sources match their approved manifest and checksums
- **THEN** the system indexes and identifies them as the only authoritative `DND_5E_2024` rule-assistance corpus

#### Scenario: Corpus file is missing or changed
- **WHEN** a required corpus file is missing, has an unexpected checksum, or cannot be tied to its manifest
- **THEN** the system marks the affected corpus unavailable and does not answer from that file

#### Scenario: D&D Beyond Basic Rules are reachable
- **WHEN** the product or an external provider can access the D&D Beyond Basic Rules
- **THEN** the system does not ingest, quote, or treat that non-CC source as part of the rule-assistance corpus

#### Scenario: Non-SRD book or web result is found
- **WHEN** a rule term appears in a source outside the approved SRD 5.2.1 documents
- **THEN** the system excludes that source and does not use its content to complete an answer

#### Scenario: A new SRD version is published
- **WHEN** an SRD version newer than 5.2.1 becomes available
- **THEN** the active corpus remains 5.2.1 until a separately reviewed manifest, compatibility decision, index, and acceptance suite authorize the new version

### Requirement: RUL-003 Evidence-grounded rule explanations
Every substantive rule claim in an answer SHALL be directly supported by one or more retrieved passages from the approved corpus. The system SHALL distinguish a concise paraphrased explanation from the cited source text, SHALL preserve the rules profile and source version in the result, and MUST NOT treat generated prose, model memory, a confidence score, application code, campaign lore, or prior AI output as rule authority. If a claim cannot be paired with sufficient source evidence, that claim MUST NOT be presented as a rule answer.

#### Scenario: Corpus directly answers the question
- **WHEN** the approved corpus contains sufficient passages that directly support the requested explanation
- **THEN** the system returns a concise explanation whose substantive claims each reference those passages

#### Scenario: Answer needs more than one passage
- **WHEN** a complete answer depends on rules found under multiple headings or pages
- **THEN** the system retrieves and cites every required passage rather than attributing the combined explanation to only one source location

#### Scenario: Generated draft adds an unsupported detail
- **WHEN** an explanation draft contains a rule, exception, example, or conclusion not supported by its retrieved passages
- **THEN** the system removes or rejects that claim and does not expose it as authoritative rule content

#### Scenario: Prior AI content states a rule
- **WHEN** campaign-assistance, recap, chat, or other generated prose contains a purported rule statement
- **THEN** the system ignores that statement as evidence and answers only from the approved SRD corpus

#### Scenario: Application behavior differs from the corpus
- **WHEN** current or future application behavior does not match a retrieved SRD rule
- **THEN** rule assistance explains the cited corpus without declaring the application behavior authoritative or mutating it

### Requirement: RUL-004 Claim-level citations and attribution
Each answered claim SHALL carry a citation containing the source identifier, `SRD 5.2.1` version, source language, complete heading path, printed document page, and official source link. The result SHALL identify the `DND_5E_2024` profile and whether its prose is a paraphrase or source excerpt. Dicekeeper SHALL display the exact publisher-supplied SRD 5.2.1 attribution and a CC BY 4.0 license link in an accessible attribution location, and SHALL indicate when Dicekeeper has paraphrased, reformatted, indexed, or otherwise adapted source material. A citation with missing or inconsistent version, heading, page, language, or source provenance MUST NOT support an answered claim.

#### Scenario: German explanation cites the German source
- **WHEN** a supported German answer uses the official localized passage
- **THEN** each claim cites `SRD 5.2.1`, German language, the German heading path, printed page, stable source identifier, and official source link

#### Scenario: English explanation cites the English source
- **WHEN** a supported English answer uses the English semantic source
- **THEN** each claim cites `SRD 5.2.1`, English language, the English heading path, printed page, stable source identifier, and official source link

#### Scenario: Explanation uses multiple source locations
- **WHEN** one explanation combines claims from different SRD sections
- **THEN** each claim or clearly grouped set of claims carries all source locations needed to verify it

#### Scenario: Attribution information is opened
- **WHEN** a user opens the rule-assistance attribution information
- **THEN** the system shows the publisher-required SRD 5.2.1 attribution, official SRD link, CC BY 4.0 link, and Dicekeeper's indication of adaptations without implying Wizards endorsement

#### Scenario: Citation metadata is incomplete
- **WHEN** retrieved text lacks a verified heading path, printed page, language, version, or approved source identity
- **THEN** the system does not use that text to support an answered claim

### Requirement: RUL-005 Missing, ambiguous, and uncertain evidence
Rule assistance SHALL return an explicit non-answer when the approved corpus contains no sufficient evidence. An ambiguous question SHALL produce a focused clarification request without a speculative answer. A partially supported multi-part question SHALL identify the supported and unsupported parts separately, and each supported part SHALL still satisfy the citation requirements. Retrieval score, model confidence, common play practice, or likely intent MUST NOT substitute for source evidence.

#### Scenario: Rule is absent from the corpus
- **WHEN** the approved SRD 5.2.1 corpus contains no passage sufficient to answer the question
- **THEN** the system reports that the answer is not available from the licensed corpus and provides no guessed rule

#### Scenario: Question has multiple plausible meanings
- **WHEN** the question is too ambiguous to select the relevant rule without guessing
- **THEN** the system asks a focused clarification question and returns no substantive rule answer for that request

#### Scenario: Retrieval is uncertain
- **WHEN** retrieval finds related terms but cannot establish that the passages answer the submitted question
- **THEN** the system reports insufficient evidence and does not use a confidence score or common practice to complete the answer

#### Scenario: Multi-part question is partly covered
- **WHEN** the corpus directly supports some subquestions but contains no sufficient evidence for others
- **THEN** the system may answer only the supported parts with citations and explicitly marks every unsupported part as unavailable from the corpus

#### Scenario: User asks for a DM judgment
- **WHEN** the source states that adjudication or a choice belongs to the DM or does not determine one outcome
- **THEN** the system cites that boundary and does not manufacture the requested judgment

### Requirement: RUL-006 Source precedence and conflicting evidence
The English SRD 5.2.1 source SHALL control semantic interpretation; the German SRD 5.2.1 source SHALL provide official localized terminology and same-version German answers. When passages appear to conflict, the system SHALL apply a precedence rule only when that rule is itself explicit in the approved corpus and cited in the answer. An unresolved same-source conflict SHALL produce a conflicting-evidence outcome with citations to each relevant passage and no selected winner. A material English/German mismatch SHALL identify the localization conflict, cite both sources, and use only the English source for any supported semantic conclusion rather than silently merging them.

#### Scenario: English and German passages align
- **WHEN** the official German passage expresses the same rule meaning as the English source
- **THEN** the system may answer in German with the German citation while retaining the English source as semantic precedence metadata

#### Scenario: English and German passages materially differ
- **WHEN** the two SRD 5.2.1 language sources produce incompatible rule meanings
- **THEN** the system identifies the localization conflict, cites both passages, and bases any limited supported conclusion only on the English passage

#### Scenario: Corpus provides an explicit precedence rule
- **WHEN** two passages appear general and specific and the approved corpus explicitly defines how that relationship is resolved
- **THEN** the system may explain the resolution only while citing both passages and the source-backed precedence rule

#### Scenario: Same-source passages remain in conflict
- **WHEN** relevant English SRD 5.2.1 passages conflict and no cited corpus rule resolves them
- **THEN** the system returns a conflicting-evidence outcome with both citations and no invented resolution

#### Scenario: Provider chooses a conflict winner
- **WHEN** an explanation provider prefers one conflicting passage without a cited corpus precedence rule
- **THEN** the system rejects that preference and preserves the conflicting-evidence outcome

### Requirement: RUL-007 Wrong-edition and non-corpus material
Rule assistance SHALL reject a request to answer from D&D 2014 rules, SRD 5.1, another edition or game system, a non-SRD book, homebrew, or user-supplied rule text as though it were part of the approved `DND_5E_2024` corpus. The system SHALL identify the edition or source mismatch when it can do so without reproducing unlicensed content, SHALL avoid silently translating an older rule into 2024 behavior, and SHALL provide a 2024 answer only when the question can be independently answered from SRD 5.2.1 with normal citations.

#### Scenario: Question explicitly requests 2014 rules
- **WHEN** a user asks for a D&D 2014 or SRD 5.1 rule answer
- **THEN** the system reports that only the D&D 5e (2024) SRD 5.2.1 profile is supported and does not answer from the older source

#### Scenario: User supplies older-edition text
- **WHEN** a user pastes or paraphrases an older-edition rule and asks the system to treat it as authority
- **THEN** the system excludes that text from evidence and does not merge it into the 2024 answer

#### Scenario: Question names non-SRD content
- **WHEN** a question requires a class, spell, item, monster, setting, or rule absent from SRD 5.2.1
- **THEN** the system reports that the requested content is outside the licensed corpus and does not infer it from related SRD material

#### Scenario: Homebrew is presented as official
- **WHEN** a caller submits campaign or homebrew text and asks whether it is an official D&D 5e (2024) rule
- **THEN** the system does not treat that text as official and answers only any independently supported corpus question

#### Scenario: Correct 2024 rule is independently available
- **WHEN** a question mentions an older rule but also asks what SRD 5.2.1 says about a separately identifiable topic
- **THEN** the system may answer the 2024 topic from the approved corpus while explicitly excluding the older text from evidence

### Requirement: RUL-008 Non-authoritative explanation provider and failures
An external explanation provider MAY receive only the authenticated user's normalized question, the minimum verified SRD passages and citation metadata needed for that question, the requested answer language, and non-secret generation constraints. Rule assistance SHALL remain disabled for provider-generated explanations until a finite server-controlled provider/model policy defines request, context, output, timeout, usage/cost, accounting, and provider-retention limits and discloses provider transfer before submission. Provider output SHALL be an untrusted draft and MUST pass claim-to-citation verification before it is shown as an explanation. A disabled, exhausted, oversized, timed-out, rate-limited, unauthorized, unavailable, malformed, or unverifiable provider result SHALL create no grounded explanation; when retrieval itself succeeded, the system SHALL instead return verified source excerpts and citations marked `SOURCE_EXTRACTS_ONLY`, otherwise it SHALL return an unavailable outcome. Duplicate delivery of one request MUST consume and dispatch at most once.

#### Scenario: Provider-generated explanation passes verification
- **WHEN** the provider policy is enabled, retrieval is sufficient, the user confirms the disclosed transfer, and every draft claim is supported by its cited passage
- **THEN** the system returns the explanation as non-authoritative paraphrase with verified claim-level citations

#### Scenario: User declines provider transfer
- **WHEN** the user does not confirm the disclosed external transfer
- **THEN** the system sends no question or passage to the provider and returns verified source excerpts and citations when retrieval succeeded

#### Scenario: Provider is disabled or capacity is exhausted
- **WHEN** no finite provider policy is enabled or its usage or cost capacity is unavailable
- **THEN** the system sends no provider request and returns `SOURCE_EXTRACTS_ONLY` when sufficient corpus passages were retrieved

#### Scenario: Provider fails or times out
- **WHEN** a provider request times out, is rate-limited, unauthorized, unavailable, or returns a malformed response
- **THEN** the system exposes no partial generated answer and falls back only to verified source excerpts and citations

#### Scenario: Provider output cannot be verified
- **WHEN** any generated substantive claim lacks sufficient support in the retrieved passages
- **THEN** the system rejects the generated explanation and returns only the verified source-extract outcome

#### Scenario: No sufficient evidence was retrieved
- **WHEN** corpus retrieval cannot support the question
- **THEN** the system does not contact the explanation provider and returns the applicable missing, ambiguous, conflict, wrong-edition, or unavailable outcome

#### Scenario: Same request is delivered twice
- **WHEN** one provider-backed request is retried with the same idempotency identity
- **THEN** the system returns the original result and does not reserve usage or dispatch the provider twice

### Requirement: RUL-009 Read-only data and integration boundary
Rule assistance SHALL be read-only and SHALL NOT automatically retrieve or transmit campaign metadata, story, content, session or encounter history, combat state, characters, progression history, account-private data, notifications, individual votes, player notes, media, AI drafts, audio or transcripts, Discord data, credentials, or unrelated records. A question or answer MUST NOT create or mutate a campaign ruling, session event, combat command, condition/effect, character field, progression choice, item/loot/reward, map state, voice command, Discord message, or AI-preparation record. The accepted scope SHALL provide no product-facing question history, saved ruling library, campaign attachment, audio input, voice execution, or Discord delivery.

#### Scenario: Rule question mentions campaign facts
- **WHEN** a user includes campaign facts in the submitted plain-text question
- **THEN** the system processes only the submitted text and does not fetch additional campaign or player records automatically

#### Scenario: Caller asks to apply the answer
- **WHEN** a user asks rule assistance to apply a condition, change hit points, advance a character, create an item, record a ruling, or alter another product state
- **THEN** the system performs no mutation and keeps the answer separate from every owning capability

#### Scenario: Another AI workflow offers context
- **WHEN** campaign-assistance or recap data is available to the authenticated user
- **THEN** rule assistance does not import that content as query context or rule evidence

#### Scenario: User asks for rule-question history
- **WHEN** a user requests a prior question, answer, saved ruling, or campaign-attached rule note
- **THEN** the system reports that no product-facing rule-assistance history or ruling library is provided by this capability

#### Scenario: Audio, voice, or Discord input is requested
- **WHEN** a caller attempts to submit or deliver a rule question through audio, executable voice commands, or Discord
- **THEN** this capability provides no such integration and leaves those behaviors to separately accepted changes

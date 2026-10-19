package character;

import character.ability.AbilityScoreDTO;
import character.ability.CharacterAbility;
import background.Background;
import characterclass.CharacterClass;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import security.SecurityIdentityService;

import java.util.List;
import java.util.stream.Collectors;

@Path("/api/character")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class CharacterResource {

    @Inject
    CharacterDeletionService characterDeletionService;

    @Inject
    CharacterAccess characterAccess;

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    /**
     * Create a new empty character for the character creation flow.
     */
    @POST
    @Path("/createInitialCharacter")
    @Transactional
    public Response createInitialCharacter() {
        Character character = new Character();
        character.ownerPlayerId = currentPlayerId();
        character.persist();

        CharacterDTO dto = CharacterDTO.fromEntity(character);
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    /**
     * Get all characters of the current player as DTOs.
     */
    @GET
    @Path("/all")
    public Response getAllCharacters() {
        List<Character> characters = Character.list("ownerPlayerId", currentPlayerId());
        List<CharacterDTO> dtos = characters.stream()
            // Drafts of an aborted creation have no name and cannot be used.
            .filter(c -> c.name != null && !c.name.isBlank())
            .map(this::toFullDTO)
            .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    /**
     * Shared templates ("Vorlagen"): characters without an owner, e.g. created before characters had
     * owners. Nobody can change them; a player uses one by adopting a personal copy.
     */
    @GET
    @Path("/presets")
    public Response getPresets() {
        List<CharacterDTO> dtos = Character.<Character>list("ownerPlayerId is null and classId <> 0 order by name").stream()
            .filter(c -> c.name != null && !c.name.isBlank())
            .map(c -> {
                CharacterDTO dto = toFullDTO(c);
                dto.preset = true;
                return dto;
            })
            .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    /** Creates a copy of a template that belongs to the current player. */
    @POST
    @Path("/{id}/adopt")
    @Consumes(MediaType.WILDCARD)
    @Transactional
    public Response adoptPreset(@PathParam("id") Long id) {
        Character template = Character.findById(id);
        if (template == null || template.ownerPlayerId != null
                || template.name == null || template.name.isBlank() || template.classId == 0) {
            return characterAccess.notFound();
        }
        Character copy = new Character();
        copy.ownerPlayerId = currentPlayerId();
        copy.name = template.name;
        copy.classId = template.classId;
        copy.backgroundId = template.backgroundId;
        copy.level = Math.max(1, template.level);
        copy.isCreated = true;
        copy.info = template.info;
        copy.race = template.race;
        copy.alignment = template.alignment;
        copy.persist();
        for (CharacterAbility ability : CharacterAbility.<CharacterAbility>list("character", template)) {
            CharacterAbility copied = new CharacterAbility();
            copied.character = copy;
            copied.ability = ability.ability;
            copied.score = ability.score;
            copied.persist();
        }
        for (character.skill.CharacterSkill skill : character.skill.CharacterSkill.<character.skill.CharacterSkill>list("characterId", template.id.intValue())) {
            character.skill.CharacterSkill copied = new character.skill.CharacterSkill();
            copied.characterId = copy.id.intValue();
            copied.skillId = skill.skillId;
            copied.persist();
        }
        return Response.status(Response.Status.CREATED).entity(toFullDTO(copy)).build();
    }

    /**
     * Get a single character with all related data (class, background, ability scores).
     */
    @GET
    @Path("/{id}")
    public Response getCharacter(@PathParam("id") Long id) {
        Character character = Character.findById(id);
        Long playerId = currentPlayerId();
        if (character == null || !characterAccess.canReadSummary(character, playerId)) {
            return characterAccess.notFound();
        }

        CharacterDTO dto = characterAccess.canReadFull(character, playerId)
                ? toFullDTO(character)
                : toSummaryDTO(character);
        return Response.ok(dto).build();
    }

    /**
     * Get just the character name.
     */
    @GET
    @Path("/{id}/getName")
    public Response getCharacterName(@PathParam("id") Long id) {
        Character character = Character.findById(id);
        if (character == null || !characterAccess.canReadSummary(character, currentPlayerId())) {
            return characterAccess.notFound();
        }
        return Response.ok(character.name).build();
    }

    /**
     * Get ability scores for a character.
     */
    @GET
    @Path("/{id}/getAbilityScores")
    public Response getCharacterAbilityScores(@PathParam("id") Long id) {
        Character character = Character.findById(id);
        if (character == null || !characterAccess.canReadFull(character, currentPlayerId())) {
            return characterAccess.notFound();
        }

        List<CharacterAbility> list = CharacterAbility.list("character", character);
        List<AbilityScoreDTO> result = list.stream()
            .map(AbilityScoreDTO::fromEntity)
            .collect(Collectors.toList());

        return Response.ok(result).build();
    }

    /**
     * Update character fields. Only non-null fields will be updated.
     */
    @PATCH
    @Path("/{id}")
    @Transactional
    public Response updateCharacter(@PathParam("id") Long id, CharacterUpdateDTO updated) {
        Character existing = Character.findById(id);
        if (existing == null || !characterAccess.isOwner(existing, currentPlayerId())) {
            return characterAccess.notFound();
        }
        if (updated == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Keine Änderungen übermittelt").build();
        }
        if (characterAccess.isLockedForEditing(existing)) {
            return characterAccess.locked();
        }

        if (updated.name != null) {
            existing.name = updated.name;
        }
        if (updated.classId != null) {
            existing.classId = updated.classId;
        }
        if (updated.backgroundId != null) {
            existing.backgroundId = updated.backgroundId.intValue();
        }
        if (updated.info != null) {
            existing.info = updated.info;
        }
        if (updated.level != null) {
            existing.level = updated.level;
        }
        if (updated.race != null) {
            existing.race = updated.race;
        }
        if (updated.alignment != null) {
            existing.alignment = updated.alignment;
        }

        CharacterDTO dto = toFullDTO(existing);
        return Response.ok(dto).build();
    }

    /**
     * Delete a character.
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response deleteCharacter(@PathParam("id") Long id) {
        Character character = Character.findById(id);
        if (character == null || !characterAccess.isOwner(character, currentPlayerId())) {
            return characterAccess.notFound();
        }
        if (characterAccess.isLockedForEditing(character)) {
            return characterAccess.locked();
        }

        characterDeletionService.deleteCharacterById(id);
        return Response.noContent().build();
    }

    private Long currentPlayerId() {
        return securityIdentityService.getCurrentPlayerId(securityIdentity);
    }

    /** What fellow players see: name, level, race and class, no scores, background or story. */
    private CharacterDTO toSummaryDTO(Character character) {
        CharacterDTO dto = new CharacterDTO();
        dto.id = character.id;
        dto.name = character.name;
        dto.level = character.level;
        dto.race = character.race;
        if (character.classId != 0) {
            dto.characterClass = characterclass.ClassDTO.fromEntity(CharacterClass.findById(character.classId));
        }
        return dto;
    }

    private CharacterDTO toFullDTO(Character character) {
        CharacterClass clazz = null;
        if (character.classId != 0) {
            clazz = CharacterClass.findById(character.classId);
        }

        Background background = null;
        if (character.backgroundId != 0) {
            background = Background.findById((long) character.backgroundId);
        }

        List<CharacterAbility> abilityScores = CharacterAbility.list("character", character);

        return CharacterDTO.fromEntityWithRelations(character, clazz, background, abilityScores);
    }
}

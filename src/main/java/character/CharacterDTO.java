package character;

import character.ability.AbilityScoreDTO;
import characterclass.ClassDTO;
import background.BackgroundDTO;
import characterclass.CharacterClass;
import background.Background;
import character.ability.CharacterAbility;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Comprehensive DTO for Character that includes all related data.
 * This eliminates the need for multiple API calls from the frontend.
 */
public class CharacterDTO {
    public Long id;
    public String name;
    public String info;
    public int level;
    public boolean isCreated;
    public String race;
    public String alignment;

    // Related entities - fully resolved
    public ClassDTO characterClass;
    public BackgroundDTO background;
    public List<AbilityScoreDTO> abilityScores;

    public CharacterDTO() {}

    /**
     * Creates a basic CharacterDTO from entity without related data.
     */
    public static CharacterDTO fromEntity(Character entity) {
        if (entity == null) return null;

        CharacterDTO dto = new CharacterDTO();
        dto.id = entity.id;
        dto.name = entity.name;
        dto.info = entity.info;
        dto.level = entity.level;
        dto.isCreated = entity.isCreated;
        dto.race = entity.race;
        dto.alignment = entity.alignment;
        return dto;
    }

    /**
     * Creates a full CharacterDTO with all related data resolved.
     */
    public static CharacterDTO fromEntityWithRelations(
            Character entity,
            CharacterClass clazz,
            Background background,
            List<CharacterAbility> abilityScores) {

        if (entity == null) return null;

        CharacterDTO dto = fromEntity(entity);
        dto.characterClass = ClassDTO.fromEntity(clazz);
        dto.background = BackgroundDTO.fromEntity(background);

        if (abilityScores != null) {
            dto.abilityScores = abilityScores.stream()
                .map(AbilityScoreDTO::fromEntity)
                .collect(Collectors.toList());
        }

        return dto;
    }
}

package character.ability;

/**
 * DTO representing a character's ability score.
 * Combines ability info with the score value.
 */
public class AbilityScoreDTO {
    public Long abilityId;
    public String abilityName;
    public String abilityDescription;
    public int score;

    public AbilityScoreDTO() {}

    public AbilityScoreDTO(Long abilityId, String abilityName, String abilityDescription, int score) {
        this.abilityId = abilityId;
        this.abilityName = abilityName;
        this.abilityDescription = abilityDescription;
        this.score = score;
    }

    public static AbilityScoreDTO fromEntity(CharacterAbility ca) {
        if (ca == null || ca.ability == null) return null;
        return new AbilityScoreDTO(
            ca.ability.id,
            ca.ability.name,
            ca.ability.description,
            ca.score
        );
    }
}


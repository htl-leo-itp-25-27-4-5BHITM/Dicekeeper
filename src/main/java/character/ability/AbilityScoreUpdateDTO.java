package character.ability;

/**
 * DTO for updating a character's ability score.
 */
public class AbilityScoreUpdateDTO {
    public int score;

    public AbilityScoreUpdateDTO() {}

    public AbilityScoreUpdateDTO(int score) {
        this.score = score;
    }
}


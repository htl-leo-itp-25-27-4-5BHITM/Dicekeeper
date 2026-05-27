package character;

import character.ability.CharacterAbility;
import character.skill.CharacterSkill;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class CharacterDeletionService {

    public void deleteCharacterById(Long characterId) {
        if (characterId == null) {
            return;
        }

        Character character = Character.findById(characterId);
        if (character == null) {
            return;
        }

        CharacterAbility.delete("character", character);
        CharacterSkill.delete("characterId", character.id.intValue());
        character.delete();
    }
}

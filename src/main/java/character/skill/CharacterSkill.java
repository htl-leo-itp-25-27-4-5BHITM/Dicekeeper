package character.skill;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "character_skill")
public class CharacterSkill extends PanacheEntity {
    public int characterId;
    public int skillId;
}


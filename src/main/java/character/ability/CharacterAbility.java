package character.ability;

import ability.Ability;
import character.Character;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "character_ability")
public class CharacterAbility extends PanacheEntity {

    @ManyToOne
    @JoinColumn(name = "character_Id")
    public Character character;

    @ManyToOne
    @JoinColumn(name = "ability_Id")
    public Ability ability;

    public int score;
}


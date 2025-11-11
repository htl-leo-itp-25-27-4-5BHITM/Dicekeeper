package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;

@Entity
public class Character_ability_score extends PanacheEntity {

    @ManyToOne
    @JoinColumn(name = "character_Id")
    public Character character;

    @ManyToOne
    @JoinColumn(name = "abilityScore_Id")
    public Ability_Score abilityScore;

    public int score;
}

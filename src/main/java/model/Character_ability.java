package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class Character_ability extends PanacheEntity {

    @ManyToOne
    @JoinColumn(name = "character_Id")
    public Character character;

    @ManyToOne
    @JoinColumn(name = "ability_Id")
    public Ability ability;

    public int score;
}

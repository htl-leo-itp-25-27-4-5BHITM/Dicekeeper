package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Character_Skill extends PanacheEntity {
    public int characterId;
    public int skillId;
}

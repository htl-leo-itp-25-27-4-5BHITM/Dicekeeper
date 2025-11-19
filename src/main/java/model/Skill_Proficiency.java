package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Skill_Proficiency extends PanacheEntity {
    public int skillId;
    public String proficiencyLevel;
}

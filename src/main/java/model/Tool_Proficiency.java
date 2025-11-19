package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Tool_Proficiency extends PanacheEntity {
    public int toolId;
    public String proficiencyLevel;
}

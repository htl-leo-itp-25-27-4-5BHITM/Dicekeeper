package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;

@Entity
public class Background extends PanacheEntity {
    public String name;
    public String description;
    public String skills;
    public String tool_proficiencies;
    public String equipment;
//    public String languages;
    public String feat;
}

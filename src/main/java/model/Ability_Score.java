package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Ability_Score extends PanacheEntity {
    public String name;
    public String description;
}

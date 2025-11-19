package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Ability extends PanacheEntity {
    public String name;
    public String description;
}

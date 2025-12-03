package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Campaign extends PanacheEntity {
    public String name;
    public String description;
}

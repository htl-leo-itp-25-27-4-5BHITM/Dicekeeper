package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Player extends PanacheEntity {
    public String email;
    public String username;
}

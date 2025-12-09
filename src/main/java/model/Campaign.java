package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Campaign extends PanacheEntity {
    public String name;
    public String description;
    // owner player id (nullable)
    @Column(name = "player_id", nullable = true)
    public Long playerId;
}

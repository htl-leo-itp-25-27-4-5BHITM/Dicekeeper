package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Character extends PanacheEntity {
    public int playerId;
    public String name;
    public int raceId;
    public int classId;
    public int backgroundId;
    public String description;
}

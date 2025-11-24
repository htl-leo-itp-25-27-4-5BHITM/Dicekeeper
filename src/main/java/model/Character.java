package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Character extends PanacheEntity {
//    public int playerId;
    public String name;
//    public int raceId;
    public long classId;
    public int backgroundId;
    public int level;
    public boolean isCreated;
    public String info;
}

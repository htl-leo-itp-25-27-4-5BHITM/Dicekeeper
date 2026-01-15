package character;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "character")
public class Character extends PanacheEntity {
    public String name;
    public long classId;
    public int backgroundId;
    public int level;
    public boolean isCreated;
    public String info;
}

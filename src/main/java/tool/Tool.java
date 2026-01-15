package tool;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;

@Entity
public class Tool extends PanacheEntity {
    public String name;
    public String description;
}


package characterclass;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "class")
public class CharacterClass extends PanacheEntity {
    public String name;

    @Column(length = 1500)
    public String description;
}


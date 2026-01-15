package background;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Background extends PanacheEntity {
    public String name;

    @Column(length = 2000)
    public String description;

    public String skills;
    public String tool_proficiencies;

    @Column(length = 2000)
    public String equipment;

    public String feat;
}

package tool;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "tool_proficiency")
public class ToolProficiency extends PanacheEntity {
    public int toolId;
    public String proficiencyLevel;
}


package skill;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "skill_proficiency")
public class SkillProficiency extends PanacheEntity {
    public int backgroundId;
    public int skillId;
    public String proficiencyLevel;
}


package background;

public class BackgroundDTO {
    public Long id;
    public String name;
    public String description;
    public String skills;
    public String toolProficiencies;
    public String equipment;
    public String feat;

    public BackgroundDTO() {}

    public BackgroundDTO(Long id, String name, String description, String skills,
                         String toolProficiencies, String equipment, String feat) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.skills = skills;
        this.toolProficiencies = toolProficiencies;
        this.equipment = equipment;
        this.feat = feat;
    }

    public static BackgroundDTO fromEntity(Background entity) {
        if (entity == null) return null;
        return new BackgroundDTO(
            entity.id,
            entity.name,
            entity.description,
            entity.skills,
            entity.tool_proficiencies,
            entity.equipment,
            entity.feat
        );
    }
}


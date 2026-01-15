package characterclass;

public class ClassDTO {
    public Long id;
    public String name;
    public String description;

    public ClassDTO() {}

    public ClassDTO(Long id, String name, String description) {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    public static ClassDTO fromEntity(CharacterClass entity) {
        if (entity == null) return null;
        return new ClassDTO(entity.id, entity.name, entity.description);
    }
}


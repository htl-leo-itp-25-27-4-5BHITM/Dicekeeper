package ability;

public class AbilityDTO {
    public Long id;
    public String name;
    public String description;

    public AbilityDTO() {}

    public AbilityDTO(Long id, String name, String description) {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    public static AbilityDTO fromEntity(Ability entity) {
        if (entity == null) return null;
        return new AbilityDTO(entity.id, entity.name, entity.description);
    }
}


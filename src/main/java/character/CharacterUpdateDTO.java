package character;

/**
 * DTO for updating character fields (PATCH operations).
 * All fields are nullable - only non-null fields will be updated.
 */
public class CharacterUpdateDTO {
    public String name;
    public Long classId;
    public Long backgroundId;
    public String info;
    public Integer level;
    public String race;
    public String alignment;

    public CharacterUpdateDTO() {}
}

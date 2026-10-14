package campaign;

/**
 * Request body for creating and (partially) updating a campaign.
 *
 * <p>Every field is nullable so a partial update only changes the fields it sends. Unlike the
 * {@link Campaign} entity there are no defaults here, so e.g. {@code {"started": true}} can no
 * longer reset {@code isPublic}. Server-owned fields (owner, map paths) are not accepted at all.</p>
 */
public class CampaignWriteDTO {
    public String name;
    public String description;
    public String story;
    public Boolean isPublic;
    public Integer maxPlayerCount;
    public Boolean started;

    public CampaignWriteDTO() {}
}

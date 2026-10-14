package player;

/**
 * What other users may see of a player. Personal data (e-mail, real name) is left out.
 */
public class PublicPlayerDTO {
    public Long id;
    public String username;
    public String profilePicture;

    public PublicPlayerDTO() {}

    public PublicPlayerDTO(Player player) {
        this.id = player.id;
        this.username = player.username;
        this.profilePicture = player.profilePicture;
    }
}

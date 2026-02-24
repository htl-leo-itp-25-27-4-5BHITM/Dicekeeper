package campaign;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Campaign extends PanacheEntity {
    public String name;
    public String description;
    public String story;

    @Column(name = "player_id", nullable = true)
    public Long playerId;

    @Column(name = "map_image_path", nullable = true)
    public String mapImagePath;

    @Column(name = "is_public", nullable = false)
    public Boolean isPublic = false;

    @Column(name = "max_player_count", nullable = true)
    public Integer maxPlayerCount;

    @Column(name = "started", nullable = false)
    public Boolean started = false;
}

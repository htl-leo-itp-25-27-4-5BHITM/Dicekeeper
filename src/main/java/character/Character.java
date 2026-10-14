package character;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "character")
public class Character extends PanacheEntity {
    public String name;
    public long classId;
    public int backgroundId;
    public int level;
    public boolean isCreated;
    public String info;
    public String race;
    public String alignment;

    /** Player who created the character. Only the owner may list, edit, delete or submit it. */
    @Column(name = "owner_player_id")
    public Long ownerPlayerId;
}

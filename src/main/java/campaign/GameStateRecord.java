package campaign;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Persisted live game state of one campaign (turn, HP, active players, last roll, markers, fog),
 * stored as JSON so a restart or deployment does not reset running games.
 */
@Entity
@Table(name = "campaign_game_state")
public class GameStateRecord extends PanacheEntityBase {

    @Id
    @Column(name = "campaign_id")
    public Long campaignId;

    @JdbcTypeCode(SqlTypes.LONG32VARCHAR)
    @Column(name = "state_json", nullable = false)
    public String stateJson;

    @Column(name = "updated_at", nullable = false)
    public Long updatedAt;
}

package player;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Player extends PanacheEntity {
    public String email;
    public String username;
    public String name;

    @Column(name = "profile_picture")
    public String profilePicture;
}

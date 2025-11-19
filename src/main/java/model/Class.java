package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Class extends PanacheEntity {
    public String name;

    @Column(length = 1500)
    public String description;
}

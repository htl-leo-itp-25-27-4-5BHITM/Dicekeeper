package resource;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import model.Campaign;
import model.Player;

import java.util.List;

import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

@Path("/api/campaign")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CampaignResource {

    @Inject
    EntityManager em;

    @POST
    @Transactional
    public Response createCampaign(Campaign c) {
        if (c == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Request body is required")
                    .build();
        }
        if (c.name == null || c.name.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Campaign name is required")
                    .build();
        }
        if (c.description == null) c.description = "";
        // if a playerId is provided, verify player exists
        if (c.playerId != null) {
            Player p = Player.findById(c.playerId);
            if (p == null) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Player with id " + c.playerId + " not found")
                        .build();
            }
        }
        try {
            // ensure we don't try to insert with a pre-set id (which can collide with seeded data)
            c.id = null;
            c.persist();
            // force flush so DB constraint violations are thrown here
            em.flush();
            return Response.status(Response.Status.CREATED).entity(c).build();
        } catch (Exception e) {
            String msg = "Failed to create campaign: " + e.getMessage();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(msg).build();
        }
    }

    @GET
    public List<Campaign> listCampaigns() {
        return Campaign.listAll();
    }

    @GET
    @Path("{id}")
    public Response getCampaign(@PathParam("id") Long id) {
        Campaign c = Campaign.findById(id);
        if (c == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(c).build();
    }

    @PATCH
    @Path("{id}")
    @Transactional
    public Response updateCampaign(@PathParam("id") Long id, Campaign update) {
        Campaign c = Campaign.findById(id);
        if (c == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        if (update.name == null || update.name.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Campaign name is required")
                    .build();
        }
        c.name = update.name;
        c.description = update.description == null ? "" : update.description;
        // Optionally update playerId if provided
        if (update.playerId != null) {
            Player p = Player.findById(update.playerId);
            if (p == null) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Player with id " + update.playerId + " not found")
                        .build();
            }
            c.playerId = update.playerId;
        }
        try {
            c.persist();
            em.flush();
            return Response.ok(c).build();
        } catch (Exception e) {
            String msg = "Failed to update campaign: " + e.getMessage();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(msg).build();
        }
    }

    @GET
    @Path("/player/{playerId}")
    public List<Campaign> getCampaignsByPlayer(@PathParam("playerId") Long playerId) {
        return Campaign.list("playerId", playerId);
    }
}

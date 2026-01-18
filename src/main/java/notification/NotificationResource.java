package notification;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/api/notification")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class NotificationResource {

    @GET
    @Path("/player/{playerId}")
    public List<Notification> getPlayerNotifications(@PathParam("playerId") Long playerId) {
        return Notification.find("playerId = ?1 order by createdAt desc", playerId).list();
    }

    @GET
    @Path("/player/{playerId}/unread")
    public List<Notification> getUnreadNotifications(@PathParam("playerId") Long playerId) {
        return Notification.find("playerId = ?1 and isRead = false order by createdAt desc", playerId).list();
    }

    @GET
    @Path("/player/{playerId}/unread/count")
    public Response getUnreadCount(@PathParam("playerId") Long playerId) {
        long count = Notification.count("playerId = ?1 and isRead = false", playerId);
        return Response.ok(count).build();
    }

    @GET
    @Path("/{id}")
    public Response getNotification(@PathParam("id") Long id) {
        Notification notification = Notification.findById(id);
        if (notification == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Notification not found")
                    .build();
        }
        return Response.ok(notification).build();
    }

    @PATCH
    @Path("/{id}/read")
    @Transactional
    public Response markAsRead(@PathParam("id") Long id) {
        Notification notification = Notification.findById(id);
        if (notification == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Notification not found")
                    .build();
        }
        notification.isRead = true;
        return Response.ok(notification).build();
    }

    @PATCH
    @Path("/player/{playerId}/read-all")
    @Transactional
    public Response markAllAsRead(@PathParam("playerId") Long playerId) {
        Notification.update("isRead = true where playerId = ?1", playerId);
        return Response.ok().build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response deleteNotification(@PathParam("id") Long id) {
        Notification notification = Notification.findById(id);
        if (notification == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Notification not found")
                    .build();
        }
        notification.delete();
        return Response.noContent().build();
    }

    @DELETE
    @Path("/player/{playerId}")
    @Transactional
    public Response deleteAllNotifications(@PathParam("playerId") Long playerId) {
        Notification.delete("playerId", playerId);
        return Response.noContent().build();
    }
}


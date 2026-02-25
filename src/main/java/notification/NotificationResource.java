package notification;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import security.SecurityIdentityService;

import java.util.List;

@Path("/api/notification")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class NotificationResource {

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Path("/player/{playerId}")
    public Response getPlayerNotifications(@PathParam("playerId") Long playerId) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

        List<Notification> notifications = Notification.find("playerId = ?1 order by createdAt desc", playerId).list();
        return Response.ok(notifications).build();
    }

    @GET
    @Path("/player/{playerId}/unread")
    public Response getUnreadNotifications(@PathParam("playerId") Long playerId) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

        List<Notification> notifications = Notification.find("playerId = ?1 and isRead = false order by createdAt desc", playerId).list();
        return Response.ok(notifications).build();
    }

    @GET
    @Path("/player/{playerId}/unread/count")
    public Response getUnreadCount(@PathParam("playerId") Long playerId) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

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

        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, notification.playerId);
        if (authorizationError != null) {
            return authorizationError;
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

        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, notification.playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

        notification.isRead = true;
        return Response.ok(notification).build();
    }

    @PATCH
    @Path("/player/{playerId}/read-all")
    @Transactional
    public Response markAllAsRead(@PathParam("playerId") Long playerId) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

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

        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, notification.playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

        notification.delete();
        return Response.noContent().build();
    }

    @DELETE
    @Path("/player/{playerId}")
    @Transactional
    public Response deleteAllNotifications(@PathParam("playerId") Long playerId) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

        Notification.delete("playerId", playerId);
        return Response.noContent().build();
    }
}

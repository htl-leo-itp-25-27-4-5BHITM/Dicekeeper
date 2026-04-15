package tool;

import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Path("/img")
public class ImagorSignedImageResource {

    @Inject
    ImagorUrlSigner imagorUrlSigner;

    @GET
    @Produces(MediaType.WILDCARD)
    public Response redirect(
            @QueryParam("src") String src,
            @QueryParam("w") Integer width,
            @QueryParam("h") Integer height,
            @QueryParam("fit") @DefaultValue("true") boolean fitIn,
            @QueryParam("smart") @DefaultValue("false") boolean smart,
            @QueryParam("format") String format,
            @QueryParam("q") Integer quality
    ) {
        String normalizedSource = normalizeUploadPath(src);
        if (normalizedSource == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Only /uploads/* images can be signed")
                    .build();
        }

        if (!imagorUrlSigner.isConfigured()) {
            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity("Imagor signing is not configured")
                    .build();
        }

        int safeWidth = sanitizeDimension(width);
        int safeHeight = sanitizeDimension(height);
        int safeQuality = sanitizeQuality(quality);

        List<String> parts = new ArrayList<>();
        if (fitIn) {
            parts.add("fit-in");
        }
        if (safeWidth > 0 || safeHeight > 0) {
            parts.add(safeWidth + "x" + safeHeight);
        }
        if (smart) {
            parts.add("smart");
        }

        List<String> filters = new ArrayList<>();
        String safeFormat = sanitizeFormat(format);
        if (safeFormat != null) {
            filters.add("format(" + safeFormat + ")");
        }
        if (safeQuality > 0) {
            filters.add("quality(" + safeQuality + ")");
        }
        if (!filters.isEmpty()) {
            parts.add("filters:" + String.join(":", filters));
        }

        parts.add(encodeSourcePath(normalizedSource));
        String imagorPath = String.join("/", parts);
        URI location = URI.create(imagorUrlSigner.buildSignedUrl(imagorPath));

        return Response.temporaryRedirect(location)
                .header("Cache-Control", "public, max-age=86400")
                .build();
    }

    private String normalizeUploadPath(String src) {
        if (src == null || src.isBlank()) {
            return null;
        }

        String normalized = Paths.get(src).normalize().toString().replace('\\', '/');
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }

        if (!normalized.startsWith("/uploads/")) {
            return null;
        }

        return normalized;
    }

    private int sanitizeDimension(Integer value) {
        if (value == null) {
            return 0;
        }
        return Math.max(0, Math.min(4000, value));
    }

    private int sanitizeQuality(Integer value) {
        if (value == null) {
            return 0;
        }
        return Math.max(1, Math.min(100, value));
    }

    private String sanitizeFormat(String format) {
        if (format == null || format.isBlank()) {
            return null;
        }

        String normalized = format.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "webp", "jpeg", "jpg", "png", "avif" -> normalized;
            default -> null;
        };
    }

    private String encodeSourcePath(String sourcePath) {
        String[] segments = sourcePath.split("/");
        List<String> encoded = new ArrayList<>();
        for (String segment : segments) {
            if (segment == null || segment.isBlank()) {
                continue;
            }
            encoded.add(URLEncoder.encode(segment, StandardCharsets.UTF_8).replace("+", "%20"));
        }
        return String.join("/", encoded);
    }
}

package campaign;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Base64;

/**
 * Server-side fog-of-war exploration memory.
 *
 * <p>Mirrors the 256×256 exploration canvas of {@code mapCanvas.js}: every position a player marker
 * visits is stamped with the same radial gradient, and the result is sent to clients as the PNG data
 * URL they already understand. Because the server derives the fog from marker positions, a client
 * can no longer upload an arbitrary (e.g. fully revealed) fog image.</p>
 */
public final class FogOfWar {

    public static final int SIZE = 256;
    /** Same as the default {@code fogRadius} in mapCanvas.js (fraction of the map size). */
    static final double RADIUS = 0.225;
    private static final String DATA_URL_PREFIX = "data:image/png;base64,";

    private FogOfWar() {
    }

    public static byte[] empty() {
        return new byte[SIZE * SIZE];
    }

    /** Stamps one explored position (x/y relative 0–1) onto the alpha grid. */
    public static void stamp(byte[] alpha, double x, double y) {
        if (!Double.isFinite(x) || !Double.isFinite(y)) return;
        double r = RADIUS * SIZE;
        double r0 = r * 0.05;
        double cx = x * SIZE;
        double cy = y * SIZE;
        int minX = Math.max(0, (int) Math.floor(cx - r));
        int maxX = Math.min(SIZE - 1, (int) Math.ceil(cx + r));
        int minY = Math.max(0, (int) Math.floor(cy - r));
        int maxY = Math.min(SIZE - 1, (int) Math.ceil(cy + r));
        for (int py = minY; py <= maxY; py++) {
            for (int px = minX; px <= maxX; px++) {
                double d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
                if (d > r) continue;
                int src = (int) Math.round(gradientAlpha((d - r0) / (r - r0)) * 255);
                if (src <= 0) continue;
                int index = py * SIZE + px;
                int dst = alpha[index] & 0xFF;
                // canvas "source-over" compositing of the alpha channel
                alpha[index] = (byte) Math.min(255, src + dst * (255 - src) / 255);
            }
        }
    }

    /** Color stops of the client gradient: 1 until 60 %, 0.5 at 85 %, 0 at the edge. */
    static double gradientAlpha(double t) {
        if (t <= 0.6) return 1.0;
        if (t <= 0.85) return 1.0 - (t - 0.6) / 0.25 * 0.5;
        if (t <= 1.0) return 0.5 * (1.0 - (t - 0.85) / 0.15);
        return 0.0;
    }

    public static boolean isEmpty(byte[] alpha) {
        if (alpha == null) return true;
        for (byte b : alpha) {
            if (b != 0) return false;
        }
        return true;
    }

    public static String toDataUrl(byte[] alpha) {
        if (isEmpty(alpha)) return null;
        BufferedImage image = new BufferedImage(SIZE, SIZE, BufferedImage.TYPE_INT_ARGB);
        for (int i = 0; i < alpha.length; i++) {
            image.setRGB(i % SIZE, i / SIZE, ((alpha[i] & 0xFF) << 24) | 0xFFFFFF);
        }
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return DATA_URL_PREFIX + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Reads a stored data URL back into an alpha grid; unreadable data yields an empty grid. */
    public static byte[] fromDataUrl(String dataUrl) {
        byte[] alpha = empty();
        if (dataUrl == null || !dataUrl.startsWith(DATA_URL_PREFIX)) return alpha;
        try {
            byte[] png = Base64.getDecoder().decode(dataUrl.substring(DATA_URL_PREFIX.length()));
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(png));
            if (image == null || image.getWidth() != SIZE || image.getHeight() != SIZE) return alpha;
            for (int i = 0; i < alpha.length; i++) {
                alpha[i] = (byte) (image.getRGB(i % SIZE, i / SIZE) >>> 24);
            }
        } catch (IOException | IllegalArgumentException e) {
            return empty();
        }
        return alpha;
    }
}

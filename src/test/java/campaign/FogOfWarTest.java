package campaign;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FogOfWarTest {

    @Test
    void stampRevealsOnlyTheSurroundingsOfAPosition() {
        byte[] alpha = FogOfWar.empty();
        FogOfWar.stamp(alpha, 0.5, 0.5);

        assertEquals(255, alpha[128 * FogOfWar.SIZE + 128] & 0xFF, "center is explored");
        assertEquals(0, alpha[0] & 0xFF, "far corner stays hidden");
        assertEquals(0, alpha[128 * FogOfWar.SIZE + 128 + 60] & 0xFF, "outside the radius stays hidden");
    }

    @Test
    void dataUrlRoundTrip() {
        byte[] alpha = FogOfWar.empty();
        FogOfWar.stamp(alpha, 0.2, 0.7);

        String dataUrl = FogOfWar.toDataUrl(alpha);

        assertTrue(dataUrl.startsWith("data:image/png;base64,"));
        assertArrayEquals(alpha, FogOfWar.fromDataUrl(dataUrl));
        assertNull(FogOfWar.toDataUrl(FogOfWar.empty()));
        assertTrue(FogOfWar.isEmpty(FogOfWar.fromDataUrl("garbage")));
    }
}

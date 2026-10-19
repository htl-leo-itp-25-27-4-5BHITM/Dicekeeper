package campaign;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class DecisionTextStartupRepairTest {

    @Test
    void decodesFormerlyEscapedTexts() {
        assertEquals("Fass & Bier", DecisionTextStartupRepair.decodeHtml("Fass &amp; Bier"));
        assertEquals("<Tür> \"links\"", DecisionTextStartupRepair.decodeHtml("&lt;Tür&gt; &quot;links&quot;"));
        // &amp;lt; was a literal "&lt;" typed by the DM: decoding once must give back exactly that
        assertEquals("&lt;", DecisionTextStartupRepair.decodeHtml("&amp;lt;"));
        assertEquals("Ohne Sonderzeichen", DecisionTextStartupRepair.decodeHtml("Ohne Sonderzeichen"));
        assertNull(DecisionTextStartupRepair.decodeHtml(null));
    }
}

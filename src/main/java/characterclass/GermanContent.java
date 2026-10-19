package characterclass;

import java.util.Locale;
import java.util.Map;

/**
 * German names and descriptions for the built-in classes and backgrounds, plus the class hit dice.
 *
 * <p>The seed data was English. {@link GermanContentStartupRepair} replaces the English rows in
 * existing databases; rows a team member already renamed are left alone.</p>
 */
public final class GermanContent {

    private GermanContent() {
    }

    public record Entry(String englishName, String germanName, String description) {
    }

    public static final Map<Long, Entry> CLASSES = Map.of(
            1L, new Entry("Barbarian", "Barbar",
                    "Barbaren sind wilde Krieger, die ihre Kraft aus einem urtümlichen Kampfrausch ziehen. Im Rausch halten sie mehr aus, schlagen härter zu und reagieren blitzschnell.<br><br>"
                            + "Manche sehen ihren Zorn als Geist eines Ahnen, andere als Ausdruck ihres innersten Wesens. In ihren Gemeinschaften sind Barbaren oft Beschützer: Sie stürzen sich zuerst in die Gefahr, damit andere es nicht müssen.<br><br>"
                            + "Trefferwürfel: W12 · Wichtigste Attribute: Stärke und Konstitution."),
            2L, new Entry("Bard", "Barde",
                    "Barden wirken Magie durch Musik, Tanz und Worte. Sie inspirieren ihre Gefährten, heilen Wunden, verunsichern Feinde und erschaffen Illusionen.<br><br>"
                            + "Als Geschichtenerzähler und Vielwisser kennen sie sich ein wenig mit allem aus und finden in fast jeder Lage einen Ausweg – mit Charme, List oder einem passenden Lied.<br><br>"
                            + "Trefferwürfel: W8 · Wichtigstes Attribut: Charisma."),
            3L, new Entry("Cleric", "Kleriker",
                    "Kleriker schöpfen ihre Macht aus dem Glauben an eine Gottheit oder ein Pantheon. Sie wirken göttliche Wunder, heilen Verbündete und stellen sich dem Bösen entgegen.<br><br>"
                            + "Je nach Domäne ihres Gottes sind sie Heiler, Kämpfer an vorderster Front oder Hüter von Wissen und Licht.<br><br>"
                            + "Trefferwürfel: W8 · Wichtigstes Attribut: Weisheit."),
            4L, new Entry("Druid", "Druide",
                    "Druiden gehören alten Orden an, die die Kräfte der Natur anrufen. Sie heilen, beherrschen Pflanzen, Tiere und Elemente und können selbst Tiergestalt annehmen.<br><br>"
                            + "Sie schützen das Gleichgewicht der Natur und stellen sich allem entgegen, was es bedroht.<br><br>"
                            + "Trefferwürfel: W8 · Wichtigstes Attribut: Weisheit."),
            5L, new Entry("Fighter", "Kämpfer",
                    "Kämpfer beherrschen Waffen und Rüstungen wie niemand sonst. Ob Ritter, Söldner oder Gardist – sie sind auf jedem Schlachtfeld zu Hause.<br><br>"
                            + "Durch Training und Erfahrung greifen sie öfter an, halten mehr aus und finden immer einen zweiten Atem, wenn es eng wird.<br><br>"
                            + "Trefferwürfel: W10 · Wichtigste Attribute: Stärke oder Geschicklichkeit."),
            6L, new Entry("Monk", "Mönch",
                    "Mönche nutzen eine innere Kraft, die sie durch Disziplin und Training bündeln. Sie kämpfen mit bloßen Händen schneller als andere mit Waffen.<br><br>"
                            + "Ihre Beweglichkeit lässt sie Geschossen ausweichen, über Hindernisse laufen und Gegner mit präzisen Schlägen lähmen.<br><br>"
                            + "Trefferwürfel: W8 · Wichtigste Attribute: Geschicklichkeit und Weisheit."),
            7L, new Entry("Paladin", "Paladin",
                    "Paladine sind durch einen heiligen Eid an ihre Sache gebunden. Aus diesem Eid ziehen sie göttliche Kraft, mit der sie heilen und ihre Feinde mit gleißendem Licht strafen.<br><br>"
                            + "In schwerer Rüstung stehen sie an vorderster Front und schützen ihre Gefährten.<br><br>"
                            + "Trefferwürfel: W10 · Wichtigste Attribute: Stärke und Charisma."),
            8L, new Entry("Ranger", "Waldläufer",
                    "Waldläufer sind Jäger und Fährtenleser der Wildnis. Sie bewegen sich lautlos durch jedes Gelände und kennen die Schwächen ihrer Beute.<br><br>"
                            + "Mit Bogen oder Klinge und etwas Naturmagie schützen sie Grenzlande und Reisende vor den Gefahren der Wildnis.<br><br>"
                            + "Trefferwürfel: W10 · Wichtigste Attribute: Geschicklichkeit und Weisheit."),
            9L, new Entry("Rogue", "Schurke",
                    "Schurken setzen auf List, Geschick und Präzision statt roher Gewalt. Sie schleichen, öffnen Schlösser, entschärfen Fallen und treffen genau dort, wo es wehtut.<br><br>"
                            + "Ihr hinterhältiger Angriff macht sie zu gefährlichen Gegnern, ihre Vielseitigkeit zu unverzichtbaren Gefährten.<br><br>"
                            + "Trefferwürfel: W8 · Wichtigstes Attribut: Geschicklichkeit."),
            10L, new Entry("Sorcerer", "Zauberer",
                    "Zauberer tragen angeborene Magie in sich – durch eine ungewöhnliche Abstammung, einen Pakt ihrer Vorfahren oder ein kosmisches Ereignis.<br><br>"
                            + "Sie lernen weniger Zauber als andere, können diese aber mit Metamagie formen, verstärken und verdoppeln.<br><br>"
                            + "Trefferwürfel: W6 · Wichtigstes Attribut: Charisma.")
    );

    public static final Map<Long, Entry> BACKGROUNDS = Map.of(
            1L, new Entry("Acolyte", "Akolyth",
                    "Du hast dich dem Dienst in einem Tempel gewidmet, in einer Stadt oder in einem abgelegenen heiligen Hain. Dort hast du Rituale zu Ehren eines Gottes oder Pantheons vollzogen und Religion studiert.<br><br>"
                            + "Durch die Unterweisung eines Priesters und deine eigene Hingabe hast du gelernt, ein wenig göttliche Kraft zu lenken.<br><br>"
                            + "Fertigkeiten: Motiv erkennen, Religion · Talent: Magischer Eingeweihter (Kleriker) · Attribute: Intelligenz, Weisheit, Charisma.")
    );

    /**
     * Hit die of a class by its English or German name; d8 for unknown classes and d10 (the former
     * fixed formula) for characters without a class.
     */
    public static int hitDie(String className) {
        if (className == null || className.isBlank()) return 10;
        return switch (className.trim().toLowerCase(Locale.ROOT)) {
            case "barbarian", "barbar" -> 12;
            case "fighter", "kämpfer", "paladin", "ranger", "waldläufer" -> 10;
            case "sorcerer", "zauberer", "wizard", "magier" -> 6;
            default -> 8;
        };
    }
}

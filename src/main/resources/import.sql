INSERT INTO public.class (id, name, description) VALUES (1, 'Barbar', 'Barbaren sind wilde Krieger, die ihre Kraft aus einem urtümlichen Kampfrausch ziehen. Im Rausch halten sie mehr aus, schlagen härter zu und reagieren blitzschnell.<br><br>Manche sehen ihren Zorn als Geist eines Ahnen, andere als Ausdruck ihres innersten Wesens. In ihren Gemeinschaften sind Barbaren oft Beschützer: Sie stürzen sich zuerst in die Gefahr, damit andere es nicht müssen.<br><br>Trefferwürfel: W12 · Wichtigste Attribute: Stärke und Konstitution.');
INSERT INTO public.class (id, name, description) VALUES (2, 'Barde', 'Barden wirken Magie durch Musik, Tanz und Worte. Sie inspirieren ihre Gefährten, heilen Wunden, verunsichern Feinde und erschaffen Illusionen.<br><br>Als Geschichtenerzähler und Vielwisser kennen sie sich ein wenig mit allem aus und finden in fast jeder Lage einen Ausweg – mit Charme, List oder einem passenden Lied.<br><br>Trefferwürfel: W8 · Wichtigstes Attribut: Charisma.');
INSERT INTO public.class (id, name, description) VALUES (3, 'Kleriker', 'Kleriker schöpfen ihre Macht aus dem Glauben an eine Gottheit oder ein Pantheon. Sie wirken göttliche Wunder, heilen Verbündete und stellen sich dem Bösen entgegen.<br><br>Je nach Domäne ihres Gottes sind sie Heiler, Kämpfer an vorderster Front oder Hüter von Wissen und Licht.<br><br>Trefferwürfel: W8 · Wichtigstes Attribut: Weisheit.');
INSERT INTO public.class (id, name, description) VALUES (4, 'Druide', 'Druiden gehören alten Orden an, die die Kräfte der Natur anrufen. Sie heilen, beherrschen Pflanzen, Tiere und Elemente und können selbst Tiergestalt annehmen.<br><br>Sie schützen das Gleichgewicht der Natur und stellen sich allem entgegen, was es bedroht.<br><br>Trefferwürfel: W8 · Wichtigstes Attribut: Weisheit.');
INSERT INTO public.class (id, name, description) VALUES (5, 'Kämpfer', 'Kämpfer beherrschen Waffen und Rüstungen wie niemand sonst. Ob Ritter, Söldner oder Gardist – sie sind auf jedem Schlachtfeld zu Hause.<br><br>Durch Training und Erfahrung greifen sie öfter an, halten mehr aus und finden immer einen zweiten Atem, wenn es eng wird.<br><br>Trefferwürfel: W10 · Wichtigste Attribute: Stärke oder Geschicklichkeit.');
INSERT INTO public.class (id, name, description) VALUES (6, 'Mönch', 'Mönche nutzen eine innere Kraft, die sie durch Disziplin und Training bündeln. Sie kämpfen mit bloßen Händen schneller als andere mit Waffen.<br><br>Ihre Beweglichkeit lässt sie Geschossen ausweichen, über Hindernisse laufen und Gegner mit präzisen Schlägen lähmen.<br><br>Trefferwürfel: W8 · Wichtigste Attribute: Geschicklichkeit und Weisheit.');
INSERT INTO public.class (id, name, description) VALUES (7, 'Paladin', 'Paladine sind durch einen heiligen Eid an ihre Sache gebunden. Aus diesem Eid ziehen sie göttliche Kraft, mit der sie heilen und ihre Feinde mit gleißendem Licht strafen.<br><br>In schwerer Rüstung stehen sie an vorderster Front und schützen ihre Gefährten.<br><br>Trefferwürfel: W10 · Wichtigste Attribute: Stärke und Charisma.');
INSERT INTO public.class (id, name, description) VALUES (8, 'Waldläufer', 'Waldläufer sind Jäger und Fährtenleser der Wildnis. Sie bewegen sich lautlos durch jedes Gelände und kennen die Schwächen ihrer Beute.<br><br>Mit Bogen oder Klinge und etwas Naturmagie schützen sie Grenzlande und Reisende vor den Gefahren der Wildnis.<br><br>Trefferwürfel: W10 · Wichtigste Attribute: Geschicklichkeit und Weisheit.');
INSERT INTO public.class (id, name, description) VALUES (9, 'Schurke', 'Schurken setzen auf List, Geschick und Präzision statt roher Gewalt. Sie schleichen, öffnen Schlösser, entschärfen Fallen und treffen genau dort, wo es wehtut.<br><br>Ihr hinterhältiger Angriff macht sie zu gefährlichen Gegnern, ihre Vielseitigkeit zu unverzichtbaren Gefährten.<br><br>Trefferwürfel: W8 · Wichtigstes Attribut: Geschicklichkeit.');
INSERT INTO public.class (id, name, description) VALUES (10, 'Zauberer', 'Zauberer tragen angeborene Magie in sich – durch eine ungewöhnliche Abstammung, einen Pakt ihrer Vorfahren oder ein kosmisches Ereignis.<br><br>Sie lernen weniger Zauber als andere, können diese aber mit Metamagie formen, verstärken und verdoppeln.<br><br>Trefferwürfel: W6 · Wichtigstes Attribut: Charisma.');


-- insert into character (id, name, classid, backgroundid, level, isCreated, info) values (1, 'Arin', 2, 1, 0, false, 'This is a test character. Additional info can go here. Background story, personality traits, ideals, bonds, and flaws can be detailed in this section.');


INSERT INTO Background
(id, name, feat, skills, tool_proficiencies, equipment, description)
VALUES
    (
        1,
        'Akolyth',
        'Magischer Eingeweihter (Kleriker)',
        'Insight, Religion',
        'Kalligrafie-Werkzeug',
        'Wähle A oder B: (A) Kalligrafie-Werkzeug, Buch (Gebete), heiliges Symbol, Pergament (10 Blatt), Robe, 8 GM; oder (B) 50 GM',
        'Du hast dich dem Dienst in einem Tempel gewidmet, in einer Stadt oder in einem abgelegenen heiligen Hain. Dort hast du Rituale zu Ehren eines Gottes oder Pantheons vollzogen und Religion studiert.<br><br>Durch die Unterweisung eines Priesters und deine eigene Hingabe hast du gelernt, ein wenig göttliche Kraft zu lenken.<br><br>Fertigkeiten: Motiv erkennen, Religion · Talent: Magischer Eingeweihter (Kleriker) · Attribute: Intelligenz, Weisheit, Charisma.'
    );


insert into Ability (id, name, description) values (1, 'Strength', 'measuring physical power');
insert into Ability (id, name, description) values (2, 'Dexterity', 'measuring agility');
insert into Ability (id, name, description) values (3, 'Constitution', 'measuring endurance');
insert into Ability (id, name, description) values (4, 'Intelligence', 'measuring reasoning and memory');
insert into Ability (id, name, description) values (5, 'Wisdom', 'measuring perception and insight');
insert into Ability (id, name, description) values (6, 'Charisma', 'measuring force of personality');

-- insert into character_ability (id, character_id, ability_id, score) values (1, 1, 1, 15);

insert into Player (id, email, username, name) values (1, 'alex@htl.at', 'AlexDM', 'Alex');
insert into Player (id, email, username, name) values (2, 'fredl@htl.at', 'Fredl', 'Fredl');
insert into Player (id, email, username, name) values (3, 'lena@htl.at', 'LenaRPG', 'Lena');
insert into Player (id, email, username, name) values (4, 'max@htl.at', 'MaxDragon', 'Max');

-- Sample campaign created by user 1 (Alex)
INSERT INTO campaign (id, name, description, story, player_id, is_public, max_player_count, started)
VALUES (9001, 'Die Schatten von Grünwald', 'Eine mysteriöse Dunkelheit breitet sich im Grünwald aus. Mutige Abenteurer werden gesucht, um das Geheimnis zu lüften.', 'Die Spieler werden herausfinden, dass ein alter Nekromant namens Malachar in den Ruinen unter dem Wald erwacht ist. Er plant, eine Armee der Untoten zu erschaffen. Die Gruppe muss drei magische Artefakte finden, um ihn zu stoppen.', 1, true, 5, false);

-- Sample character for user 2 (Fredl)
INSERT INTO character (id, name, classId, backgroundId, level, isCreated, info, race, alignment, owner_player_id)
VALUES (9001, 'Thorin Eisenfaust', 5, 1, 1, true, 'Ein erfahrener Zwergenkämpfer aus den Bergen von Kazad-Dum. Er sucht nach dem Mörder seines Bruders.', 'Zwerg', 'Rechtschaffen Gut', 2);

-- Sample character for user 3 (Lena)
INSERT INTO character (id, name, classId, backgroundId, level, isCreated, info, race, alignment, owner_player_id)
VALUES (9002, 'Elara Mondschein', 2, 1, 1, true, 'Eine elfische Bardin, die durch die Lande reist und Geschichten vergessener Helden sammelt. Ihre Musik kann Herzen heilen und Feinde in den Schlaf singen.', 'Elf', 'Chaotisch Gut', 3);

-- Sample character for user 4 (Max)
INSERT INTO character (id, name, classId, backgroundId, level, isCreated, info, race, alignment, owner_player_id)
VALUES (9003, 'Grimjaw der Wilde', 1, 1, 1, true, 'Ein halborkischer Barbar aus den nördlichen Steppen. Nachdem sein Stamm von Gnolls überfallen wurde, zieht er als einsamer Krieger durch die Welt, getrieben von Rache und dem Wunsch, einen neuen Stamm zu finden.', 'Halbork', 'Chaotisch Neutral', 4);



-- Character abilities for Thorin (Fredl - Fighter)
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9001, 9001, 1, 16);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9002, 9001, 2, 12);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9003, 9001, 3, 15);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9004, 9001, 4, 10);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9005, 9001, 5, 13);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9006, 9001, 6, 8);

-- Character abilities for Elara (Lena - Bard)
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9007, 9002, 1, 8);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9008, 9002, 2, 14);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9009, 9002, 3, 12);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9010, 9002, 4, 13);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9011, 9002, 5, 10);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9012, 9002, 6, 17);

-- Character abilities for Grimjaw (Max - Barbarian)
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9013, 9003, 1, 18);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9014, 9003, 2, 13);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9015, 9003, 3, 16);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9016, 9003, 4, 7);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9017, 9003, 5, 11);
INSERT INTO character_ability (id, character_id, ability_id, score) VALUES (9018, 9003, 6, 10);

-- Campaign player entries: User 1 as DM, User 2 as approved player
INSERT INTO campaign_player (id, campaign_id, player_id, role, joined_at, character_id, character_status)
VALUES (9001, 9001, 1, 'DM', 1706000000000, null, 'NONE');

INSERT INTO campaign_player (id, campaign_id, player_id, role, joined_at, character_id, character_status)
VALUES (9002, 9001, 2, 'PLAYER', 1706100000000, 9001, 'APPROVED');

INSERT INTO campaign_player (id, campaign_id, player_id, role, joined_at, character_id, character_status)
VALUES (9003, 9001, 3, 'PLAYER', 1706200000000, 9002, 'APPROVED');

INSERT INTO campaign_player (id, campaign_id, player_id, role, joined_at, character_id, character_status)
VALUES (9004, 9001, 4, 'PLAYER', 1706300000000, 9003, 'APPROVED');

-- sample campaigns for testing (commented out for now)
-- insert into campaign (name, description, player_id) values ('Schattenwald', 'A haunted forest campaign', 2);
-- insert into campaign (name, description, player_id) values ('Versunkene Ruinen', 'Explore the ruins beneath the sea', 2);

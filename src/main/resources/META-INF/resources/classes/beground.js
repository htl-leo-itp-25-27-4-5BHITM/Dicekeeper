const btn = document.querySelector(".backgroundBtn"); 
const output = document.getElementById("output");

let isOpen = false; // Zustand merken

btn.addEventListener("click", () => {
    try {
        if (!isOpen) {
            // Inhalt anzeigen
            output.innerHTML = `
            <div id="descriptionBackground" class="hiddenBackground">
              <div class="contentBackground">
                You devoted yourself to service in a temple, either nestled in a town or secluded in a sacred grove. There you performed rites in honor of a god or pantheon. You served under a priest and studied religion. Thanks to your priest’s instruction and your own devotion, you also learned how to channel a modicum of divine power in service to your place of worship and the people who prayed there.
              </div>

              <hr class="backgroundHR">

              <div class="detailsBackground">
                <p><strong>Ability Scores:</strong> Intelligence, Wisdom, Charisma</p>
                <p><strong>Feat:</strong> Magic Initiate (Cleric)</p>
                <p><strong>Skill Proficiencies:</strong> Insight and Religion</p>
                <p><strong>Tool Proficiencies:</strong> Calligrapher's Supplies</p>
                <p><strong>Equipment:</strong> <em>Choose A or B:</em> 
                    (A) Calligrapher's Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP; 
                    or (B) 50 GP
                </p>
              </div>

              <button id="saveBtn" class="saveBackgroundBtn">Save</button>
            </div>
            `;

            btn.textContent = "–"; // Button ändern

            // Save-Button Event Listener hinzufügen
            document.getElementById("saveBtn").addEventListener("click", () => {
                alert("Your background has been saved!");  
                // Hier kannst du später localStorage, Backend, Datei usw. einbauen
            });

        } else {
            // Inhalt ausblenden
            output.innerHTML = "";
            btn.textContent = "+"; // Button wieder ändern
        }

        isOpen = !isOpen; // Zustand umschalten
    } catch (error) {
        output.textContent = "Fehler beim Laden.";
        console.error(error);
    }
});

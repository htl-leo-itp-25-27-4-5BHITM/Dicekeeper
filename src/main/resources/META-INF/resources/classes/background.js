const btn = document.querySelector(".backgroundBtn");
const output = document.getElementById("output");

let isOpen = false;
let backgroundData = null;

// ----------------------------------
// API laden
// ----------------------------------
async function loadBackground() {
    try {
        const res = await fetch("/api/background/all"); // API → JSON
        const data = await res.json();

        // wir nehmen den Acolyte -> index 0
        backgroundData = data[0];

        // Obere Infos automatisch einsetzen
        document.getElementById("bg-title").textContent = backgroundData.name;
        document.getElementById("bg-feat").textContent = backgroundData.feat;
        document.getElementById("bg-skills").textContent = backgroundData.skills;

    } catch (err) {
        console.error(err);
        document.getElementById("bg-title").textContent = "Fehler beim Laden!";
    }
}

loadBackground();

// ----------------------------------
// Toggle: Inhalt öffnen / schließen
// ----------------------------------
btn.addEventListener("click", () => {
    if (!backgroundData) return; // Sicherheit

    if (!isOpen) {
        // ALLES anzeigen
        output.innerHTML = `
            <div id="descriptionBackground">

              <div class="contentBackground">
                ${backgroundData.description}
              </div>

              <hr class="backgroundHR">

              <div class="detailsBackground">
                <p><strong>Ability Scores:</strong> ${backgroundData.ability_scores}</p>
                <p><strong>Feat:</strong> ${backgroundData.feat}</p>
                <p><strong>Skill Proficiencies:</strong> ${backgroundData.skills}</p>
                <p><strong>Tool Proficiencies:</strong> ${backgroundData.tool_proficiencies}</p>
                <p><strong>Equipment:</strong> ${backgroundData.equipment}</p>
              </div>

              <button id="saveBtn" class="saveBackgroundBtn">Save</button>
            </div>
        `;

        btn.textContent = "–"; // Toggle ändern

        document.getElementById("saveBtn").addEventListener("click", () => {
            alert("Your background has been saved!");
        });

    } else {
        // Schließen
        output.innerHTML = "";
        btn.textContent = "+";
    }

    isOpen = !isOpen;
});

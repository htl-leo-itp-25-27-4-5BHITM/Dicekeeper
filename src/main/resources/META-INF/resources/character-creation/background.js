const btn = document.querySelector(".backgroundBtn");
const output = document.getElementById("output");

let isOpen = false;
let backgroundData = null;

function getCharacterId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function loadBackground() {
    try {
        const res = await fetch("/api/background/all");
        if (!res.ok) throw new Error("API error " + res.status);
        const data = await res.json();

        // Take first background (Acolyte) for now
        backgroundData = data[0];

        document.getElementById("bg-title").textContent = backgroundData.name;
        document.getElementById("bg-feat").textContent = backgroundData.feat;
        document.getElementById("bg-skills").textContent = backgroundData.skills;
    } catch (err) {
        console.error(err);
        document.getElementById("bg-title").textContent = "Fehler beim Laden!";
    }
}

function renderOpen() {
    if (!backgroundData) return;

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

    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", saveBackground);
    }
}

async function saveBackground() {
    const characterId = getCharacterId();
    if (!characterId) {
        alert("Kein ?id= Parameter in der URL – Charakter unbekannt.");
        return;
    }
    if (!backgroundData) {
        alert("Kein Background geladen.");
        return;
    }

    const res = await fetch(`/api/character/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backgroundId: backgroundData.id }),
    });

    if (!res.ok) {
        console.error("Failed to save background:", await res.text());
        alert("Fehler beim Speichern des Backgrounds.");
        return;
    }

    // back to main character page
    window.location.href = `./start.html?id=${encodeURIComponent(characterId)}`;
}

btn.addEventListener("click", () => {
    if (!backgroundData) return;

    if (!isOpen) {
        renderOpen();
        btn.textContent = "–";
    } else {
        output.innerHTML = "";
        btn.textContent = "+";
    }
    isOpen = !isOpen;
});

document.addEventListener("DOMContentLoaded", loadBackground);

// --------- Helpers ---------
function getCharacterId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function patchCharacter(data) {
    const characterId = getCharacterId();
    if (!characterId) {
        console.error("No character ID in URL, cannot PATCH character.");
        return;
    }

    const res = await fetch(`/api/character/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        console.error("Failed to PATCH character:", await res.text());
    } else {
        console.log("Saved character fields:", data);
    }
}

async function saveAbilityScore(abilityId, score) {
    const characterId = getCharacterId();
    if (!characterId) {
        console.warn("No character id in URL, not saving ability score.");
        return;
    }

    try {
        const res = await fetch(`/api/character-ability/${characterId}/${abilityId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: Number(score) || 0 })
        });

        if (!res.ok) {
            console.error('Failed to save ability score:', await res.text());
        }
    } catch (err) {
        console.error('Error while saving ability score:', err);
    }
}


// --------- Ability Scores UI ---------
let attrsAbility = [];
const inputsAbility = [];

const attributesDiv = document.getElementById("attributesAbility");
const totalBudgetInput = document.getElementById("totalBudgetAbility");
const usedSpan = document.getElementById("usedAbility");
const remainingSpan = document.getElementById("remainingAbility");

async function fetchAbilities() {
    if (!attributesDiv) return; // page without ability UI

    try {
        const response = await fetch("/api/ability/all");
        if (!response.ok) {
            throw new Error("Network response was not ok " + response.statusText);
        }
        const data = await response.json();
        attrsAbility = data.map((ability) => ({
            key: ability.id,
            label: ability.name,
            desc: ability.description,
        }));
    } catch (err) {
        console.error("There has been a problem with your fetch operation:", err);
        attrsAbility = [];
    }

    attrsAbility.forEach((a) => {
        const { row, input } = createRowAbility(a);
        attributesDiv.appendChild(row);
        inputsAbility.push(input);
    });

    const characterId = getCharacterId();
    if (characterId) {
        await loadAbilityScores(characterId);
    }

    updateAbility();
}

function createRowAbility(attr) {
    const row = document.createElement("div");
    row.className = "rowAbility";

    const left = document.createElement("div");
    left.innerHTML = `<div class="attrNameAbility">${attr.label}</div><span class="attrDescAbility">${attr.desc}</span>`;

    const right = document.createElement("div");
    right.className = "controlsAbility";

    const dec = document.createElement("button");
    dec.type = "button";
    dec.textContent = "−";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.value = "0";
    input.step = "1";
    input.dataset.abilityId = String(attr.key);
    input.className = "counterField";

    const inc = document.createElement("button");
    inc.type = "button";
    inc.textContent = "+";

    dec.addEventListener('click', () => {
        input.value = Math.max(0, parseInt(input.value || 0) - 1);
        updateAbility();
        saveAbilityScore(attr.key, input.value);
    });

    inc.addEventListener('click', () => {
        const totalBudget = Math.max(0, Math.floor(Number(totalBudgetInput.value) || 0));
        const used = getUsedPointsAbility();
        if (used < totalBudget) {
            input.value = Math.max(0, parseInt(input.value || 0) + 1);
            updateAbility();
            saveAbilityScore(attr.key, input.value);
        }
    });

    input.addEventListener('input', () => {
        if (input.value === '') return;
        input.value = Math.max(0, Math.floor(Number(input.value) || 0));
        const totalBudget = Math.max(0, Math.floor(Number(totalBudgetInput.value) || 0));
        let used = getUsedPointsAbility();
        if (used > totalBudget) {
            input.value = Math.max(0, input.value - (used - totalBudget));
        }
        updateAbility();
        saveAbilityScore(attr.key, input.value);
    });


    right.appendChild(dec);
    right.appendChild(input);
    right.appendChild(inc);
    row.appendChild(left);
    row.appendChild(right);
    return { row, input };
}

function getUsedPointsAbility() {
    return inputsAbility.reduce(
        (sum, i) => sum + Math.max(0, Math.floor(Number(i.value) || 0)),
        0
    );
}

function updateAbility() {
    if (!totalBudgetInput || !usedSpan || !remainingSpan) return;

    const totalBudget = Math.max(0, Math.floor(Number(totalBudgetInput.value) || 0));
    const used = getUsedPointsAbility();
    const remaining = totalBudget - used;

    usedSpan.textContent = String(used);
    remainingSpan.textContent = String(remaining);

    // Disable plus buttons if budget reached
    document.querySelectorAll(".controlsAbility button:last-child").forEach((btn) => {
        btn.disabled = remaining <= 0;
        btn.style.opacity = remaining <= 0 ? "0.4" : "1";
        btn.style.cursor = remaining <= 0 ? "not-allowed" : "pointer";
    });

    remainingSpan.style.color = remaining < 0 ? "#ff7b7b" : "";
}

async function loadAbilityScores(characterId) {
    try {
        const res = await fetch(`/api/character/${characterId}/getAbilityScores`);
        if (!res.ok) throw new Error("Failed to fetch ability scores: " + res.statusText);
        const abilityScores = await res.json();

        abilityScores.forEach((score) => {
            const input = inputsAbility.find(
                (i) => Number(i.dataset.abilityId) === score.abilityId
            );
            if (input) {
                input.value = String(score.score);
            }
        });

        updateAbility();
    } catch (err) {
        console.error(err);
    }
}

// --------- Character meta (name, class, background, info) ---------

async function loadCharacterMeta(characterId) {
    try {
        const res = await fetch(`/api/character/${characterId}`);
        if (!res.ok) {
            console.error("Failed to fetch character data:", res.statusText);
            return;
        }
        const characterData = await res.json();

        const nameInput = document.getElementById("nameInput");
        const infoInput = document.getElementById("charakterInfoInput");

        if (nameInput) nameInput.value = characterData.name || "";
        if (infoInput) infoInput.value = characterData.info || "";

        // Class text & image
        if (characterData.classId) {
            fetch(`/api/classes/${characterData.classId}`)
                .then((r) => {
                    if (!r.ok) throw new Error("Failed to fetch class data: " + r.statusText);
                    return r.json();
                })
                .then((classData) => {
                    const classBox = document.querySelector(".nextPage.class");
                    if (classBox) {
                        classBox.textContent = classData.name || "";
                    }
                    const imgBox = document.getElementById("imgBox");
                    if (imgBox && classData.name) {
                        imgBox.innerHTML = `<img src="../images/${classData.name}.png" alt="Accent Image" style="max-width:100%;max-height:100%;">`;
                    }
                })
                .catch(console.error);
        }

        // Background text
        if (characterData.backgroundId) {
            fetch(`/api/background/${characterData.backgroundId}`)
                .then((r) => {
                    if (!r.ok)
                        throw new Error("Failed to fetch background data: " + r.statusText);
                    return r.json();
                })
                .then((bgData) => {
                    const bgBox = document.querySelector(".nextPage.background");
                    if (bgBox) {
                        bgBox.textContent = bgData.name || "";
                    }
                })
                .catch(console.error);
        }
    } catch (err) {
        console.error(err);
    }
}

// --------- Navigation & clear buttons on start.html ---------

function openPage(relativeUrl) {
    const id = getCharacterId();
    const url = id
        ? `${relativeUrl}?id=${encodeURIComponent(id)}`
        : relativeUrl;
    window.location.href = url;
}

function initNavigation() {
    document.querySelectorAll(".nextPage").forEach((box) => {
        const target = box.dataset.target;
        if (target) {
            box.addEventListener("click", () => openPage(target));
        }
    });
}

function initNameAndInfoHandlers() {
    const nameInput = document.getElementById("nameInput");
    if (nameInput) {
        nameInput.addEventListener("blur", async () => {
            const newName = nameInput.value.trim();
            await patchCharacter({ name: newName });
        });
        nameInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                nameInput.blur();
            }
        });
    }

    const infoInput = document.getElementById("charakterInfoInput");
    if (infoInput) {
        infoInput.addEventListener("blur", async () => {
            const newInfo = infoInput.value.trim();
            await patchCharacter({ info: newInfo });
        });
        infoInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                infoInput.blur();
            }
        });
    }
}

function initClearButtons() {
    // Name X
    const clearName = document.getElementById("clearName");
    if (clearName) {
        clearName.addEventListener("click", async (e) => {
            e.stopPropagation();
            const nameInput = document.getElementById("nameInput");
            if (nameInput) {
                nameInput.value = "";
                await patchCharacter({ name: "" });
            }
        });
    }

    // Class X
    const clearClass = document.getElementById("clearClass");
    if (clearClass) {
        clearClass.addEventListener("click", async (e) => {
            e.stopPropagation();
            const classBox = document.querySelector(".nextPage.class");
            if (classBox) {
                classBox.innerHTML = '<img src="../images/plus.png" class="plus">';
            }
            const imgBox = document.getElementById("imgBox");
            if (imgBox) {
                imgBox.innerHTML =
                    '<img id="accImg" src="../images/account-template.png">';
            }
            await patchCharacter({ classId: 0 }); // backend: 0 = no class
        });
    }

    // Background X
    const clearBackground = document.getElementById("clearBackground");
    if (clearBackground) {
        clearBackground.addEventListener("click", async (e) => {
            e.stopPropagation();
            const bgBox = document.querySelector(".nextPage.background");
            if (bgBox) {
                bgBox.innerHTML = '<img src="../images/plus.png" class="plus">';
            }
            await patchCharacter({ backgroundId: 0 }); // backend: 0 = no background
        });
    }
}

// --------- Init ---------
document.addEventListener("DOMContentLoaded", async () => {
    const characterId = getCharacterId();

    initNavigation();
    initNameAndInfoHandlers();
    initClearButtons();

    if (characterId) {
        await loadCharacterMeta(characterId);
    }

    if (totalBudgetInput) {
        totalBudgetInput.addEventListener("input", () => {
            totalBudgetInput.value = String(
                Math.max(0, Math.floor(Number(totalBudgetInput.value) || 0))
            );
            updateAbility();
        });
    }

    await fetchAbilities();
});

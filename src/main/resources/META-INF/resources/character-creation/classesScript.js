let selectedClassId = null;

function getCharacterId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function loadClasses() {
    try {
        const res = await fetch("/api/classes");
        if (!res.ok) throw new Error("API error " + res.status);
        const items = await res.json();
        buildSlider(items);
    } catch (err) {
        console.error("Failed to load classes:", err);
        const slider = document.getElementById("slider");
        if (slider) {
            slider.innerHTML = '<p style="padding:1em">Fehler beim Laden der Daten.</p>';
        }
    }
}

// called from onclick="save()" in classes.html
async function save() {
    const characterId = getCharacterId();
    if (!characterId) {
        alert("Kein ?id= Parameter in der URL – Charakter unbekannt.");
        return;
    }
    if (!selectedClassId) {
        alert("Bitte zuerst eine Klasse auswählen.");
        return;
    }

    const res = await fetch(`/api/character/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId }),
    });

    if (!res.ok) {
        console.error("Failed to save class:", await res.text());
        alert("Fehler beim Speichern der Klasse.");
        return;
    }

    // back to main page
    window.location.href = `./start.html?id=${encodeURIComponent(characterId)}`;
}

function buildSlider(items) {
    const slider = document.getElementById("slider");
    const detail = document.getElementById("detail");
    const detailImg = document.getElementById("detailImg");
    const detailTitle = document.getElementById("detailTitle");
    const detailText = document.getElementById("detailText");
    const backBtn = document.getElementById("backBtn");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    if (!slider || !detail || !detailImg || !detailTitle || !detailText) return;

    slider.innerHTML = "";

    items.forEach((it) => {
        const btn = document.createElement("button");
        btn.className = "thumb";
        btn.innerHTML = `
            <img src="../images/${it.name}.png" alt="${it.name}">
            <div class="label">${it.name}</div>`;
        btn.addEventListener("click", () => {
            location.hash = `photo-${it.id}`;
        });
        slider.appendChild(btn);
    });

    function updateView() {
        const thumbs = Array.from(slider.querySelectorAll(".thumb"));
        thumbs.forEach((thumb) => {
            thumb.classList.remove("small", "medium", "large");
        });
        if (thumbs.length === 0) return;

        // center = index 2 (visual center of 5)
        const center = 2;
        thumbs.forEach((thumb, i) => {
            if (i === center) thumb.classList.add("large");
            else if (i === center - 1 || i === center + 1) thumb.classList.add("medium");
            else thumb.classList.add("small");
        });
    }

    prevBtn?.addEventListener("click", () => {
        if (items.length > 0) {
            items.unshift(items.pop());
            rebuild();
        }
    });

    nextBtn?.addEventListener("click", () => {
        if (items.length > 0) {
            items.push(items.shift());
            rebuild();
        }
    });

    function rebuild() {
        slider.innerHTML = "";
        items.forEach((it) => {
            const btn = document.createElement("button");
            btn.className = "thumb";
            btn.innerHTML = `
                <img src="../images/${it.name}.png" alt="${it.name}">
                <div class="label">${it.name}</div>`;
            btn.addEventListener("click", () => {
                location.hash = `photo-${it.id}`;
            });
            slider.appendChild(btn);
        });
        updateView();
    }

    updateView();

    function showDetail(id) {
        const it = items.find((x) => x.id === id);
        if (!it) return;
        selectedClassId = it.id;
        console.log("Selected class ID:", selectedClassId);
        detailImg.src = `../images/${it.name}.png`;
        detailTitle.textContent = it.name;
        detailText.textContent = it.description || "";
        detail.classList.add("active");
    }

    function hideDetail() {
        detail.classList.remove("active");
        history.replaceState(null, "", location.pathname);
    }

    window.addEventListener("hashchange", () => {
        const match = location.hash.match(/^#photo-(\d{1,3})$/);
        if (match) {
            showDetail(Number(match[1]));
        } else {
            hideDetail();
        }
    });

    backBtn?.addEventListener("click", hideDetail);
}

document.addEventListener("DOMContentLoaded", loadClasses);

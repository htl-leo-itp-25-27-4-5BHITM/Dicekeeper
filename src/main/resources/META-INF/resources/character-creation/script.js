// const attrsAbility = [
//     {key:'strength', label:'Strength', desc:'measuring physical power'},
//     {key:'dexterity', label:'Dexterity', desc:'measuring agility'},
//     {key:'constitution', label:'Constitution', desc:'measuring endurance'},
//     {key:'intelligence', label:'Intelligence', desc:'measuring reasoning and memory'},
//     {key:'wisdom', label:'Wisdom', desc:'measuring perception and insight'},
//     {key:'charisma', label:'Charisma', desc:'measuring force of personality'}
// ];
let attrsAbility
const inputsAbility = [];
fetchAbilities();

async function fetchAbilities() {
    attrsAbility = await fetch('/api/ability/all')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            return data.map(ability => ({
                key: ability.id,
                label: ability.name,
                desc: ability.description
            }));
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
            return [];
        });

    attrsAbility.forEach(a => {
        const {row, input} = createRowAbility(a);
        attributesDiv.appendChild(row);
        inputsAbility.push(input);
    });

    console.log(attrsAbility);
}


function getCharacterId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}


const attributesDiv = document.getElementById('attributesAbility');
const totalBudgetInput = document.getElementById('totalBudgetAbility');
const usedSpan = document.getElementById('usedAbility');
const remainingSpan = document.getElementById('remainingAbility');

function createRowAbility(attr) {
    const row = document.createElement('div');
    row.className = 'rowAbility';

    const left = document.createElement('div');
    left.innerHTML = `<div class="attrNameAbility">${attr.label}</div><span class="attrDescAbility">${attr.desc}</span>`;

    const right = document.createElement('div');
    right.className = 'controlsAbility';

    const dec = document.createElement('button');
    dec.type = 'button';
    dec.textContent = '−';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.value = '0';
    input.step = '1';
    input.dataset.key = attr.key;
    input.className = 'counterField';
    const inc = document.createElement('button');
    inc.type = 'button';
    inc.textContent = '+';


//DONE: load character data from backend

    loadCharacterData();

    async function loadCharacterData() {
        const params = new URLSearchParams(window.location.search);
        let characterId = params.get('id');

        const response = await fetch('/api/character/' + characterId);

        if (!response.ok) {
            console.error('Failed to fetch character data:', response.statusText);
            return;
        }

        const characterData = await response.json();

        console.log('Character Data:', characterData.backgroundId);

        fetch('/api/classes/' + characterData.classId)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to fetch class data: ' + res.statusText);
                }
                return res.json();
            })
            .then(classData => {
                // console.log('Class Data:', classData);
                document.getElementsByClassName('class').item(0).textContent = classData.name || '';
                document.getElementById('imgBox').innerHTML = `<img src="/images/${classData.name || ''}.png" alt="Accent Image" style="max-width: 100%; max-height: 100%;">`;
            })
            .catch(error => {
                console.error(error);
            });

        fetch('/api/background/' + characterData.backgroundId)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to fetch background data: ' + res.statusText);
                }
                return res.json();
            })
            .then(backgroundData => {
                // console.log('Background Data:', backgroundData);
                document.getElementsByClassName('background').item(0).textContent = backgroundData.name || '';
            })
            .catch(error => {
                console.error(error);
            });

        // populate fields (name, class, background, info)
        document.getElementById('nameInput').value = characterData.name || '';
        document.getElementById('charakterInfoInput').value = characterData.info || '';

        // populate ability scores
        fetch('/api/character/' + characterId + '/getAbilityScores')
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to fetch ability scores: ' + res.statusText);
                }
                return res.json();
            })
            .then(abilityScores => {
                // console.log('Ability Scores:', abilityScores[0].abilityId);
                // console.log('Current Attribute:', attr.key);
                abilityScores.forEach(score => {
                    if (score.abilityId === attr.key) {
                        input.value = score.score;
                    }
                });
                updateAbility();
            })
            .catch(error => {
                console.error(error);
            });

    }

// TODO: save character data to backend

    document.getElementById('nameInput').addEventListener('blur', saveName);
    document.getElementById('nameInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            this.blur(); // Remove focus from input
        }
    })

    async function saveName() {
        const newName = document.getElementById('nameInput').value.trim();

        await patchCharacter({
            name: newName
        });
    }

    document.getElementById('charakterInfoInput').addEventListener('blur', saveInfo);
    document.getElementById('charakterInfoInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            this.blur(); // Remove focus from input
        }
    })

    async function saveInfo() {
        const newInfo = document.getElementById('charakterInfoInput').value.trim();

        await patchCharacter({
            info: newInfo
        });
    }


    async function patchCharacter(data) {
        const characterId = getCharacterId();
        if (!characterId) {
            console.error("No character ID found in URL.");
            return;
        }

        const response = await fetch(`/api/character/${characterId}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            console.error("Failed to PATCH character:", await response.text());
        } else {
            console.log("Saved:", data);
        }
    }






    dec.addEventListener('click', () => {
        input.value = Math.max(0, parseInt(input.value || 0) - 1);
        updateAbility();
    });
    inc.addEventListener('click', () => {
        const totalBudget = Math.max(0, Math.floor(Number(totalBudgetInput.value) || 0));
        const used = getUsedPointsAbility();
        if (used < totalBudget) input.value = Math.max(0, parseInt(input.value || 0) + 1);
        updateAbility();
    });
    input.addEventListener('input', () => {
        if (input.value === '') return;
        input.value = Math.max(0, Math.floor(Number(input.value) || 0));
        const totalBudget = Math.max(0, Math.floor(Number(totalBudgetInput.value) || 0));
        let used = getUsedPointsAbility();
        if (used > totalBudget) input.value = Math.max(0, input.value - (used - totalBudget));
        updateAbility();
    });

    right.appendChild(dec);
    right.appendChild(input);
    right.appendChild(inc);
    row.appendChild(left);
    row.appendChild(right);
    return {row, input};
}


function getUsedPointsAbility() {
    return inputsAbility.reduce((s, i) => s + Math.max(0, Math.floor(Number(i.value) || 0)), 0);
}

function updateAbility() {
    const totalBudget = Math.max(0, Math.floor(Number(totalBudgetInput.value) || 0));
    const used = getUsedPointsAbility();
    const remaining = totalBudget - used;
    usedSpan.textContent = used;
    remainingSpan.textContent = remaining;

// Disable plus buttons if budget reached
    document.querySelectorAll('.controlsAbility button:last-child').forEach(btn => {
        btn.disabled = remaining <= 0;
        btn.style.opacity = remaining <= 0 ? 0.4 : 1;
        btn.style.cursor = remaining <= 0 ? 'not-allowed' : 'pointer';
    });

    remainingSpan.style.color = remaining < 0 ? '#ff7b7b' : '';
}

totalBudgetInput.addEventListener('input', () => {
    totalBudgetInput.value = Math.max(0, Math.floor(Number(totalBudgetInput.value) || 0));
    updateAbility();
});

updateAbility();

function openPage(url) {
    window.location.href = url;
}

function clearField(divId) {
    const target = document.getElementsByClassName(divId);
    if (!target) {
        console.error("Element mit dieser ID wurde nicht gefunden:", divId);
        return;
    }

    // Beispiel: Neue Box mit Bild erzeugen
    const newContent = `
         <div class="box_round enterName">
            <input id="nameInput" type="text" placeholder="Enter Name">
            <img id="cross" src="../images/cross.png" onclick="clearField('enterName')">
        </div>
    `;

    const newContent2 = `
         <div class="nextPage class">
            <img src="../images/plus.png" class="plus" onclick="openPage('./classes.html')">
        </div>
    `;

    const newContent3 = `
         <div class="nextPage background">
            <img src="../images/plus.png" class="plus" onclick="openPage('./background.html')">
        </div>
    `;

    if(divId == 'enterName'){
        target.innerHTML = newContent;
    } else if (divId == 'class'){
        target.innerHTML = newContent2;
    } else if (divId == 'background'){
        target.innerHTML = newContent3;
    }
}
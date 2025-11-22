const attrsAbility = [
    {key:'strength', label:'Strength', desc:'measuring physical power'},
    {key:'dexterity', label:'Dexterity', desc:'measuring agility'},
    {key:'constitution', label:'Constitution', desc:'measuring endurance'},
    {key:'intelligence', label:'Intelligence', desc:'measuring reasoning and memory'},
    {key:'wisdom', label:'Wisdom', desc:'measuring perception and insight'},
    {key:'charisma', label:'Charisma', desc:'measuring force of personality'}
];

const attributesDiv = document.getElementById('attributesAbility');
const totalBudgetInput = document.getElementById('totalBudgetAbility');
const usedSpan = document.getElementById('usedAbility');
const remainingSpan = document.getElementById('remainingAbility');

function createRowAbility(attr){
const row = document.createElement('div');
row.className = 'rowAbility';

const left = document.createElement('div');
left.innerHTML = `<div class="attrNameAbility">${attr.label}</div><span class="attrDescAbility">${attr.desc}</span>`;

const right = document.createElement('div');
right.className = 'controlsAbility';

const dec = document.createElement('button'); dec.type='button'; dec.textContent='−';
const input = document.createElement('input'); input.type='number'; input.min='0'; input.value='0'; input.step='1'; input.dataset.key = attr.key; input.className='counterField';
const inc = document.createElement('button'); inc.type='button'; inc.textContent='+';

dec.addEventListener('click', ()=>{ 
    input.value = Math.max(0, parseInt(input.value||0)-1); 
    updateAbility(); 
});
inc.addEventListener('click', ()=>{
    const totalBudget = Math.max(0, Math.floor(Number(totalBudgetInput.value)||0));
    const used = getUsedPointsAbility();
    if (used < totalBudget) input.value = Math.max(0, parseInt(input.value||0)+1);
    updateAbility();
});
input.addEventListener('input', ()=>{ 
    if (input.value==='') return; 
    input.value = Math.max(0, Math.floor(Number(input.value)||0));
    const totalBudget = Math.max(0, Math.floor(Number(totalBudgetInput.value)||0));
    let used = getUsedPointsAbility();
    if (used > totalBudget) input.value = Math.max(0, input.value - (used - totalBudget));
    updateAbility(); 
});

right.appendChild(dec); right.appendChild(input); right.appendChild(inc);
row.appendChild(left); row.appendChild(right);
return {row, input};
}

const inputsAbility = [];
attrsAbility.forEach(a=>{
const {row,input} = createRowAbility(a);
attributesDiv.appendChild(row);
inputsAbility.push(input);
});

function getUsedPointsAbility(){
return inputsAbility.reduce((s,i)=> s + Math.max(0, Math.floor(Number(i.value)||0)), 0);
}

function updateAbility(){
const totalBudget = Math.max(0, Math.floor(Number(totalBudgetInput.value)||0));
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

totalBudgetInput.addEventListener('input', ()=>{ 
totalBudgetInput.value = Math.max(0, Math.floor(Number(totalBudgetInput.value)||0)); 
updateAbility(); 
});

updateAbility();
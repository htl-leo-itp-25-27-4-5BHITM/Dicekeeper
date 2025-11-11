  const startSection = document.getElementById("startSection");
    const sliderSection = document.getElementById("sliderSection");

    function showSlider() {
      startSection.classList.add("fadeOut");
      setTimeout(() => {
        startSection.style.display = "none";
        sliderSection.style.display = "flex";
        sliderSection.classList.add("fadeIn");
      }, 500);
    }

    function goBack() {
      sliderSection.classList.remove("fadeIn");
      sliderSection.classList.add("fadeOut");
      setTimeout(() => {
        sliderSection.style.display = "none";
        startSection.style.display = "flex";
        startSection.classList.remove("fadeOut");
      }, 500);
    }

async function loadClasses() {
    try {
        const res = await fetch('/api/classes');
        if (!res.ok) throw new Error('API error ' + res.status);
        const items = await res.json();
        buildSlider(items);
    } catch (err) {
        console.error('Failed to load classes:', err);
        const slider = document.getElementById('slider');
        slider.innerHTML = '<p style="padding:1em">Fehler beim Laden der Daten.</p>';
    }
}

function buildSlider(items) {
    const slider = document.getElementById('slider');
    const detail = document.getElementById('detail');
    const detailImg = document.getElementById('detailImg');
    const detailTitle = document.getElementById('detailTitle');
    const detailText = document.getElementById('detailText');
    const detailIndex = document.getElementById('detailIndex');
    const backBtn = document.getElementById('backBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    slider.innerHTML = '';

    items.forEach(it => {
        const btn = document.createElement('button');
        btn.className = 'thumb';
        btn.innerHTML = `
            <img src="../images/${it.name}.png" alt="${it.name}">
            <div class="label">${it.name}</div>`;
        btn.addEventListener('click', () => location.hash = `photo-${it.id}`);
        slider.appendChild(btn);
    });

    let offset = 0;

    function updateView() {
        const thumbs = [...slider.querySelectorAll('.thumb')];
        thumbs.forEach((thumb, i) => {
            thumb.classList.remove('small', 'medium', 'large');
        });

        const center = (offset + 2) % items.length;

        thumbs[(center - 2 + items.length) % items.length].classList.add('small');
        thumbs[(center - 1 + items.length) % items.length].classList.add('medium');
        thumbs[(center + 0) % items.length].classList.add('large');
        thumbs[(center + 1) % items.length].classList.add('medium');
        thumbs[(center + 2) % items.length].classList.add('small');
    }

    function move(dir) {
        offset = (offset + dir + items.length) % items.length;
        slider.appendChild(slider.firstElementChild);
        updateView();
    }

    prevBtn.addEventListener('click', () => {
        items.unshift(items.pop());
        rebuild();
    });
    nextBtn.addEventListener('click', () => {
        items.push(items.shift());
        rebuild();
    });

    function rebuild() {
        slider.innerHTML = '';
        items.forEach(it => {
            const btn = document.createElement('button');
            btn.className = 'thumb';
            btn.innerHTML = `<img src="../images/${it.name}.png" alt="${it.name}">
                             <div class="label">${it.name}</div>`;
            btn.addEventListener('click', () => location.hash = `photo-${it.id}`);
            slider.appendChild(btn);
        });
        updateView();
    }

    updateView();

    // Detail-Ansicht
    function showDetail(id) {
        const it = items.find(x => x.id === id);
        if (!it) return;
        detailImg.src = `../images/${it.name}.png`;
        detailTitle.textContent = it.name;
        detailText.textContent = it.description || '';
        detailIndex.textContent = it.id;
        detail.classList.add('active');
    }

    function hideDetail() {
        detail.classList.remove('active');
        history.replaceState(null, '', location.pathname);
    }

    window.addEventListener('hashchange', () => {
        const h = location.hash.match(/^#photo-(\d{1,3})$/);
        if (h) showDetail(Number(h[1]));
        else hideDetail();
    });

    backBtn.addEventListener('click', hideDetail);
}
loadClasses();


// Ability Scores
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
      const input = document.createElement('input'); input.type='number'; input.min='0'; input.value='0'; input.step='1'; input.dataset.key = attr.key;
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
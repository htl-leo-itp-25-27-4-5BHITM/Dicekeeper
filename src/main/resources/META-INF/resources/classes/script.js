async function loadClasses() {
        try {
            const res = await fetch('/api/classes');  // 👈 updated path
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

        function createThumb(it) {
            const t = document.createElement('button');
            t.className = 'thumb';
            t.setAttribute('data-id', it.id);
            const thumbSrc = `images/photo${it.id}_thumb.jpg`;
            t.innerHTML = `<img src="../images/${it.name}.png" alt="${it.name}"><div class="label">${it.name}</div>`;
            t.addEventListener('click', () => location.hash = `photo-${it.id}`);
            return t;
        }

        items.forEach(it => slider.appendChild(createThumb(it)));

        function checkLoop() {
            const scrollLeft = slider.scrollLeft;
            const maxScroll = slider.scrollWidth / 2;
            if (scrollLeft >= maxScroll) slider.scrollLeft -= maxScroll;
            if (scrollLeft === 0) slider.scrollLeft += maxScroll;
        }

        function scrollByStep(dir) {
            const step = 192;
            slider.scrollBy({ left: dir * step, behavior: 'smooth' });
            setTimeout(checkLoop, 600);
        }

        prevBtn.addEventListener('click', () => scrollByStep(-1));
        nextBtn.addEventListener('click', () => scrollByStep(1));
        slider.addEventListener('scroll', checkLoop);

        function showDetail(id) {
            const it = items.find(x => x.id === id);
            if (!it) return;
            const fullImg = `../images/${it.name}.png`;
            detailImg.src = fullImg;
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
    

    // 👇 load from /api/classes
    loadClasses();
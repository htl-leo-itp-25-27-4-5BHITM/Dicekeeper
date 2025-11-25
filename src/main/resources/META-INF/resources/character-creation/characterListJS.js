const listUrl = '/api/character/all'; // NOTE: backend uses singular /api/character
const createUrl = '/api/character/createInitialCharacter';

const statusEl = document.getElementById('status');
const listEl = document.getElementById('characters');
const createBtn = document.getElementById('createBtn');

function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.className = isError ? 'error' : 'muted';
}

async function loadCharacters() {
    setStatus('Loading...');
    listEl.innerHTML = '';
    try {
        const res = await fetch(listUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load characters: ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            setStatus('No characters found. Create a new one.');
            return;
        }
        setStatus('');
        for (const ch of data) {
            const li = document.createElement('li');
            const left = document.createElement('div');
            const name = document.createElement('button');
            name.className = 'linklike';
            name.textContent = ch.name || ('Character ' + (ch.id ?? ''));
            name.onclick = () => openCharacter(ch.id);
            left.appendChild(name);
            const meta = document.createElement('div');
            meta.className = 'muted';
            meta.textContent = 'id: ' + (ch.id ?? '—') + (ch.level ? (' · lvl ' + ch.level) : '');
            li.appendChild(left);
            li.appendChild(meta);
            listEl.appendChild(li);
        }
    } catch (err) {
        console.error(err);
        setStatus('Could not load characters. See console for details.', true);
    }
}

function openCharacter(id) {
    if (!id) return alert('Character id missing');
    // navigate to start.html with query param id
    window.location.href = './start.html?id=' + encodeURIComponent(id);
}

async function createCharacter() {
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';
    setStatus('Creating new character...');
    try {
        const res = await fetch(createUrl, { method: 'POST' });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error('Create failed: ' + res.status + ' ' + text);
        }
        // Expect created character JSON in response
        const created = await res.json();
        const id = created && (created.id ?? created.ID ?? created.Id);
        if (!id) {
            // if backend returns no body, try to refresh list and pick latest item
            await loadCharacters();
            setStatus('Created — but server did not return id. Pick the new character from the list.');
            createBtn.disabled = false;
            createBtn.textContent = 'Create new';
            return;
        }
        // go to start page for the new character
        window.location.href = './start.html?id=' + encodeURIComponent(id);
    } catch (err) {
        console.error(err);
        setStatus('Failed to create character: ' + err.message, true);
        createBtn.disabled = false;
        createBtn.textContent = 'Create new';
    }
}

createBtn.addEventListener('click', createCharacter);

// initial load
loadCharacters();

 (function () {
      const avatarEl = document.getElementById('profileAvatar');
      const avatarInitials = document.getElementById('avatarInitials');
      const avatarImage = document.getElementById('avatarImage');
      const profilePicInput = document.getElementById('profilePicInput');
      const profileEmail = document.getElementById('profileEmail');
      const usernameInput = document.getElementById('username');
      const displayNameInput = document.getElementById('displayName');
      const saveBtn = document.getElementById('saveBtn');
      const backBtn = document.getElementById('backBtn');
      const logoutBtn = document.getElementById('logoutBtn');
      const statusEl = document.getElementById('status');

      let currentPlayer = null;

      function setStatus(msg, type = 'info') {
        statusEl.textContent = msg || '';
        statusEl.className = 'status-' + type;
      }

      function initialsFromName(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }

      function updateAvatarDisplay(player) {
        if (player.profilePicture) {
          let imgUrl = player.profilePicture;
          if (imgUrl.startsWith('/uploads/')) {
            imgUrl = '..' + imgUrl;
          }
          avatarImage.src = imgUrl;
          avatarImage.style.display = 'block';
          avatarInitials.style.display = 'none';
        } else {
          avatarImage.style.display = 'none';
          avatarInitials.style.display = 'block';
          avatarInitials.textContent = initialsFromName(player.name || player.username || player.email);
        }
      }

      function loadPlayer() {
        try {
          const raw = sessionStorage.getItem('player');
          if (!raw) {
            setStatus('Nicht eingeloggt. Weiterleitung...', 'error');
            setTimeout(() => {
              window.location.href = './Login.html';
            }, 1500);
            return null;
          }
          return JSON.parse(raw);
        } catch (e) {
          console.error('Failed to parse player from session', e);
          setStatus('Session-Fehler. Bitte erneut anmelden.', 'error');
          return null;
        }
      }

      async function fetchLatestPlayer(playerId) {
        try {
          const res = await fetch('/api/player/id/' + encodeURIComponent(playerId), { cache: 'no-store' });
          if (res.ok) {
            return await res.json();
          }
        } catch (e) {
          console.warn('Could not fetch latest player data', e);
        }
        return null;
      }

      async function init() {
        currentPlayer = loadPlayer();
        if (!currentPlayer) return;

        // Fetch latest data from server
        const latestPlayer = await fetchLatestPlayer(currentPlayer.id);
        if (latestPlayer) {
          currentPlayer = latestPlayer;
          sessionStorage.setItem('player', JSON.stringify(currentPlayer));
        }

        // Populate form
        profileEmail.textContent = currentPlayer.email || '-';
        usernameInput.value = currentPlayer.username || '';
        displayNameInput.value = currentPlayer.name || '';
        updateAvatarDisplay(currentPlayer);
      }

      // Avatar click -> open file picker
      avatarEl.addEventListener('click', () => {
        profilePicInput.click();
      });

      // Handle file selection
      profilePicInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!currentPlayer || !currentPlayer.id) {
          setStatus('Kein Spieler geladen', 'error');
          return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
          setStatus('Nur JPG, PNG oder SVG erlaubt', 'error');
          return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setStatus('Datei zu groß (max 5MB)', 'error');
          return;
        }

        setStatus('Lade Profilbild hoch...', 'info');

        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch('/api/player/' + currentPlayer.id + '/upload-profile-picture', {
            method: 'POST',
            body: formData
          });

          if (!res.ok) {
            let txt = '';
            try { txt = await res.text(); } catch (err) {}
            throw new Error(txt || res.statusText || 'Upload fehlgeschlagen');
          }

          const updatedPlayer = await res.json();
          currentPlayer = updatedPlayer;
          sessionStorage.setItem('player', JSON.stringify(currentPlayer));
          updateAvatarDisplay(currentPlayer);
          setStatus('Profilbild aktualisiert!', 'success');
        } catch (err) {
          console.error('Profile picture upload failed', err);
          setStatus('Upload fehlgeschlagen: ' + (err.message || 'Unbekannt'), 'error');
        }
      });

      // Save button
      saveBtn.addEventListener('click', async () => {
        if (!currentPlayer || !currentPlayer.id) {
          setStatus('Kein Spieler geladen', 'error');
          return;
        }

        const newUsername = usernameInput.value.trim();
        const newName = displayNameInput.value.trim();

        if (!newUsername && !newName) {
          setStatus('Bitte mindestens ein Feld ausfüllen', 'error');
          return;
        }

        saveBtn.disabled = true;
        const origText = saveBtn.textContent;
        saveBtn.textContent = 'Speichern...';
        setStatus('Speichere Änderungen...', 'info');

        try {
          const payload = {};
          if (newUsername) payload.username = newUsername;
          if (newName) payload.name = newName;

          const res = await fetch('/api/player/' + currentPlayer.id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            let txt = '';
            try { txt = await res.text(); } catch (err) {}
            throw new Error(txt || res.statusText || 'Speichern fehlgeschlagen');
          }

          const updatedPlayer = await res.json();
          currentPlayer = updatedPlayer;
          sessionStorage.setItem('player', JSON.stringify(currentPlayer));
          updateAvatarDisplay(currentPlayer);
          setStatus('Profil gespeichert!', 'success');
        } catch (err) {
          console.error('Save failed', err);
          setStatus('Speichern fehlgeschlagen: ' + (err.message || 'Unbekannt'), 'error');
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = origText;
        }
      });

      // Back button
      backBtn.addEventListener('click', () => {
        window.location.href = './Campaigns.html';
      });

      // Logout button
      logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('player');
        setStatus('Abgemeldet. Weiterleitung...', 'success');
        setTimeout(() => {
          window.location.href = './Login.html';
        }, 1000);
      });

      // Initialize
      init();
    })();
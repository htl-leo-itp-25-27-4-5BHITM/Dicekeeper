  (function() {
      const params = new URLSearchParams(window.location.search);
      const campaignId = params.get('campaignId');

      const contentEl = document.getElementById('content');
      const statusEl = document.getElementById('statusMessage');

      let selectedCharacterId = null;

      function getPlayer() {
        try {
          const raw = sessionStorage.getItem('player');
          return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
      }

      function escapeHtml(s) {
        return String(s || '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
      }

      function showStatus(msg, isError) {
        statusEl.className = 'status-message ' + (isError ? 'error' : 'success');
        statusEl.textContent = msg;
        statusEl.style.display = 'block';
      }

      async function loadData() {
        const player = getPlayer();
        if (!player) {
          showStatus('Not logged in. Please log in first.', true);
          return;
        }

        if (!campaignId) {
          showStatus('No campaign specified.', true);
          return;
        }

        try {
          // Load campaign info
          const campaignRes = await fetch(`/api/campaign/${campaignId}`, { cache: 'no-store' });
          if (!campaignRes.ok) throw new Error('Failed to load campaign');
          const campaign = await campaignRes.json();

          // Load DM info
          let dmName = 'Unknown';
          if (campaign.playerId) {
            const dmRes = await fetch(`/api/player/id/${campaign.playerId}`, { cache: 'no-store' });
            if (dmRes.ok) {
              const dm = await dmRes.json();
              dmName = dm.username || dm.name;
            }
          }

          // Load player's characters
          const charsRes = await fetch('/api/character/all', { cache: 'no-store' });
          const allCharacters = charsRes.ok ? await charsRes.json() : [];

          // Filter to only show completed characters (for simplicity, show all for now)
          const characters = allCharacters;

          renderContent(campaign, dmName, characters);
        } catch (err) {
          console.error(err);
          showStatus('Error: ' + err.message, true);
          contentEl.innerHTML = '';
        }
      }

      function renderContent(campaign, dmName, characters) {
        const characterListHtml = characters.length > 0
          ? characters.map(c => `
            <div class="character-item" data-id="${c.id}">
              <div class="character-item-name">${escapeHtml(c.name) || 'Unnamed Character'}</div>
              <div class="character-item-meta">
                ${escapeHtml(c.characterClass?.name || 'No class')} •
                Level ${c.level || 1}
              </div>
            </div>
          `).join('')
          : '<div class="empty-message">You don\'t have any characters yet.</div>';

        contentEl.innerHTML = `
          <div class="campaign-info">
            <div class="campaign-name">${escapeHtml(campaign.name)}</div>
            <div class="campaign-dm">DM: ${escapeHtml(dmName)}</div>
          </div>

          <div class="section-title">Your Characters</div>
          <div class="character-list" id="characterList">
            ${characterListHtml}
          </div>

          <div class="divider"><span>or</span></div>

          <button class="create-new-btn" id="createNewBtn">+ Create New Character</button>

          <div class="actions">
            <button class="btn btn-secondary" onclick="window.location.href='./Campaigns.html'">Cancel</button>
            <button class="btn btn-primary" id="submitBtn" disabled>Submit Character</button>
          </div>
        `;

        setupHandlers();
      }

      function setupHandlers() {
        const characterList = document.getElementById('characterList');
        const submitBtn = document.getElementById('submitBtn');
        const createNewBtn = document.getElementById('createNewBtn');

        // Character selection
        characterList.addEventListener('click', (e) => {
          const item = e.target.closest('.character-item');
          if (!item) return;

          // Deselect all
          characterList.querySelectorAll('.character-item').forEach(el => el.classList.remove('selected'));

          // Select clicked
          item.classList.add('selected');
          selectedCharacterId = item.dataset.id;
          submitBtn.disabled = false;
        });

        // Create new character
        createNewBtn.addEventListener('click', () => {
          // Redirect to character creation with campaign context
          window.location.href = `../character-creation/CharacterCreate.html?campaignId=${campaignId}`;
        });

        // Submit character
        submitBtn.addEventListener('click', async () => {
          if (!selectedCharacterId) {
            showStatus('Please select a character.', true);
            return;
          }

          const player = getPlayer();
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting...';

          try {
            const res = await fetch(`/api/campaign-player/${campaignId}/${player.id}/submit-character`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ characterId: parseInt(selectedCharacterId) })
            });

            if (!res.ok) {
              const text = await res.text();
              throw new Error(text || 'Failed to submit character');
            }

            showStatus('Character submitted for DM approval!', false);
            setTimeout(() => {
              window.location.href = `./CampaignDetail.html?id=${campaignId}`;
            }, 1500);
          } catch (err) {
            console.error(err);
            showStatus('Error: ' + err.message, true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Character';
          }
        });
      }

      loadData();
    })();
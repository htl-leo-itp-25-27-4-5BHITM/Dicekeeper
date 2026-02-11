 (function(){
    const params = new URLSearchParams(window.location.search)
    const campaignId = params.get('id')
    let currentPlayer = null
    let campaign = null
    let playerRole = null
    let campaignPlayers = []
    let playerNameMap = {}
    let isPublic = true

    function setStatus(msg, isError = false) {
      const statusEl = document.getElementById('status')
      statusEl.textContent = msg
      statusEl.className = 'status show ' + (isError ? 'error' : 'success')
      setTimeout(() => { statusEl.className = 'status' }, 3000)
    }

    function escapeHtml(s) {
      return String(s||'').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))
    }

    function requirePlayer() {
      try {
        const raw = sessionStorage.getItem('player')
        if (!raw) return null
        return JSON.parse(raw)
      } catch(e) {
        console.warn(e)
        return null
      }
    }

    function getInitials(name) {
      if (!name) return '?'
      const parts = name.trim().split(/\s+/)
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }

    async function loadCampaign() {
      currentPlayer = requirePlayer()
      if (!currentPlayer) {
        setStatus('Nicht eingeloggt', true)
        return
      }

      if (!campaignId) {
        setStatus('Kampagne nicht gefunden', true)
        return
      }

      try {
        // Include playerId so the backend knows if this is the DM (to include story)
        const campaignRes = await fetch('/api/campaign/' + encodeURIComponent(campaignId) + '?playerId=' + encodeURIComponent(currentPlayer.id), { cache: 'no-store' })
        if (!campaignRes.ok) {
          setStatus('Kampagne nicht gefunden', true)
          return
        }
        campaign = await campaignRes.json()

        const playersRes = await fetch('/api/campaign-player/' + encodeURIComponent(campaignId), { cache: 'no-store' })
        if (playersRes.ok) {
          campaignPlayers = await playersRes.json()
        }

        for (const cp of campaignPlayers) {
          try {
            const playerRes = await fetch('/api/player/id/' + encodeURIComponent(cp.playerId), { cache: 'no-store' })
            if (playerRes.ok) {
              const playerData = await playerRes.json()
              playerNameMap[cp.playerId] = playerData.name || `Player ${cp.playerId}`
            }
          } catch (err) {
            console.error('Failed to load player details', err)
            playerNameMap[cp.playerId] = `Player ${cp.playerId}`
          }
        }

        const roleRes = await fetch('/api/campaign-player/' + encodeURIComponent(campaignId) + '/' + encodeURIComponent(currentPlayer.id) + '/role', { cache: 'no-store' })
        if (roleRes.ok) {
          const cp = await roleRes.json()
          playerRole = cp.role
        }

        renderView()
      } catch (err) {
        console.error(err)
        setStatus('Fehler beim Laden der Kampagne', true)
      }
    }

    function renderView() {
      document.getElementById('notJoinedView').style.display = 'none'
      document.getElementById('playerJoinedView').style.display = 'none'
      document.getElementById('dmView').style.display = 'none'

      if (playerRole === 'DM') {
        renderDMView()
      } else if (playerRole === 'PLAYER') {
        renderPlayerView()
      } else {
        renderNotJoinedView()
      }
    }

    async function loadCampaignPlayers() {
      try {
        const res = await fetch('/api/campaign-player/' + encodeURIComponent(campaignId), { cache: 'no-store' })
        if (res.ok) {
          campaignPlayers = await res.json()
          for (const cp of campaignPlayers) {
            if (!playerNameMap[cp.playerId]) {
              try {
                const playerRes = await fetch('/api/player/id/' + encodeURIComponent(cp.playerId), { cache: 'no-store' })
                if (playerRes.ok) {
                  const playerData = await playerRes.json()
                  playerNameMap[cp.playerId] = playerData.name || `Player ${cp.playerId}`
                }
              } catch (err) {
                console.error('Failed to load player details', err)
                playerNameMap[cp.playerId] = `Player ${cp.playerId}`
              }
            }
          }
        }
      } catch (err) {
        console.error(err)
      }
    }

    function getDMName() {
      const dm = campaignPlayers.find(cp => cp.role === 'DM')
      return dm ? (playerNameMap[dm.playerId] || `Player ${dm.playerId}`) : 'Unbekannt'
    }

    function renderNotJoinedView() {
      document.getElementById('notJoinedView').style.display = 'block'
      document.getElementById('titleNotJoined').textContent = campaign.name || 'Kampagne'
      document.getElementById('badgeNotJoined').innerHTML = campaign.isPublic ? '<span class="badge-public">Public</span>' : ''
      document.getElementById('descNotJoined').textContent = campaign.description || 'Keine Beschreibung'
      document.getElementById('dmNameNotJoined').textContent = getDMName()
      document.getElementById('playerCountNotJoined').textContent = campaignPlayers.filter(cp => cp.role === 'PLAYER').length
      document.getElementById('maxPlayersNotJoined').textContent = campaign.maxPlayerCount ? `${campaign.maxPlayerCount}` : 'Unbegrenzt'
      renderPlayersListCompact('playersListNotJoined')

      document.getElementById('backBtnNotJoined').onclick = () => window.location.href = './Campaigns.html'

      const joinBtn = document.getElementById('joinBtn')
      joinBtn.onclick = async () => {
        joinBtn.disabled = true
        joinBtn.textContent = 'Beitreten...'
        try {
          const res = await fetch('/api/campaign-player/' + encodeURIComponent(campaignId) + '/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: currentPlayer.id })
          })
          if (!res.ok) {
            let msg = 'Beitreten fehlgeschlagen'
            try { msg = await res.text() } catch (e) {}
            setStatus(msg, true)
            joinBtn.disabled = false
            joinBtn.textContent = 'Beitreten'
            return
          }
          // Redirect to character selection after joining
          setStatus('Beigetreten! Wähle deinen Charakter...')
          setTimeout(() => {
            window.location.href = './CharacterSelect.html?campaignId=' + encodeURIComponent(campaignId)
          }, 1000)
        } catch (err) {
          console.error(err)
          setStatus('Fehler beim Beitreten', true)
          joinBtn.disabled = false
          joinBtn.textContent = 'Beitreten'
        }
      }
    }

    function renderPlayerView() {
      document.getElementById('playerJoinedView').style.display = 'block'
      document.getElementById('titlePlayer').textContent = campaign.name || 'Kampagne'
      document.getElementById('badgePlayer').innerHTML = campaign.isPublic ? '<span class="badge-public">Public</span>' : ''
      document.getElementById('descPlayer').textContent = campaign.description || 'Keine Beschreibung'
      document.getElementById('dmNamePlayer').textContent = getDMName()
      document.getElementById('playerCountPlayer').textContent = campaignPlayers.filter(cp => cp.role === 'PLAYER').length
      document.getElementById('maxPlayersPlayer').textContent = campaign.maxPlayerCount ? `${campaign.maxPlayerCount}` : 'Unbegrenzt'
      renderPlayersListCompact('playersListPlayer')

      if (campaign.mapImagePath) {
        const mapSection = document.getElementById('mapSectionPlayer')
        const mapImg = document.getElementById('mapImagePlayer')
        mapSection.style.display = 'block'

        let mapUrl = campaign.mapImagePath
        if (mapUrl.startsWith('/uploads/')) {
          mapUrl = '.' + mapUrl
        } else if (!mapUrl.startsWith('./') && !mapUrl.startsWith('http')) {
          mapUrl = './' + mapUrl
        }
        mapImg.src = mapUrl
        mapImg.onerror = () => { mapSection.style.display = 'none' }
      }

      document.getElementById('backBtnPlayer').onclick = () => window.location.href = './Campaigns.html'

      const leaveBtn = document.getElementById('leaveBtn')
      leaveBtn.onclick = async () => {
        leaveBtn.disabled = true
        leaveBtn.textContent = 'Verlasse...'
        try {
          const res = await fetch('/api/campaign-player/' + encodeURIComponent(campaignId) + '/leave/' + encodeURIComponent(currentPlayer.id), {
            method: 'DELETE'
          })
          if (!res.ok) {
            setStatus('Verlassen fehlgeschlagen', true)
            leaveBtn.disabled = false
            leaveBtn.textContent = 'Verlassen'
            return
          }
          setStatus('Kampagne verlassen')
          setTimeout(() => window.location.href = './Campaigns.html', 1500)
        } catch (err) {
          console.error(err)
          setStatus('Fehler beim Verlassen', true)
          leaveBtn.disabled = false
          leaveBtn.textContent = 'Verlassen'
        }
      }
    }

    function renderDMView() {
      document.getElementById('dmView').style.display = 'block'
      document.getElementById('dmTitle').value = campaign.name || ''
      document.getElementById('dmDescription').value = campaign.description || ''
      document.getElementById('dmStory').value = campaign.story || ''
      document.getElementById('dmMaxPlayers').value = campaign.maxPlayerCount || ''

      // Set up visibility switch
      isPublic = campaign.isPublic || false
      const switchEl = document.getElementById('visibilitySwitch')
      if (isPublic) {
        switchEl.classList.remove('private')
        switchEl.classList.add('public')
      } else {
        switchEl.classList.remove('public')
        switchEl.classList.add('private')
      }

      switchEl.onclick = () => {
        isPublic = !isPublic
        if (isPublic) {
          switchEl.classList.remove('private')
          switchEl.classList.add('public')
        } else {
          switchEl.classList.remove('public')
          switchEl.classList.add('private')
        }
      }

      renderPlayersListDM('playersListDM')

      // Map preview
      if (campaign.mapImagePath) {
        const mapSection = document.getElementById('mapSectionDM')
        const mapImg = document.getElementById('mapImageDM')
        mapSection.style.display = 'block'

        let mapUrl = campaign.mapImagePath
        if (mapUrl.startsWith('/uploads/')) {
          mapUrl = '.' + mapUrl
        } else if (!mapUrl.startsWith('./') && !mapUrl.startsWith('http')) {
          mapUrl = './' + mapUrl
        }
        mapImg.src = mapUrl
        mapImg.onerror = () => { mapSection.style.display = 'none' }
      }

      // File upload preview
      const mapInput = document.getElementById('dmMapFile')
      mapInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => {
          const mapSection = document.getElementById('mapSectionDM')
          const mapImg = document.getElementById('mapImageDM')
          mapImg.src = evt.target.result
          mapSection.style.display = 'block'
        }
        reader.readAsDataURL(file)
      }

      // Buttons
      document.getElementById('cancelBtn').onclick = () => window.location.href = './Campaigns.html'

      const updateBtn = document.getElementById('updateBtn')
      updateBtn.onclick = async () => {
        updateBtn.disabled = true
        updateBtn.textContent = 'Aktualisiere...'
        try {
          const payload = {
            name: document.getElementById('dmTitle').value.trim(),
            description: document.getElementById('dmDescription').value.trim(),
            story: document.getElementById('dmStory').value.trim(),
            isPublic: isPublic,
            maxPlayerCount: document.getElementById('dmMaxPlayers').value ? parseInt(document.getElementById('dmMaxPlayers').value) : null
          }

          const res = await fetch('/api/campaign/' + encodeURIComponent(campaignId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })

          if (!res.ok) {
            let msg = 'Aktualisieren fehlgeschlagen'
            try { msg = await res.text() } catch (e) {}
            setStatus(msg, true)
            updateBtn.disabled = false
            updateBtn.textContent = 'Aktualisieren'
            return
          }

          // Handle file upload
          const mapFile = document.getElementById('dmMapFile')
          if (mapFile.files && mapFile.files.length > 0) {
            const formData = new FormData()
            formData.append('file', mapFile.files[0])
            await fetch('/api/campaign/' + campaignId + '/upload-map', {
              method: 'POST',
              body: formData
            })
          }

          campaign = await res.json()
          setStatus('Kampagne aktualisiert')
          updateBtn.disabled = false
          updateBtn.textContent = 'Aktualisieren'
        } catch (err) {
          console.error(err)
          setStatus('Fehler beim Aktualisieren', true)
          updateBtn.disabled = false
          updateBtn.textContent = 'Aktualisieren'
        }
      }

      const deleteBtn = document.getElementById('deleteBtn')
      deleteBtn.onclick = async () => {
        if (!confirm('Möchtest du diese Kampagne wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
          return
        }
        deleteBtn.disabled = true
        deleteBtn.textContent = 'Löschen...'
        try {
          const res = await fetch('/api/campaign/' + encodeURIComponent(campaignId), {
            method: 'DELETE'
          })
          if (!res.ok) {
            setStatus('Löschen fehlgeschlagen', true)
            deleteBtn.disabled = false
            deleteBtn.textContent = 'Löschen'
            return
          }
          setStatus('Kampagne gelöscht')
          setTimeout(() => window.location.href = './Campaigns.html', 1500)
        } catch (err) {
          console.error(err)
          setStatus('Fehler beim Löschen', true)
          deleteBtn.disabled = false
          deleteBtn.textContent = 'Löschen'
        }
      }

      const cockpitBtn = document.getElementById('cockpitBtn')
      cockpitBtn.onclick = () => {
        window.location.href = './GMCockpit.html?id=' + encodeURIComponent(campaignId)
      }
    }

    function renderPlayersListCompact(listId) {
      const list = document.getElementById(listId)
      list.innerHTML = ''
      if (campaignPlayers.length === 0) {
        list.innerHTML = '<span class="empty-players">Noch keine Spieler beigetreten</span>'
        return
      }

      campaignPlayers.forEach(cp => {
        const div = document.createElement('div')
        div.className = 'player-compact'
        const name = playerNameMap[cp.playerId] || `Player ${cp.playerId}`
        const roleClass = cp.role === 'DM' ? 'role-dm' : 'role-player'
        div.innerHTML = `
          <span class="player-avatar">${getInitials(name)}</span>
          <span>${escapeHtml(name)}</span>
          <span class="player-role ${roleClass}">${cp.role}</span>
        `
        list.appendChild(div)
      })
    }

    function renderPlayersListDM(listId) {
      const list = document.getElementById(listId)
      list.innerHTML = ''
      if (campaignPlayers.length === 0) {
        list.innerHTML = '<span class="empty-players">Noch keine Spieler beigetreten</span>'
        return
      }

      campaignPlayers.forEach(cp => {
        const div = document.createElement('div')
        div.className = 'player'
        const name = playerNameMap[cp.playerId] || `Player ${cp.playerId}`
        const roleClass = cp.role === 'DM' ? 'role-dm' : 'role-player'

        if (cp.role === 'DM') {
          div.innerHTML = `
            <div class="player-left">
              <span class="player-avatar">${getInitials(name)}</span>
              <span class="player-name">${escapeHtml(name)}</span>
            </div>
            <span class="player-role ${roleClass}">${cp.role}</span>
          `
        } else {
          // Determine character status
          let statusBadge = ''
          let reviewHint = ''
          let isClickable = false

          if (cp.characterStatus === 'PENDING') {
            statusBadge = '<span class="character-status status-pending">⏳ Pending Review</span>'
            reviewHint = '<span class="review-hint">Click to review</span>'
            isClickable = true
          } else if (cp.characterStatus === 'APPROVED') {
            statusBadge = '<span class="character-status status-approved">✓ Approved</span>'
          } else if (cp.characterStatus === 'REJECTED') {
            statusBadge = '<span class="character-status status-rejected">✗ Rejected</span>'
            isClickable = true
          } else if (!cp.characterId) {
            statusBadge = '<span class="character-status status-none">No Character</span>'
          }

          if (isClickable) {
            div.className = 'player clickable'
          }

          div.innerHTML = `
            <div class="player-left">
              <span class="player-avatar">${getInitials(name)}</span>
              <span class="player-name">${escapeHtml(name)}</span>
              ${statusBadge}
              ${reviewHint}
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="player-role ${roleClass}">${cp.role}</span>
              <button class="kick-btn" data-player-id="${cp.playerId}">KICK</button>
            </div>
          `

          // Add click handler for review if pending or rejected
          if (isClickable) {
            div.addEventListener('click', (e) => {
              // Don't navigate if clicking the kick button
              if (e.target.classList.contains('kick-btn')) return
              window.location.href = './CharacterReview.html?campaignId=' + encodeURIComponent(campaignId) + '&campaignPlayerId=' + encodeURIComponent(cp.id)
            })
          }
        }

        list.appendChild(div)

        // Add kick handler
        if (cp.role !== 'DM') {
          const kickBtn = div.querySelector('.kick-btn')
          kickBtn.onclick = async (e) => {
            e.stopPropagation() // Prevent triggering the review click
            const playerId = kickBtn.getAttribute('data-player-id')
            kickBtn.disabled = true
            kickBtn.textContent = '...'
            try {
              const res = await fetch('/api/campaign-player/' + encodeURIComponent(campaignId) + '/leave/' + encodeURIComponent(playerId), {
                method: 'DELETE'
              })
              if (!res.ok) {
                setStatus('Entfernen fehlgeschlagen', true)
                kickBtn.disabled = false
                kickBtn.textContent = 'KICK'
                return
              }
              setStatus('Spieler entfernt')
              await loadCampaignPlayers()
              renderPlayersListDM('playersListDM')
            } catch (err) {
              console.error(err)
              setStatus('Fehler beim Entfernen', true)
              kickBtn.disabled = false
              kickBtn.textContent = 'KICK'
            }
          }
        }
      })
    }

    loadCampaign()
  })()
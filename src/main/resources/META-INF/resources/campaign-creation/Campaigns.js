(function(){
    const myCampaignsListEl = document.getElementById('myCampaignsList')
    const publicGamesListEl = document.getElementById('publicGamesList')
    const status = document.getElementById('status')
    const newBtn = document.getElementById('newBtn')
    const backLogin = document.getElementById('backLogin')

    function setStatus(msg, isErr){ status.textContent = msg || ''; status.style.color = isErr ? '#f97373' : '#98a2b3' }

    function requirePlayer(){
      try{
        const raw = sessionStorage.getItem('player')
        if (!raw) return null
        return JSON.parse(raw)
      }catch(e){ console.warn(e); return null }
    }

    function escapeHtml(s){ return String(s||'').replace(/[&<>\"]/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]) }) }

    function createCampaignCard(campaign, player, campaignPlayerData = null, isDM = false) {
      const card = document.createElement('div')
      card.className = 'campaign'

      const infoDiv = document.createElement('div')
      infoDiv.className = 'campaign-info'

      const titleDiv = document.createElement('div')
      titleDiv.className = 'campaign-title'
      titleDiv.textContent = campaign.name || 'Unnamed Campaign'

      const metaDiv = document.createElement('div')
      metaDiv.className = 'campaign-meta'
      const maxPlayers = campaign.maxPlayerCount ? `Max: ${campaign.maxPlayerCount} Spieler` : 'Unbegrenzt'
      metaDiv.textContent = campaign.description ? `${campaign.description.substring(0, 50)}${campaign.description.length > 50 ? '...' : ''} • ${maxPlayers}` : maxPlayers

      infoDiv.appendChild(titleDiv)
      infoDiv.appendChild(metaDiv)
      card.appendChild(infoDiv)

      // Show public badge
      if (campaign.isPublic) {
        const badgeSpan = document.createElement('span')
        badgeSpan.className = 'badge'
        badgeSpan.textContent = 'Public'
        card.appendChild(badgeSpan)
      }

      // Make entire card clickable
      card.addEventListener('click', () => {
        // If the current user is the DM for this campaign
        if (isDM) {
          if (campaign.started) {
            // Campaign is started, go to GM UI
            window.location.href = './GM_Ui.html?campaignId=' + encodeURIComponent(campaign.id)
          } else {
            // Campaign not started yet, go to campaign detail
            window.location.href = './CampaignDetail.html?id=' + encodeURIComponent(campaign.id)
          }
        } else if (campaignPlayerData) {
          // If campaign is started and character is approved, go to player game UI
          if (campaign.started && campaignPlayerData.characterStatus === 'APPROVED') {
            window.location.href = './Spieler_Ui.html?campaignId=' + encodeURIComponent(campaign.id)
          // If character was rejected, redirect to edit page
          } else if (campaignPlayerData.characterStatus === 'REJECTED' && campaignPlayerData.characterId) {
            window.location.href = '../character-creation/CharacterEdit.html?id=' + encodeURIComponent(campaignPlayerData.characterId) + '&campaignId=' + encodeURIComponent(campaign.id)
          } else if (campaignPlayerData.characterStatus === 'PENDING' || campaignPlayerData.characterStatus === 'APPROVED') {
            // Character has been submitted, go to campaign detail
            window.location.href = './CampaignDetail.html?id=' + encodeURIComponent(campaign.id)
          } else {
            // No character submitted yet (NONE status), go to character selection
            window.location.href = './CharacterSelect.html?campaignId=' + encodeURIComponent(campaign.id)
          }
        } else {
          window.location.href = './CampaignDetail.html?id=' + encodeURIComponent(campaign.id)
        }
      })

      return card
    }

    async function load(){
      const player = requirePlayer()
      if (!player){ setStatus('Nicht eingeloggt — bitte anmelden', true); return }
      setStatus('Lade Kampagnen...')
      try{
        // Load user's campaigns (created by them)
        const myCampaignsRes = await fetch('/api/campaign/player/' + encodeURIComponent(player.id), { cache:'no-store' })
        if (!myCampaignsRes.ok){
          let txt = null
          try { txt = await myCampaignsRes.text() } catch (e) {}
          setStatus('Kampagnen konnten nicht geladen werden: ' + (txt || myCampaignsRes.statusText || ('HTTP ' + myCampaignsRes.status)), true)
          return
        }
        const myCampaigns = await myCampaignsRes.json()

        // Load all public campaigns
        const publicRes = await fetch('/api/campaign/public/all', { cache:'no-store' })
        let publicCampaigns = []
        if (publicRes.ok) {
          publicCampaigns = await publicRes.json()
        }

        // Load campaigns the player has joined (via CampaignPlayer entries)
        const playerCampaignsRes = await fetch('/api/campaign-player/player/' + encodeURIComponent(player.id), { cache:'no-store' })
        const joinedCampaignMap = new Map() // Map campaignId -> campaignPlayer data
        if (playerCampaignsRes.ok) {
          const playerCampaigns = await playerCampaignsRes.json()
          playerCampaigns.forEach(pc => {
            // Add to map if player (not DM, since DM campaigns are already in myCampaigns)
            if (pc.role === 'PLAYER') {
              joinedCampaignMap.set(pc.campaignId, pc)
            }
          })
        }

        // Get the full campaign objects for joined campaigns
        const joinedCampaigns = []
        for (const campaignId of joinedCampaignMap.keys()) {
          try {
            const res = await fetch('/api/campaign/' + encodeURIComponent(campaignId), { cache:'no-store' })
            if (res.ok) {
              joinedCampaigns.push(await res.json())
            }
          } catch (err) {
            console.error('Error loading joined campaign', err)
          }
        }

        // Combine created campaigns with joined campaigns
        const allMyCampaigns = [...myCampaigns, ...joinedCampaigns]

        // Create a set of campaign IDs that the user owns or has joined
        const myCampaignIds = new Set(allMyCampaigns.map(c => c.id))
        // Create a set of campaign IDs that the user created (is DM for)
        const dmCampaignIds = new Set(myCampaigns.map(c => c.id))

        // Populate "My Campaigns" section
        myCampaignsListEl.innerHTML = ''
        if (!Array.isArray(allMyCampaigns) || allMyCampaigns.length === 0){
          myCampaignsListEl.innerHTML = '<div class="empty">Noch keine Kampagnen.</div>'
        } else {
          for(const c of allMyCampaigns){
            // Check if this is a joined campaign (not created by user) and get player data
            const campaignPlayerData = joinedCampaignMap.get(c.id) || null
            const isDM = dmCampaignIds.has(c.id)
            myCampaignsListEl.appendChild(createCampaignCard(c, player, campaignPlayerData, isDM))
          }
        }

        // Filter out campaigns that already appear in "My Campaigns"
        const filteredPublicCampaigns = publicCampaigns.filter(c => !myCampaignIds.has(c.id))

        // Populate "All Public Games" section
        publicGamesListEl.innerHTML = ''
        if (!Array.isArray(filteredPublicCampaigns) || filteredPublicCampaigns.length === 0){
          publicGamesListEl.innerHTML = '<div class="empty">Keine öffentlichen Kampagnen verfügbar.</div>'
        } else {
          for(const c of filteredPublicCampaigns){
            myCampaignsListEl.appendChild(createCampaignCard(c, player))
          }
        }

        setStatus('')
      }catch(err){ console.error(err); setStatus('Kampagnen konnten nicht geladen werden: ' + (err.message||''), true) }
    }

    newBtn.addEventListener('click', ()=>{ window.location.href = './Campaign.html' })
    backLogin.addEventListener('click', ()=>{
      const hadPlayerSession = Boolean(sessionStorage.getItem('player'))
      sessionStorage.removeItem('player')
      window.location.href = hadPlayerSession ? '/api/auth/logout' : '/404.html?reason=faulty-logout'
    })

    load()
  })()

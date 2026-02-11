// Profile widget
    (function () {
      function initialsFromName(name) {
        if (!name) return '?'
        const parts = name.trim().split(/\s+/)
        if (parts.length === 1) return parts[0].slice(0,2).toUpperCase()
        return (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
      }

      var widget = document.getElementById('profileWidget')
      var pic = document.getElementById('profilePic')
      var nameEl = document.getElementById('profileName')

      try {
        var raw = sessionStorage.getItem('player')
        if (raw) {
          var player = JSON.parse(raw)
          nameEl.textContent = player.name || player.username || player.email || 'Player'

          // Check if player has a profile picture
          if (player.profilePicture) {
            var imgUrl = player.profilePicture
            if (imgUrl.startsWith('/uploads/')) {
              imgUrl = '..' + imgUrl
            }
            pic.innerHTML = '<img src="' + imgUrl + '" alt="Profile">'
          } else {
            pic.textContent = initialsFromName(player.name || player.username || player.email)
          }
        } else {
          nameEl.textContent = 'Guest'
          pic.textContent = '?'
        }
      } catch (e) {
        console.warn('Failed to read player from sessionStorage', e)
        nameEl.textContent = 'Guest'
        pic.textContent = '?'
      }

      widget.addEventListener('click', function () {
        window.location.href = './Profile.html'
      })
    })();

    // Character counter for description
    const storyInput = document.getElementById('story');
    const descChars = document.getElementById('descChars');
    storyInput.addEventListener('input', () => {
      const remaining = storyInput.maxLength - storyInput.value.length;
      descChars.textContent = 'Zeichen: ' + remaining;
    });

    // Switch Public / Private
    const switchEl = document.getElementById('visibilitySwitch');
    const visibilityText = document.getElementById('visibilityText');
    let isPublic = true;

    switchEl.addEventListener('click', () => {
      isPublic = !isPublic;
      if (isPublic) {
        switchEl.classList.remove('private');
        switchEl.classList.add('public');
        visibilityText.textContent = 'Kampagne ist öffentlich';
      } else {
        switchEl.classList.remove('public');
        switchEl.classList.add('private');
        visibilityText.textContent = 'Kampagne ist privat';
      }
    });

    // Handle campaign creation/editing
    (function () {
      const btn = document.getElementById('createBtn')
      const backBtn = document.getElementById('backBtn')
      const nameInput = document.getElementById('name')
      const mapInput = document.getElementById('map')
      const status = document.getElementById('status')
      let currentCampaignId = null

      // Live preview when a file is selected
      if (mapInput) {
        mapInput.addEventListener('change', function (e) {
          const file = e.target.files && e.target.files[0]
          const preview = document.getElementById('mapPreview')
          const mapImage = document.getElementById('mapImage')
          const mapFileName = document.getElementById('mapFileName')

          if (!file) {
            if (preview) preview.style.display = 'none'
            if (mapImage) mapImage.src = ''
            if (mapFileName) mapFileName.textContent = ''
            return
          }

          const reader = new FileReader()
          reader.onload = function (evt) {
            if (mapImage) mapImage.src = evt.target.result
            if (mapFileName) {
              const sizeKb = Math.round(file.size / 1024)
              mapFileName.textContent = file.name + ' (' + sizeKb + ' KB)'
            }
            if (preview) preview.style.display = 'block'
          }
          reader.readAsDataURL(file)
        })
      }

      function setStatus(msg, isError) {
        status.textContent = msg || ''
        status.style.color = isError ? '#f97373' : '#98a2b3'
      }

      function getUrlParam(param) {
        const params = new URLSearchParams(window.location.search)
        return params.get(param)
      }

      async function loadCampaign() {
        const campaignId = getUrlParam('id')
        if (!campaignId) return

        currentCampaignId = campaignId
        setStatus('Lade Kampagne...')
        try {
          const res = await fetch('/api/campaign/' + encodeURIComponent(campaignId), { cache: 'no-store' })
          if (!res.ok) {
            let txt = null
            try { txt = await res.text() } catch (e) {}
            throw new Error(txt || res.statusText || ('HTTP ' + res.status))
          }
          const campaign = await res.json()

          // Pre-fill form
          nameInput.value = campaign.name || ''
          storyInput.value = campaign.description || ''

          // Set visibility switch
          isPublic = campaign.isPublic || false
          if (isPublic) {
            switchEl.classList.remove('private');
            switchEl.classList.add('public');
            visibilityText.textContent = 'Kampagne ist öffentlich';
          } else {
            switchEl.classList.remove('public');
            switchEl.classList.add('private');
            visibilityText.textContent = 'Kampagne ist privat';
          }

          if (campaign.maxPlayerCount) {
            document.getElementById('maxPlayers').value = campaign.maxPlayerCount
          }

          // Show existing map if present
          if (campaign.mapImagePath) {
            showMapPreview(campaign.mapImagePath)
          }

          // Change button text
          btn.textContent = 'Aktualisieren'
          setStatus('')
        } catch (err) {
          console.error('Load campaign failed', err)
          setStatus('Kampagne konnte nicht geladen werden: ' + (err.message || 'Unbekannt'), true)
        }
      }

      function showMapPreview(imageUrl) {
        const preview = document.getElementById('mapPreview')
        const mapImage = document.getElementById('mapImage')
        const mapFileName = document.getElementById('mapFileName')

        let resolvedUrl = imageUrl
        if (resolvedUrl && resolvedUrl.startsWith('/uploads/')) {
          resolvedUrl = '.' + resolvedUrl
        }

        mapImage.src = resolvedUrl
        mapFileName.textContent = 'Karte geladen'
        preview.style.display = 'block'
      }

      async function saveCampaign() {
        const name = (nameInput.value || '').trim()
        const description = (storyInput.value || '').trim()
        const dmStoryValue = (document.getElementById('dmStory').value || '').trim()
        if (!name) {
          setStatus('Kampagnenname ist erforderlich.', true)
          nameInput.focus()
          return
        }

        let player = null
        try { player = JSON.parse(sessionStorage.getItem('player')) } catch (e) { player = null }
        if (!player || !player.id) {
          setStatus('Du musst angemeldet sein, um eine Kampagne zu erstellen.', true)
          return
        }

        btn.disabled = true
        const orig = btn.textContent
        btn.textContent = currentCampaignId ? 'Aktualisiere...' : 'Erstelle...'
        setStatus(currentCampaignId ? 'Aktualisiere Kampagne...' : 'Erstelle Kampagne...')

        try {
          const payload = {
            name: name,
            description: description,
            story: dmStoryValue,
            playerId: Number(player.id),
            isPublic: isPublic,
            maxPlayerCount: document.getElementById('maxPlayers').value ? parseInt(document.getElementById('maxPlayers').value) : null
          }
          let res

          if (currentCampaignId) {
            res = await fetch('/api/campaign/' + encodeURIComponent(currentCampaignId), {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
          } else {
            res = await fetch('/api/campaign', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
          }

          if (!res.ok) {
            let txt = null
            try { txt = await res.text() } catch (e) {}
            throw new Error(txt || res.statusText || ('HTTP ' + res.status))
          }
          const campaign = await res.json()

          // Handle file upload if file was selected
          if (mapInput.files && mapInput.files.length > 0) {
            const formData = new FormData()
            formData.append('file', mapInput.files[0])

            const uploadRes = await fetch('/api/campaign/' + campaign.id + '/upload-map', {
              method: 'POST',
              body: formData,
            })

            if (!uploadRes.ok) {
              let txt = null
              try { txt = await uploadRes.text() } catch (e) {}
              console.warn('File upload warning: ' + (txt || uploadRes.statusText))
              setStatus('Kampagne gespeichert, aber Karten-Upload fehlgeschlagen')
              setTimeout(() => { window.location.href = './Campaigns.html' }, 2000)
              return
            }
          }

          setStatus(currentCampaignId ? 'Kampagne aktualisiert! Weiterleitung…' : 'Kampagne erstellt! Weiterleitung…')
          window.location.href = './Campaigns.html'
        } catch (err) {
          console.error('Save campaign failed', err)
          setStatus('Kampagne konnte nicht gespeichert werden: ' + (err.message || 'Unbekannt'), true)
        } finally {
          btn.disabled = false
          btn.textContent = orig
        }
      }

      loadCampaign()

      btn.addEventListener('click', saveCampaign)

      if (backBtn) {
        backBtn.addEventListener('click', function () {
          window.location.href = './Campaigns.html'
        })
      }
    })()
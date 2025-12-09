// Simple login script for campaign-creation/Login.html
// - Reads the email input, calls GET /api/player/{email}
// - On success stores the player object in sessionStorage under 'player'
// - Redirects to Campaign.html
// - Shows inline status and handles keyboard enter

document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email')
  const btn = document.querySelector('.btn')
  const box = document.querySelector('.login-box')

  // small status element appended to the box
  const statusEl = document.createElement('div')
  statusEl.style.marginTop = '12px'
  statusEl.style.fontSize = '0.95rem'
  statusEl.style.color = '#98a2b3'
  box.appendChild(statusEl)

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg || ''
    statusEl.style.color = isError ? '#f97373' : '#98a2b3'
  }

  async function login() {
    const email = (emailInput.value || '').trim()
    if (!email) {
      setStatus('Bitte gib eine E-Mail-Adresse ein.', true)
      emailInput.focus()
      return
    }

    btn.disabled = true
    const origText = btn.textContent
    btn.textContent = 'Signing in...'
    setStatus('Logging in...')

    try {
      const res = await fetch('/api/player/' + encodeURIComponent(email), {
        cache: 'no-store',
      })
      if (!res.ok) {
        // try to read text error if present
        let txt = null
        try {
          txt = await res.text()
        } catch (e) {
          /* ignore */
        }
        const msg = txt || res.statusText || ('HTTP ' + res.status)
        console.warn('Login failed response:', msg)
        setStatus('Login failed: ' + msg, true)
        return
      }
      const player = await res.json()
      // store player in sessionStorage for later pages to use
      try {
        sessionStorage.setItem('player', JSON.stringify(player))
      } catch (e) {
        console.warn('Failed to store player in sessionStorage', e)
      }
      setStatus('Login successful. Redirecting…')
      // redirect to campaigns overview page (sits next to this login page)
      window.location.href = './Campaigns.html'
    } catch (err) {
      console.error('Login error', err)
      setStatus('Login failed: ' + (err.message || 'Unknown error'), true)
    } finally {
      btn.disabled = false
      btn.textContent = origText
    }
  }

  btn.addEventListener('click', login)
  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      login()
    }
  })
})

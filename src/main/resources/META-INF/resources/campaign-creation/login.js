document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.btn')
  const box = document.querySelector('.login-box')

  const statusEl = document.createElement('div')
  statusEl.style.marginTop = '12px'
  statusEl.style.fontSize = '0.95rem'
  statusEl.style.color = '#98a2b3'
  box.appendChild(statusEl)

  const params = new URLSearchParams(window.location.search)
  const isKeycloakCallback = params.get('kc') === '1'
  const loggedOut = params.get('logout') === '1'

  const nextPath = sanitizeRedirectPath(params.get('next'))

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg || ''
    statusEl.style.color = isError ? '#f97373' : '#98a2b3'
  }

  function sanitizeRedirectPath(path) {
    if (!path || typeof path !== 'string') {
      return '/campaign-creation/Campaigns.html'
    }

    const trimmed = path.trim()
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
      return '/campaign-creation/Campaigns.html'
    }

    return trimmed
  }

  async function syncAuthenticatedPlayerAndContinue() {
    btn.disabled = true
    const originalLabel = btn.textContent
    btn.textContent = 'Signing in...'
    setStatus('Synchronizing user profile...')

    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!res.ok) {
        let text = ''
        try {
          text = await res.text()
        } catch (e) {
          /* ignore */
        }
        throw new Error(text || res.statusText || `HTTP ${res.status}`)
      }

      const player = await res.json()
      sessionStorage.setItem('player', JSON.stringify(player))

      setStatus('Login successful. Redirecting...')
      window.location.href = nextPath
    } catch (err) {
      console.error('Failed to sync authenticated player', err)
      setStatus('Login failed: ' + (err.message || 'Unknown error'), true)
    } finally {
      btn.disabled = false
      btn.textContent = originalLabel
    }
  }

  function startKeycloakLogin() {
    const callbackPath = '/campaign-creation/Login.html?kc=1&next=' + encodeURIComponent(nextPath)
    const authRedirect = '/api/auth/login?redirect=' + encodeURIComponent(callbackPath)
    window.location.href = authRedirect
  }

  if (loggedOut) {
    sessionStorage.removeItem('player')
    setStatus('You are logged out.')
  }

  if (isKeycloakCallback) {
    syncAuthenticatedPlayerAndContinue()
  }

  btn.addEventListener('click', startKeycloakLogin)
})

/**
 * SPA Header component – notification bell, user avatar
 */
import { getPlayer } from '../services/auth.js';
import { esc, timeAgo } from '../services/utils.js';
import { navigate } from '../router.js';
import { getTheme, toggleTheme } from '../services/theme.js';

let pollInterval = null;

function getNotificationIcon(type) {
  switch (type) {
    case 'CHARACTER_SUBMITTED': return '<span class="notification-icon submitted">📝</span>';
    case 'CHARACTER_APPROVED': return '<span class="notification-icon approved">✓</span>';
    case 'CHARACTER_REJECTED': return '<span class="notification-icon rejected">✗</span>';
    default: return '<span class="notification-icon">📢</span>';
  }
}

export function renderHeader() {
  const player = getPlayer();
  if (!player) return '';

  return `
    <header class="app-header">
      <div class="header-left">
        <a href="#/campaigns" class="header-logo">🎲 Dicekeeper</a>
      </div>
      <div class="header-right">
        <button class="header-a11y-btn${getTheme() === 'accessible' ? ' active' : ''}" id="headerThemeToggle" title="Barrierefreie Farben">
          <span class="header-a11y-icon">👁</span>
        </button>
        <button class="notification-btn" id="notificationBtn" title="Notifications">
          🔔
          <span class="notification-badge hidden" id="notificationBadge">0</span>
        </button>
        <div class="user-profile" id="userProfile">
          <div class="user-avatar" id="userAvatar">
            ${player.profilePicture
              ? `<img src="${esc(player.profilePicture)}" alt="Avatar">`
              : esc((player.username || player.name || 'U').charAt(0).toUpperCase())}
          </div>
          <span class="user-name">${esc(player.username || player.name || 'User')}</span>
        </div>
      </div>
    </header>
    <div class="notification-overlay" id="notificationOverlay"></div>
    <aside class="notification-sidebar" id="notificationSidebar">
      <div class="notification-sidebar-header">
        <span class="notification-sidebar-title">Notifications</span>
        <button class="notification-close-btn" id="notificationCloseBtn">×</button>
      </div>
      <div class="notification-actions">
        <button class="mark-all-read-btn" id="markAllReadBtn">Mark all as read</button>
      </div>
      <div class="notification-list" id="notificationList">
        <div class="notification-empty">Loading notifications...</div>
      </div>
    </aside>
  `;
}

export function initHeader() {
  const player = getPlayer();
  if (!player) return;

  const notificationBtn = document.getElementById('notificationBtn');
  const notificationBadge = document.getElementById('notificationBadge');
  const notificationSidebar = document.getElementById('notificationSidebar');
  const notificationOverlay = document.getElementById('notificationOverlay');
  const notificationCloseBtn = document.getElementById('notificationCloseBtn');
  const notificationList = document.getElementById('notificationList');
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  const userProfile = document.getElementById('userProfile');

  if (!notificationBtn) return;

  function openSidebar() {
    notificationSidebar.classList.add('open');
    notificationOverlay.classList.add('open');
    loadNotifications();
  }

  function closeSidebar() {
    notificationSidebar.classList.remove('open');
    notificationOverlay.classList.remove('open');
  }

  notificationBtn.addEventListener('click', openSidebar);
  notificationCloseBtn.addEventListener('click', closeSidebar);
  notificationOverlay.addEventListener('click', closeSidebar);

  if (userProfile) {
    userProfile.addEventListener('click', () => navigate('/profile'));
  }

  const headerThemeToggle = document.getElementById('headerThemeToggle');
  if (headerThemeToggle) {
    headerThemeToggle.addEventListener('click', () => {
      const next = toggleTheme();
      headerThemeToggle.classList.toggle('active', next === 'accessible');
    });
  }

  async function loadNotificationCount() {
    try {
      const res = await fetch(`/api/notification/player/${player.id}/unread/count`, { cache: 'no-store' });
      if (res.ok) {
        const count = await res.json();
        if (count > 0) {
          notificationBadge.textContent = count > 99 ? '99+' : count;
          notificationBadge.classList.remove('hidden');
        } else {
          notificationBadge.classList.add('hidden');
        }
      }
    } catch (err) { /* ignore */ }
  }

  async function loadNotifications() {
    try {
      const res = await fetch(`/api/notification/player/${player.id}`, { cache: 'no-store' });
      if (!res.ok) { notificationList.innerHTML = '<div class="notification-empty">Failed to load</div>'; return; }
      const notifications = await res.json();
      if (!notifications || notifications.length === 0) {
        notificationList.innerHTML = '<div class="notification-empty">No notifications yet</div>';
        return;
      }
      notificationList.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}" data-type="${esc(n.type)}" data-ref="${n.referenceId || ''}" data-ref2="${n.secondaryReferenceId || ''}">
          <div class="notification-item-title">${getNotificationIcon(n.type)} ${esc(n.title)}</div>
          <div class="notification-item-message">${esc(n.message)}</div>
          <div class="notification-item-time">${timeAgo(n.createdAt)}</div>
        </div>
      `).join('');

      notificationList.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => handleNotificationClick(item));
      });
    } catch (err) {
      notificationList.innerHTML = '<div class="notification-empty">Failed to load</div>';
    }
  }

  async function handleNotificationClick(item) {
    const id = item.dataset.id;
    const type = item.dataset.type;
    const ref = item.dataset.ref;
    const ref2 = item.dataset.ref2;

    try {
      await fetch(`/api/notification/${id}/read`, { method: 'PATCH' });
      item.classList.remove('unread');
      loadNotificationCount();
    } catch (err) { /* ignore */ }

    closeSidebar();

    switch (type) {
      case 'CHARACTER_SUBMITTED':
        navigate(`/campaign/${ref}/review/${ref2}`);
        break;
      case 'CHARACTER_APPROVED':
        navigate(`/campaign/${ref}`);
        break;
      case 'CHARACTER_REJECTED':
        navigate(`/character/edit/${ref2}?campaignId=${ref}`);
        break;
      default:
        navigate('/campaigns');
    }
  }

  markAllReadBtn.addEventListener('click', async () => {
    try {
      await fetch(`/api/notification/player/${player.id}/read-all`, { method: 'PATCH' });
      loadNotifications();
      loadNotificationCount();
    } catch (err) { /* ignore */ }
  });

  loadNotificationCount();
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(loadNotificationCount, 30000);
}

export function destroyHeader() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}


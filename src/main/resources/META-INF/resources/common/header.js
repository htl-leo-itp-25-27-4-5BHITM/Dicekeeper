/**
 * Common Header and Notification System
 * Include this script on all pages to add the header with user profile and notifications.
 *
 * Usage:
 * 1. Add <link rel="stylesheet" href="../common/header.css"> in <head>
 * 2. Add <script src="../common/header.js" defer></script> before </body>
 * 3. Add class "has-header" to <body> to adjust padding
 */

(function() {
  'use strict';

  // Get current player from sessionStorage
  function getPlayer() {
    try {
      const raw = sessionStorage.getItem('player');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Failed to parse player from sessionStorage', e);
      return null;
    }
  }

  // Format relative time
  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd ago';
    return new Date(timestamp).toLocaleDateString();
  }

  // Escape HTML
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"]/g, function(ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  // Get notification icon based on type
  function getNotificationIcon(type) {
    switch (type) {
      case 'CHARACTER_SUBMITTED':
        return '<span class="notification-icon submitted">📝</span>';
      case 'CHARACTER_APPROVED':
        return '<span class="notification-icon approved">✓</span>';
      case 'CHARACTER_REJECTED':
        return '<span class="notification-icon rejected">✗</span>';
      default:
        return '<span class="notification-icon">📢</span>';
    }
  }

  // Create header HTML
  function createHeader(player) {
    const headerHtml = `
      <header class="app-header">
        <div class="header-left">
          <a href="../campaign-creation/Campaigns.html" class="header-logo">🎲 Dicekeeper</a>
        </div>
        <div class="header-right">
          <button class="notification-btn" id="notificationBtn" title="Notifications">
            🔔
            <span class="notification-badge hidden" id="notificationBadge">0</span>
          </button>
          <div class="user-profile" id="userProfile">
            <div class="user-avatar" id="userAvatar">
              ${player.profilePicture 
                ? `<img src="${escapeHtml(player.profilePicture)}" alt="Avatar">` 
                : escapeHtml((player.username || player.name || 'U').charAt(0).toUpperCase())}
            </div>
            <span class="user-name">${escapeHtml(player.username || player.name || 'User')}</span>
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
    return headerHtml;
  }

  // Initialize header
  function initHeader() {
    const player = getPlayer();
    if (!player) {
      console.log('No player logged in, header not shown');
      return;
    }

    // Insert header at the beginning of body
    document.body.insertAdjacentHTML('afterbegin', createHeader(player));
    document.body.classList.add('has-header');

    // Get elements
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationSidebar = document.getElementById('notificationSidebar');
    const notificationOverlay = document.getElementById('notificationOverlay');
    const notificationCloseBtn = document.getElementById('notificationCloseBtn');
    const notificationList = document.getElementById('notificationList');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    // Toggle sidebar
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

    // User profile click - navigate to profile page
    const userProfile = document.getElementById('userProfile');
    if (userProfile) {
      userProfile.addEventListener('click', function() {
        window.location.href = '../campaign-creation/Profile.html';
      });
    }

    // Load notification count
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
      } catch (err) {
        console.error('Failed to load notification count', err);
      }
    }

    // Load notifications
    async function loadNotifications() {
      try {
        const res = await fetch(`/api/notification/player/${player.id}`, { cache: 'no-store' });
        if (!res.ok) {
          notificationList.innerHTML = '<div class="notification-empty">Failed to load notifications</div>';
          return;
        }
        const notifications = await res.json();

        if (!notifications || notifications.length === 0) {
          notificationList.innerHTML = '<div class="notification-empty">No notifications yet</div>';
          return;
        }

        notificationList.innerHTML = notifications.map(n => `
          <div class="notification-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}" data-type="${escapeHtml(n.type)}" data-ref="${n.referenceId || ''}" data-ref2="${n.secondaryReferenceId || ''}">
            <div class="notification-item-title">
              ${getNotificationIcon(n.type)}
              ${escapeHtml(n.title)}
            </div>
            <div class="notification-item-message">${escapeHtml(n.message)}</div>
            <div class="notification-item-time">${timeAgo(n.createdAt)}</div>
          </div>
        `).join('');

        // Add click handlers
        notificationList.querySelectorAll('.notification-item').forEach(item => {
          item.addEventListener('click', () => handleNotificationClick(item));
        });
      } catch (err) {
        console.error('Failed to load notifications', err);
        notificationList.innerHTML = '<div class="notification-empty">Failed to load notifications</div>';
      }
    }

    // Handle notification click
    async function handleNotificationClick(item) {
      const id = item.dataset.id;
      const type = item.dataset.type;
      const ref = item.dataset.ref;
      const ref2 = item.dataset.ref2;

      // Mark as read
      try {
        await fetch(`/api/notification/${id}/read`, { method: 'PATCH' });
        item.classList.remove('unread');
        loadNotificationCount();
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }

      // Navigate based on type
      closeSidebar();

      switch (type) {
        case 'CHARACTER_SUBMITTED':
          // DM clicks - go to character review page
          // ref = campaignId, ref2 = campaignPlayerId
          window.location.href = `../campaign-creation/CharacterReview.html?campaignId=${ref}&campaignPlayerId=${ref2}`;
          break;
        case 'CHARACTER_APPROVED':
          // Player clicks - go to campaign detail
          window.location.href = `../campaign-creation/CampaignDetail.html?id=${ref}`;
          break;
        case 'CHARACTER_REJECTED':
          // Player clicks - go to character edit with campaign context
          // ref = campaignId, ref2 = characterId
          window.location.href = `../character-creation/CharacterEdit.html?id=${ref2}&campaignId=${ref}`;
          break;
        default:
          // Default - go to campaigns
          window.location.href = '../campaign-creation/Campaigns.html';
      }
    }

    // Mark all as read
    markAllReadBtn.addEventListener('click', async () => {
      try {
        await fetch(`/api/notification/player/${player.id}/read-all`, { method: 'PATCH' });
        loadNotifications();
        loadNotificationCount();
      } catch (err) {
        console.error('Failed to mark all as read', err);
      }
    });

    // Initial load
    loadNotificationCount();

    // Poll for new notifications every 30 seconds
    setInterval(loadNotificationCount, 30000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }

  // Expose functions globally for other scripts to use
  window.DicekeeperHeader = {
    getPlayer: getPlayer,
    refreshNotificationCount: function() {
      const player = getPlayer();
      if (player) {
        fetch(`/api/notification/player/${player.id}/unread/count`, { cache: 'no-store' })
          .then(res => res.json())
          .then(count => {
            const badge = document.getElementById('notificationBadge');
            if (badge) {
              if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
              } else {
                badge.classList.add('hidden');
              }
            }
          })
          .catch(err => console.error('Failed to refresh notification count', err));
      }
    }
  };
})();

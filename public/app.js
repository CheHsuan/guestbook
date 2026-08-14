// Initialize Firebase
// Production: config is injected by /__/firebase/init.js (Firebase Hosting)
// Local: /__/firebase/init.js serves undefined config, so we init with emulator
//        placeholder values via getEmulatorConfig() (defined in utils.js)
if (!firebase.apps.length) {
  const emulatorConfig = getEmulatorConfig(location.hostname);
  if (emulatorConfig) {
    firebase.initializeApp(emulatorConfig);
  }
}

const auth = firebase.auth();
const db = firebase.database();
const provider = new firebase.auth.GoogleAuthProvider();

// Connect to emulators when running locally
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  db.useEmulator('localhost', 9000);
  auth.useEmulator('http://localhost:9099');
  console.log('🔧 Using Firebase Emulators (local database)');
}

// ========================================
// Keyboard Shortcut: Cmd/Ctrl+Enter
// ========================================
const SUBMIT_HINT_TEXT = (function () {
  try {
    if (/Mac|iPhone|iPad|iPod/.test(navigator.platform || '')) return 'or press ⌘↵';
  } catch (_) {}
  return 'or press Ctrl+↵';
}());

// ========================================
// Theme Toggle
// ========================================
const MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
const BOOKMARK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
const BOOKMARK_FILLED_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  if (theme === 'dark') {
    btn.innerHTML = SUN_ICON;
    btn.setAttribute('aria-label', 'Switch to light mode');
  } else {
    btn.innerHTML = MOON_ICON;
    btn.setAttribute('aria-label', 'Switch to dark mode');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('theme', next); } catch (e) {}
}

// Initialize toggle button to reflect the theme already set by the anti-FOUC inline script
(function () {
  const theme = document.documentElement.getAttribute('data-theme') ||
    getInitialTheme(
      typeof localStorage !== 'undefined' ? localStorage : null,
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false
    );
  applyTheme(theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', toggleTheme);
})();

// ========================================
// DOM Elements
// ========================================
const loginBtnMain = document.getElementById('login-btn-main');
const loginBtnHeader = document.getElementById('login-btn-header');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const editDisplayNameBtn = document.getElementById('edit-display-name-btn');
const mainContent = document.getElementById('main-content');
const loginPrompt = document.getElementById('login-prompt');
const postSection = document.getElementById('post-section');
const postForm = document.getElementById('post-form');
const messageInput = document.getElementById('message-input');
const charCounter = document.getElementById('char-counter');
const submitBtn = document.getElementById('submit-btn');
const submitHint = document.getElementById('submit-hint');
const rateLimitMsg = document.getElementById('rate-limit-msg');
const messagesContainer = document.getElementById('messages-container');
const emptyState = document.getElementById('empty-state');
const searchEmptyState = document.getElementById('search-empty-state');
const loadingState = document.getElementById('loading-state');
const messageCount = document.getElementById('message-count');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const searchResultsCount = document.getElementById('search-results-count');
const newMessagesBanner = document.getElementById('new-messages-banner');

// ========================================
// State
// ========================================
let currentUser = null;
let userAlias = null;
let userBio = null;
let userWebsite = null;
let messagesListener = null;
let searchDebounceTimer = null;
const replyCountMap = new Map(); // msgId -> current reply count (for delete warning)
const replyListenerMap = new Map(); // msgId -> db ref (for cleanup)
let newMessageCount = 0;
let bannerHideTimer = null;
const ORIGINAL_TITLE = document.title;
let notificationPermissionRequested = false;

// ========================================
// Sort Order (localStorage)
// ========================================
const SORT_KEY = 'guestbook_sort';
const SORT_NEWEST = 'newest';
const SORT_OLDEST = 'oldest';
const SORT_ACTIVE = 'active';

let currentSort = SORT_NEWEST;
try {
  const _savedSort = localStorage.getItem(SORT_KEY);
  if (_savedSort === SORT_OLDEST || _savedSort === SORT_ACTIVE) currentSort = _savedSort;
} catch (_) {}

function getSortComparator(sort) {
  if (sort === SORT_OLDEST) {
    return (a, b) => Number(a.dataset.timestamp) - Number(b.dataset.timestamp);
  }
  if (sort === SORT_ACTIVE) {
    return (a, b) => {
      const rc = Number(b.dataset.replyCount) - Number(a.dataset.replyCount);
      return rc !== 0 ? rc : Number(b.dataset.timestamp) - Number(a.dataset.timestamp);
    };
  }
  return (a, b) => Number(b.dataset.timestamp) - Number(a.dataset.timestamp);
}

function applySortOrder() {
  const cards = Array.from(messagesContainer.querySelectorAll('.message-card'));
  if (cards.length === 0) return;
  cards.sort(getSortComparator(currentSort));
  cards.forEach(card => messagesContainer.insertBefore(card, loadingState));
}

// ========================================
// Mute List (localStorage)
// ========================================
const MUTED_KEY = 'guestbook_muted';
const MUTE_LIMIT = 50;

function loadMuted() {
  try {
    const raw = localStorage.getItem(MUTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveMuted(list) {
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

function isMuted(uid) {
  if (!uid) return false;
  return loadMuted().includes(uid);
}

function addMuted(uid) {
  const list = loadMuted();
  if (list.includes(uid)) return true;
  if (list.length >= MUTE_LIMIT) {
    showToast(`Mute list is full (${MUTE_LIMIT} authors). Unmute someone first.`);
    return false;
  }
  list.push(uid);
  saveMuted(list);
  return true;
}

function removeMuted(uid) {
  const list = loadMuted().filter(id => id !== uid);
  saveMuted(list);
}

function updateMutedChip() {
  const chipEl = document.getElementById('muted-badge');
  if (!chipEl) return;
  const count = loadMuted().length;
  if (count === 0) {
    chipEl.style.display = 'none';
    chipEl.setAttribute('aria-expanded', 'false');
    const panel = document.getElementById('muted-panel');
    if (panel) panel.style.display = 'none';
  } else {
    chipEl.textContent = '🚫 ' + count + ' muted';
    chipEl.style.display = '';
  }
}

function refreshMutedPanel() {
  const panel = document.getElementById('muted-panel');
  if (!panel || panel.style.display === 'none') return;

  const listEl = document.getElementById('muted-panel-list');
  if (!listEl) return;

  listEl.innerHTML = '';
  const mutedUids = loadMuted();

  if (mutedUids.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted-panel-list-empty';
    empty.textContent = 'No muted authors.';
    listEl.appendChild(empty);
    return;
  }

  mutedUids.forEach(uid => {
    let name = 'Unknown user';
    const matchCard = messagesContainer.querySelector(`.message-card[data-author-id="${uid}"]`);
    if (matchCard) {
      const nameEl = matchCard.querySelector('.message-author');
      if (nameEl) name = nameEl.textContent;
    }

    const row = document.createElement('div');
    row.className = 'muted-panel-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'muted-panel-name';
    nameEl.textContent = name; // textContent — XSS safe

    const unmuteBtn = document.createElement('button');
    unmuteBtn.className = 'muted-panel-unmute-btn';
    unmuteBtn.textContent = 'Unmute';
    unmuteBtn.addEventListener('click', () => {
      removeMuted(uid);
      messagesContainer.querySelectorAll(`.message-card[data-author-id="${uid}"]`).forEach(c => {
        c.style.display = '';
      });
      updateMutedChip();
      refreshMutedPanel();
      filterMessages();
    });

    row.appendChild(nameEl);
    row.appendChild(unmuteBtn);
    listEl.appendChild(row);
  });

  const unmuteAllRow = document.createElement('div');
  unmuteAllRow.className = 'muted-panel-unmute-all-row';
  const unmuteAllBtn = document.createElement('button');
  unmuteAllBtn.className = 'muted-panel-unmute-all-btn';
  unmuteAllBtn.textContent = 'Unmute all';
  unmuteAllBtn.addEventListener('click', () => {
    const uids = loadMuted();
    uids.forEach(uid => {
      messagesContainer.querySelectorAll(`.message-card[data-author-id="${uid}"]`).forEach(c => {
        c.style.display = '';
      });
    });
    saveMuted([]);
    updateMutedChip();
    refreshMutedPanel();
    filterMessages();
  });
  unmuteAllRow.appendChild(unmuteAllBtn);
  listEl.appendChild(unmuteAllRow);
}

// ========================================
// Last-visit tracking (localStorage)
// ========================================
const LAST_VISIT_KEY = 'guestbook_last_visit';

// Read once at page load — used for the entire session
let lastVisitTs = null;
try {
  const _raw = localStorage.getItem(LAST_VISIT_KEY);
  const _parsed = _raw ? Number(_raw) : null;
  if (_parsed && !isNaN(_parsed)) lastVisitTs = _parsed;
} catch (_) {}

let lastVisitSaved = false;

function saveLastVisitTimestamp() {
  try {
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
  } catch (_) {}
}

function maybeSaveLastVisit() {
  if (lastVisitSaved) return;
  lastVisitSaved = true;
  saveLastVisitTimestamp();
}

setTimeout(maybeSaveLastVisit, 5000);

// allNewMode: true when every message in the initial load is new (badges become noise)
let allNewMode = false;
// ID of the oldest new-since-last-visit message for scroll-to on summary click
let oldestNewMsgId = null;

// ========================================
// Author Profile Panel
// ========================================
const authorPanelBackdropEl = document.getElementById('author-panel-backdrop');
const authorPanelEl = document.getElementById('author-panel');
const authorPanelNameEl = document.getElementById('author-panel-name');
const authorPanelBioEl = document.getElementById('author-panel-bio');
const authorPanelSubtitleEl = document.getElementById('author-panel-subtitle');
const authorPanelAvatarEl = document.getElementById('author-panel-avatar');
const authorPanelBodyEl = document.getElementById('author-panel-body');
const authorPanelCloseBtn = document.getElementById('author-panel-close');

let authorPanelOpen = false;

function closeAuthorPanel() {
  if (!authorPanelOpen) return;
  authorPanelOpen = false;
  authorPanelBackdropEl.classList.remove('author-panel-backdrop--visible');
  authorPanelEl.classList.remove('author-panel--open');
  setTimeout(() => {
    if (!authorPanelOpen) {
      authorPanelBackdropEl.style.display = 'none';
      authorPanelEl.style.display = 'none';
    }
  }, 260);
}

async function openAuthorPanel(authorId, authorName, photoURL) {
  // Remove stale mute button from previous open
  const existingMuteBtn = authorPanelEl.querySelector('.author-panel-mute-btn');
  if (existingMuteBtn) existingMuteBtn.remove();

  // Populate header immediately
  authorPanelAvatarEl.innerHTML = '';
  const panelAvatar = createAvatarElement(photoURL, authorName);
  authorPanelAvatarEl.appendChild(panelAvatar);
  authorPanelNameEl.textContent = authorName; // textContent — XSS safe
  authorPanelBioEl.textContent = '';
  authorPanelBioEl.style.display = 'none';
  authorPanelSubtitleEl.textContent = 'Loading…';

  // Show loading state in body
  authorPanelBodyEl.innerHTML = '';
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'author-panel-loading';
  const spinnerEl = document.createElement('div');
  spinnerEl.className = 'spinner';
  loadingDiv.appendChild(spinnerEl);
  authorPanelBodyEl.appendChild(loadingDiv);

  // Animate panel open
  authorPanelBackdropEl.style.display = '';
  authorPanelEl.style.display = '';
  void authorPanelEl.offsetWidth; // force reflow to enable CSS transition
  authorPanelBackdropEl.classList.add('author-panel-backdrop--visible');
  authorPanelEl.classList.add('author-panel--open');
  authorPanelOpen = true;

  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

  try {
    const [snapshot, profileSnap] = await Promise.all([
      db.ref('messages').orderByChild('authorId').equalTo(authorId).once('value'),
      db.ref(`users/${authorId}/profile`).once('value'),
    ]);

    // Display bio if set
    const profileData = (profileSnap.exists() && typeof profileSnap.val === 'function') ? profileSnap.val() : null;
    const bio = profileData && profileData.bio ? profileData.bio : null;
    if (bio) {
      authorPanelBioEl.textContent = bio; // textContent — XSS safe
      authorPanelBioEl.style.display = '';
    } else {
      authorPanelBioEl.textContent = '';
      authorPanelBioEl.style.display = 'none';
    }

    // Show "Edit bio" button when viewing own profile
    const existingEditBioBtn = authorPanelEl.querySelector('.author-panel-edit-bio-btn');
    if (existingEditBioBtn) existingEditBioBtn.remove();
    if (currentUser && authorId === currentUser.uid) {
      const editBioBtn = document.createElement('button');
      editBioBtn.className = 'author-panel-edit-bio-btn';
      editBioBtn.setAttribute('aria-label', bio ? 'Edit bio' : 'Add bio');
      editBioBtn.textContent = bio ? 'Edit bio' : '+ Add bio';
      editBioBtn.addEventListener('click', () => openBioEditor());
      authorPanelBioEl.insertAdjacentElement('afterend', editBioBtn);
    }

    // Display website link if set (inserted before subtitle)
    const existingWebsiteRow = authorPanelEl.querySelector('.author-panel-website-row');
    if (existingWebsiteRow) existingWebsiteRow.remove();
    const existingEditWebsiteBtn = authorPanelEl.querySelector('.author-panel-edit-website-btn');
    if (existingEditWebsiteBtn) existingEditWebsiteBtn.remove();

    const website = profileData && profileData.website ? profileData.website : null;
    if (website) {
      const validation = validateWebsiteURL(website);
      if (validation.valid) {
        const websiteRow = document.createElement('div');
        websiteRow.className = 'author-panel-website-row';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'author-panel-website-icon';
        iconSpan.innerHTML = LINK_ICON; // static SVG constant — no user data

        let hostname = '';
        try { hostname = new URL(validation.url).hostname; } catch (_) { hostname = validation.url; }
        const displayLabel = hostname.length > 40 ? hostname.slice(0, 40) + '…' : hostname;

        const link = document.createElement('a');
        link.href = validation.url; // validated — only http/https, no javascript:
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = displayLabel; // textContent — XSS safe

        websiteRow.appendChild(iconSpan);
        websiteRow.appendChild(link);
        authorPanelSubtitleEl.insertAdjacentElement('beforebegin', websiteRow);
      }
    }

    // Show "Edit website" / "Add website" button when viewing own profile
    if (currentUser && authorId === currentUser.uid) {
      const editWebsiteBtn = document.createElement('button');
      editWebsiteBtn.className = 'author-panel-edit-website-btn';
      editWebsiteBtn.setAttribute('aria-label', website ? 'Edit website' : 'Add website');
      editWebsiteBtn.textContent = website ? 'Edit website' : '+ Add website';
      editWebsiteBtn.addEventListener('click', () => openWebsiteEditor());
      authorPanelSubtitleEl.insertAdjacentElement('beforebegin', editWebsiteBtn);
    }

    const messages = [];
    snapshot.forEach(child => {
      const data = child.val();
      if (data.timestamp >= twentyFourHoursAgo) {
        messages.push({ id: child.key, ...data });
      }
    });

    messages.sort((a, b) => b.timestamp - a.timestamp);

    const count = messages.length;
    authorPanelSubtitleEl.textContent = count === 1 ? '1 message today' : `${count} messages today`;

    authorPanelBodyEl.innerHTML = '';

    if (count === 0) {
      const emptyEl = document.createElement('p');
      emptyEl.className = 'author-panel-empty';
      emptyEl.textContent = 'No messages from this author in the last 24 hours.';
      authorPanelBodyEl.appendChild(emptyEl);
    } else {
      messages.forEach(msg => {
        const preview = document.createElement('div');
        preview.className = 'author-msg-preview';
        preview.setAttribute('role', 'button');
        preview.setAttribute('tabindex', '0');

        const timeEl = document.createElement('div');
        timeEl.className = 'author-msg-time';
        timeEl.textContent = formatTimestamp(msg.timestamp);

        const textEl = document.createElement('p');
        textEl.className = 'author-msg-text';
        const snippet = typeof msg.text === 'string' && msg.text.length > 80
          ? msg.text.slice(0, 80) + '…'
          : (msg.text || '');
        textEl.textContent = snippet; // textContent — XSS safe

        preview.appendChild(timeEl);
        preview.appendChild(textEl);

        const scrollToMessage = () => {
          closeAuthorPanel();
          const card = document.getElementById('msg-' + msg.id);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth' });
            card.classList.add('permalink-highlight');
            setTimeout(() => card.classList.remove('permalink-highlight'), 2000);
          }
        };

        preview.addEventListener('click', scrollToMessage);
        preview.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            scrollToMessage();
          }
        });

        authorPanelBodyEl.appendChild(preview);
      });
    }

    // Add mute/unmute button for non-self profiles
    if (!currentUser || authorId !== currentUser.uid) {
      const muted = isMuted(authorId);
      const muteBtn = document.createElement('button');
      muteBtn.className = 'author-panel-mute-btn' + (muted ? ' author-panel-mute-btn--unmute' : '');
      muteBtn.textContent = muted ? `Unmute ${authorName}` : `Mute ${authorName}`; // textContent — XSS safe

      muteBtn.addEventListener('click', () => {
        if (isMuted(authorId)) {
          removeMuted(authorId);
          messagesContainer.querySelectorAll(`.message-card[data-author-id="${authorId}"]`).forEach(c => {
            c.style.display = '';
          });
          filterMessages();
          updateMutedChip();
          closeAuthorPanel();
          showToast(`Unmuted ${authorName}.`);
        } else {
          const success = addMuted(authorId);
          if (success) {
            messagesContainer.querySelectorAll(`.message-card[data-author-id="${authorId}"]`).forEach(c => {
              c.style.display = 'none';
            });
            filterMessages();
            updateMutedChip();
            closeAuthorPanel();
            showToast(`Muted ${authorName}. Their messages are now hidden.`);
          }
        }
      });

      authorPanelBodyEl.insertAdjacentElement('beforebegin', muteBtn);
    }
  } catch (err) {
    console.error('Failed to load author messages:', err);
    authorPanelBodyEl.innerHTML = '';
    const errEl = document.createElement('p');
    errEl.className = 'author-panel-empty';
    errEl.textContent = 'Failed to load messages. Please try again.';
    authorPanelBodyEl.appendChild(errEl);
    authorPanelSubtitleEl.textContent = '';
  }
}

if (authorPanelCloseBtn) {
  authorPanelCloseBtn.addEventListener('click', closeAuthorPanel);
}

if (authorPanelBackdropEl) {
  authorPanelBackdropEl.addEventListener('click', closeAuthorPanel);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && authorPanelOpen) {
    closeAuthorPanel();
  }
});

// ========================================
// Author Pool (for @mention autocomplete)
// ========================================
const authorPool = new Map(); // authorName -> most-recent timestamp

function trackAuthor(name, timestamp) {
  if (!name) return;
  const existing = authorPool.get(name);
  if (!existing || timestamp > existing) {
    authorPool.set(name, timestamp || 0);
  }
}

function getAuthorSuggestions(prefix) {
  if (!prefix) return [];
  const lower = prefix.toLowerCase();
  const matches = [];
  for (const [name, ts] of authorPool.entries()) {
    if (name.toLowerCase().startsWith(lower)) {
      matches.push({ name, ts });
    }
  }
  matches.sort((a, b) => b.ts - a.ts);
  return matches.slice(0, 5).map(m => m.name);
}

// ========================================
// Typing Indicator
// ========================================
const typingMap = new Map(); // uid -> { name, timestamp }
let typingRef = null;        // db ref for current user's typing record
let typingDebounceTimer = null;
let typingListener = null;
let typingHideTimer = null;

function renderTypingLabel(map, currentUid) {
  const thirtySecondsAgo = Date.now() - 30000;
  const typers = [];

  for (const [uid, data] of map.entries()) {
    if (uid === currentUid) continue;
    if (data.timestamp < thirtySecondsAgo) continue;
    const name = data.name || '';
    typers.push(name.length > 25 ? name.slice(0, 25) + '…' : name);
  }

  const el = document.getElementById('typing-indicator');
  if (!el) return;

  if (typers.length === 0) {
    clearTimeout(typingHideTimer);
    el.classList.remove('typing-indicator--visible');
    typingHideTimer = setTimeout(() => {
      if (!el.classList.contains('typing-indicator--visible')) {
        el.style.display = 'none';
        el.textContent = '';
      }
    }, 200);
    return;
  }

  let text;
  if (typers.length === 1) {
    text = `${typers[0]} is typing`;
  } else if (typers.length === 2) {
    text = `${typers[0]} and ${typers[1]} are typing`;
  } else {
    text = 'Several people are typing';
  }

  el.textContent = text;

  if (!el.classList.contains('typing-indicator--visible')) {
    clearTimeout(typingHideTimer);
    el.style.display = '';
    void el.offsetWidth; // force reflow to enable the CSS transition
    el.classList.add('typing-indicator--visible');
  }
}

function startTyping() {
  if (!currentUser) return;

  if (!typingRef) {
    typingRef = db.ref(`typing/${currentUser.uid}`);
    typingRef.onDisconnect().remove();
  }

  typingRef.set({
    name: userAlias || currentUser.displayName || 'Anonymous',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });

  clearTimeout(typingDebounceTimer);
  typingDebounceTimer = setTimeout(stopTyping, 5000);
}

function stopTyping() {
  clearTimeout(typingDebounceTimer);
  if (typingRef) {
    typingRef.remove();
  }
}

function setupTypingInputListeners() {
  const isMobile = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
    : false;

  messageInput.addEventListener('input', () => {
    if (!currentUser) return;
    if (isMobile && messageInput.value.length === 0) return;
    if (messageInput.value.length > 0) {
      startTyping();
    }
  });

  messageInput.addEventListener('blur', () => {
    if (!messageInput.value.trim()) {
      stopTyping();
    }
  });
}

// ========================================
// New Messages Banner
// ========================================
function updateNewMessagesBanner() {
  const label = newMessageCount === 1 ? 'new message' : 'new messages';
  newMessagesBanner.textContent = `↑ ${newMessageCount} ${label}`;
  clearTimeout(bannerHideTimer);
  newMessagesBanner.style.display = '';
  void newMessagesBanner.offsetWidth; // force reflow for CSS transition
  newMessagesBanner.classList.add('new-messages-banner--visible');
}

function hideNewMessagesBanner() {
  newMessageCount = 0;
  document.title = ORIGINAL_TITLE;
  newMessagesBanner.classList.remove('new-messages-banner--visible');
  clearTimeout(bannerHideTimer);
  bannerHideTimer = setTimeout(() => {
    if (!newMessagesBanner.classList.contains('new-messages-banner--visible')) {
      newMessagesBanner.style.display = 'none';
    }
  }, 220);
}

// ========================================
// New-since-last-visit summary
// ========================================
function updateNewSinceSummary(count) {
  const el = document.getElementById('new-since-visit-summary');
  if (!el) return;
  if (count <= 0) {
    el.style.display = 'none';
    return;
  }
  const label = count === 1 ? '1 new since your last visit' : `${count} new since your last visit`;
  el.textContent = label;
  el.style.display = '';

  el.onclick = null;
  el.onkeydown = null;

  const scrollToOldest = () => {
    if (!oldestNewMsgId) return;
    const card = document.getElementById('msg-' + oldestNewMsgId);
    if (card) card.scrollIntoView({ behavior: 'smooth' });
  };
  el.onclick = scrollToOldest;
  el.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToOldest(); }
  };
}

newMessagesBanner.addEventListener('click', () => {
  if (searchInput.value) {
    searchInput.value = '';
    filterMessages();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  hideNewMessagesBanner();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    maybeSaveLastVisit();
  }
  if (document.visibilityState === 'visible' && newMessageCount > 0) {
    hideNewMessagesBanner();
  }
});

// ========================================
// Browser Notifications (reply alerts + @mention alerts)
// ========================================
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maybeFireMentionNotification(msg) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!currentUser) return;
  if (msg.authorId === currentUser.uid) return;
  if (document.visibilityState === 'visible') return;

  const displayName = currentUser.displayName;
  if (!displayName) return;

  const text = typeof msg.text === 'string' ? msg.text : '';
  const mentionRegex = new RegExp('@' + escapeRegex(displayName) + '(?!\\w)', 'i');
  if (!mentionRegex.test(text)) return;

  const snippet = text.length > 80 ? text.slice(0, 80) + '…' : text;
  const notif = new Notification('You were mentioned on Guestbook', {
    body: (msg.author || 'Someone') + ': ' + snippet,
    icon: '/icon.png',
  });
  notif.addEventListener('click', () => {
    window.focus();
    const card = document.getElementById('msg-' + msg.id);
    if (card) card.scrollIntoView({ behavior: 'smooth' });
    notif.close();
  });
}

function maybeFireReplyNotification(msg, reply) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!currentUser || msg.authorId !== currentUser.uid) return;
  if (reply.authorId === currentUser.uid) return;
  if (document.visibilityState === 'visible') return;
  if (!document.getElementById('msg-' + msg.id)) return;

  const raw = typeof reply.text === 'string' ? reply.text : '';
  const snippet = raw.length > 80 ? raw.slice(0, 80) + '…' : raw;
  const notif = new Notification('New reply on Guestbook', {
    body: (reply.author || 'Someone') + ' replied: ' + snippet,
    icon: '/icon.png',
  });
  notif.addEventListener('click', () => {
    window.focus();
    const card = document.getElementById('msg-' + msg.id);
    if (card) card.scrollIntoView({ behavior: 'smooth' });
    notif.close();
  });
}

// ========================================
// Permalink: Toast + Deep-link
// ========================================
let deepLinkHandled = false;

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'permalink-toast permalink-toast--visible';
  toast.textContent = message; // textContent — never user-derived
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('permalink-toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function handleDeepLink() {
  if (deepLinkHandled) return;
  const hash = location.hash;
  if (!hash.startsWith('#msg-')) return;
  const targetEl = document.getElementById(hash.slice(1));
  if (targetEl) {
    deepLinkHandled = true;
    targetEl.scrollIntoView({ behavior: 'smooth' });
    targetEl.classList.add('permalink-highlight');
    setTimeout(() => targetEl.classList.remove('permalink-highlight'), 2000);
  } else if (!hasMoreMessages) {
    deepLinkHandled = true;
    showToast('Message not found — it may have expired.');
  }
}

// ========================================
// Search / Filter
// ========================================
function normalizeStr(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function filterMessages() {
  const term = normalizeStr(searchInput.value.trim());
  const cards = messagesContainer.querySelectorAll('.message-card');

  if (!term) {
    cards.forEach(card => {
      if (!isMuted(card.dataset.authorId)) card.style.display = '';
    });
    searchClearBtn.style.display = 'none';
    searchResultsCount.style.display = 'none';
    searchEmptyState.style.display = 'none';
    return;
  }

  searchClearBtn.style.display = '';

  if (cards.length === 0) {
    searchResultsCount.style.display = 'none';
    searchEmptyState.style.display = 'none';
    return;
  }

  let matchCount = 0;
  let visibleTotal = 0;
  cards.forEach(card => {
    if (isMuted(card.dataset.authorId)) return; // keep muted cards hidden
    visibleTotal++;
    const author = normalizeStr(card.querySelector('.message-author')?.textContent || '');
    const text = normalizeStr(card.querySelector('.message-text')?.textContent || '');
    const matches = author.includes(term) || text.includes(term);
    card.style.display = matches ? '' : 'none';
    if (matches) matchCount++;
  });

  if (matchCount === 0) {
    searchEmptyState.style.display = 'block';
    searchResultsCount.style.display = 'none';
  } else {
    searchEmptyState.style.display = 'none';
    searchResultsCount.textContent = `Showing ${matchCount} of ${visibleTotal}`;
    searchResultsCount.style.display = 'block';
  }
}

searchInput.addEventListener('input', () => {
  searchClearBtn.style.display = searchInput.value ? '' : 'none';
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(filterMessages, 200);
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterMessages();
});

messagesContainer.addEventListener('click', (e) => {
  const hashtag = e.target.closest('.hashtag');
  if (!hashtag) return;
  searchInput.value = hashtag.textContent;
  filterMessages();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ========================================
// Display Name (alias)
// ========================================
async function loadUserAlias(user) {
  try {
    const snap = await db.ref(`users/${user.uid}/profile`).once('value');
    if (snap.exists()) {
      const profile = snap.val();
      userAlias = profile.displayName || null;
      userBio = profile.bio || null;
      userWebsite = profile.website || null;
    } else {
      userAlias = null;
      userBio = null;
      userWebsite = null;
    }
  } catch (e) {
    userAlias = null;
    userBio = null;
    userWebsite = null;
  }
}

function openDisplayNameEditor() {
  if (!currentUser) return;
  const currentName = userAlias || currentUser.displayName || '';

  userName.style.display = 'none';
  if (editDisplayNameBtn) editDisplayNameBtn.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.className = 'display-name-edit-wrapper';

  const row = document.createElement('div');
  row.className = 'display-name-edit-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'display-name-input';
  input.value = currentName;
  input.maxLength = 40;
  input.placeholder = 'Your name';
  input.setAttribute('aria-label', 'Display name');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-save btn-display-name-save';
  saveBtn.textContent = 'Save';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-cancel btn-display-name-cancel';
  cancelBtn.textContent = 'Cancel';

  row.appendChild(input);
  row.appendChild(saveBtn);
  row.appendChild(cancelBtn);

  const errorEl = document.createElement('span');
  errorEl.className = 'display-name-error';

  wrapper.appendChild(row);
  wrapper.appendChild(errorEl);

  userInfo.insertBefore(wrapper, logoutBtn);
  input.focus();
  input.select();

  function closeEditor() {
    wrapper.remove();
    userName.style.display = '';
    if (editDisplayNameBtn) editDisplayNameBtn.style.display = '';
  }

  cancelBtn.addEventListener('click', closeEditor);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
  });

  saveBtn.addEventListener('click', async () => {
    const raw = input.value;
    const trimmed = raw.trim();
    errorEl.textContent = '';

    if (trimmed.length > 0) {
      const validation = validateDisplayName(raw);
      if (!validation.valid) {
        errorEl.textContent = validation.error;
        return;
      }
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    const googleName = currentUser.displayName || null;
    const newAlias = (trimmed.length > 0 && trimmed !== googleName) ? trimmed : null;

    try {
      if (newAlias) {
        await db.ref(`users/${currentUser.uid}/profile`).update({ displayName: newAlias });
      } else {
        await db.ref(`users/${currentUser.uid}/profile/displayName`).remove();
      }
      userAlias = newAlias;
      userName.textContent = userAlias || googleName || 'User';
      closeEditor();
      showToast('Display name updated');
    } catch (err) {
      console.error('Failed to save display name:', err);
      errorEl.textContent = 'Failed to save. Please try again.';
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });
}

// ========================================
// Bio Editor
// ========================================
const editBioBtn = document.getElementById('edit-bio-btn');

function openBioEditor() {
  if (!currentUser) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'bio-edit-wrapper';

  const row = document.createElement('div');
  row.className = 'bio-edit-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'bio-input';
  input.value = userBio || '';
  input.maxLength = 150;
  input.placeholder = 'Tell people about yourself…';
  input.setAttribute('aria-label', 'Bio');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-save btn-bio-save';
  saveBtn.textContent = 'Save';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-cancel btn-bio-cancel';
  cancelBtn.textContent = 'Cancel';

  row.appendChild(input);
  row.appendChild(saveBtn);
  row.appendChild(cancelBtn);

  const errorEl = document.createElement('span');
  errorEl.className = 'bio-error';

  wrapper.appendChild(row);
  wrapper.appendChild(errorEl);

  const targetEl = editBioBtn || logoutBtn;
  userInfo.insertBefore(wrapper, targetEl);
  if (editBioBtn) editBioBtn.style.display = 'none';
  input.focus();
  input.select();

  function closeEditor() {
    wrapper.remove();
    if (editBioBtn) editBioBtn.style.display = '';
  }

  cancelBtn.addEventListener('click', closeEditor);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
    if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
  });

  saveBtn.addEventListener('click', async () => {
    const raw = input.value;
    const trimmed = raw.trim();
    errorEl.textContent = '';

    if (trimmed.length === 0) {
      // Clear bio
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      try {
        await db.ref(`users/${currentUser.uid}/profile/bio`).remove();
        userBio = null;
        closeEditor();
        showToast('Bio removed');
      } catch (err) {
        console.error('Failed to remove bio:', err);
        errorEl.textContent = 'Failed to save. Please try again.';
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
      }
      return;
    }

    const validation = validateBio(raw);
    if (!validation.valid) {
      errorEl.textContent = validation.error;
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      await db.ref(`users/${currentUser.uid}/profile`).update({ bio: validation.text });
      userBio = validation.text;
      closeEditor();
      showToast('Bio saved');
    } catch (err) {
      console.error('Failed to save bio:', err);
      errorEl.textContent = 'Failed to save. Please try again.';
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });
}

// ========================================
// Website Editor
// ========================================
const editWebsiteBtn = document.getElementById('edit-website-btn');

function openWebsiteEditor() {
  if (!currentUser) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'website-edit-wrapper';

  const row = document.createElement('div');
  row.className = 'website-edit-row';

  const input = document.createElement('input');
  input.type = 'url';
  input.className = 'website-input';
  input.value = userWebsite || '';
  input.maxLength = 200;
  input.placeholder = 'https://yoursite.com';
  input.setAttribute('aria-label', 'Website URL');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-save btn-website-save';
  saveBtn.textContent = 'Save';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-cancel btn-website-cancel';
  cancelBtn.textContent = 'Cancel';

  row.appendChild(input);
  row.appendChild(saveBtn);
  row.appendChild(cancelBtn);

  const errorEl = document.createElement('span');
  errorEl.className = 'website-error';

  wrapper.appendChild(row);
  wrapper.appendChild(errorEl);

  const targetEl = editWebsiteBtn || logoutBtn;
  userInfo.insertBefore(wrapper, targetEl);
  if (editWebsiteBtn) editWebsiteBtn.style.display = 'none';
  input.focus();
  input.select();

  function closeEditor() {
    wrapper.remove();
    if (editWebsiteBtn) editWebsiteBtn.style.display = '';
  }

  cancelBtn.addEventListener('click', closeEditor);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
    if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
  });

  saveBtn.addEventListener('click', async () => {
    const raw = input.value;
    const trimmed = raw.trim();
    errorEl.textContent = '';

    if (trimmed.length === 0) {
      // Clear website
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      try {
        await db.ref(`users/${currentUser.uid}/profile/website`).remove();
        userWebsite = null;
        closeEditor();
        showToast('Website removed');
      } catch (err) {
        console.error('Failed to remove website:', err);
        errorEl.textContent = 'Failed to save. Please try again.';
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
      }
      return;
    }

    const validation = validateWebsiteURL(raw);
    if (!validation.valid) {
      errorEl.textContent = validation.error;
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      await db.ref(`users/${currentUser.uid}/profile`).update({ website: validation.url });
      userWebsite = validation.url;
      closeEditor();
      showToast('Website saved');
    } catch (err) {
      console.error('Failed to save website:', err);
      errorEl.textContent = 'Failed to save. Please try again.';
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  });
}

// ========================================
// Auth: Sign In / Sign Out
// ========================================
function signIn() {
  auth.signInWithPopup(provider).catch((error) => {
    console.error('Sign-in error:', error.message);
  });
}

function signOut() {
  auth.signOut().catch((error) => {
    console.error('Sign-out error:', error.message);
  });
}

loginBtnMain.addEventListener('click', signIn);
loginBtnHeader.addEventListener('click', signIn);
logoutBtn.addEventListener('click', signOut);
if (editDisplayNameBtn) editDisplayNameBtn.addEventListener('click', openDisplayNameEditor);
if (editBioBtn) editBioBtn.addEventListener('click', openBioEditor);
if (editWebsiteBtn) editWebsiteBtn.addEventListener('click', openWebsiteEditor);

// ========================================
// Auth: State Observer
// ========================================
auth.onAuthStateChanged(async (user) => {
  // Clean up typing indicator when signing out
  if (!user && currentUser) {
    stopTyping();
    typingRef = null;
    userAlias = null;
    userBio = null;
    userWebsite = null;
  }

  currentUser = user;

  // Message feed is always visible; login prompt is never shown full-screen
  mainContent.style.display = 'block';
  loginPrompt.style.display = 'none';

  if (user) {
    // Show UI synchronously with Google name; alias will update it once loaded
    userInfo.style.display = 'flex';
    userAvatar.src = user.photoURL || '';
    userName.textContent = user.displayName || 'User';
    postSection.style.display = 'block';
    loginBtnHeader.style.display = 'none';
    restoreDraft();
  } else {
    userInfo.style.display = 'none';
    postSection.style.display = 'none';
    loginBtnHeader.style.display = 'inline-flex';
    hideNewMessagesBanner();
    clearDraft();
  }

  // Start the listener once; skip if already running to avoid duplicate listeners
  if (!realtimeAddedListener) {
    startListeningMessages();
  }

  // Load alias after listener is started so tests see correct listener timing
  if (user) {
    await loadUserAlias(user);
    userName.textContent = userAlias || user.displayName || 'User';
  }
});

// ========================================
// Realtime Database: Listen for Messages (last 24h)
// ========================================
// ========================================
// State
// ========================================
let realtimeAddedListener = null;
let realtimeRemovedListener = null;
let oldestMessageTimestamp = null;
let newestMessageTimestamp = null;
let isLoadingMore = false;
let hasMoreMessages = true;
let totalMessagesListener = null;
let expiryInterval = null;
const INITIAL_LOAD_LIMIT = 20;

// ========================================
// Realtime Database: Listen for Messages
// ========================================

async function startListeningMessages() {
  if (!expiryInterval) {
    expiryInterval = setInterval(tickExpiryLabels, 60000);
  }

  // Show loading
  loadingState.style.display = 'block';
  emptyState.style.display = 'none';

  // Reset state
  oldestMessageTimestamp = null;
  newestMessageTimestamp = null;
  hasMoreMessages = true;
  deepLinkHandled = false;
  newMessageCount = 0;
  clearTimeout(bannerHideTimer);
  newMessagesBanner.classList.remove('new-messages-banner--visible');
  newMessagesBanner.style.display = 'none';

  // Clear existing message cards
  const existingCards = messagesContainer.querySelectorAll('.message-card');
  existingCards.forEach((card) => card.remove());

  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

  // 1. Initial Load
  const messagesRef = db.ref('messages')
    .orderByChild('timestamp')
    .startAt(twentyFourHoursAgo)
    .limitToLast(INITIAL_LOAD_LIMIT);

  try {
    const snapshot = await messagesRef.once('value');
    loadingState.style.display = 'none';

    if (!snapshot.exists()) {
      emptyState.style.display = 'block';
      hasMoreMessages = false;
    } else {
      emptyState.style.display = 'none';
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });

      // Sort newest first
      messages.sort((a, b) => b.timestamp - a.timestamp);

      if (messages.length > 0) {
        newestMessageTimestamp = messages[0].timestamp;
        oldestMessageTimestamp = messages[messages.length - 1].timestamp;
      }

      if (messages.length < INITIAL_LOAD_LIMIT) {
        hasMoreMessages = false;
      }

      // Compute new-since-last-visit state before rendering cards
      let newCount = 0;
      let _oldestNewMsgId = null;
      messages.forEach(msg => {
        if (isNewSinceLastVisit(msg.timestamp, lastVisitTs)) {
          newCount++;
          _oldestNewMsgId = msg.id; // sorted newest→oldest; last match = oldest new
        }
      });
      allNewMode = newCount > 0 && newCount === messages.length;
      oldestNewMsgId = _oldestNewMsgId;

      messages.forEach(msg => {
        trackAuthor(msg.author, msg.timestamp);
        const showBadge = !allNewMode && isNewSinceLastVisit(msg.timestamp, lastVisitTs);
        const card = createMessageCard(msg, currentUser, showBadge);
        messagesContainer.insertBefore(card, loadingState);
      });

      applySortOrder();
      updateNewSinceSummary(newCount);
    }

    handleDeepLink();

    // Start listening for true total count for the badge
    if (!totalMessagesListener) {
      totalMessagesListener = db.ref('messages')
        .orderByChild('timestamp')
        .startAt(twentyFourHoursAgo)
        .on('value', snap => {
          const total = snap.numChildren();
          let displayCount = total.toString();

          if (total >= 100) {
            displayCount = Math.floor(total / 100) * 100 + '+';
          }

          messageCount.textContent = displayCount;
        }, error => {
          console.error('Error fetching total message count:', error);
        });
    }

    // 2. Listen for NEW messages added *after* our initial load
    const realTimeRef = db.ref('messages').orderByChild('timestamp');
    let queryRef = realTimeRef;
    if (newestMessageTimestamp) {
      // Start after the newest message we just loaded to avoid duplicate
      queryRef = realTimeRef.startAfter(newestMessageTimestamp);
    } else {
      queryRef = realTimeRef.startAt(twentyFourHoursAgo);
    }

    realtimeAddedListener = queryRef.on('child_added', (childSnapshot) => {
      // Prevent processing if it's somehow an old message or we just posted it and it was already handled (though child_added usually fires for new)
      const msg = { id: childSnapshot.key, ...childSnapshot.val() };

      // If we don't have a newestMessageTimestamp (empty DB on load), set it now
      if (!newestMessageTimestamp || msg.timestamp > newestMessageTimestamp) {
        newestMessageTimestamp = msg.timestamp;
        emptyState.style.display = 'none';

        trackAuthor(msg.author, msg.timestamp);

        if (isMuted(msg.authorId)) return; // silently suppress muted authors

        const card = createMessageCard(msg, currentUser);
        messagesContainer.insertBefore(card, loadingState);
        applySortOrder();
        filterMessages();
        maybeFireMentionNotification(msg);

        // Show banner and update tab title when user is scrolled down or tab is hidden
        if (window.scrollY > 200 || document.hidden) {
          newMessageCount++;
          if (window.scrollY > 200) {
            updateNewMessagesBanner();
          }
          document.title = `(${newMessageCount}) ${ORIGINAL_TITLE}`;
        }
      }
    });

    // 3. Listen for REMOVED messages
    realtimeRemovedListener = db.ref('messages').on('child_removed', (childSnapshot) => {
      const msgId = childSnapshot.key;
      const cardToRemove = document.getElementById(`msg-${msgId}`);
      if (cardToRemove) {
        const replyRef = replyListenerMap.get(msgId);
        if (replyRef) {
          replyRef.off();
          replyListenerMap.delete(msgId);
        }
        replyCountMap.delete(msgId);
        cardToRemove.remove();

        // Hide empty state if there are elements besides loading/empty states
        const hasMessages = messagesContainer.querySelectorAll('.message-card').length > 0;
        if (!hasMessages) {
          emptyState.style.display = 'block';
          searchEmptyState.style.display = 'none';
          searchResultsCount.style.display = 'none';
        } else {
          filterMessages();
        }
      }
    });

    // Assign scroll listener
    window.addEventListener('scroll', handleScroll);

    // 4. Listen for typing indicators
    if (!typingListener) {
      const typingDbRef = db.ref('typing');
      typingDbRef.on('child_added', (snap) => {
        typingMap.set(snap.key, snap.val());
        renderTypingLabel(typingMap, currentUser ? currentUser.uid : null);
      });
      typingDbRef.on('child_changed', (snap) => {
        typingMap.set(snap.key, snap.val());
        renderTypingLabel(typingMap, currentUser ? currentUser.uid : null);
      });
      typingDbRef.on('child_removed', (snap) => {
        typingMap.delete(snap.key);
        renderTypingLabel(typingMap, currentUser ? currentUser.uid : null);
      });
      typingListener = typingDbRef;
    }

  } catch (error) {
    console.error('Error loading initial messages:', error);
    loadingState.style.display = 'none';
    emptyState.style.display = 'block';
  }
}

async function loadMoreMessages() {
  if (isLoadingMore || !hasMoreMessages || !oldestMessageTimestamp) return;

  isLoadingMore = true;
  loadingState.style.display = 'block';
  // Move loading state to bottom
  messagesContainer.appendChild(loadingState);

  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

  const nextRef = db.ref('messages')
    .orderByChild('timestamp')
    .startAt(twentyFourHoursAgo)
    .endBefore(oldestMessageTimestamp)
    .limitToLast(INITIAL_LOAD_LIMIT);

  try {
    const snapshot = await nextRef.once('value');

    // Artificial delay to simulate network latency so the spinner flashes visibly
    await new Promise(resolve => setTimeout(resolve, 500));

    loadingState.style.display = 'none';

    if (!snapshot.exists()) {
      hasMoreMessages = false;
      return;
    }

    const messages = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });

    if (messages.length < INITIAL_LOAD_LIMIT) {
      hasMoreMessages = false;
    }

    // Sort newest first
    messages.sort((a, b) => b.timestamp - a.timestamp);

    if (messages.length > 0) {
      oldestMessageTimestamp = messages[messages.length - 1].timestamp;
    }

    messages.forEach(msg => {
      trackAuthor(msg.author, msg.timestamp);
      const showBadge = !allNewMode && isNewSinceLastVisit(msg.timestamp, lastVisitTs);
      const card = createMessageCard(msg, currentUser, showBadge);
      messagesContainer.insertBefore(card, loadingState);
    });

    applySortOrder();
    filterMessages();
    handleDeepLink();

  } catch (error) {
    console.error('Error loading more messages:', error);
    loadingState.style.display = 'none';
  } finally {
    isLoadingMore = false;
  }
}

function handleScroll() {
  const scrollPosition = window.innerHeight + window.scrollY;
  const bodyHeight = document.body.offsetHeight;
  if (isNearBottom(scrollPosition, bodyHeight)) {
    loadMoreMessages();
  }
  if (window.scrollY <= 200 && newMessageCount > 0) {
    hideNewMessagesBanner();
  }
}

function stopListeningMessages() {
  if (expiryInterval) {
    clearInterval(expiryInterval);
    expiryInterval = null;
  }

  if (realtimeAddedListener) {
    db.ref('messages').off('child_added', realtimeAddedListener);
    realtimeAddedListener = null;
  }
  if (realtimeRemovedListener) {
    db.ref('messages').off('child_removed', realtimeRemovedListener);
    realtimeRemovedListener = null;
  }
  if (totalMessagesListener) {
    db.ref('messages').off('value', totalMessagesListener);
    totalMessagesListener = null;
  }
  if (typingListener) {
    typingListener.off();
    typingListener = null;
    typingMap.clear();
  }

  replyListenerMap.forEach(ref => ref.off());
  replyListenerMap.clear();
  replyCountMap.clear();

  window.removeEventListener('scroll', handleScroll);

  // Clear rendered messages
  const existingCards = messagesContainer.querySelectorAll('.message-card');
  existingCards.forEach((card) => card.remove());
  messageCount.textContent = '0';

  newMessageCount = 0;
  document.title = ORIGINAL_TITLE;
  clearTimeout(bannerHideTimer);
  newMessagesBanner.classList.remove('new-messages-banner--visible');
  newMessagesBanner.style.display = 'none';
}

// ========================================
// Expiry Countdown
// ========================================
const MESSAGE_LIFETIME_MS = 86400000; // 24 hours

function formatExpiryLabel(msRemaining) {
  if (msRemaining >= 3600000) {
    const hours = Math.floor(msRemaining / 3600000);
    const minutes = Math.floor((msRemaining % 3600000) / 60000);
    return { text: `expires in ${hours}h ${minutes}m`, cls: '' };
  }
  if (msRemaining >= 600000) {
    const minutes = Math.ceil(msRemaining / 60000);
    return { text: `expires in ${minutes}m`, cls: 'expiry--warning' };
  }
  return { text: 'expiring soon', cls: 'expiry--danger' };
}

function createExpiryLabel(timestamp) {
  const expiry = timestamp + MESSAGE_LIFETIME_MS;
  const msRemaining = expiry - Date.now();
  const { text, cls } = msRemaining > 0 ? formatExpiryLabel(msRemaining) : { text: 'expiring soon', cls: 'expiry--danger' };

  const el = document.createElement('span');
  el.className = 'expiry-label' + (cls ? ' ' + cls : '');
  el.dataset.expiry = String(expiry);
  el.textContent = ' \xB7 ' + text;

  const expiryTimeStr = new Date(expiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  el.setAttribute('aria-label', 'Expires at ' + expiryTimeStr);

  return el;
}

function tickExpiryLabels() {
  const now = Date.now();

  document.querySelectorAll('.message-card .expiry-label[data-expiry]').forEach(el => {
    const expiry = Number(el.dataset.expiry);
    const msRemaining = expiry - now;
    if (msRemaining <= 0) {
      const card = el.closest('.message-card');
      if (card) {
        const msgId = card.id.replace(/^msg-/, '');
        const replyRef = replyListenerMap.get(msgId);
        if (replyRef) {
          replyRef.off();
          replyListenerMap.delete(msgId);
        }
        replyCountMap.delete(msgId);
        card.remove();
      }
    } else {
      const { text, cls } = formatExpiryLabel(msRemaining);
      el.textContent = ' \xB7 ' + text;
      el.className = 'expiry-label' + (cls ? ' ' + cls : '');
    }
  });

  let savedPanelNeedsRefresh = false;
  document.querySelectorAll('.saved-message .expiry-label[data-expiry]').forEach(el => {
    const expiry = Number(el.dataset.expiry);
    const msRemaining = expiry - now;
    if (msRemaining <= 0) {
      savedPanelNeedsRefresh = true;
    } else {
      const { text, cls } = formatExpiryLabel(msRemaining);
      el.textContent = ' \xB7 ' + text;
      el.className = 'expiry-label' + (cls ? ' ' + cls : '');
    }
  });

  if (savedPanelNeedsRefresh) {
    refreshSavedPanel();
  }
}

// ========================================
// Bookmarks (localStorage)
// ========================================
const BOOKMARK_KEY = 'guestbook_bookmarks';
const BOOKMARK_LIMIT = 100;

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveBookmarksToStorage(list) {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

function isBookmarked(msgId) {
  return loadBookmarks().some(b => b.id === msgId);
}

function addBookmark(msg) {
  try {
    localStorage.setItem('__bm_probe__', '1');
    localStorage.removeItem('__bm_probe__');
  } catch (e) {
    showToast('Bookmarks unavailable in this browser mode.');
    return false;
  }

  const list = loadBookmarks();
  if (list.length >= BOOKMARK_LIMIT) {
    showToast('Bookmark limit reached (100). Remove some bookmarks to save more.');
    return false;
  }

  list.unshift({
    id: msg.id,
    author: msg.author,
    authorId: msg.authorId,
    photoURL: msg.photoURL || null,
    text: msg.text,
    timestamp: msg.timestamp,
    savedAt: Date.now(),
  });

  saveBookmarksToStorage(list);
  updateSavedBadge();
  refreshSavedPanel();
  return true;
}

function removeBookmark(msgId) {
  const list = loadBookmarks().filter(b => b.id !== msgId);
  saveBookmarksToStorage(list);
  updateSavedBadge();
  refreshSavedPanel();
}

function updateSavedBadge() {
  const badgeEl = document.getElementById('saved-badge');
  if (!badgeEl) return;
  const count = loadBookmarks().length;
  if (count === 0) {
    badgeEl.style.display = 'none';
  } else {
    badgeEl.textContent = '⊟ ' + count;
    badgeEl.style.display = '';
  }
}

function refreshSavedPanel() {
  const panel = document.getElementById('saved-panel');
  if (!panel || panel.style.display === 'none') return;

  const listEl = document.getElementById('saved-panel-list');
  if (!listEl) return;

  listEl.innerHTML = '';
  const list = loadBookmarks();

  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'saved-panel-empty';
    empty.textContent = 'No saved messages.';
    listEl.appendChild(empty);
    return;
  }

  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  list.forEach(bookmark => {
    const isExpired = now - bookmark.timestamp > TWENTY_FOUR_HOURS;

    let contentChanged = false;
    const liveCard = document.getElementById('msg-' + bookmark.id);
    if (liveCard) {
      const liveTextEl = liveCard.querySelector('.message-text');
      if (liveTextEl && liveTextEl.textContent !== bookmark.text) {
        contentChanged = true;
      }
    }

    const item = document.createElement('div');
    item.className = 'saved-message' + (isExpired ? ' saved-message--expired' : '');

    const unsaveBtn = document.createElement('button');
    unsaveBtn.className = 'btn-unsave';
    unsaveBtn.setAttribute('aria-label', 'Remove bookmark');
    unsaveBtn.textContent = '✕';
    unsaveBtn.addEventListener('click', () => {
      removeBookmark(bookmark.id);
      const liveBtn = document.querySelector('#msg-' + bookmark.id + ' .btn-bookmark');
      if (liveBtn) {
        liveBtn.innerHTML = BOOKMARK_ICON;
        liveBtn.setAttribute('aria-label', 'Bookmark this message');
        liveBtn.classList.remove('btn-bookmark--active');
      }
    });

    const msgHeader = document.createElement('div');
    msgHeader.className = 'saved-message-header';

    const avatarEl = createAvatarElement(bookmark.photoURL, bookmark.author);

    const authorEl = document.createElement('span');
    authorEl.className = 'saved-message-author';
    authorEl.textContent = bookmark.author; // textContent — XSS safe

    const timeEl = document.createElement('span');
    timeEl.className = 'saved-message-time';
    if (isExpired) {
      const badge = document.createElement('span');
      badge.className = 'expired-badge';
      badge.textContent = 'Expired \xB7 ' + formatTimestamp(bookmark.timestamp);
      timeEl.appendChild(badge);
    } else {
      timeEl.textContent = formatTimestamp(bookmark.timestamp);
      timeEl.appendChild(createExpiryLabel(bookmark.timestamp));
    }

    msgHeader.appendChild(avatarEl);
    msgHeader.appendChild(authorEl);
    msgHeader.appendChild(timeEl);

    const textEl = document.createElement('p');
    textEl.className = 'saved-message-text';
    textEl.textContent = bookmark.text; // textContent — XSS safe

    item.appendChild(unsaveBtn);
    item.appendChild(msgHeader);
    item.appendChild(textEl);

    if (contentChanged) {
      const changedNote = document.createElement('p');
      changedNote.className = 'changed-note';
      changedNote.textContent = 'Content may have changed';
      item.appendChild(changedNote);
    }

    listEl.appendChild(item);
  });
}

// ========================================
// Draft Auto-save (localStorage)
// ========================================
const DRAFT_KEY = 'guestbook_draft';
const MAX_DRAFT_LENGTH = 250;
let draftDebounceTimer = null;

function saveDraft(text) {
  try {
    localStorage.setItem('__draft_probe__', '1');
    localStorage.removeItem('__draft_probe__');
  } catch (e) {
    return false;
  }
  try {
    localStorage.setItem(DRAFT_KEY, text);
    return true;
  } catch (e) {
    return false;
  }
}

function loadDraft() {
  try {
    return localStorage.getItem(DRAFT_KEY);
  } catch (e) {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {}
}

function showDraftLabel(text) {
  const draftLabel = document.getElementById('draft-label');
  if (!draftLabel) return;
  draftLabel.textContent = text;
  draftLabel.style.display = '';
  void draftLabel.offsetWidth; // force reflow for CSS transition
  draftLabel.classList.add('draft-label--visible');
  setTimeout(() => {
    draftLabel.classList.remove('draft-label--visible');
    setTimeout(() => { draftLabel.style.display = 'none'; }, 300);
  }, 3000);
}

function restoreDraft() {
  const draft = loadDraft();
  if (!draft) return;

  let text = draft.length > MAX_DRAFT_LENGTH ? draft.slice(0, MAX_DRAFT_LENGTH) : draft;

  messageInput.value = text;
  const len = text.length;
  charCounter.textContent = `${len} / 250`;
  charCounter.classList.remove('warning', 'danger');
  if (len >= 230) charCounter.classList.add('danger');
  else if (len >= 200) charCounter.classList.add('warning');

  showDraftLabel('Draft restored');
  messageInput.focus();
}

// ========================================
// Formatting Toolbar
// ========================================
function createFormattingToolbar(textarea) {
  const toolbar = document.createElement('div');
  toolbar.className = 'formatting-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Formatting options');

  [
    { label: 'Bold',   before: '**', after: '**', text: 'B', cls: 'btn-format-bold' },
    { label: 'Italic', before: '*',  after: '*',  text: 'I', cls: 'btn-format-italic' },
    { label: 'Code',   before: '`',  after: '`',  text: '<>', cls: 'btn-format-code' },
  ].forEach(({ label, before, after, text, cls }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-format ' + cls;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.textContent = text;
    btn.addEventListener('click', () => {
      wrapSelection(textarea, before, after);
      textarea.focus();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    toolbar.appendChild(btn);
  });

  return toolbar;
}

// ========================================
// Quote Truncation
// ========================================
function truncateQuote(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.length > 100 ? trimmed.slice(0, 100) + '…' : trimmed;
}

// ========================================
// Create Reply Card Element
// ========================================
function createReplyCard(reply, user, msgId) {
  const card = document.createElement('div');
  card.className = 'reply-card';
  card.id = `reply-${reply.id}`;

  const header = document.createElement('div');
  header.className = 'reply-header';

  const authorEl = document.createElement('span');
  authorEl.className = 'reply-author';
  authorEl.textContent = reply.author; // textContent for XSS safety

  const timeEl = document.createElement('span');
  timeEl.className = 'reply-time';
  timeEl.textContent = formatTimestamp(reply.timestamp);

  header.appendChild(authorEl);
  header.appendChild(timeEl);

  if (user && reply.authorId === user.uid) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-reply-delete';
    deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    deleteBtn.title = 'Delete reply';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this reply?')) return;
      try {
        await db.ref(`messages/${msgId}/replies/${reply.id}`).remove();
      } catch (err) {
        console.error('Failed to delete reply:', err);
        alert('Failed to delete reply.');
      }
    });
    header.appendChild(deleteBtn);
  }

  const textEl = document.createElement('p');
  textEl.className = 'reply-text';
  renderMessageText(textEl, reply.text);

  card.appendChild(header);

  if (reply.quotedText) {
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'reply-quote';
    if (reply.quotedAuthor) {
      const quoteAuthorEl = document.createElement('span');
      quoteAuthorEl.className = 'reply-quote-author';
      quoteAuthorEl.textContent = reply.quotedAuthor + ': '; // textContent — XSS safe
      blockquote.appendChild(quoteAuthorEl);
    }
    const quoteTextEl = document.createElement('span');
    quoteTextEl.className = 'reply-quote-text';
    quoteTextEl.textContent = reply.quotedText; // textContent — XSS safe
    blockquote.appendChild(quoteTextEl);
    card.appendChild(blockquote);
  }

  card.appendChild(textEl);

  return card;
}

// ========================================
// Avatar Element
// ========================================
const AVATAR_FALLBACK_COLORS = ['#e8b4b8', '#a8d8ea', '#b8d8be', '#f9c784', '#c5b8e8', '#f2c4a0'];

function createAvatarElement(photoURL, author) {
  function makeFallback() {
    const div = document.createElement('div');
    div.className = 'avatar-fallback';
    const colorIndex = (author ? author.charCodeAt(0) : 0) % AVATAR_FALLBACK_COLORS.length;
    div.style.backgroundColor = AVATAR_FALLBACK_COLORS[colorIndex];
    div.textContent = author ? author.charAt(0).toUpperCase() : '?';
    return div;
  }

  if (!photoURL) {
    return makeFallback();
  }

  const img = document.createElement('img');
  img.className = 'message-avatar';
  img.alt = author || '';
  img.setAttribute('referrerpolicy', 'no-referrer');
  img.src = photoURL;
  img.onerror = function () {
    const fallback = makeFallback();
    if (img.parentNode) img.parentNode.replaceChild(fallback, img);
  };
  return img;
}

// ========================================
// Create Message Card Element
// ========================================
function createMessageCard(msg, user, isNew) {
  const card = document.createElement('div');
  card.className = 'message-card';
  card.id = `msg-${msg.id}`;
  card.dataset.timestamp = String(msg.timestamp);
  card.dataset.replyCount = '0';
  card.dataset.authorId = msg.authorId || '';

  if (isMuted(msg.authorId)) {
    card.style.display = 'none';
  }

  const header = document.createElement('div');
  header.className = 'message-header';

  const authorEl = document.createElement('span');
  authorEl.className = 'message-author';
  authorEl.textContent = msg.author; // textContent for XSS safety

  const timeEl = document.createElement('span');
  timeEl.className = 'message-time';
  timeEl.textContent = formatTimestamp(msg.timestamp);
  if (msg.editedAt) {
    const editedLabel = document.createElement('span');
    editedLabel.className = 'edited-label';
    editedLabel.textContent = ' · edited';
    timeEl.appendChild(editedLabel);
  }
  timeEl.appendChild(createExpiryLabel(msg.timestamp));

  if (isNew) {
    const newBadge = document.createElement('span');
    newBadge.className = 'new-since-visit-badge';
    newBadge.textContent = 'NEW';
    newBadge.setAttribute('aria-label', 'New since your last visit');
    timeEl.appendChild(newBadge);
  }

  const avatarEl = createAvatarElement(msg.photoURL, msg.author);
  avatarEl.classList.add('author-avatar-btn');
  avatarEl.addEventListener('click', (e) => {
    e.stopPropagation();
    openAuthorPanel(msg.authorId, msg.author, msg.photoURL);
  });

  authorEl.classList.add('author-name-btn');
  authorEl.addEventListener('click', (e) => {
    e.stopPropagation();
    openAuthorPanel(msg.authorId, msg.author, msg.photoURL);
  });

  header.appendChild(avatarEl);
  header.appendChild(authorEl);
  header.appendChild(timeEl);

  const textEl = document.createElement('p');
  textEl.className = 'message-text';
  renderMessageText(textEl, msg.text);

  card.appendChild(header);
  card.appendChild(textEl);

  // Show edit + delete buttons only for own messages
  if (user && msg.authorId === user.uid) {
    // Static, non-user SVG icon markup (no user data — safe to assign as innerHTML)
    const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    const DELETE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    card.classList.add('has-actions');

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.innerHTML = EDIT_ICON;
    editBtn.title = 'Edit message';
    editBtn.setAttribute('aria-label', 'Edit message');

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.innerHTML = DELETE_ICON;
    deleteBtn.title = 'Delete message';
    deleteBtn.setAttribute('aria-label', 'Delete message');
    deleteBtn.addEventListener('click', async () => {
      const count = replyCountMap.get(msg.id) || 0;
      const confirmMsg = count > 0
        ? `This will also delete ${count} ${count === 1 ? 'reply' : 'replies'}. Continue?`
        : 'Delete this message?';
      if (!confirm(confirmMsg)) return;
      try {
        if (count > 0) {
          await db.ref(`messages/${msg.id}/replies`).remove();
        }
        await db.ref(`messages/${msg.id}`).remove();
      } catch (err) {
        console.error('Failed to delete:', err);
        alert('Failed to delete message.');
      }
    });

    editBtn.addEventListener('click', () => {
      // Hide read-only text and action buttons
      textEl.style.display = 'none';
      editBtn.style.display = 'none';
      deleteBtn.style.display = 'none';

      // Build edit UI
      const editWrapper = document.createElement('div');
      editWrapper.className = 'edit-wrapper';

      const textarea = document.createElement('textarea');
      textarea.className = 'edit-textarea';
      textarea.value = msg.text;
      textarea.maxLength = 250;

      const editCounter = document.createElement('span');
      editCounter.className = 'edit-char-counter';
      updateEditCounter(editCounter, textarea.value.length);

      textarea.addEventListener('input', () => {
        updateEditCounter(editCounter, textarea.value.length);
      });

      const editError = document.createElement('p');
      editError.className = 'edit-error-msg';
      editError.style.display = 'none';

      const editActions = document.createElement('div');
      editActions.className = 'edit-actions';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-save';
      saveBtn.textContent = 'Save';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-cancel';
      cancelBtn.textContent = 'Cancel';

      const editHint = document.createElement('span');
      editHint.className = 'submit-hint';
      editHint.textContent = SUBMIT_HINT_TEXT;

      editActions.appendChild(saveBtn);
      editActions.appendChild(cancelBtn);

      editWrapper.appendChild(createFormattingToolbar(textarea));
      editWrapper.appendChild(textarea);
      editWrapper.appendChild(editCounter);
      editWrapper.appendChild(editError);
      editWrapper.appendChild(editActions);
      editWrapper.appendChild(editHint);
      card.insertBefore(editWrapper, editBtn);

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          saveBtn.click();
        }
      });

      textarea.focus();

      cancelBtn.addEventListener('click', () => {
        editWrapper.remove();
        textEl.style.display = '';
        editBtn.style.display = '';
        deleteBtn.style.display = '';
      });

      saveBtn.addEventListener('click', async () => {
        const validation = validateMessage(textarea.value);
        if (!validation.valid) {
          editError.textContent = validation.error;
          editError.style.display = 'block';
          textarea.classList.add('input-error');
          return;
        }
        editError.style.display = 'none';
        textarea.classList.remove('input-error');

        saveBtn.disabled = true;
        cancelBtn.disabled = true;

        try {
          await db.ref(`messages/${msg.id}`).update({
            text: validation.text,
            editedAt: firebase.database.ServerValue.TIMESTAMP,
          });

          // Update in-memory msg for re-edits
          msg.text = validation.text;
          msg.editedAt = Date.now();

          // Update card to reflect saved text
          renderMessageText(textEl, validation.text);
          if (!timeEl.querySelector('.edited-label')) {
            const editedLabel = document.createElement('span');
            editedLabel.className = 'edited-label';
            editedLabel.textContent = ' · edited';
            timeEl.appendChild(editedLabel);
          }

          editWrapper.remove();
          textEl.style.display = '';
          editBtn.style.display = '';
          deleteBtn.style.display = '';
        } catch (err) {
          console.error('Failed to save edit:', err);
          editError.textContent = 'Failed to save. Please try again.';
          editError.style.display = 'block';
          saveBtn.disabled = false;
          cancelBtn.disabled = false;
        }
      });
    });

    card.appendChild(editBtn);
    card.appendChild(deleteBtn);
  }

  // Card footer: reply count + reply button (reply button for all auth'd users)
  const cardFooter = document.createElement('div');
  cardFooter.className = 'card-footer';

  const replyCountEl = document.createElement('span');
  replyCountEl.className = 'reply-count';
  replyCountEl.style.display = 'none';
  cardFooter.appendChild(replyCountEl);

  // Permalink button — visible to all visitors (not gated on auth)
  const isMobile = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(hover: none)').matches
    : false;

  const permalinkBtn = document.createElement('button');
  permalinkBtn.className = 'btn-permalink';
  permalinkBtn.setAttribute('aria-label', 'Copy link to this message');
  permalinkBtn.setAttribute('tabindex', isMobile ? '0' : '-1');
  permalinkBtn.innerHTML = LINK_ICON; // static SVG — no user data

  const permalinkTooltip = document.createElement('span');
  permalinkTooltip.className = 'permalink-tooltip';
  permalinkTooltip.textContent = 'Copied!';
  permalinkBtn.appendChild(permalinkTooltip);

  if (!isMobile) {
    card.addEventListener('mouseenter', () => permalinkBtn.setAttribute('tabindex', '0'));
    card.addEventListener('mouseleave', () => permalinkBtn.setAttribute('tabindex', '-1'));
  }

  permalinkBtn.addEventListener('click', () => {
    const url = 'https://guestbook.slashstack.app/app#msg-' + msg.id;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        permalinkTooltip.classList.add('permalink-tooltip--visible');
        setTimeout(() => permalinkTooltip.classList.remove('permalink-tooltip--visible'), 1500);
      }).catch(() => {
        prompt('Copy this link:', url);
      });
    } else {
      prompt('Copy this link:', url);
    }
  });

  if (user) {
    const replyBtn = document.createElement('button');
    replyBtn.className = 'btn-reply';
    replyBtn.textContent = 'Reply';
    replyBtn.title = 'Reply to this message';

    replyBtn.addEventListener('click', () => {
      // Toggle: close form if already open
      const existing = card.querySelector('.reply-form-wrapper');
      if (existing) {
        existing.remove();
        return;
      }

      const quotedSnippet = truncateQuote(msg.text);

      const formWrapper = document.createElement('div');
      formWrapper.className = 'reply-form-wrapper';

      if (quotedSnippet) {
        const quotePreview = document.createElement('div');
        quotePreview.className = 'reply-quote-preview';
        if (msg.author) {
          const quotePreviewAuthor = document.createElement('span');
          quotePreviewAuthor.className = 'reply-quote-preview-author';
          quotePreviewAuthor.textContent = msg.author + ': '; // textContent — XSS safe
          quotePreview.appendChild(quotePreviewAuthor);
        }
        const quotePreviewText = document.createElement('span');
        quotePreviewText.textContent = quotedSnippet; // textContent — XSS safe
        quotePreview.appendChild(quotePreviewText);
        formWrapper.appendChild(quotePreview);
      }

      const replyTextarea = document.createElement('textarea');
      replyTextarea.className = 'reply-textarea edit-textarea';
      replyTextarea.placeholder = 'Write a reply...';
      replyTextarea.maxLength = 250;

      const replyCounter = document.createElement('span');
      replyCounter.className = 'edit-char-counter';
      updateEditCounter(replyCounter, 0);

      replyTextarea.addEventListener('input', () => {
        updateEditCounter(replyCounter, replyTextarea.value.length);
      });

      const replyError = document.createElement('p');
      replyError.className = 'edit-error-msg';
      replyError.style.display = 'none';

      const replyActions = document.createElement('div');
      replyActions.className = 'edit-actions';

      const replyPostBtn = document.createElement('button');
      replyPostBtn.className = 'btn btn-save btn-reply-post';
      replyPostBtn.textContent = 'Post';

      const replyCancelBtn = document.createElement('button');
      replyCancelBtn.className = 'btn btn-cancel btn-reply-cancel';
      replyCancelBtn.textContent = 'Cancel';

      const replyHint = document.createElement('span');
      replyHint.className = 'submit-hint';
      replyHint.textContent = SUBMIT_HINT_TEXT;

      replyActions.appendChild(replyPostBtn);
      replyActions.appendChild(replyCancelBtn);

      formWrapper.appendChild(createFormattingToolbar(replyTextarea));
      formWrapper.appendChild(replyTextarea);
      formWrapper.appendChild(replyCounter);
      formWrapper.appendChild(replyError);
      formWrapper.appendChild(replyActions);
      formWrapper.appendChild(replyHint);

      replyTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          replyPostBtn.click();
        }
      });

      // Attach @mention autocomplete to reply textarea
      formWrapper.style.position = 'relative';
      attachMentionAutocomplete(replyTextarea, formWrapper);

      // Insert form between footer and replies section
      card.insertBefore(formWrapper, repliesSection);
      replyTextarea.focus();

      replyCancelBtn.addEventListener('click', () => {
        formWrapper.remove();
      });

      replyPostBtn.addEventListener('click', async () => {
        const validation = validateMessage(replyTextarea.value);
        if (!validation.valid) {
          replyError.textContent = validation.error;
          replyError.style.display = 'block';
          replyTextarea.classList.add('input-error');
          return;
        }
        replyError.style.display = 'none';
        replyTextarea.classList.remove('input-error');

        replyPostBtn.disabled = true;
        replyCancelBtn.disabled = true;

        try {
          const newReplyKey = db.ref(`messages/${msg.id}/replies`).push().key;
          const updates = {};
          const replyPayload = {
            text: validation.text,
            author: userAlias || user.displayName || 'Anonymous',
            authorId: user.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
          };
          if (quotedSnippet) {
            replyPayload.quotedText = quotedSnippet;
            replyPayload.quotedAuthor = msg.author || '';
          }
          updates[`/messages/${msg.id}/replies/${newReplyKey}`] = replyPayload;
          updates[`/users/${user.uid}/lastPostTimestamp`] = firebase.database.ServerValue.TIMESTAMP;
          await db.ref().update(updates);
          formWrapper.remove();
        } catch (err) {
          console.error('Failed to post reply:', err);
          replyError.textContent = err.code === 'PERMISSION_DENIED'
            ? 'Please wait a few seconds before replying again.'
            : 'Failed to post reply.';
          replyError.style.display = 'block';
          replyPostBtn.disabled = false;
          replyCancelBtn.disabled = false;
        }
      });
    });

    cardFooter.appendChild(replyBtn);
  }

  // Bookmark button — visible to all visitors (not gated on auth)
  const bookmarked = isBookmarked(msg.id);
  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'btn-bookmark' + (bookmarked ? ' btn-bookmark--active' : '');
  bookmarkBtn.innerHTML = bookmarked ? BOOKMARK_FILLED_ICON : BOOKMARK_ICON; // static SVG — no user data
  bookmarkBtn.setAttribute('aria-label', bookmarked ? 'Remove bookmark' : 'Bookmark this message');
  bookmarkBtn.setAttribute('tabindex', isMobile || bookmarked ? '0' : '-1');

  if (!isMobile) {
    card.addEventListener('mouseenter', () => bookmarkBtn.setAttribute('tabindex', '0'));
    card.addEventListener('mouseleave', () => {
      if (!bookmarkBtn.classList.contains('btn-bookmark--active')) {
        bookmarkBtn.setAttribute('tabindex', '-1');
      }
    });
  }

  bookmarkBtn.addEventListener('click', () => {
    if (isBookmarked(msg.id)) {
      removeBookmark(msg.id);
      bookmarkBtn.innerHTML = BOOKMARK_ICON;
      bookmarkBtn.setAttribute('aria-label', 'Bookmark this message');
      bookmarkBtn.classList.remove('btn-bookmark--active');
      if (!isMobile) bookmarkBtn.setAttribute('tabindex', '-1');
    } else {
      const success = addBookmark(msg);
      if (success) {
        bookmarkBtn.innerHTML = BOOKMARK_FILLED_ICON;
        bookmarkBtn.setAttribute('aria-label', 'Remove bookmark');
        bookmarkBtn.classList.add('btn-bookmark--active');
        bookmarkBtn.setAttribute('tabindex', '0');
      }
    }
  });

  cardFooter.appendChild(bookmarkBtn);
  cardFooter.appendChild(permalinkBtn);

  // Replies section (hidden until replies exist)
  const repliesSection = document.createElement('div');
  repliesSection.className = 'replies-section';
  repliesSection.style.display = 'none';

  card.appendChild(cardFooter);
  card.appendChild(repliesSection);

  // Set up real-time listeners for replies
  let localReplyCount = 0;
  let initialReplyLoadComplete = false;
  const repliesRef = db.ref(`messages/${msg.id}/replies`).orderByChild('timestamp');

  // child_added fires synchronously for pre-existing replies; mark them done after
  Promise.resolve().then(() => { initialReplyLoadComplete = true; });

  repliesRef.on('child_added', (snap) => {
    const reply = { id: snap.key, ...snap.val() };
    localReplyCount++;
    replyCountMap.set(msg.id, localReplyCount);
    card.dataset.replyCount = String(localReplyCount);

    replyCountEl.textContent = `${localReplyCount} ${localReplyCount === 1 ? 'reply' : 'replies'}`;
    replyCountEl.style.display = '';
    repliesSection.style.display = '';
    cardFooter.style.display = '';

    const replyCard = createReplyCard(reply, user, msg.id);
    repliesSection.appendChild(replyCard);

    if (initialReplyLoadComplete) {
      maybeFireReplyNotification(msg, reply);
      if (currentSort === SORT_ACTIVE) applySortOrder();
    }
  });

  repliesRef.on('child_removed', (snap) => {
    const replyEl = document.getElementById(`reply-${snap.key}`);
    if (replyEl) replyEl.remove();
    localReplyCount = Math.max(0, localReplyCount - 1);
    replyCountMap.set(msg.id, localReplyCount);
    card.dataset.replyCount = String(localReplyCount);

    if (localReplyCount === 0) {
      replyCountEl.style.display = 'none';
      repliesSection.style.display = 'none';
    } else {
      replyCountEl.textContent = `${localReplyCount} ${localReplyCount === 1 ? 'reply' : 'replies'}`;
    }
    if (currentSort === SORT_ACTIVE) applySortOrder();
  });

  replyListenerMap.set(msg.id, repliesRef);

  return card;
}

function updateEditCounter(el, len) {
  el.textContent = `${len} / 250`;
  el.classList.remove('warning', 'danger');
  if (len >= 230) {
    el.classList.add('danger');
  } else if (len >= 200) {
    el.classList.add('warning');
  }
}

// formatTimestamp is provided by utils.js

// ========================================
// @mention Autocomplete
// ========================================

/**
 * Get the @-prefix the user is currently typing at the cursor position.
 * Returns the partial name string (without @), or null if not in a mention.
 */
function getMentionPrefix(textarea) {
  const val = textarea.value;
  const pos = textarea.selectionStart;
  // Walk backwards from cursor to find an @ that started a mention token
  let i = pos - 1;
  while (i >= 0 && /\w/.test(val[i])) i--;
  if (i >= 0 && val[i] === '@') {
    const prefix = val.slice(i + 1, pos);
    // Require at least one character after @
    return prefix.length > 0 ? { prefix, atIndex: i } : null;
  }
  return null;
}

/**
 * Attach autocomplete dropdown behaviour to a textarea.
 * The dropdown is appended to relativeParent (must have position:relative or absolute).
 */
function attachMentionAutocomplete(textarea, relativeParent) {
  let dropdown = null;
  let activeIndex = -1;
  let currentPrefix = null;
  let currentAtIndex = -1;

  function removeDropdown() {
    if (dropdown) {
      dropdown.remove();
      dropdown = null;
    }
    activeIndex = -1;
    currentPrefix = null;
    currentAtIndex = -1;
  }

  function selectItem(name) {
    const val = textarea.value;
    const pos = textarea.selectionStart;
    // Replace @prefix with @name + space
    const before = val.slice(0, currentAtIndex);
    const after = val.slice(pos);
    const inserted = '@' + name + ' ';
    textarea.value = before + inserted + after;
    const newCursor = before.length + inserted.length;
    textarea.setSelectionRange(newCursor, newCursor);
    removeDropdown();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function renderDropdown(suggestions, atIndex) {
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'mention-dropdown';
      relativeParent.appendChild(dropdown);
    }

    // Position below textarea
    const taRect = textarea.getBoundingClientRect();
    const parentRect = relativeParent.getBoundingClientRect();
    dropdown.style.top = (taRect.bottom - parentRect.top + relativeParent.scrollTop) + 'px';
    dropdown.style.left = (taRect.left - parentRect.left) + 'px';
    dropdown.style.width = taRect.width + 'px';

    dropdown.innerHTML = '';
    activeIndex = -1;

    suggestions.forEach((name, idx) => {
      const item = document.createElement('div');
      item.className = 'mention-dropdown-item';
      item.textContent = '@' + name; // textContent — XSS safe
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent textarea blur
        selectItem(name);
      });
      dropdown.appendChild(item);
    });
  }

  function setActiveIndex(idx) {
    const items = dropdown ? dropdown.querySelectorAll('.mention-dropdown-item') : [];
    if (activeIndex >= 0 && activeIndex < items.length) {
      items[activeIndex].classList.remove('active');
    }
    activeIndex = idx;
    if (activeIndex >= 0 && activeIndex < items.length) {
      items[activeIndex].classList.add('active');
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  textarea.addEventListener('input', () => {
    const match = getMentionPrefix(textarea);
    if (!match) {
      removeDropdown();
      return;
    }
    const { prefix, atIndex } = match;
    currentPrefix = prefix;
    currentAtIndex = atIndex;
    const suggestions = getAuthorSuggestions(prefix);
    if (suggestions.length === 0) {
      removeDropdown();
      return;
    }
    renderDropdown(suggestions, atIndex);
  });

  textarea.addEventListener('keydown', (e) => {
    if (!dropdown) return;
    const items = dropdown.querySelectorAll('.mention-dropdown-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(Math.min(activeIndex + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const name = items[activeIndex].textContent.slice(1); // strip leading @
      selectItem(name);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      removeDropdown();
    }
  });

  textarea.addEventListener('blur', () => {
    // Delay so mousedown on item fires first
    setTimeout(removeDropdown, 150);
  });

  return { removeDropdown };
}

// ========================================
// Sort Control
// ========================================
(function initSortControl() {
  const sortGroup = document.getElementById('sort-group');
  if (!sortGroup) return;

  const disclaimerEl = document.getElementById('sort-disclaimer');

  function updateSortUI(sort) {
    sortGroup.querySelectorAll('.sort-btn').forEach(btn => {
      const active = btn.dataset.sort === sort;
      btn.classList.toggle('sort-btn--active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (disclaimerEl) disclaimerEl.style.display = sort === SORT_ACTIVE ? '' : 'none';
  }

  // Initialize button state to reflect saved sort
  updateSortUI(currentSort);

  sortGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.sort-btn');
    if (!btn) return;
    const sort = btn.dataset.sort;
    if (sort === currentSort) return;
    currentSort = sort;
    try { localStorage.setItem(SORT_KEY, sort); } catch (_) {}
    updateSortUI(sort);
    applySortOrder();
  });
})();

// Wire up typing indicator listeners
setupTypingInputListeners();

// ========================================
// Bookmark badge + saved panel setup
// ========================================
updateSavedBadge();

const savedBadgeEl = document.getElementById('saved-badge');
if (savedBadgeEl) {
  savedBadgeEl.addEventListener('click', () => {
    const panel = document.getElementById('saved-panel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    if (isOpen) {
      panel.style.display = 'none';
      savedBadgeEl.setAttribute('aria-expanded', 'false');
    } else {
      panel.style.display = '';
      savedBadgeEl.setAttribute('aria-expanded', 'true');
      refreshSavedPanel();
    }
  });
}

const savedPanelClearEl = document.getElementById('saved-panel-clear');
if (savedPanelClearEl) {
  savedPanelClearEl.addEventListener('click', () => {
    if (!confirm('Remove all saved messages?')) return;
    saveBookmarksToStorage([]);
    updateSavedBadge();
    refreshSavedPanel();
    document.querySelectorAll('.btn-bookmark--active').forEach(btn => {
      btn.innerHTML = BOOKMARK_ICON;
      btn.setAttribute('aria-label', 'Bookmark this message');
      btn.classList.remove('btn-bookmark--active');
    });
  });
}

// ========================================
// Muted badge + muted panel setup
// ========================================
updateMutedChip();

const mutedBadgeEl = document.getElementById('muted-badge');
if (mutedBadgeEl) {
  mutedBadgeEl.addEventListener('click', () => {
    const panel = document.getElementById('muted-panel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    if (isOpen) {
      panel.style.display = 'none';
      mutedBadgeEl.setAttribute('aria-expanded', 'false');
    } else {
      panel.style.display = '';
      mutedBadgeEl.setAttribute('aria-expanded', 'true');
      refreshMutedPanel();
    }
  });
}

// Add formatting toolbar above the main message textarea
messageInput.parentElement.insertBefore(createFormattingToolbar(messageInput), messageInput);

// Attach @mention autocomplete to the main message textarea
attachMentionAutocomplete(messageInput, messageInput.parentElement);

// Set platform-appropriate keyboard shortcut hint
if (submitHint) submitHint.textContent = SUBMIT_HINT_TEXT;

// Cmd/Ctrl+Enter on main textarea submits the post form
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    postForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
});

// ========================================
// Character Counter
// ========================================
messageInput.addEventListener('input', () => {
  const len = messageInput.value.length;
  charCounter.textContent = `${len} / 250`;

  charCounter.classList.remove('warning', 'danger');
  if (len >= 230) {
    charCounter.classList.add('danger');
  } else if (len >= 200) {
    charCounter.classList.add('warning');
  }

  // Clear error state when user starts typing
  if (len > 0) {
    messageInput.classList.remove('input-error');
    const emptyErrorMsg = document.getElementById('empty-error-msg');
    if (emptyErrorMsg) emptyErrorMsg.style.display = 'none';
  }

  // Auto-save draft with debounce
  clearTimeout(draftDebounceTimer);
  draftDebounceTimer = setTimeout(() => {
    if (messageInput.value) {
      saveDraft(messageInput.value);
    }
  }, 1000);
});

// Clear draft when user empties the textarea and blurs it
messageInput.addEventListener('blur', () => {
  if (!messageInput.value.trim()) {
    clearDraft();
  }
});

// ========================================
// Post Message
// ========================================
postForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentUser) return;

  // Use shared validation from utils.js
  const validation = validateMessage(messageInput.value);
  const emptyErrorMsg = document.getElementById('empty-error-msg');
  if (!validation.valid) {
    messageInput.classList.add('input-error');
    emptyErrorMsg.style.display = 'block';
    emptyErrorMsg.textContent = validation.error;
    return;
  }
  // Clear error state
  messageInput.classList.remove('input-error');
  emptyErrorMsg.style.display = 'none';
  const text = validation.text;

  // Disable the button
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').style.display = 'none';
  submitBtn.querySelector('.btn-loading').style.display = 'inline';
  rateLimitMsg.style.display = 'none';

  try {
    // Generate a new unique key for the message
    const newMessageKey = db.ref('messages').push().key;

    // Build the atomic multi-path update
    const updates = {};
    updates[`/messages/${newMessageKey}`] = {
      text: text,
      author: userAlias || currentUser.displayName || 'Anonymous',
      authorId: currentUser.uid,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      photoURL: currentUser.photoURL || ''
    };
    updates[`/users/${currentUser.uid}/lastPostTimestamp`] = firebase.database.ServerValue.TIMESTAMP;

    // Send the atomic update
    await db.ref().update(updates);

    // Request notification permission once per session after the user's first post
    if ('Notification' in window &&
        Notification.permission === 'default' &&
        !notificationPermissionRequested) {
      notificationPermissionRequested = true;
      Notification.requestPermission();
    }

    // Success — clear input, draft, and stop typing indicator
    stopTyping();
    clearDraft();
    messageInput.value = '';
    charCounter.textContent = '0 / 250';
    charCounter.classList.remove('warning', 'danger');

  } catch (error) {
    console.error('Post error:', error);

    // Check if this is a rate-limit rejection (PERMISSION_DENIED)
    if (error.code === 'PERMISSION_DENIED') {
      rateLimitMsg.style.display = 'block';
      setTimeout(() => {
        rateLimitMsg.style.display = 'none';
      }, 5000);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').style.display = 'inline';
    submitBtn.querySelector('.btn-loading').style.display = 'none';
  }
});

// Export for testing (Node.js / Jest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createMessageCard, createReplyCard, updateEditCounter, filterMessages, createAvatarElement, applyTheme, toggleTheme, handleDeepLink, showToast, renderTypingLabel, updateNewMessagesBanner, hideNewMessagesBanner, trackAuthor, getAuthorSuggestions, getMentionPrefix, loadBookmarks, saveBookmarksToStorage, isBookmarked, addBookmark, removeBookmark, updateSavedBadge, refreshSavedPanel, maybeFireReplyNotification, maybeFireMentionNotification, escapeRegex, formatExpiryLabel, createExpiryLabel, tickExpiryLabels, truncateQuote, saveDraft, loadDraft, clearDraft, restoreDraft, openAuthorPanel, closeAuthorPanel, loadUserAlias, openDisplayNameEditor, openBioEditor, openWebsiteEditor, updateNewSinceSummary, maybeSaveLastVisit, saveLastVisitTimestamp, getSortComparator, applySortOrder, loadMuted, saveMuted, isMuted, addMuted, removeMuted, updateMutedChip, refreshMutedPanel };
}

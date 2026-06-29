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
let messagesListener = null;
let searchDebounceTimer = null;
const replyCountMap = new Map(); // msgId -> current reply count (for delete warning)
const replyListenerMap = new Map(); // msgId -> db ref (for cleanup)
let newMessageCount = 0;
let bannerHideTimer = null;

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
    name: currentUser.displayName || 'Anonymous',
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
  newMessagesBanner.classList.remove('new-messages-banner--visible');
  clearTimeout(bannerHideTimer);
  bannerHideTimer = setTimeout(() => {
    if (!newMessagesBanner.classList.contains('new-messages-banner--visible')) {
      newMessagesBanner.style.display = 'none';
    }
  }, 220);
}

newMessagesBanner.addEventListener('click', () => {
  if (searchInput.value) {
    searchInput.value = '';
    filterMessages();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  hideNewMessagesBanner();
});

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
    cards.forEach(card => { card.style.display = ''; });
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
  cards.forEach(card => {
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
    searchResultsCount.textContent = `Showing ${matchCount} of ${cards.length}`;
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

// ========================================
// Auth: State Observer
// ========================================
auth.onAuthStateChanged((user) => {
  // Clean up typing indicator when signing out
  if (!user && currentUser) {
    stopTyping();
    typingRef = null;
  }

  currentUser = user;

  // Message feed is always visible; login prompt is never shown full-screen
  mainContent.style.display = 'block';
  loginPrompt.style.display = 'none';

  if (user) {
    userInfo.style.display = 'flex';
    userAvatar.src = user.photoURL || '';
    userName.textContent = user.displayName || 'User';
    postSection.style.display = 'block';
    loginBtnHeader.style.display = 'none';
  } else {
    userInfo.style.display = 'none';
    postSection.style.display = 'none';
    loginBtnHeader.style.display = 'inline-flex';
  }

  // Start the listener once; skip if already running to avoid duplicate listeners
  if (!realtimeAddedListener) {
    startListeningMessages();
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
const INITIAL_LOAD_LIMIT = 20;

// ========================================
// Realtime Database: Listen for Messages
// ========================================

async function startListeningMessages() {
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

      messages.forEach(msg => {
        trackAuthor(msg.author, msg.timestamp);
        const card = createMessageCard(msg, currentUser);
        messagesContainer.appendChild(card);
      });
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
        const card = createMessageCard(msg, currentUser);
        // Prepend new messages to the top (right after the empty/loading states)
        messagesContainer.insertBefore(card, loadingState.nextSibling);
        filterMessages();

        // Show banner when user is scrolled down so new arrivals aren't missed
        if (window.scrollY > 200) {
          newMessageCount++;
          updateNewMessagesBanner();
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
      const card = createMessageCard(msg, currentUser);
      // Ensure the loading state is always at the bottom if it's there
      messagesContainer.insertBefore(card, loadingState);
    });

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
  clearTimeout(bannerHideTimer);
  newMessagesBanner.classList.remove('new-messages-banner--visible');
  newMessagesBanner.style.display = 'none';
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
function createMessageCard(msg, user) {
  const card = document.createElement('div');
  card.className = 'message-card';
  card.id = `msg-${msg.id}`;

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

  const avatarEl = createAvatarElement(msg.photoURL, msg.author);
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

      const formWrapper = document.createElement('div');
      formWrapper.className = 'reply-form-wrapper';

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
          updates[`/messages/${msg.id}/replies/${newReplyKey}`] = {
            text: validation.text,
            author: user.displayName || 'Anonymous',
            authorId: user.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
          };
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

  cardFooter.appendChild(permalinkBtn);

  // Replies section (hidden until replies exist)
  const repliesSection = document.createElement('div');
  repliesSection.className = 'replies-section';
  repliesSection.style.display = 'none';

  card.appendChild(cardFooter);
  card.appendChild(repliesSection);

  // Set up real-time listeners for replies
  let localReplyCount = 0;
  const repliesRef = db.ref(`messages/${msg.id}/replies`).orderByChild('timestamp');

  repliesRef.on('child_added', (snap) => {
    const reply = { id: snap.key, ...snap.val() };
    localReplyCount++;
    replyCountMap.set(msg.id, localReplyCount);

    replyCountEl.textContent = `${localReplyCount} ${localReplyCount === 1 ? 'reply' : 'replies'}`;
    replyCountEl.style.display = '';
    repliesSection.style.display = '';
    cardFooter.style.display = '';

    const replyCard = createReplyCard(reply, user, msg.id);
    repliesSection.appendChild(replyCard);
  });

  repliesRef.on('child_removed', (snap) => {
    const replyEl = document.getElementById(`reply-${snap.key}`);
    if (replyEl) replyEl.remove();
    localReplyCount = Math.max(0, localReplyCount - 1);
    replyCountMap.set(msg.id, localReplyCount);

    if (localReplyCount === 0) {
      replyCountEl.style.display = 'none';
      repliesSection.style.display = 'none';
    } else {
      replyCountEl.textContent = `${localReplyCount} ${localReplyCount === 1 ? 'reply' : 'replies'}`;
    }
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

// Wire up typing indicator listeners
setupTypingInputListeners();

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
      author: currentUser.displayName || 'Anonymous',
      authorId: currentUser.uid,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      photoURL: currentUser.photoURL || ''
    };
    updates[`/users/${currentUser.uid}/lastPostTimestamp`] = firebase.database.ServerValue.TIMESTAMP;

    // Send the atomic update
    await db.ref().update(updates);

    // Success — clear input and stop typing indicator
    stopTyping();
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
  module.exports = { createMessageCard, createReplyCard, updateEditCounter, filterMessages, createAvatarElement, applyTheme, toggleTheme, handleDeepLink, showToast, renderTypingLabel, updateNewMessagesBanner, hideNewMessagesBanner, trackAuthor, getAuthorSuggestions, getMentionPrefix };
}

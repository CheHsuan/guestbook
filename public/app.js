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
const rateLimitMsg = document.getElementById('rate-limit-msg');
const messagesContainer = document.getElementById('messages-container');
const emptyState = document.getElementById('empty-state');
const loadingState = document.getElementById('loading-state');
const messageCount = document.getElementById('message-count');

// ========================================
// State
// ========================================
let currentUser = null;
let messagesListener = null;

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
        const card = createMessageCard(msg, currentUser);
        messagesContainer.appendChild(card);
      });
    }

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

        const card = createMessageCard(msg, currentUser);
        // Prepend new messages to the top (right after the empty/loading states)
        messagesContainer.insertBefore(card, loadingState.nextSibling);
      }
    });

    // 3. Listen for REMOVED messages
    realtimeRemovedListener = db.ref('messages').on('child_removed', (childSnapshot) => {
      const msgId = childSnapshot.key;
      const cardToRemove = document.getElementById(`msg-${msgId}`);
      if (cardToRemove) {
        cardToRemove.remove();

        // Hide empty state if there are elements besides loading/empty states
        const hasMessages = messagesContainer.querySelectorAll('.message-card').length > 0;
        if (!hasMessages) {
          emptyState.style.display = 'block';
        }
      }
    });

    // Assign scroll listener
    window.addEventListener('scroll', handleScroll);

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
      const card = createMessageCard(msg, currentUser);
      // Ensure the loading state is always at the bottom if it's there
      messagesContainer.insertBefore(card, loadingState);
    });

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

  window.removeEventListener('scroll', handleScroll);

  // Clear rendered messages
  const existingCards = messagesContainer.querySelectorAll('.message-card');
  existingCards.forEach((card) => card.remove());
  messageCount.textContent = '0';
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

  header.appendChild(authorEl);
  header.appendChild(timeEl);

  const textEl = document.createElement('p');
  textEl.className = 'message-text';
  textEl.textContent = msg.text; // textContent for XSS safety

  card.appendChild(header);
  card.appendChild(textEl);

  // Show delete button only for own messages
  if (user && msg.authorId === user.uid) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Delete message';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this message?')) return;
      try {
        await db.ref(`messages/${msg.id}`).remove();
      } catch (err) {
        console.error('Failed to delete:', err);
        alert('Failed to delete message.');
      }
    });
    card.appendChild(deleteBtn);
  }

  return card;
}

// formatTimestamp is provided by utils.js

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
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    updates[`/users/${currentUser.uid}/lastPostTimestamp`] = firebase.database.ServerValue.TIMESTAMP;

    // Send the atomic update
    await db.ref().update(updates);

    // Success — clear input
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
  module.exports = { createMessageCard };
}

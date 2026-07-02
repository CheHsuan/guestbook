/**
 * @jest-environment jsdom
 */

'use strict';

// --- HTML fixture — mirrors the DOM elements app.js grabs at load time ---
const APP_HTML = `
  <button id="login-btn-header" style="display:none"></button>
  <button id="login-btn-main"></button>
  <button id="logout-btn"></button>
  <div id="user-info" style="display:none"></div>
  <img id="user-avatar" />
  <span id="user-name"></span>
  <div id="main-content" style="display:none"></div>
  <div id="login-prompt" style="display:flex"></div>
  <div id="post-section" style="display:none">
    <form id="post-form">
      <input id="message-input" type="text" />
      <span id="char-counter">0 / 250</span>
      <button id="submit-btn" type="submit">
        <span class="btn-text" style="display:inline"></span>
        <span class="btn-loading" style="display:none"></span>
      </button>
      <span id="submit-hint" class="submit-hint"></span>
      <span id="empty-error-msg" style="display:none"></span>
      <div id="rate-limit-msg" style="display:none"></div>
    </form>
  </div>
  <input id="search-input" type="search" />
  <button id="search-clear-btn" style="display:none"></button>
  <p id="search-results-count" style="display:none"></p>
  <div id="messages-container">
    <div id="empty-state" style="display:none"></div>
    <div id="search-empty-state" style="display:none"></div>
    <div id="loading-state" style="display:none"></div>
  </div>
  <span id="message-count">0</span>
  <div id="typing-indicator" class="typing-indicator" style="display:none;"></div>
  <button id="new-messages-banner" type="button" class="new-messages-banner" style="display:none;"></button>
  <button id="saved-badge" style="display:none;"></button>
  <section id="saved-panel" style="display:none;">
    <div class="saved-panel-header">
      <button id="saved-panel-clear"></button>
    </div>
    <div id="saved-panel-list"></div>
  </section>
`;

// --- Firebase mock factory — re-created each test to reset call counts ---
function makeFirebaseMock() {
  const dbRef = {
    push: jest.fn().mockReturnValue({ key: 'mock-key-abc' }),
    update: jest.fn().mockResolvedValue(undefined),
    off: jest.fn(),
    on: jest.fn().mockReturnValue('listener-token'),
    once: jest.fn().mockResolvedValue({
      exists: () => false,
      forEach: jest.fn(),
      numChildren: () => 0,
    }),
    remove: jest.fn().mockResolvedValue(undefined),
    orderByChild: jest.fn().mockReturnThis(),
    startAt: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    endBefore: jest.fn().mockReturnThis(),
    limitToLast: jest.fn().mockReturnThis(),
  };

  const dbInstance = {
    useEmulator: jest.fn(),
    ref: jest.fn().mockReturnValue(dbRef),
  };

  const authInstance = {
    useEmulator: jest.fn(),
    onAuthStateChanged: jest.fn(),
    signInWithPopup: jest.fn().mockResolvedValue({}),
    signOut: jest.fn().mockResolvedValue({}),
  };

  const GoogleAuthProvider = jest.fn().mockReturnValue({});

  const authFn = Object.assign(jest.fn().mockReturnValue(authInstance), {
    GoogleAuthProvider,
  });

  const dbFn = Object.assign(jest.fn().mockReturnValue(dbInstance), {
    ServerValue: { TIMESTAMP: 'SERVER_TIMESTAMP' },
  });

  return {
    firebase: {
      apps: { length: 0 },
      initializeApp: jest.fn(),
      auth: authFn,
      database: dbFn,
    },
    authInstance,
    dbInstance,
    dbRef,
  };
}

// --- createMessageCard ---
describe('createMessageCard', () => {
  let createMessageCard;

  beforeAll(() => {
    // Set up globals that app.js needs at load time
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance, dbInstance } = makeFirebaseMock();
    global.firebase = firebase;
    // Prevent onAuthStateChanged from doing anything on load
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    // Prevent startListeningMessages from running (no signed-in user on load)

    document.body.innerHTML = APP_HTML;
    jest.resetModules();
    ({ createMessageCard } = require('../public/app.js'));
  });

  const baseMsg = {
    id: 'msg1',
    author: 'Alice',
    text: 'Hello world',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  test('renders message card with correct structure', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.className).toBe('message-card');
    expect(card.id).toBe('msg-msg1');
    expect(card.querySelector('.message-author').textContent).toBe('Alice');
    expect(card.querySelector('.message-text').textContent).toBe('Hello world');
    expect(card.querySelector('.message-time')).not.toBeNull();
  });

  test('does not render delete button when user is null', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-delete')).toBeNull();
  });

  test('does not render delete button for another user\'s message', () => {
    const otherUser = { uid: 'uid-bob' };
    const card = createMessageCard(baseMsg, otherUser);
    expect(card.querySelector('.btn-delete')).toBeNull();
  });

  test('renders delete button for own message', () => {
    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(baseMsg, ownUser);
    expect(card.querySelector('.btn-delete')).not.toBeNull();
  });

  test('escapes XSS in author name (uses textContent)', () => {
    const xssMsg = { ...baseMsg, author: '<script>alert(1)</script>' };
    const card = createMessageCard(xssMsg, null);
    // textContent assignment means the tag won't be parsed as HTML
    expect(card.querySelector('.message-author').textContent).toBe('<script>alert(1)</script>');
    expect(card.innerHTML).not.toContain('<script>');
  });

  test('escapes XSS in message text (uses textContent)', () => {
    const xssMsg = { ...baseMsg, text: '<img src=x onerror=alert(1)>' };
    const card = createMessageCard(xssMsg, null);
    expect(card.querySelector('.message-text').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(card.innerHTML).not.toContain('<img');
  });

  // --- Edit feature ---
  test('renders edit button for own message', () => {
    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(baseMsg, ownUser);
    expect(card.querySelector('.btn-edit')).not.toBeNull();
  });

  test('does not render edit button when user is null', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-edit')).toBeNull();
  });

  test('does not render edit button for another user\'s message', () => {
    const otherUser = { uid: 'uid-bob' };
    const card = createMessageCard(baseMsg, otherUser);
    expect(card.querySelector('.btn-edit')).toBeNull();
  });

  test('does not render "(edited)" label when editedAt is absent', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.edited-label')).toBeNull();
  });

  test('renders "(edited)" label when editedAt is present', () => {
    const editedMsg = { ...baseMsg, editedAt: Date.now() };
    const card = createMessageCard(editedMsg, null);
    const label = card.querySelector('.edited-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('edited');
  });

  test('edit textarea enforces 250-char limit via maxLength attribute', () => {
    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(baseMsg, ownUser);
    card.querySelector('.btn-edit').click();
    const textarea = card.querySelector('.edit-textarea');
    expect(textarea).not.toBeNull();
    expect(Number(textarea.maxLength)).toBe(250);
  });

  test('edit textarea is pre-filled with current message text', () => {
    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(baseMsg, ownUser);
    card.querySelector('.btn-edit').click();
    const textarea = card.querySelector('.edit-textarea');
    expect(textarea.value).toBe(baseMsg.text);
  });

  test('cancel restores read-only view without Firebase write', () => {
    const { firebase: fb, authInstance: ai, dbInstance: di, dbRef: dr } = makeFirebaseMock();
    global.firebase = fb;
    ai.onAuthStateChanged.mockImplementation(() => {});
    jest.resetModules();
    const { createMessageCard: cmc } = require('../public/app.js');

    const ownUser = { uid: 'uid-alice' };
    const card = cmc(baseMsg, ownUser);
    card.querySelector('.btn-edit').click();
    card.querySelector('.btn-cancel').click();

    expect(card.querySelector('.edit-wrapper')).toBeNull();
    expect(card.querySelector('.message-text').style.display).toBe('');
    expect(dr.update).not.toHaveBeenCalled();
  });

  test('saving a blank edit shows validation error without calling Firebase', async () => {
    const { firebase: fb, authInstance: ai, dbInstance: di, dbRef: dr } = makeFirebaseMock();
    global.firebase = fb;
    ai.onAuthStateChanged.mockImplementation(() => {});
    jest.resetModules();
    const { createMessageCard: cmc } = require('../public/app.js');

    const ownUser = { uid: 'uid-alice' };
    const card = cmc(baseMsg, ownUser);
    card.querySelector('.btn-edit').click();
    card.querySelector('.edit-textarea').value = '   ';
    card.querySelector('.btn-save').click();

    expect(card.querySelector('.edit-error-msg').style.display).toBe('block');
    expect(dr.update).not.toHaveBeenCalled();
  });

  test('successful save calls Firebase update, updates text, shows edited label, and restores read-only view', async () => {
    const { firebase: fb, authInstance: ai, dbInstance: di, dbRef: dr } = makeFirebaseMock();
    global.firebase = fb;
    ai.onAuthStateChanged.mockImplementation(() => {});
    jest.resetModules();
    const { createMessageCard: cmc } = require('../public/app.js');

    const ownUser = { uid: 'uid-alice' };
    const card = cmc(baseMsg, ownUser);
    card.querySelector('.btn-edit').click();
    card.querySelector('.edit-textarea').value = 'Updated text';
    card.querySelector('.btn-save').click();

    // Flush microtasks so the async save handler resolves
    await Promise.resolve();
    await Promise.resolve();

    expect(di.ref).toHaveBeenCalledWith('messages/msg1');
    expect(dr.update).toHaveBeenCalledWith({
      text: 'Updated text',
      editedAt: 'SERVER_TIMESTAMP',
    });
    expect(card.querySelector('.message-text').textContent).toBe('Updated text');
    expect(card.querySelector('.edited-label')).not.toBeNull();
    expect(card.querySelector('.edit-wrapper')).toBeNull();
    expect(card.querySelector('.message-text').style.display).toBe('');
  });

  // --- Avatar feature ---
  test('renders <img class="message-avatar"> when photoURL is provided', () => {
    const msgWithPhoto = { ...baseMsg, photoURL: 'https://example.com/avatar.jpg' };
    const card = createMessageCard(msgWithPhoto, null);
    const img = card.querySelector('.message-avatar');
    expect(img).not.toBeNull();
    expect(img.tagName).toBe('IMG');
  });

  test('sets avatar src to photoURL via property assignment', () => {
    const msgWithPhoto = { ...baseMsg, photoURL: 'https://example.com/avatar.jpg' };
    const card = createMessageCard(msgWithPhoto, null);
    expect(card.querySelector('.message-avatar').src).toContain('example.com/avatar.jpg');
  });

  test('sets referrerpolicy="no-referrer" on avatar img', () => {
    const msgWithPhoto = { ...baseMsg, photoURL: 'https://example.com/avatar.jpg' };
    const card = createMessageCard(msgWithPhoto, null);
    expect(card.querySelector('.message-avatar').getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  test('sets alt text to author name for screen reader accessibility', () => {
    const msgWithPhoto = { ...baseMsg, photoURL: 'https://example.com/avatar.jpg' };
    const card = createMessageCard(msgWithPhoto, null);
    expect(card.querySelector('.message-avatar').alt).toBe('Alice');
  });

  test('renders .avatar-fallback div when photoURL is absent', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.avatar-fallback')).not.toBeNull();
    expect(card.querySelector('.message-avatar')).toBeNull();
  });

  test('fallback contains author first initial via textContent (not innerHTML)', () => {
    const card = createMessageCard(baseMsg, null);
    const fallback = card.querySelector('.avatar-fallback');
    expect(fallback.textContent).toBe('A');
    expect(fallback.children.length).toBe(0);
  });

  test('onerror on avatar img replaces it with .avatar-fallback', () => {
    const msgWithPhoto = { ...baseMsg, photoURL: 'https://broken.example.com/avatar.jpg' };
    const card = createMessageCard(msgWithPhoto, null);
    const header = card.querySelector('.message-header');

    document.body.appendChild(card);
    card.querySelector('.message-avatar').onerror();

    expect(header.querySelector('.message-avatar')).toBeNull();
    expect(header.querySelector('.avatar-fallback')).not.toBeNull();

    document.body.removeChild(card);
  });
});

// --- Form submit handler ---
describe('post form submit handler', () => {
  let mocks;
  let authStateCallback;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    mocks = makeFirebaseMock();

    // Capture the onAuthStateChanged callback so we can trigger it
    mocks.authInstance.onAuthStateChanged.mockImplementation((cb) => {
      authStateCallback = cb;
    });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    require('../public/app.js');
  });

  function simulateSignIn(user = { uid: 'uid-test', displayName: 'Tester', photoURL: '' }) {
    // Make startListeningMessages resolve immediately (empty DB)
    mocks.dbRef.once.mockResolvedValue({
      exists: () => false,
      forEach: jest.fn(),
      numChildren: () => 0,
    });
    authStateCallback(user);
  }

  test('shows validation error when message is empty', async () => {
    simulateSignIn();
    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');
    const errorMsg = document.getElementById('empty-error-msg');

    input.value = '';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(errorMsg.style.display).toBe('block');
    expect(errorMsg.textContent).toBeTruthy();
    expect(mocks.dbRef.update).not.toHaveBeenCalled();
  });

  test('calls db.ref().update() with correct payload on valid submit', async () => {
    simulateSignIn({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');

    input.value = 'Hello from tests!';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Flush microtasks so the async handler runs
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.dbInstance.ref).toHaveBeenCalledWith();
    expect(mocks.dbRef.update).toHaveBeenCalledTimes(1);

    const updateArg = mocks.dbRef.update.mock.calls[0][0];
    expect(Object.keys(updateArg).some(k => k.startsWith('/messages/'))).toBe(true);
    const msgEntry = Object.values(updateArg).find(v => v && v.text);
    expect(msgEntry.text).toBe('Hello from tests!');
    expect(msgEntry.author).toBe('Tester');
    expect(msgEntry.authorId).toBe('uid-test');
  });

  test('clears input and char counter after successful post', async () => {
    simulateSignIn({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');
    const counter = document.getElementById('char-counter');

    input.value = 'Test message';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(input.value).toBe('');
    expect(counter.textContent).toBe('0 / 250');
  });

  test('does nothing if user is not signed in', () => {
    // authStateCallback never called with a user → currentUser stays null
    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');
    input.value = 'Should not post';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(mocks.dbRef.update).not.toHaveBeenCalled();
  });

  test('post payload includes photoURL from currentUser', async () => {
    simulateSignIn({ uid: 'uid-test', displayName: 'Tester', photoURL: 'https://example.com/photo.jpg' });
    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');

    input.value = 'Testing photo URL inclusion';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    const updateArg = mocks.dbRef.update.mock.calls[0][0];
    const msgEntry = Object.values(updateArg).find(v => v && v.text);
    expect(msgEntry.photoURL).toBe('https://example.com/photo.jpg');
  });
});

// --- PERMISSION_DENIED error handling ---
describe('PERMISSION_DENIED rate-limit handling', () => {
  let mocks;
  let authStateCallback;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    jest.useFakeTimers();

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation((cb) => {
      authStateCallback = cb;
    });
    // Make the update reject with PERMISSION_DENIED
    const permError = new Error('PERMISSION_DENIED');
    permError.code = 'PERMISSION_DENIED';
    mocks.dbRef.update.mockRejectedValue(permError);

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    require('../public/app.js');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows rate-limit message on PERMISSION_DENIED', async () => {
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');
    const rateLimitMsg = document.getElementById('rate-limit-msg');

    input.value = 'Trigger rate limit';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Wait for the rejected promise to propagate
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(rateLimitMsg.style.display).toBe('block');
  });

  test('hides rate-limit message after 5 seconds', async () => {
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');
    const rateLimitMsg = document.getElementById('rate-limit-msg');

    input.value = 'Trigger rate limit again';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Advance fake timers past the 5s timeout
    jest.advanceTimersByTime(6000);

    expect(rateLimitMsg.style.display).toBe('none');
  });

  test('re-enables submit button after PERMISSION_DENIED', async () => {
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');
    const submitBtn = document.getElementById('submit-btn');

    input.value = 'Test';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(submitBtn.disabled).toBe(false);
  });
});

// --- sign-out behaviour ---
describe('sign-out behaviour', () => {
  let mocks;
  let authStateCallback;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation((cb) => {
      authStateCallback = cb;
    });
    mocks.dbRef.once.mockResolvedValue({
      exists: () => true,
      numChildren: () => 1,
      forEach: (fn) => fn({ key: 'msg1', val: () => ({ author: 'Alice', text: 'Hi', timestamp: Date.now(), authorId: 'uid-alice' }) }),
    });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    require('../public/app.js');
  });

  test('hides post section on sign-out', async () => {
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    await Promise.resolve();
    await Promise.resolve();

    authStateCallback(null);

    expect(document.getElementById('post-section').style.display).toBe('none');
  });

  test('shows login-btn-header on sign-out', async () => {
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    await Promise.resolve();
    await Promise.resolve();

    authStateCallback(null);

    expect(document.getElementById('login-btn-header').style.display).toBe('inline-flex');
  });

  test('keeps main-content visible on sign-out', async () => {
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    await Promise.resolve();
    await Promise.resolve();

    authStateCallback(null);

    expect(document.getElementById('main-content').style.display).toBe('block');
  });

  test('does not detach realtime listeners on sign-out', async () => {
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    await Promise.resolve();
    await Promise.resolve();

    const offCallsBefore = mocks.dbRef.off.mock.calls.length;

    authStateCallback(null);

    expect(mocks.dbRef.off.mock.calls.length).toBe(offCallsBefore);
  });

  test('keeps message cards in DOM on sign-out', async () => {
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    await Promise.resolve();
    await Promise.resolve();

    const container = document.getElementById('messages-container');
    const card = document.createElement('div');
    card.className = 'message-card';
    container.appendChild(card);

    authStateCallback(null);

    expect(container.querySelectorAll('.message-card').length).toBeGreaterThan(0);
  });
});

// --- infinite scroll / loadMoreMessages ---
describe('infinite scroll / loadMoreMessages', () => {
  let mocks;
  let authStateCallback;

  function makeMessages(n, baseTs, prefix = 'msg') {
    const msgs = [];
    for (let i = 0; i < n; i++) {
      msgs.push({
        id: `${prefix}-${i}`,
        author: `Author ${i}`,
        text: `Text ${i}`,
        timestamp: baseTs - i * 1000,
        authorId: `uid-${i}`,
      });
    }
    return msgs;
  }

  function makeSnapshot(messages) {
    return {
      exists: () => messages.length > 0,
      numChildren: () => messages.length,
      forEach: fn => messages.forEach(m => fn({
        key: m.id,
        val: () => ({ author: m.author, text: m.text, timestamp: m.timestamp, authorId: m.authorId }),
      })),
    };
  }

  async function loadInitialMessages(messages) {
    mocks.dbRef.once.mockResolvedValueOnce(makeSnapshot(messages));
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    jest.useFakeTimers();

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNearBottom = jest.fn().mockReturnValue(false);
    global.firebase = mocks.firebase;

    require('../public/app.js');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('appends older messages to the DOM when called', async () => {
    const BASE_TS = 1_000_000;
    const initial = makeMessages(20, BASE_TS);
    const older = makeMessages(5, BASE_TS - 25_000, 'old');

    await loadInitialMessages(initial);
    mocks.dbRef.once.mockResolvedValueOnce(makeSnapshot(older));

    const container = document.getElementById('messages-container');
    expect(container.querySelectorAll('.message-card').length).toBe(20);

    global.isNearBottom = jest.fn().mockReturnValue(true);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(600);
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelectorAll('.message-card').length).toBe(25);
  });

  test('uses oldest visible message timestamp as cursor for the next query', async () => {
    const BASE_TS = 1_000_000;
    const initial = makeMessages(20, BASE_TS);
    await loadInitialMessages(initial);

    global.isNearBottom = jest.fn().mockReturnValue(true);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();

    expect(mocks.dbRef.endBefore).toHaveBeenCalledWith(BASE_TS - 19_000);
  });

  test('stops loading more when Firebase returns a partial batch', async () => {
    const BASE_TS = 1_000_000;
    const initial = makeMessages(20, BASE_TS);
    const partial = makeMessages(3, BASE_TS - 25_000, 'partial');

    await loadInitialMessages(initial);
    mocks.dbRef.once.mockResolvedValueOnce(makeSnapshot(partial));

    global.isNearBottom = jest.fn().mockReturnValue(true);

    // First scroll — triggers load-more with 3 results (< INITIAL_LOAD_LIMIT of 20)
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(600);
    await Promise.resolve();
    await Promise.resolve();

    const onceCountAfterFirstScroll = mocks.dbRef.once.mock.calls.length;

    // Second scroll — hasMoreMessages is now false, so loadMoreMessages should bail
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();

    expect(mocks.dbRef.once.mock.calls.length).toBe(onceCountAfterFirstScroll);
  });

  test('handleScroll triggers loadMoreMessages when near bottom of page', async () => {
    const BASE_TS = 1_000_000;
    const initial = makeMessages(20, BASE_TS);
    await loadInitialMessages(initial);

    const onceCallsBefore = mocks.dbRef.once.mock.calls.length;

    global.isNearBottom = jest.fn().mockReturnValue(true);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();

    expect(mocks.dbRef.once.mock.calls.length).toBeGreaterThan(onceCallsBefore);
  });

  test('handleScroll does not trigger loadMoreMessages while a load is in flight', async () => {
    const BASE_TS = 1_000_000;
    const initial = makeMessages(20, BASE_TS);
    await loadInitialMessages(initial);

    global.isNearBottom = jest.fn().mockReturnValue(true);

    // First scroll starts load-more; isLoadingMore becomes true synchronously before any await
    window.dispatchEvent(new Event('scroll'));
    // Second scroll fires while isLoadingMore is still true — should be a no-op
    window.dispatchEvent(new Event('scroll'));

    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(600);
    await Promise.resolve();
    await Promise.resolve();

    // 1 initial load + 1 load-more = 2; second scroll was ignored by isLoadingMore guard
    expect(mocks.dbRef.once.mock.calls.length).toBe(2);
  });
});

// --- search / filter ---
describe('search / filter', () => {
  let filterMessages;
  let authStateCallback;

  function addCard(container, { author = 'Alice', text = 'Hello', id = 'c1' } = {}) {
    const card = document.createElement('div');
    card.className = 'message-card';
    card.id = `msg-${id}`;
    const authorEl = document.createElement('span');
    authorEl.className = 'message-author';
    authorEl.textContent = author;
    const textEl = document.createElement('p');
    textEl.className = 'message-text';
    textEl.textContent = text;
    card.appendChild(authorEl);
    card.appendChild(textEl);
    container.appendChild(card);
    return card;
  }

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });
    global.firebase = firebase;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    ({ filterMessages } = require('../public/app.js'));
  });

  test('shows all cards when search term is empty', () => {
    const container = document.getElementById('messages-container');
    const c1 = addCard(container, { author: 'Alice', text: 'Hello', id: '1' });
    const c2 = addCard(container, { author: 'Bob', text: 'World', id: '2' });

    document.getElementById('search-input').value = '';
    filterMessages();

    expect(c1.style.display).not.toBe('none');
    expect(c2.style.display).not.toBe('none');
  });

  test('hides cards that do not match the search term', () => {
    const container = document.getElementById('messages-container');
    const c1 = addCard(container, { author: 'Alice', text: 'Hello world', id: '1' });
    const c2 = addCard(container, { author: 'Bob', text: 'Goodbye', id: '2' });

    document.getElementById('search-input').value = 'alice';
    filterMessages();

    expect(c1.style.display).not.toBe('none');
    expect(c2.style.display).toBe('none');
  });

  test('matches by message text', () => {
    const container = document.getElementById('messages-container');
    const c1 = addCard(container, { author: 'Alice', text: 'Hello world', id: '1' });
    const c2 = addCard(container, { author: 'Bob', text: 'Goodbye', id: '2' });

    document.getElementById('search-input').value = 'world';
    filterMessages();

    expect(c1.style.display).not.toBe('none');
    expect(c2.style.display).toBe('none');
  });

  test('matching is case-insensitive', () => {
    const container = document.getElementById('messages-container');
    const card = addCard(container, { author: 'Alice', text: 'Hello', id: '1' });

    document.getElementById('search-input').value = 'ALICE';
    filterMessages();

    expect(card.style.display).not.toBe('none');
  });

  test('shows search-empty-state when no cards match', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hello', id: '1' });

    document.getElementById('search-input').value = 'zzznomatch';
    filterMessages();

    expect(document.getElementById('search-empty-state').style.display).toBe('block');
  });

  test('hides search-empty-state when some cards match', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hello', id: '1' });

    document.getElementById('search-input').value = 'alice';
    filterMessages();

    expect(document.getElementById('search-empty-state').style.display).not.toBe('block');
  });

  test('shows Showing X of Y when filter is active and matches exist', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hello', id: '1' });
    addCard(container, { author: 'Bob', text: 'Goodbye', id: '2' });

    document.getElementById('search-input').value = 'alice';
    filterMessages();

    const countEl = document.getElementById('search-results-count');
    expect(countEl.style.display).toBe('block');
    expect(countEl.textContent).toBe('Showing 1 of 2');
  });

  test('hides Showing X of Y when search is cleared', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hello', id: '1' });

    document.getElementById('search-input').value = 'alice';
    filterMessages();

    document.getElementById('search-input').value = '';
    filterMessages();

    expect(document.getElementById('search-results-count').style.display).toBe('none');
  });

  test('shows clear button when term is non-empty', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hello', id: '1' });

    document.getElementById('search-input').value = 'alice';
    filterMessages();

    expect(document.getElementById('search-clear-btn').style.display).not.toBe('none');
  });

  test('hides clear button when term is cleared', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hello', id: '1' });

    document.getElementById('search-input').value = '';
    filterMessages();

    expect(document.getElementById('search-clear-btn').style.display).toBe('none');
  });

  test('does not show search-empty-state when there are no cards at all', () => {
    document.getElementById('search-input').value = 'anything';
    filterMessages();

    expect(document.getElementById('search-empty-state').style.display).not.toBe('block');
  });

  test('restores all cards when search is cleared after filtering', () => {
    const container = document.getElementById('messages-container');
    const c1 = addCard(container, { author: 'Alice', text: 'Hello', id: '1' });
    const c2 = addCard(container, { author: 'Bob', text: 'World', id: '2' });

    document.getElementById('search-input').value = 'alice';
    filterMessages();
    expect(c2.style.display).toBe('none');

    document.getElementById('search-input').value = '';
    filterMessages();
    expect(c1.style.display).not.toBe('none');
    expect(c2.style.display).not.toBe('none');
  });
});

// --- unauthenticated visitor ---
describe('unauthenticated visitor', () => {
  let mocks;
  let authStateCallback;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation((cb) => {
      authStateCallback = cb;
    });
    mocks.dbRef.once.mockResolvedValue({
      exists: () => false,
      forEach: jest.fn(),
      numChildren: () => 0,
    });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    require('../public/app.js');
  });

  test('shows main-content without sign-in', () => {
    authStateCallback(null);
    expect(document.getElementById('main-content').style.display).toBe('block');
  });

  test('hides post section without sign-in', () => {
    authStateCallback(null);
    expect(document.getElementById('post-section').style.display).toBe('none');
  });

  test('shows login-btn-header without sign-in', () => {
    authStateCallback(null);
    expect(document.getElementById('login-btn-header').style.display).toBe('inline-flex');
  });

  test('hides login-prompt without sign-in', () => {
    authStateCallback(null);
    expect(document.getElementById('login-prompt').style.display).toBe('none');
  });

  test('starts listening to messages without sign-in', () => {
    authStateCallback(null);
    expect(mocks.dbRef.once).toHaveBeenCalled();
  });

  test('does not start duplicate listeners when user signs in after anonymous browsing', async () => {
    authStateCallback(null);
    await Promise.resolve();
    await Promise.resolve();

    const onCallsAfterAnon = mocks.dbRef.on.mock.calls.length;

    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.dbRef.on.mock.calls.length).toBe(onCallsAfterAnon);
  });

  test('shows post section after sign-in', async () => {
    authStateCallback(null);
    await Promise.resolve();
    await Promise.resolve();

    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    expect(document.getElementById('post-section').style.display).toBe('block');
  });

  test('hides login-btn-header after sign-in', async () => {
    authStateCallback(null);
    await Promise.resolve();
    await Promise.resolve();

    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    expect(document.getElementById('login-btn-header').style.display).toBe('none');
  });
});

// --- reply feature ---
describe('reply feature', () => {
  let createMessageCard;
  let createReplyCard;

  const baseMsg = {
    id: 'msg1',
    author: 'Alice',
    text: 'Hello world',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  beforeAll(() => {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    document.body.innerHTML = APP_HTML;
    jest.resetModules();
    ({ createMessageCard, createReplyCard } = require('../public/app.js'));
  });

  // Reply button visibility
  test('renders reply button for authenticated user viewing own message', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-alice' });
    expect(card.querySelector('.btn-reply')).not.toBeNull();
  });

  test('renders reply button for authenticated user viewing another\'s message', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-reply')).not.toBeNull();
  });

  test('does not render reply button when user is null', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-reply')).toBeNull();
  });

  // Reply form toggle
  test('clicking reply button opens reply form', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    expect(card.querySelector('.reply-form-wrapper')).not.toBeNull();
  });

  test('clicking reply button again closes reply form (toggle)', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    card.querySelector('.btn-reply').click();
    expect(card.querySelector('.reply-form-wrapper')).toBeNull();
  });

  test('reply form textarea enforces 250-char limit via maxLength', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    expect(Number(card.querySelector('.reply-textarea').maxLength)).toBe(250);
  });

  // Cancel
  test('cancel removes reply form without Firebase write', () => {
    const { firebase: fb, authInstance: ai, dbRef: dr } = makeFirebaseMock();
    global.firebase = fb;
    ai.onAuthStateChanged.mockImplementation(() => {});
    jest.resetModules();
    const { createMessageCard: cmc } = require('../public/app.js');

    const card = cmc(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    card.querySelector('.btn-reply-cancel').click();

    expect(card.querySelector('.reply-form-wrapper')).toBeNull();
    expect(dr.update).not.toHaveBeenCalled();
  });

  // Validation
  test('submitting blank reply shows error without Firebase write', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = '   ';
    card.querySelector('.btn-reply-post').click();

    const form = card.querySelector('.reply-form-wrapper');
    expect(form.querySelector('.edit-error-msg').style.display).toBe('block');
  });

  // Submission
  test('submitting reply calls db.ref().update() with reply path and rate-limit update', async () => {
    const { firebase: fb, authInstance: ai, dbRef: dr } = makeFirebaseMock();
    global.firebase = fb;
    ai.onAuthStateChanged.mockImplementation(() => {});
    jest.resetModules();
    const { createMessageCard: cmc } = require('../public/app.js');

    const user = { uid: 'uid-bob', displayName: 'Bob' };
    const card = cmc(baseMsg, user);
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Great message!';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    expect(dr.update).toHaveBeenCalledTimes(1);
    const updateArg = dr.update.mock.calls[0][0];
    const replyKey = Object.keys(updateArg).find(k => k.includes(`/messages/${baseMsg.id}/replies/`));
    expect(replyKey).toBeTruthy();
    const replyData = updateArg[replyKey];
    expect(replyData.text).toBe('Great message!');
    expect(replyData.author).toBe('Bob');
    expect(replyData.authorId).toBe('uid-bob');
    const rateLimitKey = Object.keys(updateArg).find(k => k.includes('/users/uid-bob/lastPostTimestamp'));
    expect(rateLimitKey).toBeTruthy();
  });

  test('successful reply submission closes the form', async () => {
    const { firebase: fb, authInstance: ai } = makeFirebaseMock();
    global.firebase = fb;
    ai.onAuthStateChanged.mockImplementation(() => {});
    jest.resetModules();
    const { createMessageCard: cmc } = require('../public/app.js');

    const card = cmc(baseMsg, { uid: 'uid-bob', displayName: 'Bob' });
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Nice!';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    expect(card.querySelector('.reply-form-wrapper')).toBeNull();
  });

  // XSS safety in reply cards
  test('createReplyCard escapes XSS in reply author (uses textContent)', () => {
    const xssReply = {
      id: 'r1',
      author: '<script>alert(1)</script>',
      text: 'Hello',
      timestamp: Date.now(),
      authorId: 'uid-x',
    };
    const card = createReplyCard(xssReply, null, 'msg1');
    expect(card.querySelector('.reply-author').textContent).toBe('<script>alert(1)</script>');
    expect(card.innerHTML).not.toContain('<script>');
  });

  test('createReplyCard escapes XSS in reply text (uses textContent)', () => {
    const xssReply = {
      id: 'r1',
      author: 'Eve',
      text: '<img src=x onerror=alert(1)>',
      timestamp: Date.now(),
      authorId: 'uid-x',
    };
    const card = createReplyCard(xssReply, null, 'msg1');
    expect(card.querySelector('.reply-text').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(card.innerHTML).not.toContain('<img');
  });

  // Reply delete button
  test('createReplyCard renders delete button for own reply', () => {
    const reply = { id: 'r1', author: 'Alice', text: 'Hi', timestamp: Date.now(), authorId: 'uid-alice' };
    const card = createReplyCard(reply, { uid: 'uid-alice' }, 'msg1');
    expect(card.querySelector('.btn-reply-delete')).not.toBeNull();
  });

  test('createReplyCard does not render delete button for another user\'s reply', () => {
    const reply = { id: 'r1', author: 'Alice', text: 'Hi', timestamp: Date.now(), authorId: 'uid-alice' };
    const card = createReplyCard(reply, { uid: 'uid-bob' }, 'msg1');
    expect(card.querySelector('.btn-reply-delete')).toBeNull();
  });

  test('createReplyCard does not render delete button when user is null', () => {
    const reply = { id: 'r1', author: 'Alice', text: 'Hi', timestamp: Date.now(), authorId: 'uid-alice' };
    const card = createReplyCard(reply, null, 'msg1');
    expect(card.querySelector('.btn-reply-delete')).toBeNull();
  });
});

// --- permalink button ---
describe('permalink button', () => {
  let createMessageCard;

  const baseMsg = {
    id: 'permalink-msg-1',
    author: 'Alice',
    text: 'Hello world',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  beforeAll(() => {
    jest.resetModules();

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    document.body.innerHTML = APP_HTML;
    ({ createMessageCard } = require('../public/app.js'));
  });

  test('renders .btn-permalink on every card (no user)', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-permalink')).not.toBeNull();
  });

  test('renders .btn-permalink on every card (own message)', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-alice' });
    expect(card.querySelector('.btn-permalink')).not.toBeNull();
  });

  test('renders .btn-permalink on every card (other user)', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-permalink')).not.toBeNull();
  });

  test('.btn-permalink has aria-label="Copy link to this message"', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-permalink').getAttribute('aria-label'))
      .toBe('Copy link to this message');
  });

  test('.btn-permalink has tabindex="-1" in non-touch environment (jsdom has no matchMedia)', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-permalink').getAttribute('tabindex')).toBe('-1');
  });

  test('.btn-permalink comes after .btn-reply in the footer', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    const footer = card.querySelector('.card-footer');
    const children = Array.from(footer.children);
    const replyIdx = children.findIndex(el => el.classList.contains('btn-reply'));
    const permalinkIdx = children.findIndex(el => el.classList.contains('btn-permalink'));
    expect(replyIdx).toBeGreaterThanOrEqual(0);
    expect(permalinkIdx).toBeGreaterThan(replyIdx);
  });

  test('.btn-permalink contains .permalink-tooltip with text "Copied!"', () => {
    const card = createMessageCard(baseMsg, null);
    const tooltip = card.querySelector('.btn-permalink .permalink-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe('Copied!');
  });

  test('.permalink-tooltip does not use innerHTML for its text', () => {
    const card = createMessageCard(baseMsg, null);
    const tooltip = card.querySelector('.permalink-tooltip');
    expect(tooltip.children.length).toBe(0);
  });

  test('clicking .btn-permalink calls clipboard.writeText with full permalink URL', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-permalink').click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(
      `https://guestbook.slashstack.app/app#msg-${baseMsg.id}`
    );
  });

  test('successful clipboard copy adds permalink-tooltip--visible class to tooltip', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-permalink').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(card.querySelector('.permalink-tooltip').classList.contains('permalink-tooltip--visible'))
      .toBe(true);
  });

  test('falls back to prompt() when clipboard API is unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: null,
      writable: true,
      configurable: true,
    });
    const promptSpy = jest.spyOn(window, 'prompt').mockImplementation(() => null);

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-permalink').click();

    expect(promptSpy).toHaveBeenCalledWith(
      'Copy this link:',
      `https://guestbook.slashstack.app/app#msg-${baseMsg.id}`
    );
    promptSpy.mockRestore();
  });
});

// --- handleDeepLink ---
describe('handleDeepLink', () => {
  let handleDeepLink;
  let mocks;
  let authStateCallback;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });
    mocks.dbRef.once.mockResolvedValue({
      exists: () => false,
      forEach: jest.fn(),
      numChildren: () => 0,
    });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    ({ handleDeepLink } = require('../public/app.js'));
  });

  test('adds permalink-highlight class and calls scrollIntoView when hash target is in DOM', () => {
    const targetId = 'msg-deep-link-target';
    const card = document.createElement('div');
    card.id = targetId;
    card.scrollIntoView = jest.fn();
    document.getElementById('messages-container').appendChild(card);

    window.location.hash = `#${targetId}`;
    handleDeepLink();

    expect(card.classList.contains('permalink-highlight')).toBe(true);
    expect(card.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    document.getElementById('messages-container').removeChild(card);
  });

  test('does not show toast when hash target not found but hasMoreMessages is still true', () => {
    window.location.hash = '#msg-nonexistent-id';
    handleDeepLink();
    expect(document.querySelector('.permalink-toast')).toBeNull();
  });

  test('shows toast when hash target not found and no more messages (empty DB)', async () => {
    window.location.hash = '#msg-nonexistent-id';
    // Trigger startListeningMessages via auth state; empty DB → hasMoreMessages = false
    authStateCallback(null);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector('.permalink-toast')).not.toBeNull();
    expect(document.querySelector('.permalink-toast').textContent)
      .toBe('Message not found — it may have expired.');
  });

  test('does not run handleDeepLink twice (deepLinkHandled guard)', () => {
    const targetId = 'msg-guard-test';
    const card = document.createElement('div');
    card.id = targetId;
    card.scrollIntoView = jest.fn();
    document.getElementById('messages-container').appendChild(card);

    window.location.hash = `#${targetId}`;
    handleDeepLink();
    card.classList.remove('permalink-highlight');
    handleDeepLink(); // should be a no-op

    expect(card.classList.contains('permalink-highlight')).toBe(false);

    document.getElementById('messages-container').removeChild(card);
  });

  test('does nothing when hash does not start with #msg-', () => {
    const card = document.createElement('div');
    card.id = 'msg-some-id';
    card.scrollIntoView = jest.fn();
    document.getElementById('messages-container').appendChild(card);

    window.location.hash = '#unrelated-hash';
    handleDeepLink();

    expect(card.classList.contains('permalink-highlight')).toBe(false);
    expect(card.scrollIntoView).not.toHaveBeenCalled();

    document.getElementById('messages-container').removeChild(card);
  });
});

// --- renderTypingLabel ---
describe('renderTypingLabel', () => {
  let renderTypingLabel;

  beforeAll(() => {
    jest.useFakeTimers();

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance, dbInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    document.body.innerHTML = APP_HTML;
    jest.resetModules();
    ({ renderTypingLabel } = require('../public/app.js'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    const el = document.getElementById('typing-indicator');
    el.style.display = 'none';
    el.textContent = '';
    el.className = 'typing-indicator';
  });

  test('hides indicator when map is empty', () => {
    const el = document.getElementById('typing-indicator');
    el.style.display = '';
    el.classList.add('typing-indicator--visible');

    renderTypingLabel(new Map(), 'uid-me');

    expect(el.classList.contains('typing-indicator--visible')).toBe(false);
    jest.runAllTimers();
    expect(el.style.display).toBe('none');
  });

  test('shows single user label', () => {
    const map = new Map([['uid-alice', { name: 'Alice', timestamp: Date.now() }]]);
    renderTypingLabel(map, 'uid-me');

    const el = document.getElementById('typing-indicator');
    expect(el.textContent).toBe('Alice is typing');
    expect(el.classList.contains('typing-indicator--visible')).toBe(true);
    expect(el.style.display).not.toBe('none');
  });

  test('shows two-user label', () => {
    const now = Date.now();
    const map = new Map([
      ['uid-alice', { name: 'Alice', timestamp: now }],
      ['uid-bob',   { name: 'Bob',   timestamp: now }],
    ]);
    renderTypingLabel(map, 'uid-me');

    const el = document.getElementById('typing-indicator');
    expect(el.textContent).toBe('Alice and Bob are typing');
    expect(el.classList.contains('typing-indicator--visible')).toBe(true);
  });

  test('shows "Several people are typing" for 3+ users', () => {
    const now = Date.now();
    const map = new Map([
      ['uid-a', { name: 'Alice',   timestamp: now }],
      ['uid-b', { name: 'Bob',     timestamp: now }],
      ['uid-c', { name: 'Charlie', timestamp: now }],
    ]);
    renderTypingLabel(map, 'uid-me');

    const el = document.getElementById('typing-indicator');
    expect(el.textContent).toBe('Several people are typing');
    expect(el.classList.contains('typing-indicator--visible')).toBe(true);
  });

  test('excludes the current user from the label', () => {
    const now = Date.now();
    const map = new Map([
      ['uid-me',    { name: 'Me',    timestamp: now }],
      ['uid-alice', { name: 'Alice', timestamp: now }],
    ]);
    renderTypingLabel(map, 'uid-me');

    const el = document.getElementById('typing-indicator');
    expect(el.textContent).toBe('Alice is typing');
  });

  test('hides indicator when only the current user is typing', () => {
    const map = new Map([['uid-me', { name: 'Me', timestamp: Date.now() }]]);
    renderTypingLabel(map, 'uid-me');

    const el = document.getElementById('typing-indicator');
    expect(el.classList.contains('typing-indicator--visible')).toBe(false);
  });

  test('ignores stale records older than 30 seconds', () => {
    const staleTimestamp = Date.now() - 31000;
    const map = new Map([['uid-alice', { name: 'Alice', timestamp: staleTimestamp }]]);
    renderTypingLabel(map, 'uid-me');

    const el = document.getElementById('typing-indicator');
    expect(el.classList.contains('typing-indicator--visible')).toBe(false);
  });

  test('truncates names longer than 25 characters', () => {
    const longName = 'A'.repeat(30);
    const map = new Map([['uid-long', { name: longName, timestamp: Date.now() }]]);
    renderTypingLabel(map, 'uid-me');

    const el = document.getElementById('typing-indicator');
    expect(el.textContent).toBe('AAAAAAAAAAAAAAAAAAAAAAAAA… is typing');
  });

  test('handles null currentUid (unauthenticated visitor)', () => {
    const map = new Map([['uid-alice', { name: 'Alice', timestamp: Date.now() }]]);
    renderTypingLabel(map, null);

    const el = document.getElementById('typing-indicator');
    expect(el.textContent).toBe('Alice is typing');
    expect(el.classList.contains('typing-indicator--visible')).toBe(true);
  });
});

// --- Cmd/Ctrl+Enter keyboard shortcut ---
describe('Cmd/Ctrl+Enter keyboard shortcut', () => {
  let mocks;
  let authStateCallback;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation((cb) => {
      authStateCallback = cb;
    });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    require('../public/app.js');
  });

  function simulateSignIn(user = { uid: 'uid-test', displayName: 'Tester', photoURL: '' }) {
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });
    authStateCallback(user);
  }

  test('metaKey+Enter on main textarea triggers submit handler', async () => {
    simulateSignIn();
    const input = document.getElementById('message-input');
    input.value = 'Hello via shortcut!';

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.dbRef.update).toHaveBeenCalledTimes(1);
    const updateArg = mocks.dbRef.update.mock.calls[0][0];
    const msgEntry = Object.values(updateArg).find(v => v && v.text);
    expect(msgEntry.text).toBe('Hello via shortcut!');
  });

  test('ctrlKey+Enter on main textarea triggers submit handler', async () => {
    simulateSignIn();
    const input = document.getElementById('message-input');
    input.value = 'Hello via ctrl shortcut!';

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.dbRef.update).toHaveBeenCalledTimes(1);
    const updateArg = mocks.dbRef.update.mock.calls[0][0];
    const msgEntry = Object.values(updateArg).find(v => v && v.text);
    expect(msgEntry.text).toBe('Hello via ctrl shortcut!');
  });

  test('Enter alone on main textarea does NOT trigger submit', async () => {
    simulateSignIn();
    const input = document.getElementById('message-input');
    input.value = 'Hello plain enter';

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    await Promise.resolve();

    expect(mocks.dbRef.update).not.toHaveBeenCalled();
  });

  test('Cmd/Ctrl+Enter is no-op when user is not authenticated', async () => {
    const input = document.getElementById('message-input');
    input.value = 'Should not post';

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true, cancelable: true }));

    await Promise.resolve();

    expect(mocks.dbRef.update).not.toHaveBeenCalled();
  });
});

// --- new messages banner ---
describe('new messages banner', () => {
  let mocks;
  let authStateCallback;
  let childAddedCallback;

  const T1 = 2_000_000;
  const T2 = 2_001_000;
  const T3 = 2_002_000;

  function setScrollY(value) {
    Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
  }

  function makeChildSnapshot(key, ts) {
    return { key, val: () => ({ author: 'Tester', text: 'Hello', timestamp: ts, authorId: 'uid-test' }) };
  }

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    jest.useFakeTimers();
    setScrollY(0);

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });

    // Capture the first child_added callback (messages), skip subsequent (typing)
    let childAddedCallCount = 0;
    mocks.dbRef.on.mockImplementation((event, cb) => {
      if (event === 'child_added') {
        childAddedCallCount++;
        if (childAddedCallCount === 1) childAddedCallback = cb;
      }
      return 'listener-token';
    });

    mocks.dbRef.once.mockResolvedValue({
      exists: () => false,
      forEach: jest.fn(),
      numChildren: () => 0,
    });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = jest.fn().mockReturnValue(false);
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    require('../public/app.js');
  });

  afterEach(() => {
    jest.useRealTimers();
    setScrollY(0);
  });

  async function startWithEmptyFeed() {
    authStateCallback(null);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  test('banner is hidden on initial load', async () => {
    await startWithEmptyFeed();
    const banner = document.getElementById('new-messages-banner');
    expect(banner.style.display).toBe('none');
  });

  test('banner does not appear when new message arrives at top (scrollY <= 200)', async () => {
    await startWithEmptyFeed();
    setScrollY(0);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    const banner = document.getElementById('new-messages-banner');
    expect(banner.style.display).toBe('none');
    expect(banner.classList.contains('new-messages-banner--visible')).toBe(false);
  });

  test('banner appears when new message arrives while scrolled down (scrollY > 200)', async () => {
    await startWithEmptyFeed();
    setScrollY(250);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    const banner = document.getElementById('new-messages-banner');
    expect(banner.style.display).not.toBe('none');
    expect(banner.classList.contains('new-messages-banner--visible')).toBe(true);
  });

  test('banner reads "↑ 1 new message" (singular) for one arrival', async () => {
    await startWithEmptyFeed();
    setScrollY(250);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    expect(document.getElementById('new-messages-banner').textContent).toBe('↑ 1 new message');
  });

  test('banner reads "↑ 2 new messages" (plural) for two arrivals', async () => {
    await startWithEmptyFeed();
    setScrollY(250);

    childAddedCallback(makeChildSnapshot('msg-1', T1));
    childAddedCallback(makeChildSnapshot('msg-2', T2));

    expect(document.getElementById('new-messages-banner').textContent).toBe('↑ 2 new messages');
  });

  test('counter increments with each new arrival while scrolled down', async () => {
    await startWithEmptyFeed();
    setScrollY(250);

    childAddedCallback(makeChildSnapshot('msg-1', T1));
    childAddedCallback(makeChildSnapshot('msg-2', T2));
    childAddedCallback(makeChildSnapshot('msg-3', T3));

    expect(document.getElementById('new-messages-banner').textContent).toBe('↑ 3 new messages');
  });

  test('clicking banner removes --visible class', async () => {
    await startWithEmptyFeed();
    setScrollY(250);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    const banner = document.getElementById('new-messages-banner');
    expect(banner.classList.contains('new-messages-banner--visible')).toBe(true);

    banner.click();

    expect(banner.classList.contains('new-messages-banner--visible')).toBe(false);
  });

  test('clicking banner resets counter so next arrival starts from 1', async () => {
    await startWithEmptyFeed();
    setScrollY(250);

    childAddedCallback(makeChildSnapshot('msg-1', T1));
    childAddedCallback(makeChildSnapshot('msg-2', T2));

    const banner = document.getElementById('new-messages-banner');
    banner.click();

    // counter reset — next arrival while scrolled down starts from 1
    childAddedCallback(makeChildSnapshot('msg-3', T3));

    expect(banner.textContent).toBe('↑ 1 new message');
  });

  test('clicking banner hides it after animation timeout', async () => {
    await startWithEmptyFeed();
    setScrollY(250);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    const banner = document.getElementById('new-messages-banner');
    banner.click();

    jest.advanceTimersByTime(250);

    expect(banner.style.display).toBe('none');
  });

  test('scrolling to top removes --visible class from banner', async () => {
    await startWithEmptyFeed();
    setScrollY(250);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    const banner = document.getElementById('new-messages-banner');
    expect(banner.classList.contains('new-messages-banner--visible')).toBe(true);

    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));

    expect(banner.classList.contains('new-messages-banner--visible')).toBe(false);
  });

  test('scrolling to top hides banner after animation timeout', async () => {
    await startWithEmptyFeed();
    setScrollY(250);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));
    jest.advanceTimersByTime(250);

    expect(document.getElementById('new-messages-banner').style.display).toBe('none');
  });

  test('banner does not appear for loadMoreMessages (historical messages use once(), not child_added)', async () => {
    // Initial load with 20 messages (full batch → hasMoreMessages stays true)
    const initialMsgs = Array.from({ length: 20 }, (_, i) => ({
      key: `init-${i}`,
      val: () => ({ author: 'A', text: 'T', timestamp: 1_000_000 - i * 1000, authorId: 'uid-a' }),
    }));
    mocks.dbRef.once
      .mockResolvedValueOnce({
        exists: () => true,
        numChildren: () => 20,
        forEach: fn => initialMsgs.forEach(m => fn({ key: m.key, val: m.val })),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        numChildren: () => 5,
        forEach: fn => Array.from({ length: 5 }, (_, i) => ({
          key: `old-${i}`,
          val: () => ({ author: 'B', text: 'U', timestamp: 900_000 - i * 1000, authorId: 'uid-b' }),
        })).forEach(m => fn({ key: m.key, val: m.val })),
      });

    authStateCallback(null);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    setScrollY(250);

    // Trigger loadMoreMessages via scroll near bottom
    global.isNearBottom = jest.fn().mockReturnValue(true);
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(600);
    await Promise.resolve();
    await Promise.resolve();

    const banner = document.getElementById('new-messages-banner');
    expect(banner.style.display).toBe('none');
    expect(banner.classList.contains('new-messages-banner--visible')).toBe(false);
  });
});

// --- browser tab unread count ---
describe('browser tab unread count', () => {
  let mocks;
  let authStateCallback;
  let childAddedCallback;

  const T1 = 3_000_000;
  const T2 = 3_001_000;
  const T3 = 3_002_000;
  const TITLE = 'Guestbook — Share your thoughts with the world';

  function setScrollY(value) {
    Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
  }

  function setDocumentHidden(hidden) {
    Object.defineProperty(document, 'hidden', { value: hidden, configurable: true, writable: true });
    Object.defineProperty(document, 'visibilityState', {
      value: hidden ? 'hidden' : 'visible',
      configurable: true,
      writable: true,
    });
  }

  function makeChildSnapshot(key, ts) {
    return { key, val: () => ({ author: 'Tester', text: 'Hello', timestamp: ts, authorId: 'uid-test' }) };
  }

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    document.title = TITLE;
    jest.useFakeTimers();
    setScrollY(0);
    setDocumentHidden(false);

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });

    let childAddedCallCount = 0;
    mocks.dbRef.on.mockImplementation((event, cb) => {
      if (event === 'child_added') {
        childAddedCallCount++;
        if (childAddedCallCount === 1) childAddedCallback = cb;
      }
      return 'listener-token';
    });

    mocks.dbRef.once.mockResolvedValue({
      exists: () => false,
      forEach: jest.fn(),
      numChildren: () => 0,
    });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = jest.fn().mockReturnValue(false);
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    require('../public/app.js');
  });

  afterEach(() => {
    jest.useRealTimers();
    setScrollY(0);
    setDocumentHidden(false);
  });

  async function startWithEmptyFeed() {
    authStateCallback(null);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  test('tab title is unchanged on initial load', async () => {
    await startWithEmptyFeed();
    expect(document.title).toBe(TITLE);
  });

  test('tab title updates when tab is hidden and message arrives at scroll top', async () => {
    await startWithEmptyFeed();
    setScrollY(0);
    setDocumentHidden(true);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    expect(document.title).toBe(`(1) ${TITLE}`);
  });

  test('tab title updates when scrolled down and tab is visible', async () => {
    await startWithEmptyFeed();
    setScrollY(250);
    setDocumentHidden(false);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    expect(document.title).toBe(`(1) ${TITLE}`);
  });

  test('tab title does NOT change when at top and tab is focused', async () => {
    await startWithEmptyFeed();
    setScrollY(0);
    setDocumentHidden(false);

    childAddedCallback(makeChildSnapshot('msg-1', T1));

    expect(document.title).toBe(TITLE);
  });

  test('tab title increments correctly for multiple arrivals while hidden', async () => {
    await startWithEmptyFeed();
    setScrollY(0);
    setDocumentHidden(true);

    childAddedCallback(makeChildSnapshot('msg-1', T1));
    childAddedCallback(makeChildSnapshot('msg-2', T2));
    childAddedCallback(makeChildSnapshot('msg-3', T3));

    expect(document.title).toBe(`(3) ${TITLE}`);
  });

  test('tab title increments without resetting between arrivals while scrolled down', async () => {
    await startWithEmptyFeed();
    setScrollY(250);
    setDocumentHidden(false);

    childAddedCallback(makeChildSnapshot('msg-1', T1));
    expect(document.title).toBe(`(1) ${TITLE}`);

    childAddedCallback(makeChildSnapshot('msg-2', T2));
    expect(document.title).toBe(`(2) ${TITLE}`);
  });

  test('tab title restores when visibilitychange fires with visibilityState=visible', async () => {
    await startWithEmptyFeed();
    setScrollY(0);
    setDocumentHidden(true);
    childAddedCallback(makeChildSnapshot('msg-1', T1));
    expect(document.title).toBe(`(1) ${TITLE}`);

    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(document.title).toBe(TITLE);
  });

  test('visibilitychange when count is 0 does not change title', async () => {
    await startWithEmptyFeed();
    document.title = TITLE;

    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(document.title).toBe(TITLE);
  });

  test('tab title restores when banner is clicked', async () => {
    await startWithEmptyFeed();
    setScrollY(250);
    childAddedCallback(makeChildSnapshot('msg-1', T1));
    expect(document.title).toBe(`(1) ${TITLE}`);

    document.getElementById('new-messages-banner').click();

    expect(document.title).toBe(TITLE);
  });

  test('tab title restores when user scrolls back to top', async () => {
    await startWithEmptyFeed();
    setScrollY(250);
    childAddedCallback(makeChildSnapshot('msg-1', T1));
    expect(document.title).toBe(`(1) ${TITLE}`);

    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));

    expect(document.title).toBe(TITLE);
  });

  test('tab title restores on sign-out', async () => {
    // Sign in first, then build up unread count
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    await Promise.resolve();
    await Promise.resolve();

    setScrollY(0);
    setDocumentHidden(true);
    childAddedCallback(makeChildSnapshot('msg-1', T1));
    expect(document.title).toBe(`(1) ${TITLE}`);

    // Sign out
    authStateCallback(null);

    expect(document.title).toBe(TITLE);
  });
});

// --- renderMessageText (DOM) ---
describe('renderMessageText (DOM)', () => {
  let renderMessageText;

  beforeAll(() => {
    const utils = require('../public/utils');
    renderMessageText = utils.renderMessageText;
  });

  function makeContainer() {
    return document.createElement('p');
  }

  test('renders plain text as text node', () => {
    const el = makeContainer();
    renderMessageText(el, 'Hello world');
    expect(el.textContent).toBe('Hello world');
    expect(el.children.length).toBe(0);
  });

  test('renders @mention as <span class="mention"> with @ prefix', () => {
    const el = makeContainer();
    renderMessageText(el, '@Alice');
    const span = el.querySelector('.mention');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('@Alice');
  });

  test('mention span uses textContent — no innerHTML injection', () => {
    const el = makeContainer();
    renderMessageText(el, '@<script>alert(1)</script>');
    expect(el.innerHTML).not.toContain('<script>');
  });

  test('renders URL as anchor', () => {
    const el = makeContainer();
    renderMessageText(el, 'https://example.com');
    const a = el.querySelector('a');
    expect(a).not.toBeNull();
    expect(a.href).toContain('example.com');
  });

  test('clears existing children before rendering', () => {
    const el = makeContainer();
    el.appendChild(document.createTextNode('old'));
    renderMessageText(el, 'new');
    expect(el.textContent).toBe('new');
  });

  test('mix of text, @mention, and URL renders all three', () => {
    const el = makeContainer();
    renderMessageText(el, 'Hey @Bob see https://example.com');
    expect(el.querySelector('.mention')).not.toBeNull();
    expect(el.querySelector('a')).not.toBeNull();
    expect(el.textContent).toContain('Hey ');
  });
});

// --- @mention rendering ---
describe('@mention rendering in message cards', () => {
  let createMessageCard;
  let createReplyCard;

  const baseMsg = {
    id: 'msg-mention-1',
    author: 'Alice',
    text: 'Hello @Bob how are you?',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  beforeAll(() => {
    jest.resetModules();

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    document.body.innerHTML = APP_HTML;
    ({ createMessageCard, createReplyCard } = require('../public/app.js'));
  });

  test('renders @mention as <span class="mention"> in message text', () => {
    const card = createMessageCard(baseMsg, null);
    const mentionEl = card.querySelector('.message-text .mention');
    expect(mentionEl).not.toBeNull();
    expect(mentionEl.textContent).toBe('@Bob');
  });

  test('@mention span uses textContent — does not inject HTML', () => {
    const xssMsg = { ...baseMsg, id: 'msg-xss-1', text: '@<script>alert(1)</script>' };
    const card = createMessageCard(xssMsg, null);
    expect(card.querySelector('.message-text').innerHTML).not.toContain('<script>');
  });

  test('non-mention text is preserved around the mention', () => {
    const card = createMessageCard(baseMsg, null);
    const textEl = card.querySelector('.message-text');
    expect(textEl.textContent).toBe('Hello @Bob how are you?');
  });

  test('renders @mention in reply card', () => {
    const reply = {
      id: 'r-mention-1',
      author: 'Charlie',
      text: 'Thanks @Alice!',
      timestamp: Date.now(),
      authorId: 'uid-charlie',
    };
    const card = createReplyCard(reply, null, 'msg1');
    const mentionEl = card.querySelector('.reply-text .mention');
    expect(mentionEl).not.toBeNull();
    expect(mentionEl.textContent).toBe('@Alice');
  });

  test('message with no @mention has no .mention span', () => {
    const noMentionMsg = { ...baseMsg, id: 'msg-no-mention', text: 'Hello world' };
    const card = createMessageCard(noMentionMsg, null);
    expect(card.querySelector('.message-text .mention')).toBeNull();
  });

  test('multiple @mentions all render as .mention spans', () => {
    const multiMsg = { ...baseMsg, id: 'msg-multi-mention', text: '@Alice and @Bob both said hi' };
    const card = createMessageCard(multiMsg, null);
    const mentions = card.querySelectorAll('.message-text .mention');
    expect(mentions.length).toBe(2);
    expect(mentions[0].textContent).toBe('@Alice');
    expect(mentions[1].textContent).toBe('@Bob');
  });
});

// --- @mention author pool ---
describe('@mention author pool', () => {
  let trackAuthor;
  let getAuthorSuggestions;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    ({ trackAuthor, getAuthorSuggestions } = require('../public/app.js'));
  });

  test('getAuthorSuggestions returns empty array when pool is empty', () => {
    expect(getAuthorSuggestions('A')).toEqual([]);
  });

  test('getAuthorSuggestions returns matching names after trackAuthor', () => {
    trackAuthor('Alice', 1000);
    trackAuthor('Bob', 2000);
    const results = getAuthorSuggestions('A');
    expect(results).toContain('Alice');
    expect(results).not.toContain('Bob');
  });

  test('getAuthorSuggestions is case-insensitive', () => {
    trackAuthor('Alice', 1000);
    expect(getAuthorSuggestions('ali')).toContain('Alice');
  });

  test('getAuthorSuggestions returns at most 5 results', () => {
    for (let i = 0; i < 10; i++) trackAuthor('Author' + i, i * 1000);
    expect(getAuthorSuggestions('Author').length).toBeLessThanOrEqual(5);
  });

  test('getAuthorSuggestions sorts by most recent timestamp first', () => {
    trackAuthor('Alice', 1000);
    trackAuthor('Abe', 5000);
    trackAuthor('Amy', 3000);
    const results = getAuthorSuggestions('A');
    expect(results[0]).toBe('Abe');
    expect(results[1]).toBe('Amy');
    expect(results[2]).toBe('Alice');
  });

  test('getAuthorSuggestions returns empty array for empty prefix', () => {
    trackAuthor('Alice', 1000);
    expect(getAuthorSuggestions('')).toEqual([]);
  });

  test('trackAuthor updates timestamp when newer value is provided', () => {
    trackAuthor('Alice', 1000);
    trackAuthor('Alice', 5000);
    trackAuthor('Bob', 3000);
    const results = getAuthorSuggestions('');
    // Alice should be most recent, then Bob
    // getAuthorSuggestions('A') should show Alice
    const aliceResults = getAuthorSuggestions('A');
    expect(aliceResults).toContain('Alice');
  });
});

// --- getMentionPrefix ---
describe('getMentionPrefix', () => {
  let getMentionPrefix;

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    ({ getMentionPrefix } = require('../public/app.js'));
  });

  function makeTextarea(value, cursorPos) {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.selectionStart = cursorPos;
    ta.selectionEnd = cursorPos;
    return ta;
  }

  test('returns prefix when cursor is right after @word', () => {
    const ta = makeTextarea('Hello @Ali', 10);
    const result = getMentionPrefix(ta);
    expect(result).not.toBeNull();
    expect(result.prefix).toBe('Ali');
    expect(result.atIndex).toBe(6);
  });

  test('returns null when no @ before cursor word', () => {
    const ta = makeTextarea('Hello world', 11);
    expect(getMentionPrefix(ta)).toBeNull();
  });

  test('returns null for lone @ with no following characters', () => {
    const ta = makeTextarea('Hello @', 7);
    expect(getMentionPrefix(ta)).toBeNull();
  });

  test('returns correct prefix mid-word', () => {
    const ta = makeTextarea('@Bo', 3);
    const result = getMentionPrefix(ta);
    expect(result).not.toBeNull();
    expect(result.prefix).toBe('Bo');
  });

  test('returns null after completed @mention followed by space', () => {
    const ta = makeTextarea('@Bob ', 5);
    expect(getMentionPrefix(ta)).toBeNull();
  });
});

// --- Bookmark feature ---
describe('bookmark feature', () => {
  let createMessageCard;
  let loadBookmarks, saveBookmarksToStorage, isBookmarked, addBookmark, removeBookmark, updateSavedBadge, refreshSavedPanel;

  const baseMsg = {
    id: 'bm-msg1',
    author: 'Alice',
    text: 'Hello world',
    timestamp: Date.now(),
    authorId: 'uid-alice',
    photoURL: null,
  };

  function setupModule() {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    localStorage.clear();

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    const mod = require('../public/app.js');
    createMessageCard = mod.createMessageCard;
    loadBookmarks = mod.loadBookmarks;
    saveBookmarksToStorage = mod.saveBookmarksToStorage;
    isBookmarked = mod.isBookmarked;
    addBookmark = mod.addBookmark;
    removeBookmark = mod.removeBookmark;
    updateSavedBadge = mod.updateSavedBadge;
    refreshSavedPanel = mod.refreshSavedPanel;
  }

  beforeEach(setupModule);

  test('bookmark button is present on every message card', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-bookmark')).not.toBeNull();
  });

  test('bookmark button has aria-label "Bookmark this message" when not bookmarked', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-bookmark').getAttribute('aria-label')).toBe('Bookmark this message');
  });

  test('bookmark button is present for authenticated users too', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-alice' });
    expect(card.querySelector('.btn-bookmark')).not.toBeNull();
  });

  test('clicking bookmark button saves message to localStorage', () => {
    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-bookmark').click();
    const list = loadBookmarks();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(baseMsg.id);
    expect(list[0].author).toBe(baseMsg.author);
    expect(list[0].text).toBe(baseMsg.text);
  });

  test('bookmark stores all required fields', () => {
    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-bookmark').click();
    const bm = loadBookmarks()[0];
    expect(bm).toHaveProperty('id');
    expect(bm).toHaveProperty('author');
    expect(bm).toHaveProperty('authorId');
    expect(bm).toHaveProperty('text');
    expect(bm).toHaveProperty('timestamp');
    expect(bm).toHaveProperty('savedAt');
  });

  test('clicking bookmarked button again removes it (toggle)', () => {
    const card = createMessageCard(baseMsg, null);
    const btn = card.querySelector('.btn-bookmark');
    btn.click(); // bookmark
    btn.click(); // unbookmark
    expect(loadBookmarks()).toHaveLength(0);
  });

  test('aria-label updates to "Remove bookmark" after bookmarking', () => {
    const card = createMessageCard(baseMsg, null);
    const btn = card.querySelector('.btn-bookmark');
    btn.click();
    expect(btn.getAttribute('aria-label')).toBe('Remove bookmark');
  });

  test('aria-label restores to "Bookmark this message" after unbookmarking', () => {
    const card = createMessageCard(baseMsg, null);
    const btn = card.querySelector('.btn-bookmark');
    btn.click();
    btn.click();
    expect(btn.getAttribute('aria-label')).toBe('Bookmark this message');
  });

  test('btn-bookmark--active class added after bookmarking', () => {
    const card = createMessageCard(baseMsg, null);
    const btn = card.querySelector('.btn-bookmark');
    btn.click();
    expect(btn.classList.contains('btn-bookmark--active')).toBe(true);
  });

  test('btn-bookmark--active class removed after unbookmarking', () => {
    const card = createMessageCard(baseMsg, null);
    const btn = card.querySelector('.btn-bookmark');
    btn.click();
    btn.click();
    expect(btn.classList.contains('btn-bookmark--active')).toBe(false);
  });

  test('bookmark limit shows toast when 100 bookmarks already exist', () => {
    const existing = Array.from({ length: 100 }, (_, i) => ({
      id: 'bm-fill-' + i, author: 'A', authorId: 'u', text: 'T', timestamp: 1, savedAt: 1,
    }));
    localStorage.setItem('guestbook_bookmarks', JSON.stringify(existing));

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-bookmark').click();

    const toast = document.querySelector('.permalink-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Bookmark limit reached');
    expect(loadBookmarks()).toHaveLength(100); // not added
  });

  test('bookmark does not exceed 100 entries after limit toast', () => {
    const existing = Array.from({ length: 100 }, (_, i) => ({
      id: 'bm-fill-' + i, author: 'A', authorId: 'u', text: 'T', timestamp: 1, savedAt: 1,
    }));
    localStorage.setItem('guestbook_bookmarks', JSON.stringify(existing));

    addBookmark(baseMsg);
    expect(loadBookmarks()).toHaveLength(100);
  });

  test('localStorage unavailable shows toast', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-bookmark').click();

    const toast = document.querySelector('.permalink-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Bookmarks unavailable');

    Storage.prototype.setItem.mockRestore();
  });

  test('bookmark text stored via data property — XSS-safe storage', () => {
    const xssMsg = { ...baseMsg, id: 'bm-xss', text: '<script>evil()</script>' };
    const card = createMessageCard(xssMsg, null);
    card.querySelector('.btn-bookmark').click();
    expect(loadBookmarks()[0].text).toBe('<script>evil()</script>');
  });

  test('saved badge is hidden when no bookmarks', () => {
    updateSavedBadge();
    expect(document.getElementById('saved-badge').style.display).toBe('none');
  });

  test('saved badge becomes visible after bookmarking', () => {
    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-bookmark').click();
    const badge = document.getElementById('saved-badge');
    expect(badge.style.display).not.toBe('none');
  });

  test('saved badge shows bookmark count', () => {
    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-bookmark').click();
    expect(document.getElementById('saved-badge').textContent).toContain('1');
  });

  test('saved badge updates count after second bookmark', () => {
    const msg2 = { ...baseMsg, id: 'bm-msg2' };
    const c1 = createMessageCard(baseMsg, null);
    const c2 = createMessageCard(msg2, null);
    c1.querySelector('.btn-bookmark').click();
    c2.querySelector('.btn-bookmark').click();
    expect(document.getElementById('saved-badge').textContent).toContain('2');
  });

  test('saved badge hides again after removing last bookmark', () => {
    const card = createMessageCard(baseMsg, null);
    const btn = card.querySelector('.btn-bookmark');
    btn.click();
    btn.click();
    expect(document.getElementById('saved-badge').style.display).toBe('none');
  });

  test('saved panel renders bookmarks when opened via badge click', () => {
    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-bookmark').click();

    document.getElementById('saved-badge').click();

    const panel = document.getElementById('saved-panel');
    expect(panel.style.display).not.toBe('none');
    expect(panel.querySelector('.saved-message')).not.toBeNull();
  });

  test('saved panel shows author name via textContent (XSS safe)', () => {
    const xssMsg = { ...baseMsg, id: 'bm-xss2', author: '<b>evil</b>' };
    addBookmark(xssMsg);

    document.getElementById('saved-panel').style.display = '';
    refreshSavedPanel();

    const authorEl = document.querySelector('.saved-message-author');
    expect(authorEl).not.toBeNull();
    expect(authorEl.textContent).toBe('<b>evil</b>');
    expect(authorEl.innerHTML).not.toContain('<b>');
  });

  test('saved panel shows message text via textContent (XSS safe)', () => {
    const xssMsg = { ...baseMsg, id: 'bm-xss3', text: '<img src=x onerror=evil()>' };
    addBookmark(xssMsg);

    document.getElementById('saved-panel').style.display = '';
    refreshSavedPanel();

    const textEl = document.querySelector('.saved-message-text');
    expect(textEl).not.toBeNull();
    expect(textEl.textContent).toBe('<img src=x onerror=evil()>');
    expect(textEl.innerHTML).not.toContain('<img');
  });

  test('saved panel shows expired badge for messages older than 24 hours', () => {
    const oldMsg = { ...baseMsg, id: 'bm-old', timestamp: Date.now() - 25 * 60 * 60 * 1000 };
    addBookmark(oldMsg);

    document.getElementById('saved-panel').style.display = '';
    refreshSavedPanel();

    expect(document.querySelector('.expired-badge')).not.toBeNull();
    expect(document.querySelector('.expired-badge').textContent).toContain('Expired');
  });

  test('saved panel shows no expired badge for recent messages', () => {
    addBookmark(baseMsg);

    document.getElementById('saved-panel').style.display = '';
    refreshSavedPanel();

    expect(document.querySelector('.expired-badge')).toBeNull();
  });

  test('expired message card has saved-message--expired class', () => {
    const oldMsg = { ...baseMsg, id: 'bm-old2', timestamp: Date.now() - 25 * 60 * 60 * 1000 };
    addBookmark(oldMsg);

    document.getElementById('saved-panel').style.display = '';
    refreshSavedPanel();

    expect(document.querySelector('.saved-message--expired')).not.toBeNull();
  });

  test('saved panel shows "Content may have changed" when live text differs', () => {
    addBookmark(baseMsg);

    // Simulate the live card existing with different text
    const liveCard = document.createElement('div');
    liveCard.id = 'msg-' + baseMsg.id;
    const liveText = document.createElement('p');
    liveText.className = 'message-text';
    liveText.textContent = 'Updated text';
    liveCard.appendChild(liveText);
    document.getElementById('messages-container').appendChild(liveCard);

    document.getElementById('saved-panel').style.display = '';
    refreshSavedPanel();

    const note = document.querySelector('.changed-note');
    expect(note).not.toBeNull();
    expect(note.textContent).toContain('Content may have changed');
  });

  test('saved panel does NOT show changed note when live text matches', () => {
    addBookmark(baseMsg);

    const liveCard = document.createElement('div');
    liveCard.id = 'msg-' + baseMsg.id;
    const liveText = document.createElement('p');
    liveText.className = 'message-text';
    liveText.textContent = baseMsg.text;
    liveCard.appendChild(liveText);
    document.getElementById('messages-container').appendChild(liveCard);

    document.getElementById('saved-panel').style.display = '';
    refreshSavedPanel();

    expect(document.querySelector('.changed-note')).toBeNull();
  });

  test('saved panel empty state shown when no bookmarks', () => {
    document.getElementById('saved-panel').style.display = '';
    refreshSavedPanel();

    expect(document.querySelector('.saved-panel-empty')).not.toBeNull();
  });

  test('badge click closes panel when already open', () => {
    addBookmark(baseMsg);
    const badge = document.getElementById('saved-badge');
    const panel = document.getElementById('saved-panel');

    badge.click(); // open
    badge.click(); // close
    expect(panel.style.display).toBe('none');
  });

  test('isBookmarked returns true after adding bookmark', () => {
    addBookmark(baseMsg);
    expect(isBookmarked(baseMsg.id)).toBe(true);
  });

  test('isBookmarked returns false after removing bookmark', () => {
    addBookmark(baseMsg);
    removeBookmark(baseMsg.id);
    expect(isBookmarked(baseMsg.id)).toBe(false);
  });

  test('loadBookmarks returns empty array when localStorage is empty', () => {
    expect(loadBookmarks()).toEqual([]);
  });

  test('bookmarks persist across loadBookmarks calls', () => {
    addBookmark(baseMsg);
    expect(loadBookmarks()).toHaveLength(1);
    expect(loadBookmarks()[0].id).toBe(baseMsg.id);
  });
});

// --- browser notifications: maybeFireReplyNotification ---
describe('browser notifications — maybeFireReplyNotification', () => {
  let maybeFireReplyNotification;
  let authStateCallback;
  let mocks;

  const currentUserMock = { uid: 'uid-me', displayName: 'Me', photoURL: '' };

  const myMsg = {
    id: 'notif-msg-1',
    author: 'Me',
    text: 'Hello',
    timestamp: 1000,
    authorId: 'uid-me',
  };

  const otherReply = {
    id: 'r1',
    author: 'Bob',
    text: 'Nice message!',
    timestamp: 2000,
    authorId: 'uid-bob',
  };

  function setVisibility(state) {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true, writable: true });
  }

  function mockNotificationCtor(permission = 'granted') {
    const instances = [];
    const Ctor = jest.fn().mockImplementation(() => {
      const inst = { addEventListener: jest.fn(), close: jest.fn() };
      instances.push(inst);
      return inst;
    });
    Ctor.permission = permission;
    Ctor.requestPermission = jest.fn().mockResolvedValue(permission);
    Ctor.instances = instances;
    global.Notification = Ctor;
    return Ctor;
  }

  function addCard(msgId) {
    const el = document.createElement('div');
    el.id = 'msg-' + msgId;
    document.getElementById('messages-container').appendChild(el);
    return el;
  }

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    delete global.Notification;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    ({ maybeFireReplyNotification } = require('../public/app.js'));
    authStateCallback(currentUserMock);
    setVisibility('hidden');
  });

  afterEach(() => {
    delete global.Notification;
    setVisibility('visible');
  });

  test('does not throw when Notification API is unavailable', () => {
    addCard(myMsg.id);
    expect(() => maybeFireReplyNotification(myMsg, otherReply)).not.toThrow();
  });

  test('does not fire when permission is "denied"', () => {
    const Ctor = mockNotificationCtor('denied');
    addCard(myMsg.id);
    maybeFireReplyNotification(myMsg, otherReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does not fire when permission is "default"', () => {
    const Ctor = mockNotificationCtor('default');
    addCard(myMsg.id);
    maybeFireReplyNotification(myMsg, otherReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does not fire for a message not authored by current user', () => {
    const Ctor = mockNotificationCtor('granted');
    addCard(myMsg.id);
    const othersMsg = { ...myMsg, authorId: 'uid-other' };
    maybeFireReplyNotification(othersMsg, otherReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does not fire when replier is the current user (self-reply)', () => {
    const Ctor = mockNotificationCtor('granted');
    addCard(myMsg.id);
    const selfReply = { ...otherReply, authorId: 'uid-me' };
    maybeFireReplyNotification(myMsg, selfReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does not fire when tab is visible', () => {
    const Ctor = mockNotificationCtor('granted');
    setVisibility('visible');
    addCard(myMsg.id);
    maybeFireReplyNotification(myMsg, otherReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does not fire when message card is not in the DOM', () => {
    const Ctor = mockNotificationCtor('granted');
    maybeFireReplyNotification(myMsg, otherReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('fires notification when all conditions are met', () => {
    const Ctor = mockNotificationCtor('granted');
    addCard(myMsg.id);
    maybeFireReplyNotification(myMsg, otherReply);
    expect(Ctor).toHaveBeenCalledTimes(1);
  });

  test('notification title is "New reply on Guestbook"', () => {
    mockNotificationCtor('granted');
    addCard(myMsg.id);
    maybeFireReplyNotification(myMsg, otherReply);
    expect(global.Notification.mock.calls[0][0]).toBe('New reply on Guestbook');
  });

  test('notification body is "{replierName} replied: {text}"', () => {
    mockNotificationCtor('granted');
    addCard(myMsg.id);
    maybeFireReplyNotification(myMsg, otherReply);
    expect(global.Notification.mock.calls[0][1].body).toBe('Bob replied: Nice message!');
  });

  test('notification body snippet is truncated to 80 chars with ellipsis when reply text is long', () => {
    mockNotificationCtor('granted');
    addCard(myMsg.id);
    const longReply = { ...otherReply, text: 'A'.repeat(100) };
    maybeFireReplyNotification(myMsg, longReply);
    const body = global.Notification.mock.calls[0][1].body;
    expect(body).toBe('Bob replied: ' + 'A'.repeat(80) + '…');
  });

  test('notification body is not truncated when reply text is exactly 80 chars', () => {
    mockNotificationCtor('granted');
    addCard(myMsg.id);
    const exactReply = { ...otherReply, text: 'A'.repeat(80) };
    maybeFireReplyNotification(myMsg, exactReply);
    const body = global.Notification.mock.calls[0][1].body;
    expect(body).toBe('Bob replied: ' + 'A'.repeat(80));
    expect(body.endsWith('…')).toBe(false);
  });

  test('notification icon is /icon.png', () => {
    mockNotificationCtor('granted');
    addCard(myMsg.id);
    maybeFireReplyNotification(myMsg, otherReply);
    expect(global.Notification.mock.calls[0][1].icon).toBe('/icon.png');
  });

  test('clicking notification calls window.focus() and scrolls to message card', () => {
    const Ctor = mockNotificationCtor('granted');
    const card = addCard(myMsg.id);
    card.scrollIntoView = jest.fn();
    const focusSpy = jest.spyOn(window, 'focus').mockImplementation(() => {});

    maybeFireReplyNotification(myMsg, otherReply);

    const notifInstance = Ctor.instances[0];
    const clickArgs = notifInstance.addEventListener.mock.calls.find(c => c[0] === 'click');
    expect(clickArgs).toBeDefined();
    clickArgs[1]();

    expect(focusSpy).toHaveBeenCalled();
    expect(card.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    focusSpy.mockRestore();
  });
});

// --- browser notifications: permission request ---
describe('browser notifications — permission request on post', () => {
  let mocks;
  let authStateCallback;

  function mockNotificationCtor(permission = 'default') {
    const Ctor = jest.fn();
    Ctor.permission = permission;
    Ctor.requestPermission = jest.fn().mockResolvedValue(permission);
    global.Notification = Ctor;
    return Ctor;
  }

  async function submitPost(text = 'Hello!') {
    const input = document.getElementById('message-input');
    const form = document.getElementById('post-form');
    input.value = text;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    delete global.Notification;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    require('../public/app.js');
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
  });

  afterEach(() => {
    delete global.Notification;
  });

  test('calls Notification.requestPermission() after first successful post when permission is "default"', async () => {
    const Ctor = mockNotificationCtor('default');
    await submitPost();
    expect(Ctor.requestPermission).toHaveBeenCalledTimes(1);
  });

  test('does not request permission when already "granted"', async () => {
    const Ctor = mockNotificationCtor('granted');
    await submitPost();
    expect(Ctor.requestPermission).not.toHaveBeenCalled();
  });

  test('does not request permission when already "denied"', async () => {
    const Ctor = mockNotificationCtor('denied');
    await submitPost();
    expect(Ctor.requestPermission).not.toHaveBeenCalled();
  });

  test('does not throw when Notification API is unavailable', async () => {
    await expect(submitPost()).resolves.not.toThrow();
  });

  test('requests permission at most once per session even after multiple posts', async () => {
    const Ctor = mockNotificationCtor('default');
    await submitPost('First post');
    await submitPost('Second post');
    expect(Ctor.requestPermission).toHaveBeenCalledTimes(1);
  });
});

// --- browser notifications: initial load gate ---
describe('browser notifications — initial load gate in createMessageCard', () => {
  let createMessageCard;
  let authStateCallback;
  let mocks;

  const currentUserMock = { uid: 'uid-me', displayName: 'Me', photoURL: '' };

  const myMsg = {
    id: 'gate-msg-1',
    author: 'Me',
    text: 'Hello',
    timestamp: 1000,
    authorId: 'uid-me',
  };

  function setVisibility(state) {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true, writable: true });
  }

  function mockNotificationCtor(permission = 'granted') {
    const Ctor = jest.fn().mockImplementation(() => ({
      addEventListener: jest.fn(),
      close: jest.fn(),
    }));
    Ctor.permission = permission;
    Ctor.requestPermission = jest.fn().mockResolvedValue(permission);
    global.Notification = Ctor;
    return Ctor;
  }

  function addCard(msgId) {
    const el = document.createElement('div');
    el.id = 'msg-' + msgId;
    document.getElementById('messages-container').appendChild(el);
    return el;
  }

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    delete global.Notification;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.firebase = mocks.firebase;

    ({ createMessageCard } = require('../public/app.js'));
    authStateCallback(currentUserMock);
    setVisibility('hidden');
  });

  afterEach(() => {
    delete global.Notification;
    setVisibility('visible');
  });

  test('does not fire notification for replies present when card is first created', () => {
    const Ctor = mockNotificationCtor('granted');
    addCard(myMsg.id);

    mocks.dbRef.on.mockClear();
    createMessageCard(myMsg, currentUserMock);

    const childAddedCall = mocks.dbRef.on.mock.calls.find(c => c[0] === 'child_added');
    expect(childAddedCall).toBeDefined();
    const childAddedCb = childAddedCall[1];

    // Fire before the microtask resolves (initialReplyLoadComplete is still false)
    childAddedCb({ key: 'r1', val: () => ({ author: 'Bob', text: 'Hi', authorId: 'uid-bob', timestamp: 2000 }) });

    expect(Ctor).not.toHaveBeenCalled();
  });

  test('fires notification for new replies arriving after initial load completes', async () => {
    const Ctor = mockNotificationCtor('granted');
    addCard(myMsg.id);

    mocks.dbRef.on.mockClear();
    createMessageCard(myMsg, currentUserMock);

    const childAddedCall = mocks.dbRef.on.mock.calls.find(c => c[0] === 'child_added');
    expect(childAddedCall).toBeDefined();
    const childAddedCb = childAddedCall[1];

    // Let Promise.resolve().then(...) run so initialReplyLoadComplete becomes true
    await Promise.resolve();

    childAddedCb({ key: 'r2', val: () => ({ author: 'Bob', text: 'Hello!', authorId: 'uid-bob', timestamp: 3000 }) });

    expect(Ctor).toHaveBeenCalledTimes(1);
  });
});

// --- Expiry Countdown ---
describe('formatExpiryLabel', () => {
  let formatExpiryLabel;

  beforeAll(() => {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    document.body.innerHTML = APP_HTML;
    jest.resetModules();
    ({ formatExpiryLabel } = require('../public/app.js'));
  });

  test('returns hours+minutes format and no class for >= 2 hours', () => {
    const ms = 4 * 3600000 + 23 * 60000; // 4h 23m
    const result = formatExpiryLabel(ms);
    expect(result.text).toBe('expires in 4h 23m');
    expect(result.cls).toBe('');
  });

  test('returns hours+minutes format and no class for exactly 1 hour', () => {
    const ms = 3600000; // 1h 0m
    const result = formatExpiryLabel(ms);
    expect(result.text).toBe('expires in 1h 0m');
    expect(result.cls).toBe('');
  });

  test('returns minutes format and warning class for < 1 hour but >= 10 min', () => {
    const ms = 52 * 60000; // 52 minutes
    const result = formatExpiryLabel(ms);
    expect(result.text).toBe('expires in 52m');
    expect(result.cls).toBe('expiry--warning');
  });

  test('returns minutes format and warning class for exactly 10 minutes', () => {
    const ms = 600000; // 10 minutes
    const result = formatExpiryLabel(ms);
    expect(result.text).toBe('expires in 10m');
    expect(result.cls).toBe('expiry--warning');
  });

  test('returns "expiring soon" and danger class for < 10 minutes', () => {
    const ms = 9 * 60000; // 9 minutes
    const result = formatExpiryLabel(ms);
    expect(result.text).toBe('expiring soon');
    expect(result.cls).toBe('expiry--danger');
  });

  test('returns "expiring soon" and danger class for 1 ms remaining', () => {
    const result = formatExpiryLabel(1);
    expect(result.text).toBe('expiring soon');
    expect(result.cls).toBe('expiry--danger');
  });

  test('floors hours and minutes correctly', () => {
    const ms = 2 * 3600000 + 59000; // 2h 0m (59 seconds left over, rounds down)
    const result = formatExpiryLabel(ms);
    expect(result.text).toBe('expires in 2h 0m');
    expect(result.cls).toBe('');
  });
});

describe('createExpiryLabel', () => {
  let createExpiryLabel;

  beforeAll(() => {
    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    document.body.innerHTML = APP_HTML;
    jest.resetModules();
    ({ createExpiryLabel } = require('../public/app.js'));
  });

  test('returns an element with class expiry-label', () => {
    const now = Date.now();
    const el = createExpiryLabel(now - (20 * 3600000)); // 4h remaining
    expect(el.classList.contains('expiry-label')).toBe(true);
  });

  test('sets data-expiry to timestamp + 86400000', () => {
    const ts = Date.now() - (20 * 3600000); // 4h remaining
    const el = createExpiryLabel(ts);
    expect(Number(el.dataset.expiry)).toBe(ts + 86400000);
  });

  test('sets aria-label with absolute expiry time', () => {
    const ts = Date.now() - (20 * 3600000);
    const el = createExpiryLabel(ts);
    expect(el.getAttribute('aria-label')).toMatch(/^Expires at \d/);
  });

  test('text includes formatted countdown', () => {
    const ts = Date.now() - (20 * 3600000); // 4h remaining
    const el = createExpiryLabel(ts);
    expect(el.textContent).toMatch(/expires in \d+h \d+m/);
  });

  test('adds expiry--warning class when < 1 hour remaining', () => {
    const ts = Date.now() - (23.5 * 3600000); // 30 minutes remaining
    const el = createExpiryLabel(ts);
    expect(el.classList.contains('expiry--warning')).toBe(true);
  });

  test('adds expiry--danger class when < 10 minutes remaining', () => {
    const ts = Date.now() - (24 * 3600000 - 5 * 60000); // 5 minutes remaining
    const el = createExpiryLabel(ts);
    expect(el.classList.contains('expiry--danger')).toBe(true);
  });

  test('shows expiring soon for already-expired timestamp', () => {
    const ts = Date.now() - (25 * 3600000); // already expired
    const el = createExpiryLabel(ts);
    expect(el.textContent).toContain('expiring soon');
    expect(el.classList.contains('expiry--danger')).toBe(true);
  });
});

describe('createMessageCard expiry label', () => {
  let createMessageCard;

  beforeAll(() => {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    document.body.innerHTML = APP_HTML;
    jest.resetModules();
    ({ createMessageCard } = require('../public/app.js'));
  });

  const baseMsg = {
    id: 'msg-expiry-1',
    author: 'Alice',
    text: 'Hello',
    timestamp: Date.now() - (20 * 3600000), // 4h remaining
    authorId: 'uid-alice',
  };

  test('renders .expiry-label inside .message-time', () => {
    const card = createMessageCard(baseMsg, null);
    const timeEl = card.querySelector('.message-time');
    expect(timeEl).not.toBeNull();
    expect(timeEl.querySelector('.expiry-label')).not.toBeNull();
  });

  test('expiry label has data-expiry attribute set to timestamp + 86400000', () => {
    const card = createMessageCard(baseMsg, null);
    const label = card.querySelector('.expiry-label');
    expect(Number(label.dataset.expiry)).toBe(baseMsg.timestamp + 86400000);
  });

  test('expiry label has aria-label with expiry time', () => {
    const card = createMessageCard(baseMsg, null);
    const label = card.querySelector('.expiry-label');
    expect(label.getAttribute('aria-label')).toMatch(/^Expires at/);
  });

  test('expiry label shows warning class when < 1 hour remaining', () => {
    const msg = { ...baseMsg, id: 'msg-warn', timestamp: Date.now() - (23.5 * 3600000) };
    const card = createMessageCard(msg, null);
    const label = card.querySelector('.expiry-label');
    expect(label.classList.contains('expiry--warning')).toBe(true);
  });

  test('expiry label shows danger class when < 10 minutes remaining', () => {
    const msg = { ...baseMsg, id: 'msg-danger', timestamp: Date.now() - (24 * 3600000 - 5 * 60000) };
    const card = createMessageCard(msg, null);
    const label = card.querySelector('.expiry-label');
    expect(label.classList.contains('expiry--danger')).toBe(true);
  });
});

describe('tickExpiryLabels', () => {
  let createMessageCard;
  let tickExpiryLabels;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    ({ createMessageCard, tickExpiryLabels } = require('../public/app.js'));
  });

  function appendCard(msg) {
    const card = createMessageCard(msg, null);
    document.getElementById('messages-container').appendChild(card);
    return card;
  }

  test('updates expiry label text and class on tick', () => {
    const msg = {
      id: 'tick-1',
      author: 'Alice',
      text: 'hi',
      timestamp: Date.now() - (23 * 3600000), // 1h remaining
      authorId: 'uid-alice',
    };
    const card = appendCard(msg);
    const label = card.querySelector('.expiry-label');

    // Simulate time passing: change data-expiry to 30 min from now
    const thirtyMin = Date.now() + (30 * 60000);
    label.dataset.expiry = String(thirtyMin);

    tickExpiryLabels();

    expect(label.textContent).toContain('expires in 30m');
    expect(label.classList.contains('expiry--warning')).toBe(true);
  });

  test('removes expired message card from DOM on tick', () => {
    const msg = {
      id: 'tick-expire',
      author: 'Alice',
      text: 'hi',
      timestamp: Date.now() - (20 * 3600000),
      authorId: 'uid-alice',
    };
    const card = appendCard(msg);
    const label = card.querySelector('.expiry-label');

    // Set expiry to the past
    label.dataset.expiry = String(Date.now() - 1000);

    tickExpiryLabels();

    expect(document.getElementById('msg-tick-expire')).toBeNull();
  });

  test('does not remove card with time remaining', () => {
    const msg = {
      id: 'tick-keep',
      author: 'Alice',
      text: 'hi',
      timestamp: Date.now() - (20 * 3600000),
      authorId: 'uid-alice',
    };
    appendCard(msg);

    tickExpiryLabels();

    expect(document.getElementById('msg-tick-keep')).not.toBeNull();
  });
});

// --- flag feature ---
describe('flag feature', () => {
  const baseMsg = {
    id: 'flag-msg-1',
    author: 'Alice',
    text: 'Hello world',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  function setupModule(onMockImpl) {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const { firebase, authInstance, dbRef } = makeFirebaseMock();
    if (onMockImpl) {
      dbRef.on.mockImplementation(onMockImpl);
    }
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;

    const mod = require('../public/app.js');
    return { ...mod, firebase, dbRef };
  }

  // --- Button visibility ---
  test('flag button is not rendered for unauthenticated visitor', () => {
    const { createMessageCard } = setupModule();
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-flag')).toBeNull();
  });

  test('flag button is not rendered for the message\'s own author', () => {
    const { createMessageCard } = setupModule();
    const card = createMessageCard(baseMsg, { uid: 'uid-alice' });
    expect(card.querySelector('.btn-flag')).toBeNull();
  });

  test('flag button is rendered for an authenticated non-author', () => {
    const { createMessageCard } = setupModule();
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-flag')).not.toBeNull();
  });

  test('flag button has aria-label "Flag as inappropriate" initially', () => {
    const { createMessageCard } = setupModule();
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-flag').getAttribute('aria-label')).toBe('Flag as inappropriate');
  });

  test('flag button has title "Flag as inappropriate"', () => {
    const { createMessageCard } = setupModule();
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-flag').title).toBe('Flag as inappropriate');
  });

  test('flag button shows 🚩 emoji', () => {
    const { createMessageCard } = setupModule();
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-flag').textContent).toBe('🚩');
  });

  test('flag button appears in card footer between reply and bookmark buttons', () => {
    const { createMessageCard } = setupModule();
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    const footer = card.querySelector('.card-footer');
    const children = Array.from(footer.children);
    const replyIdx = children.findIndex(el => el.classList.contains('btn-reply'));
    const flagIdx = children.findIndex(el => el.classList.contains('btn-flag'));
    const bookmarkIdx = children.findIndex(el => el.classList.contains('btn-bookmark'));
    expect(flagIdx).toBeGreaterThan(replyIdx);
    expect(flagIdx).toBeLessThan(bookmarkIdx);
  });

  // --- Click behavior: add flag ---
  test('clicking flag button (not active) calls db.ref().update() with correct paths', async () => {
    const { firebase: fb, authInstance: ai, dbRef: dr } = makeFirebaseMock();
    ai.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = fb;
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    const { createMessageCard } = require('../public/app.js');

    const user = { uid: 'uid-bob', displayName: 'Bob' };
    const card = createMessageCard(baseMsg, user);
    card.querySelector('.btn-flag').click();

    await Promise.resolve();
    await Promise.resolve();

    expect(dr.update).toHaveBeenCalledTimes(1);
    const updateArg = dr.update.mock.calls[0][0];
    const reportKey = `/reports/${baseMsg.id}/${user.uid}`;
    expect(updateArg[reportKey]).toBeDefined();
    expect(updateArg[reportKey].authorId).toBe(baseMsg.authorId);
    expect(updateArg[reportKey].reportedAt).toBe('SERVER_TIMESTAMP');
    const rateLimitKey = `/users/${user.uid}/lastFlagTimestamp`;
    expect(updateArg[rateLimitKey]).toBe('SERVER_TIMESTAMP');
  });

  // --- Click behavior: remove flag ---
  test('clicking flag button when active calls db.ref().remove()', async () => {
    const { firebase: fb, authInstance: ai, dbRef: dr } = makeFirebaseMock();
    ai.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = fb;
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    const { createMessageCard } = require('../public/app.js');

    const user = { uid: 'uid-bob', displayName: 'Bob' };
    const card = createMessageCard(baseMsg, user);
    const flagBtn = card.querySelector('.btn-flag');

    // Manually put button in active state (as if listener fired)
    flagBtn.classList.add('btn-flag--active');
    flagBtn.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(dr.remove).toHaveBeenCalledTimes(1);
    expect(dr.update).not.toHaveBeenCalled();
  });

  // --- Reports listener: dimming ---
  test('reports listener dims card and replaces text when 3+ flags', () => {
    let reportsValueCallback;
    const { createMessageCard } = setupModule((event, cb) => {
      if (event === 'value') reportsValueCallback = cb;
      return 'listener-token';
    });

    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });

    reportsValueCallback({
      val: () => ({
        'uid-a': { reportedAt: 1, authorId: 'uid-alice' },
        'uid-b': { reportedAt: 2, authorId: 'uid-alice' },
        'uid-c': { reportedAt: 3, authorId: 'uid-alice' },
      }),
    });

    expect(card.style.opacity).toBe('0.4');
    expect(card.querySelector('.message-text').textContent)
      .toBe('⚠️ This message has been flagged by the community.');
  });

  test('reports listener does not dim card when fewer than 3 flags', () => {
    let reportsValueCallback;
    const { createMessageCard } = setupModule((event, cb) => {
      if (event === 'value') reportsValueCallback = cb;
      return 'listener-token';
    });

    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });

    reportsValueCallback({
      val: () => ({
        'uid-a': { reportedAt: 1, authorId: 'uid-alice' },
        'uid-b': { reportedAt: 2, authorId: 'uid-alice' },
      }),
    });

    expect(card.style.opacity).not.toBe('0.4');
    expect(card.querySelector('.message-text').textContent).toBe(baseMsg.text);
  });

  test('reports listener restores text and opacity when flags drop below 3', () => {
    let reportsValueCallback;
    const { createMessageCard } = setupModule((event, cb) => {
      if (event === 'value') reportsValueCallback = cb;
      return 'listener-token';
    });

    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });

    // Apply dimming
    reportsValueCallback({
      val: () => ({
        'uid-a': { reportedAt: 1, authorId: 'uid-alice' },
        'uid-b': { reportedAt: 2, authorId: 'uid-alice' },
        'uid-c': { reportedAt: 3, authorId: 'uid-alice' },
      }),
    });
    expect(card.style.opacity).toBe('0.4');

    // Remove one flag (drop to 2)
    reportsValueCallback({
      val: () => ({
        'uid-a': { reportedAt: 1, authorId: 'uid-alice' },
        'uid-b': { reportedAt: 2, authorId: 'uid-alice' },
      }),
    });

    expect(card.style.opacity).toBe('');
    expect(card.querySelector('.message-text').textContent).toBe(baseMsg.text);
  });

  // --- Reports listener: author notice ---
  test('reports listener shows author notice (not dimming) when own message has 3+ flags', () => {
    let reportsValueCallback;
    const { createMessageCard } = setupModule((event, cb) => {
      if (event === 'value') reportsValueCallback = cb;
      return 'listener-token';
    });

    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(baseMsg, ownUser);

    reportsValueCallback({
      val: () => ({
        'uid-b': { reportedAt: 1, authorId: 'uid-alice' },
        'uid-c': { reportedAt: 2, authorId: 'uid-alice' },
        'uid-d': { reportedAt: 3, authorId: 'uid-alice' },
      }),
    });

    expect(card.style.opacity).toBe('');
    const notice = card.querySelector('.flagged-author-notice');
    expect(notice).not.toBeNull();
    expect(notice.textContent).toBe('Your message has been flagged');
  });

  test('reports listener removes author notice when flags drop below 3', () => {
    let reportsValueCallback;
    const { createMessageCard } = setupModule((event, cb) => {
      if (event === 'value') reportsValueCallback = cb;
      return 'listener-token';
    });

    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(baseMsg, ownUser);

    reportsValueCallback({
      val: () => ({
        'uid-b': { reportedAt: 1, authorId: 'uid-alice' },
        'uid-c': { reportedAt: 2, authorId: 'uid-alice' },
        'uid-d': { reportedAt: 3, authorId: 'uid-alice' },
      }),
    });
    expect(card.querySelector('.flagged-author-notice')).not.toBeNull();

    reportsValueCallback({
      val: () => ({
        'uid-b': { reportedAt: 1, authorId: 'uid-alice' },
        'uid-c': { reportedAt: 2, authorId: 'uid-alice' },
      }),
    });

    expect(card.querySelector('.flagged-author-notice')).toBeNull();
  });

  // --- Reports listener: flag button active state ---
  test('reports listener marks flag button active when current user has flagged', () => {
    let reportsValueCallback;
    const { createMessageCard } = setupModule((event, cb) => {
      if (event === 'value') reportsValueCallback = cb;
      return 'listener-token';
    });

    const user = { uid: 'uid-bob' };
    const card = createMessageCard(baseMsg, user);

    reportsValueCallback({
      val: () => ({
        'uid-bob': { reportedAt: 1, authorId: 'uid-alice' },
      }),
    });

    const flagBtn = card.querySelector('.btn-flag');
    expect(flagBtn.classList.contains('btn-flag--active')).toBe(true);
    expect(flagBtn.getAttribute('aria-label')).toBe('Remove flag');
  });

  test('reports listener clears flag button active state when current user unflagged', () => {
    let reportsValueCallback;
    const { createMessageCard } = setupModule((event, cb) => {
      if (event === 'value') reportsValueCallback = cb;
      return 'listener-token';
    });

    const user = { uid: 'uid-bob' };
    const card = createMessageCard(baseMsg, user);

    // First: user has flagged
    reportsValueCallback({ val: () => ({ 'uid-bob': { reportedAt: 1, authorId: 'uid-alice' } }) });
    expect(card.querySelector('.btn-flag').classList.contains('btn-flag--active')).toBe(true);

    // Then: user removed flag
    reportsValueCallback({ val: () => ({}) });
    const flagBtn = card.querySelector('.btn-flag');
    expect(flagBtn.classList.contains('btn-flag--active')).toBe(false);
    expect(flagBtn.getAttribute('aria-label')).toBe('Flag as inappropriate');
  });

  // --- XSS safety ---
  test('flagged-author-notice uses textContent — no innerHTML injection', () => {
    let reportsValueCallback;
    const { createMessageCard } = setupModule((event, cb) => {
      if (event === 'value') reportsValueCallback = cb;
      return 'listener-token';
    });

    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(baseMsg, ownUser);

    reportsValueCallback({
      val: () => ({
        'uid-b': { reportedAt: 1, authorId: 'uid-alice' },
        'uid-c': { reportedAt: 2, authorId: 'uid-alice' },
        'uid-d': { reportedAt: 3, authorId: 'uid-alice' },
      }),
    });

    const notice = card.querySelector('.flagged-author-notice');
    expect(notice.children.length).toBe(0);
    expect(notice.innerHTML).not.toContain('<');
  });
});

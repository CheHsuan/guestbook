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
    jest.runAllTimers();

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

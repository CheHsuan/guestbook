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
  <div id="messages-container">
    <div id="loading-state" style="display:none"></div>
    <div id="empty-state" style="display:none"></div>
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

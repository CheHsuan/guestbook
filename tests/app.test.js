/**
 * @jest-environment jsdom
 */

'use strict';

// --- HTML fixture — mirrors the DOM elements app.js grabs at load time ---
const APP_HTML = `
  <button id="login-btn-header" style="display:none"></button>
  <button id="post-as-guest-btn-header" style="display:none"></button>
  <button id="login-btn-main"></button>
  <button id="post-as-guest-btn-main"></button>
  <div id="guest-name-backdrop" style="display:none;"></div>
  <div id="guest-name-modal" style="display:none;">
    <input id="guest-name-input" type="text" maxlength="40" />
    <button id="guest-name-confirm"></button>
  </div>
  <button id="logout-btn"></button>
  <div id="user-info" style="display:none">
    <button id="edit-bio-btn"></button>
  </div>
  <img id="user-avatar" />
  <span id="user-name"></span>
  <div id="main-content" style="display:none"></div>
  <div id="login-prompt" style="display:flex"></div>
  <div id="post-section" style="display:none">
    <form id="post-form">
      <button type="button" id="poll-toggle-btn" aria-pressed="false"></button>
      <button type="button" id="gif-toggle-btn" aria-pressed="false"></button>
      <div id="text-composer">
        <input id="message-input" type="text" />
        <span id="char-counter">0 / 250</span>
        <span id="draft-label" class="draft-label" style="display:none;"></span>
      </div>
      <div id="poll-composer" style="display:none">
        <input id="poll-question-input" type="text" maxlength="120" />
        <span id="poll-question-counter" class="char-counter">0 / 120</span>
        <div id="poll-options-container"></div>
        <button type="button" id="poll-add-option-btn">+ Add option</button>
      </div>
      <div id="gif-composer" style="display:none">
        <div id="gif-preview-wrap"></div>
        <button type="button" id="gif-change-btn" style="display:none;"></button>
      </div>
      <button id="submit-btn" type="submit">
        <span class="btn-text" style="display:inline">Post Message</span>
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
  <div id="trending-section" class="trending-section" style="display:none;">
    <span class="trending-label">Trending</span>
    <div class="trending-chips"></div>
  </div>
  <div id="messages-container">
    <div id="empty-state" style="display:none"></div>
    <div id="search-empty-state" style="display:none"><p>No messages match your search.</p></div>
    <div id="loading-state" style="display:none"></div>
  </div>
  <span id="message-count">0</span>
  <div class="sort-controls">
    <div id="sort-group">
      <button class="sort-btn sort-btn--active" data-sort="newest" aria-pressed="true">Newest</button>
      <button class="sort-btn" data-sort="oldest" aria-pressed="false">Oldest</button>
      <button class="sort-btn" data-sort="active" aria-pressed="false">Most Active</button>
    </div>
    <button id="my-posts-btn" class="my-posts-btn" aria-pressed="false" style="display:none;">My Posts</button>
  </div>
  <p id="sort-disclaimer" style="display:none;"></p>
  <p id="my-posts-count" class="my-posts-count" style="display:none;"></p>
  <div id="type-filter-row" class="type-filter-row" role="group" aria-label="Filter by message type" style="display:none;"></div>
  <div id="typing-indicator" class="typing-indicator" style="display:none;"></div>
  <button id="new-messages-banner" type="button" class="new-messages-banner" style="display:none;"></button>
  <button id="muted-badge" style="display:none;"></button>
  <button id="muted-words-badge" style="display:none;"></button>
  <button id="saved-badge" style="display:none;"></button>
  <section id="saved-panel" style="display:none;">
    <div class="saved-panel-header">
      <button id="saved-panel-clear"></button>
    </div>
    <div id="saved-panel-list"></div>
  </section>
  <section id="muted-panel" style="display:none;">
    <div class="muted-panel-header"></div>
    <div id="muted-panel-list"></div>
  </section>
  <section id="muted-words-panel" style="display:none;">
    <div class="muted-panel-header"></div>
    <input id="muted-words-input" type="text" />
    <p id="muted-words-input-error" style="display:none;"></p>
    <div id="muted-words-panel-list"></div>
    <button id="muted-words-add-btn"></button>
  </section>
  <div id="author-panel-backdrop" style="display:none;"></div>
  <aside id="author-panel" style="display:none;">
    <div class="author-panel-header">
      <div id="author-panel-avatar"></div>
      <div class="author-panel-meta">
        <div id="author-panel-name"></div>
        <div id="author-panel-bio" style="display:none;"></div>
        <div id="author-panel-subtitle"></div>
      </div>
      <button id="author-panel-close"></button>
    </div>
    <div id="author-panel-body"></div>
  </aside>
  <div id="gif-picker-backdrop" style="display:none;"></div>
  <div id="gif-picker" style="display:none;">
    <span id="gif-picker-title"></span>
    <button id="gif-picker-close"></button>
    <div class="gif-search-row">
      <input id="gif-search-input" type="text" />
    </div>
    <div id="gif-grid"></div>
    <p id="gif-search-error" style="display:none;"></p>
  </div>
  <button type="button" id="image-toggle-btn" aria-pressed="false"></button>
  <input type="file" id="image-file-input" style="display:none;" />
  <div id="image-composer" style="display:none;">
    <div id="image-preview-wrap"></div>
  </div>
  <p id="image-upload-error" style="display:none;"></p>
  <button type="button" id="voice-toggle-btn" aria-pressed="false" style="display:none;"></button>
  <div id="voice-composer" style="display:none;">
    <div id="voice-record-area">
      <button type="button" id="voice-record-btn">Record</button>
      <span class="voice-max-label">Max 60 sec</span>
    </div>
    <div id="voice-recording-area" style="display:none;">
      <button type="button" id="voice-stop-btn">Stop</button>
      <span id="voice-duration">0:00</span>
    </div>
    <div id="voice-preview-area" style="display:none;">
      <audio id="voice-preview-player" controls></audio>
      <button type="button" id="voice-rerecord-btn">Re-record</button>
    </div>
    <p id="voice-error-msg" style="display:none;"></p>
    <div id="voice-upload-progress" style="display:none;">
      <div class="voice-upload-bar"><div id="voice-upload-fill"></div></div>
      <span id="voice-upload-label">Uploading…</span>
    </div>
  </div>
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
    equalTo: jest.fn().mockReturnThis(),
  };

  const dbInstance = {
    useEmulator: jest.fn(),
    ref: jest.fn().mockReturnValue(dbRef),
  };

  const authInstance = {
    useEmulator: jest.fn(),
    onAuthStateChanged: jest.fn(),
    signInWithPopup: jest.fn().mockResolvedValue({}),
    signInAnonymously: jest.fn().mockResolvedValue({}),
    signOut: jest.fn().mockResolvedValue({}),
    currentUser: null,
  };

  const GoogleAuthProvider = jest.fn().mockReturnValue({});

  const authFn = Object.assign(jest.fn().mockReturnValue(authInstance), {
    GoogleAuthProvider,
  });

  const dbFn = Object.assign(jest.fn().mockReturnValue(dbInstance), {
    ServerValue: { TIMESTAMP: 'SERVER_TIMESTAMP' },
  });

  const storageRef = {
    put: jest.fn().mockReturnValue({
      on: jest.fn(),
      cancel: jest.fn(),
      snapshot: { ref: { getDownloadURL: jest.fn().mockResolvedValue('https://example.com/img.jpg') } },
    }),
    getDownloadURL: jest.fn().mockResolvedValue('https://example.com/img.jpg'),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const storageInstance = {
    useEmulator: jest.fn(),
    ref: jest.fn().mockReturnValue(storageRef),
    refFromURL: jest.fn().mockReturnValue(storageRef),
  };

  const storageFn = jest.fn().mockReturnValue(storageInstance);

  return {
    firebase: {
      apps: { length: 0 },
      initializeApp: jest.fn(),
      auth: authFn,
      database: dbFn,
      storage: storageFn,
    },
    authInstance,
    dbInstance,
    dbRef,
    storageInstance,
    storageRef,
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.countryCodeToFlag = utils.countryCodeToFlag;

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

  // --- Edit window (5-minute gate) ---
  test('hides edit button for own message posted more than 5 minutes ago', () => {
    const ownUser = { uid: 'uid-alice' };
    const oldMsg = { ...baseMsg, timestamp: Date.now() - 6 * 60 * 1000 };
    const card = createMessageCard(oldMsg, ownUser);
    expect(card.querySelector('.btn-edit')).toBeNull();
  });

  test('shows edit button for own message posted within the last 5 minutes', () => {
    const ownUser = { uid: 'uid-alice' };
    const recentMsg = { ...baseMsg, timestamp: Date.now() - 60 * 1000 };
    const card = createMessageCard(recentMsg, ownUser);
    expect(card.querySelector('.btn-edit')).not.toBeNull();
  });

  test('(edited) label includes title tooltip with formatted edit time', () => {
    const editedAt = Date.now();
    const editedMsg = { ...baseMsg, editedAt };
    const card = createMessageCard(editedMsg, null);
    const label = card.querySelector('.edited-label');
    expect(label).not.toBeNull();
    expect(label.title).toContain('Last edited at');
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

  // --- Country flag badge ---
  test('renders flag emoji span when countryCode and countryName are present', () => {
    const msg = { ...baseMsg, countryCode: 'US', countryName: 'United States' };
    const card = createMessageCard(msg, null);
    const flagSpan = card.querySelector('.message-country-flag');
    expect(flagSpan).not.toBeNull();
    expect(flagSpan.textContent).toBe('🇺🇸');
  });

  test('flag span has correct title tooltip', () => {
    const msg = { ...baseMsg, countryCode: 'JP', countryName: 'Japan' };
    const card = createMessageCard(msg, null);
    const flagSpan = card.querySelector('.message-country-flag');
    expect(flagSpan.title).toBe('Posted from Japan');
  });

  test('flag span has correct aria-label', () => {
    const msg = { ...baseMsg, countryCode: 'BR', countryName: 'Brazil' };
    const card = createMessageCard(msg, null);
    const flagSpan = card.querySelector('.message-country-flag');
    expect(flagSpan.getAttribute('aria-label')).toBe('Brazil');
  });

  test('falls back to countryCode in title when countryName is absent', () => {
    const msg = { ...baseMsg, countryCode: 'GB' };
    const card = createMessageCard(msg, null);
    const flagSpan = card.querySelector('.message-country-flag');
    expect(flagSpan).not.toBeNull();
    expect(flagSpan.title).toBe('Posted from GB');
  });

  test('does not render flag when countryCode is absent', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.message-country-flag')).toBeNull();
  });

  test('does not render flag for invalid countryCode (lowercase)', () => {
    const msg = { ...baseMsg, countryCode: 'us', countryName: 'United States' };
    const card = createMessageCard(msg, null);
    expect(card.querySelector('.message-country-flag')).toBeNull();
  });

  test('does not render flag for invalid countryCode (3 letters)', () => {
    const msg = { ...baseMsg, countryCode: 'USA', countryName: 'United States' };
    const card = createMessageCard(msg, null);
    expect(card.querySelector('.message-country-flag')).toBeNull();
  });

  test('flag span is placed after author name and before timestamp', () => {
    const msg = { ...baseMsg, countryCode: 'US', countryName: 'United States' };
    const card = createMessageCard(msg, null);
    const header = card.querySelector('.message-header');
    const children = Array.from(header.children);
    const authorIdx = children.findIndex(el => el.classList.contains('message-author'));
    const flagIdx = children.findIndex(el => el.classList.contains('message-country-flag'));
    const timeIdx = children.findIndex(el => el.classList.contains('message-time'));
    expect(flagIdx).toBeGreaterThan(authorIdx);
    expect(flagIdx).toBeLessThan(timeIdx);
  });

  test('XSS safety: countryName never creates a script DOM element', () => {
    const msg = { ...baseMsg, countryCode: 'US', countryName: '<script>alert(1)</script>' };
    const card = createMessageCard(msg, null);
    expect(card.querySelectorAll('script').length).toBe(0);
    const flagSpan = card.querySelector('.message-country-flag');
    expect(flagSpan.title).toBe('Posted from <script>alert(1)</script>');
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.fetchCountryData = jest.fn().mockResolvedValue(null);
    global.countryCodeToFlag = utils.countryCodeToFlag;
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.fetchCountryData = jest.fn().mockResolvedValue(null);
    global.countryCodeToFlag = utils.countryCodeToFlag;
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
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

    // 1 initial load + 1 alias load + 1 load-more = 3; second scroll was ignored by isLoadingMore guard
    expect(mocks.dbRef.once.mock.calls.length).toBe(3);
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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

// --- type filter ---
describe('type filter', () => {
  let filterMessages, updateTypeFilterRow;

  function addCard(container, { id = 'c1', type = 'text', author = 'Alice', text = 'Hello' } = {}) {
    const card = document.createElement('div');
    card.className = 'message-card';
    card.id = `msg-${id}`;
    card.dataset.type = type;
    card.dataset.authorId = 'uid-alice';
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
    localStorage.clear();

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    ({ filterMessages, updateTypeFilterRow } = require('../public/app.js'));
  });

  test('createMessageCard sets data-type from msg.type', () => {
    const { createMessageCard } = require('../public/app.js');
    const pollCard = createMessageCard({ id: 'p1', type: 'poll', text: 'Poll?', author: 'Alice', authorId: 'u1', timestamp: Date.now(), poll: { options: { '0': 'Yes', '1': 'No' } } }, null);
    expect(pollCard.dataset.type).toBe('poll');
  });

  test('createMessageCard defaults data-type to text when msg.type is absent', () => {
    const { createMessageCard } = require('../public/app.js');
    const card = createMessageCard({ id: 't1', text: 'Hi', author: 'Alice', authorId: 'u1', timestamp: Date.now() }, null);
    expect(card.dataset.type).toBe('text');
  });

  test('type-filter-row is hidden when all cards are text-only', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { id: '1', type: 'text' });
    addCard(container, { id: '2', type: 'text' });
    filterMessages();
    expect(document.getElementById('type-filter-row').style.display).toBe('none');
  });

  test('type-filter-row is visible when multiple types are present', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { id: '1', type: 'text' });
    addCard(container, { id: '2', type: 'poll' });
    filterMessages();
    expect(document.getElementById('type-filter-row').style.display).not.toBe('none');
  });

  test('type-filter-row shows chips only for types present', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { id: '1', type: 'text' });
    addCard(container, { id: '2', type: 'gif' });
    updateTypeFilterRow();
    const row = document.getElementById('type-filter-row');
    const btns = Array.from(row.querySelectorAll('button'));
    const labels = btns.map(b => b.dataset.typeFilter);
    expect(labels).toContain('all');
    expect(labels).toContain('text');
    expect(labels).toContain('gif');
    expect(labels).not.toContain('poll');
    expect(labels).not.toContain('image');
  });

  test('filterMessages hides non-matching type cards when type filter active', () => {
    const container = document.getElementById('messages-container');
    const textCard = addCard(container, { id: '1', type: 'text' });
    const pollCard = addCard(container, { id: '2', type: 'poll' });
    updateTypeFilterRow();

    // Click the poll chip
    const row = document.getElementById('type-filter-row');
    const pollBtn = Array.from(row.querySelectorAll('button')).find(b => b.dataset.typeFilter === 'poll');
    pollBtn.click();

    expect(pollCard.style.display).not.toBe('none');
    expect(textCard.style.display).toBe('none');
  });

  test('clicking All chip restores all cards', () => {
    const container = document.getElementById('messages-container');
    const textCard = addCard(container, { id: '1', type: 'text' });
    const pollCard = addCard(container, { id: '2', type: 'poll' });
    updateTypeFilterRow();

    // Activate poll filter
    const row = document.getElementById('type-filter-row');
    const pollBtn = Array.from(row.querySelectorAll('button')).find(b => b.dataset.typeFilter === 'poll');
    pollBtn.click();
    expect(textCard.style.display).toBe('none');

    // Click All
    updateTypeFilterRow(); // re-render chips with updated active state
    const allBtn = Array.from(document.getElementById('type-filter-row').querySelectorAll('button')).find(b => b.dataset.typeFilter === 'all');
    allBtn.click();

    expect(textCard.style.display).not.toBe('none');
    expect(pollCard.style.display).not.toBe('none');
  });

  test('active chip has aria-pressed=true', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { id: '1', type: 'text' });
    addCard(container, { id: '2', type: 'gif' });
    updateTypeFilterRow();

    const row = document.getElementById('type-filter-row');
    const allBtn = Array.from(row.querySelectorAll('button')).find(b => b.dataset.typeFilter === 'all');
    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
    const gifBtn = Array.from(row.querySelectorAll('button')).find(b => b.dataset.typeFilter === 'gif');
    expect(gifBtn.getAttribute('aria-pressed')).toBe('false');
  });

  test('type filter persists to localStorage', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { id: '1', type: 'text' });
    addCard(container, { id: '2', type: 'image' });
    updateTypeFilterRow();

    const row = document.getElementById('type-filter-row');
    const imageBtn = Array.from(row.querySelectorAll('button')).find(b => b.dataset.typeFilter === 'image');
    imageBtn.click();

    expect(localStorage.getItem('guestbook_type_filter')).toBe('image');
  });

  test('shows search-empty-state with type-specific message when type filter yields no results', () => {
    const container = document.getElementById('messages-container');
    addCard(container, { id: '1', type: 'text' });
    addCard(container, { id: '2', type: 'poll' });
    updateTypeFilterRow();

    // Activate gif filter (no GIF cards present but we set it manually)
    // Simulate selecting gif filter
    const row = document.getElementById('type-filter-row');
    // Manually add a gif card then activate gif filter, then remove the gif card
    const gifCard = addCard(container, { id: '3', type: 'gif' });
    updateTypeFilterRow();
    const gifBtn = Array.from(document.getElementById('type-filter-row').querySelectorAll('button')).find(b => b.dataset.typeFilter === 'gif');
    gifBtn.click(); // now gif is active filter
    gifCard.remove(); // remove the gif card
    filterMessages(); // re-filter with gif active but no gif cards

    const emptyState = document.getElementById('search-empty-state');
    expect(emptyState.style.display).toBe('block');
    expect(emptyState.querySelector('p').textContent).toContain('GIF');
  });

  test('type filter composes with search — hides cards that fail either check', () => {
    const container = document.getElementById('messages-container');
    const t1 = addCard(container, { id: '1', type: 'text', author: 'Alice', text: 'hello' });
    const t2 = addCard(container, { id: '2', type: 'text', author: 'Bob', text: 'world' });
    const p1 = addCard(container, { id: '3', type: 'poll', author: 'Alice', text: 'vote' });
    updateTypeFilterRow();

    // Activate poll filter
    const pollBtn = Array.from(document.getElementById('type-filter-row').querySelectorAll('button')).find(b => b.dataset.typeFilter === 'poll');
    pollBtn.click();

    // Now search for 'alice' — only Alice's poll should be visible
    document.getElementById('search-input').value = 'alice';
    filterMessages();

    expect(p1.style.display).not.toBe('none'); // poll + alice match
    expect(t1.style.display).toBe('none');      // text doesn't match poll filter
    expect(t2.style.display).toBe('none');      // text + no alice match
  });
});

// --- My Posts filter ---
describe('My Posts filter', () => {
  let filterMessages;
  let authStateCallback;

  function addCard(container, { author = 'Alice', text = 'Hello', id = 'c1', authorId = 'uid-alice' } = {}) {
    const card = document.createElement('div');
    card.className = 'message-card';
    card.id = `msg-${id}`;
    card.dataset.authorId = authorId;
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

  function simulateSignIn(uid = 'uid-alice') {
    authStateCallback({
      uid,
      displayName: 'Alice',
      photoURL: '',
    });
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    ({ filterMessages } = require('../public/app.js'));
  });

  test('my-posts-btn is hidden by default (logged out)', () => {
    expect(document.getElementById('my-posts-btn').style.display).toBe('none');
  });

  test('clicking my-posts-btn toggles aria-pressed to true', () => {
    simulateSignIn();
    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click();
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  test('clicking my-posts-btn again toggles aria-pressed back to false', () => {
    simulateSignIn();
    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click();
    btn.click();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  test('My Posts mode shows only cards matching currentUser uid', () => {
    simulateSignIn('uid-alice');
    const container = document.getElementById('messages-container');
    const own = addCard(container, { author: 'Alice', text: 'Hi', id: '1', authorId: 'uid-alice' });
    const other = addCard(container, { author: 'Bob', text: 'Hey', id: '2', authorId: 'uid-bob' });

    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click(); // activate My Posts

    expect(own.style.display).not.toBe('none');
    expect(other.style.display).toBe('none');
  });

  test('deactivating My Posts restores all cards', () => {
    simulateSignIn('uid-alice');
    const container = document.getElementById('messages-container');
    const own = addCard(container, { author: 'Alice', text: 'Hi', id: '1', authorId: 'uid-alice' });
    const other = addCard(container, { author: 'Bob', text: 'Hey', id: '2', authorId: 'uid-bob' });

    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click(); // activate
    btn.click(); // deactivate

    expect(own.style.display).not.toBe('none');
    expect(other.style.display).not.toBe('none');
  });

  test('shows my-posts-count when own messages exist', () => {
    simulateSignIn('uid-alice');
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hi', id: '1', authorId: 'uid-alice' });

    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click();

    const countEl = document.getElementById('my-posts-count');
    expect(countEl.style.display).toBe('block');
    expect(countEl.textContent).toBe('Your 1 message');
  });

  test('count label uses plural for multiple messages', () => {
    simulateSignIn('uid-alice');
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hi', id: '1', authorId: 'uid-alice' });
    addCard(container, { author: 'Alice', text: 'Bye', id: '2', authorId: 'uid-alice' });

    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click();

    expect(document.getElementById('my-posts-count').textContent).toBe('Your 2 messages');
  });

  test('shows search-empty-state when user has no own messages', () => {
    simulateSignIn('uid-alice');
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Bob', text: 'Hey', id: '1', authorId: 'uid-bob' });

    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click();

    expect(document.getElementById('search-empty-state').style.display).toBe('block');
  });

  test('clears search input when My Posts is activated with a search term', () => {
    simulateSignIn('uid-alice');
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hi', id: '1', authorId: 'uid-alice' });

    document.getElementById('search-input').value = 'some search';
    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click();

    expect(document.getElementById('search-input').value).toBe('');
  });

  test('my-posts-count is hidden after deactivating My Posts', () => {
    simulateSignIn('uid-alice');
    const container = document.getElementById('messages-container');
    addCard(container, { author: 'Alice', text: 'Hi', id: '1', authorId: 'uid-alice' });

    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click(); // activate
    btn.click(); // deactivate

    expect(document.getElementById('my-posts-count').style.display).toBe('none');
  });

  test('My Posts mode button adds my-posts-btn--active class when active', () => {
    simulateSignIn('uid-alice');
    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click();
    expect(btn.classList.contains('my-posts-btn--active')).toBe(true);
  });

  test('My Posts mode button removes my-posts-btn--active class when deactivated', () => {
    simulateSignIn('uid-alice');
    const btn = document.getElementById('my-posts-btn');
    btn.style.display = '';
    btn.click();
    btn.click();
    expect(btn.classList.contains('my-posts-btn--active')).toBe(false);
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
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

// --- guest posting ---
describe('guest posting', () => {
  let mocks;
  let authStateCallback;

  function setupModule() {
    jest.resetModules();
    sessionStorage.clear();
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.fetchCountryData = jest.fn().mockResolvedValue(null);
    global.countryCodeToFlag = utils.countryCodeToFlag;
    global.firebase = mocks.firebase;

    require('../public/app.js');
  }

  beforeEach(setupModule);

  function simulateAnonymousSignIn() {
    authStateCallback({ uid: 'uid-anon', displayName: null, photoURL: '', isAnonymous: true });
  }

  test('onAuthStateChanged: anonymous user hides post section until name is confirmed', () => {
    simulateAnonymousSignIn();
    expect(document.getElementById('post-section').style.display).toBe('none');
  });

  test('onAuthStateChanged: anonymous user hides poll/gif/image toggles', () => {
    simulateAnonymousSignIn();
    expect(document.getElementById('poll-toggle-btn').style.display).toBe('none');
    expect(document.getElementById('gif-toggle-btn').style.display).toBe('none');
    expect(document.getElementById('image-toggle-btn').style.display).toBe('none');
  });

  test('onAuthStateChanged: anonymous user shows login-btn-header for account upgrade', () => {
    simulateAnonymousSignIn();
    expect(document.getElementById('login-btn-header').style.display).toBe('inline-flex');
  });

  test('confirmGuestName shows post section and sets user-name display', () => {
    simulateAnonymousSignIn();
    const nameInput = document.getElementById('guest-name-input');
    const confirmBtn = document.getElementById('guest-name-confirm');
    nameInput.value = 'Bob';
    confirmBtn.click();
    expect(document.getElementById('post-section').style.display).toBe('block');
    expect(document.getElementById('user-name').textContent).toBe('Bob');
  });

  test('confirmGuestName defaults to "Anonymous" when input is blank', () => {
    simulateAnonymousSignIn();
    const nameInput = document.getElementById('guest-name-input');
    const confirmBtn = document.getElementById('guest-name-confirm');
    nameInput.value = '';
    confirmBtn.click();
    expect(document.getElementById('user-name').textContent).toBe('Anonymous');
  });

  test('post payload sets isGuest:true for anonymous user', async () => {
    simulateAnonymousSignIn();
    // Confirm guest name so post section is shown
    document.getElementById('guest-name-input').value = 'Alice';
    document.getElementById('guest-name-confirm').click();

    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');
    input.value = 'Hello as guest!';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const updateCalls = mocks.dbRef.update.mock.calls;
    expect(updateCalls.length).toBeGreaterThan(0);
    const payload = Object.values(updateCalls[0][0]).find(v => v && v.text !== undefined);
    expect(payload).toBeDefined();
    expect(payload.isGuest).toBe(true);
  });

  test('post payload uses guestDisplayName as author for anonymous user', async () => {
    simulateAnonymousSignIn();
    document.getElementById('guest-name-input').value = 'Carol';
    document.getElementById('guest-name-confirm').click();

    const form = document.getElementById('post-form');
    const input = document.getElementById('message-input');
    input.value = 'Hello from Carol!';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const updateCalls = mocks.dbRef.update.mock.calls;
    const payload = Object.values(updateCalls[0][0]).find(v => v && v.text !== undefined);
    expect(payload.author).toBe('Carol');
  });

  test('createMessageCard renders guest-badge for isGuest messages', () => {
    const utils = require('../public/utils');
    const { createMessageCard } = require('../public/app.js');

    const msg = {
      id: 'g1',
      author: 'Alice',
      text: 'Guest message',
      timestamp: Date.now(),
      authorId: 'uid-anon',
      isGuest: true,
    };
    const card = createMessageCard(msg, null, false);
    const badge = card.querySelector('.guest-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('Guest');
  });

  test('createMessageCard does not render guest-badge for non-guest messages', () => {
    const { createMessageCard } = require('../public/app.js');

    const msg = {
      id: 'g2',
      author: 'Bob',
      text: 'Normal message',
      timestamp: Date.now(),
      authorId: 'uid-bob',
    };
    const card = createMessageCard(msg, null, false);
    expect(card.querySelector('.guest-badge')).toBeNull();
  });

  test('createMessageCard: guest messages do not add author-avatar-btn class', () => {
    const { createMessageCard } = require('../public/app.js');

    const msg = {
      id: 'g3',
      author: 'Gus',
      text: 'Guest post',
      timestamp: Date.now(),
      authorId: 'uid-gus',
      isGuest: true,
    };
    const card = createMessageCard(msg, null, false);
    expect(card.querySelector('.author-avatar-btn')).toBeNull();
  });

  test('unauthenticated state shows post-as-guest-btn-header', () => {
    authStateCallback(null);
    expect(document.getElementById('post-as-guest-btn-header').style.display).toBe('inline-flex');
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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

// --- collapsible reply threads ---
describe('collapsible reply threads', () => {
  let createMessageCard;
  let REPLIES_COLLAPSE_THRESHOLD;
  let replyAddedCallback;
  let replyRemovedCallback;

  const baseMsg = {
    id: 'collapse-msg-1',
    author: 'Alice',
    text: 'Hello',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  function makeReplySnap(id, overrides = {}) {
    return {
      key: id,
      val: () => ({
        author: 'Bob',
        text: `Reply ${id}`,
        timestamp: Date.now(),
        authorId: 'uid-bob',
        ...overrides,
      }),
    };
  }

  beforeAll(() => {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance, dbRef } = makeFirebaseMock();

    // Capture child_added and child_removed callbacks so tests can simulate events
    dbRef.on.mockImplementation((event, callback) => {
      if (event === 'child_added') replyAddedCallback = callback;
      if (event === 'child_removed') replyRemovedCallback = callback;
      return 'listener-token';
    });

    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    document.body.innerHTML = APP_HTML;
    jest.resetModules();
    ({ createMessageCard, REPLIES_COLLAPSE_THRESHOLD } = require('../public/app.js'));
  });

  beforeEach(() => {
    replyAddedCallback = null;
    replyRemovedCallback = null;
  });

  test('REPLIES_COLLAPSE_THRESHOLD equals 3', () => {
    expect(REPLIES_COLLAPSE_THRESHOLD).toBe(3);
  });

  test('toggle button is hidden when replies at or below threshold', () => {
    const card = createMessageCard(baseMsg, null);
    // Simulate 3 replies arriving
    for (let i = 1; i <= 3; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    const toggle = card.querySelector('.btn-replies-toggle');
    expect(!toggle || toggle.style.display === 'none').toBe(true);
  });

  test('toggle button appears when replies exceed threshold', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-2' }, null);
    for (let i = 1; i <= 4; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    const toggle = card.querySelector('.btn-replies-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle.style.display).not.toBe('none');
  });

  test('toggle button label shows overflow count when collapsed', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-3' }, null);
    for (let i = 1; i <= 5; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    const toggle = card.querySelector('.btn-replies-toggle');
    // 5 total - 3 threshold = 2 more
    expect(toggle.textContent).toContain('2');
    expect(toggle.textContent).toContain('more');
  });

  test('only REPLIES_COLLAPSE_THRESHOLD reply cards in DOM when collapsed', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-4' }, null);
    for (let i = 1; i <= 5; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    const replyCards = card.querySelectorAll('.reply-card');
    expect(replyCards.length).toBe(REPLIES_COLLAPSE_THRESHOLD);
  });

  test('clicking toggle reveals all reply cards', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-5' }, null);
    for (let i = 1; i <= 5; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    card.querySelector('.btn-replies-toggle').click();
    expect(card.querySelectorAll('.reply-card').length).toBe(5);
  });

  test('toggle button shows "Hide replies" when expanded', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-6' }, null);
    for (let i = 1; i <= 4; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    card.querySelector('.btn-replies-toggle').click();
    expect(card.querySelector('.btn-replies-toggle').textContent).toContain('Hide replies');
  });

  test('clicking toggle again re-collapses to threshold', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-7' }, null);
    for (let i = 1; i <= 5; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    const toggle = card.querySelector('.btn-replies-toggle');
    toggle.click(); // expand
    toggle.click(); // collapse
    expect(card.querySelectorAll('.reply-card').length).toBe(REPLIES_COLLAPSE_THRESHOLD);
  });

  test('new reply while collapsed updates toggle count but does not inject card', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-8' }, null);
    // Load 4 replies — collapses with toggle showing "1 more reply"
    for (let i = 1; i <= 4; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    const toggle = card.querySelector('.btn-replies-toggle');
    expect(toggle.textContent).toContain('1');

    // New real-time reply arrives while collapsed
    if (replyAddedCallback) replyAddedCallback(makeReplySnap('r5'));
    // Total 5 - 3 threshold = 2 more
    expect(toggle.textContent).toContain('2');
    // Still only threshold cards in DOM
    expect(card.querySelectorAll('.reply-card').length).toBe(REPLIES_COLLAPSE_THRESHOLD);
  });

  test('new reply while expanded is appended to DOM', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-9' }, null);
    for (let i = 1; i <= 4; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    card.querySelector('.btn-replies-toggle').click(); // expand
    if (replyAddedCallback) replyAddedCallback(makeReplySnap('r5'));
    expect(card.querySelectorAll('.reply-card').length).toBe(5);
  });

  test('deleting reply below threshold removes toggle when count drops to threshold', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-10' }, null);
    for (let i = 1; i <= 4; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    // Delete the 4th reply (hidden one)
    if (replyRemovedCallback) replyRemovedCallback({ key: 'r4' });
    // Now 3 replies — toggle should be hidden
    const toggle = card.querySelector('.btn-replies-toggle');
    expect(!toggle || toggle.style.display === 'none').toBe(true);
    expect(card.querySelectorAll('.reply-card').length).toBe(3);
  });

  test('reply count badge always reflects true total', () => {
    const card = createMessageCard({ ...baseMsg, id: 'collapse-msg-11' }, null);
    for (let i = 1; i <= 5; i++) {
      if (replyAddedCallback) replyAddedCallback(makeReplySnap(`r${i}`));
    }
    const badge = card.querySelector('.reply-count');
    expect(badge.textContent).toContain('5');
  });
});

// --- share button ---
describe('share button', () => {
  let createMessageCard;

  const baseMsg = {
    id: 'share-msg-1',
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    document.body.innerHTML = APP_HTML;
    ({ createMessageCard } = require('../public/app.js'));
  });

  beforeEach(() => {
    // Reset navigator.share to undefined (desktop default) before each test
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // Clear any lingering toast elements from previous tests
    document.querySelectorAll('.permalink-toast').forEach(el => el.remove());
  });

  test('renders .btn-share on every card (no user)', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-share')).not.toBeNull();
  });

  test('renders .btn-share on every card (own message)', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-alice' });
    expect(card.querySelector('.btn-share')).not.toBeNull();
  });

  test('renders .btn-share on every card (other user)', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-share')).not.toBeNull();
  });

  test('.btn-share has aria-label="Share this message"', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-share').getAttribute('aria-label'))
      .toBe('Share this message');
  });

  test('.btn-share has tabindex="-1" in non-touch environment (jsdom has no matchMedia)', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-share').getAttribute('tabindex')).toBe('-1');
  });

  test('.btn-share comes after .btn-reply in the footer', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    const footer = card.querySelector('.card-footer');
    const children = Array.from(footer.children);
    const replyIdx = children.findIndex(el => el.classList.contains('btn-reply'));
    const shareIdx = children.findIndex(el => el.classList.contains('btn-share'));
    expect(replyIdx).toBeGreaterThanOrEqual(0);
    expect(shareIdx).toBeGreaterThan(replyIdx);
  });

  test('uses navigator.share when available and resolves successfully', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn() },
      writable: true,
      configurable: true,
    });

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-share').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(shareMock).toHaveBeenCalledWith({
      title: 'Guestbook',
      text: `Alice: Hello world`,
      url: `https://guestbook.slashstack.app/app#msg-${baseMsg.id}`,
    });
  });

  test('AbortError from navigator.share shows no toast', async () => {
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    Object.defineProperty(navigator, 'share', {
      value: jest.fn().mockRejectedValue(abortError),
      writable: true,
      configurable: true,
    });

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-share').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector('.permalink-toast')).toBeNull();
  });

  test('non-AbortError from navigator.share falls back to clipboard', async () => {
    const networkError = Object.assign(new Error('Network'), { name: 'TypeError' });
    Object.defineProperty(navigator, 'share', {
      value: jest.fn().mockRejectedValue(networkError),
      writable: true,
      configurable: true,
    });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-share').click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(
      `https://guestbook.slashstack.app/app#msg-${baseMsg.id}`
    );
  });

  test('clicking .btn-share calls clipboard.writeText with full permalink URL (no navigator.share)', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-share').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(
      `https://guestbook.slashstack.app/app#msg-${baseMsg.id}`
    );
  });

  test('successful clipboard copy shows "Link copied!" toast', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-share').click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const toast = document.querySelector('.permalink-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Link copied!');
  });

  test('falls back to toast when clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: null,
      writable: true,
      configurable: true,
    });

    const card = createMessageCard(baseMsg, null);
    card.querySelector('.btn-share').click();
    await Promise.resolve();
    await Promise.resolve();

    const toast = document.querySelector('.permalink-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe(`Copy this link: #msg-${baseMsg.id}`);
  });

  test('GIF message uses fixed share text', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      writable: true,
      configurable: true,
    });

    const gifMsg = { ...baseMsg, id: 'share-gif-1', type: 'gif', gifUrl: 'https://media.tenor.com/x.gif', text: 'some alt' };
    const card = createMessageCard(gifMsg, null);
    card.querySelector('.btn-share').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Check out this GIF on Guestbook',
    }));
  });

  test('share text is truncated to 100 chars', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      writable: true,
      configurable: true,
    });

    const longText = 'x'.repeat(200);
    const longMsg = { ...baseMsg, id: 'share-long-1', text: longText };
    const card = createMessageCard(longMsg, null);
    card.querySelector('.btn-share').click();
    await Promise.resolve();
    await Promise.resolve();

    const { text } = shareMock.mock.calls[0][0];
    expect(text).toBe('Alice: ' + 'x'.repeat(100));
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.fetchCountryData = jest.fn().mockResolvedValue(null);
    global.countryCodeToFlag = utils.countryCodeToFlag;
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = jest.fn().mockReturnValue(false);
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = jest.fn().mockReturnValue(false);
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
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

  test('renders single #hashtag as <span class="hashtag">', () => {
    const el = makeContainer();
    renderMessageText(el, 'Hello #coding');
    const span = el.querySelector('.hashtag');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('#coding');
  });

  test('renders multiple #hashtags as separate spans', () => {
    const el = makeContainer();
    renderMessageText(el, '#music and #coding are fun');
    const spans = el.querySelectorAll('.hashtag');
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe('#music');
    expect(spans[1].textContent).toBe('#coding');
  });

  test('does not treat word-embedded # as hashtag (foo#bar)', () => {
    const el = makeContainer();
    renderMessageText(el, 'foo#bar');
    expect(el.querySelector('.hashtag')).toBeNull();
    expect(el.textContent).toBe('foo#bar');
  });

  test('does not treat digit-leading # as hashtag (#2026)', () => {
    const el = makeContainer();
    renderMessageText(el, '#2026');
    expect(el.querySelector('.hashtag')).toBeNull();
  });

  test('hashtag span uses textContent — no innerHTML injection', () => {
    const el = makeContainer();
    renderMessageText(el, '#<script>alert(1)</script>');
    expect(el.innerHTML).not.toContain('<script>');
  });
});

// --- #hashtag regex detection ---
describe('#hashtag regex detection via parseMessageSegments', () => {
  let parseMessageSegments;

  beforeAll(() => {
    const utils = require('../public/utils');
    parseMessageSegments = utils.parseMessageSegments;
  });

  test('detects a single hashtag', () => {
    const segs = parseMessageSegments('hello #world');
    const tag = segs.find(s => s.type === 'hashtag');
    expect(tag).toBeDefined();
    expect(tag.value).toBe('#world');
  });

  test('detects hashtag starting with letter only (not digit)', () => {
    const segs = parseMessageSegments('#2026');
    expect(segs.every(s => s.type !== 'hashtag')).toBe(true);
  });

  test('detects hashtag with underscores', () => {
    const segs = parseMessageSegments('#coding_tips');
    const tag = segs.find(s => s.type === 'hashtag');
    expect(tag).toBeDefined();
    expect(tag.value).toBe('#coding_tips');
  });

  test('does not detect word-embedded # (foo#bar)', () => {
    const segs = parseMessageSegments('foo#bar');
    expect(segs.every(s => s.type !== 'hashtag')).toBe(true);
  });

  test('detects multiple hashtags', () => {
    const segs = parseMessageSegments('#music and #coding');
    const tags = segs.filter(s => s.type === 'hashtag');
    expect(tags.length).toBe(2);
    expect(tags[0].value).toBe('#music');
    expect(tags[1].value).toBe('#coding');
  });

  test('single-char hashtag body is not valid (minimum 2 chars after #)', () => {
    // #a = 2 chars total — regex requires [a-zA-Z] + {1,29} more, so #a is NOT a match
    const segs = parseMessageSegments('#a');
    expect(segs.every(s => s.type !== 'hashtag')).toBe(true);
  });

  test('detects hashtag at minimum length (2 chars after #)', () => {
    const segs = parseMessageSegments('#ab');
    const tag = segs.find(s => s.type === 'hashtag');
    expect(tag).toBeDefined();
    expect(tag.value).toBe('#ab');
  });
});

// --- #hashtag click-to-filter wiring ---
describe('#hashtag click-to-filter wiring', () => {
  let createMessageCard;

  const hashtagMsg = {
    id: 'msg-hashtag-1',
    author: 'Alice',
    text: 'Check out #coding today',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  beforeEach(() => {
    jest.resetModules();

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    document.body.innerHTML = APP_HTML;
    ({ createMessageCard } = require('../public/app.js'));
  });

  test('clicking a #hashtag sets searchInput value to the tag', () => {
    const card = createMessageCard(hashtagMsg, null);
    document.getElementById('messages-container').appendChild(card);

    const span = card.querySelector('.hashtag');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('#coding');

    span.click();

    expect(document.getElementById('search-input').value).toBe('#coding');
  });

  test('clicking a #hashtag triggers filter (shows matching count)', () => {
    const card = createMessageCard(hashtagMsg, null);
    document.getElementById('messages-container').appendChild(card);

    const span = card.querySelector('.hashtag');
    span.click();

    const countEl = document.getElementById('search-results-count');
    expect(countEl.style.display).not.toBe('none');
  });

  test('renders #hashtag in reply card', () => {
    const replyMsg = {
      id: 'r-hashtag-1',
      author: 'Bob',
      text: 'Loving #music today',
      timestamp: Date.now(),
      authorId: 'uid-bob',
    };

    const { createReplyCard } = require('../public/app.js');
    const card = createReplyCard(replyMsg, null, 'msg1');
    const span = card.querySelector('.hashtag');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('#music');
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.fetchCountryData = jest.fn().mockResolvedValue(null);
    global.countryCodeToFlag = utils.countryCodeToFlag;
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

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

// --- truncateQuote ---
describe('truncateQuote', () => {
  let truncateQuote;

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ truncateQuote } = require('../public/app.js'));
  });

  test('returns empty string for null input', () => {
    expect(truncateQuote(null)).toBe('');
  });

  test('returns empty string for undefined input', () => {
    expect(truncateQuote(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(truncateQuote('')).toBe('');
  });

  test('returns empty string for whitespace-only string', () => {
    expect(truncateQuote('   ')).toBe('');
  });

  test('returns text as-is when length is less than 100 chars', () => {
    const text = 'Hello world';
    expect(truncateQuote(text)).toBe(text);
  });

  test('returns text as-is when length is exactly 100 chars', () => {
    const text = 'A'.repeat(100);
    expect(truncateQuote(text)).toBe(text);
    expect(truncateQuote(text).endsWith('…')).toBe(false);
  });

  test('truncates text longer than 100 chars and appends ellipsis', () => {
    const text = 'A'.repeat(101);
    const result = truncateQuote(text);
    expect(result).toBe('A'.repeat(100) + '…');
  });

  test('truncated result is 101 chars (100 + ellipsis char)', () => {
    const text = 'B'.repeat(200);
    const result = truncateQuote(text);
    expect([...result].length).toBe(101); // 100 chars + 1 ellipsis codepoint
  });

  test('trims leading/trailing whitespace before checking length', () => {
    const text = '  Hello  ';
    expect(truncateQuote(text)).toBe('Hello');
  });

  test('returns non-string input as empty string', () => {
    expect(truncateQuote(42)).toBe('');
    expect(truncateQuote(true)).toBe('');
  });
});

// --- quote reply: createReplyCard ---
describe('quote reply — createReplyCard', () => {
  let createReplyCard;

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ createReplyCard } = require('../public/app.js'));
  });

  const baseReply = {
    id: 'r-quote-1',
    author: 'Bob',
    text: 'Great point!',
    timestamp: Date.now(),
    authorId: 'uid-bob',
  };

  test('renders blockquote.reply-quote when quotedText is present', () => {
    const reply = { ...baseReply, quotedText: 'Hello world', quotedAuthor: 'Alice' };
    const card = createReplyCard(reply, null, 'msg1');
    expect(card.querySelector('blockquote.reply-quote')).not.toBeNull();
  });

  test('does NOT render blockquote.reply-quote when quotedText is absent (graceful degradation)', () => {
    const card = createReplyCard(baseReply, null, 'msg1');
    expect(card.querySelector('blockquote.reply-quote')).toBeNull();
  });

  test('does NOT render blockquote.reply-quote when quotedText is empty string', () => {
    const reply = { ...baseReply, quotedText: '' };
    const card = createReplyCard(reply, null, 'msg1');
    expect(card.querySelector('blockquote.reply-quote')).toBeNull();
  });

  test('shows quoted text content inside blockquote', () => {
    const reply = { ...baseReply, quotedText: 'Original message text', quotedAuthor: 'Alice' };
    const card = createReplyCard(reply, null, 'msg1');
    const qt = card.querySelector('.reply-quote-text');
    expect(qt).not.toBeNull();
    expect(qt.textContent).toBe('Original message text');
  });

  test('shows author prefix when quotedAuthor is present', () => {
    const reply = { ...baseReply, quotedText: 'Hello', quotedAuthor: 'Alice' };
    const card = createReplyCard(reply, null, 'msg1');
    const authorEl = card.querySelector('.reply-quote-author');
    expect(authorEl).not.toBeNull();
    expect(authorEl.textContent).toBe('Alice: ');
  });

  test('omits author prefix when quotedAuthor is empty string', () => {
    const reply = { ...baseReply, quotedText: 'Hello', quotedAuthor: '' };
    const card = createReplyCard(reply, null, 'msg1');
    expect(card.querySelector('.reply-quote-author')).toBeNull();
  });

  test('omits author prefix when quotedAuthor is absent', () => {
    const reply = { ...baseReply, quotedText: 'Hello' };
    const card = createReplyCard(reply, null, 'msg1');
    expect(card.querySelector('.reply-quote-author')).toBeNull();
  });

  test('blockquote appears before reply body text', () => {
    const reply = { ...baseReply, quotedText: 'Parent text', quotedAuthor: 'Alice' };
    const card = createReplyCard(reply, null, 'msg1');
    const children = Array.from(card.children);
    const quoteIdx = children.findIndex(el => el.tagName === 'BLOCKQUOTE');
    const textIdx = children.findIndex(el => el.classList.contains('reply-text'));
    expect(quoteIdx).toBeGreaterThanOrEqual(0);
    expect(quoteIdx).toBeLessThan(textIdx);
  });

  test('quotedText rendered via textContent — XSS safe', () => {
    const xssReply = { ...baseReply, quotedText: '<script>alert(1)</script>', quotedAuthor: 'Alice' };
    const card = createReplyCard(xssReply, null, 'msg1');
    expect(card.querySelector('.reply-quote-text').textContent).toBe('<script>alert(1)</script>');
    expect(card.innerHTML).not.toContain('<script>');
  });

  test('quotedAuthor rendered via textContent — XSS safe', () => {
    const xssReply = { ...baseReply, quotedText: 'Hi', quotedAuthor: '<img src=x onerror=evil()>' };
    const card = createReplyCard(xssReply, null, 'msg1');
    expect(card.querySelector('.reply-quote-author').textContent).toBe('<img src=x onerror=evil()>: ');
    expect(card.innerHTML).not.toContain('<img');
  });
});

// --- quote reply: composer quote preview ---
describe('quote reply — composer quote preview', () => {
  let createMessageCard;

  const baseMsg = {
    id: 'msg-quote-composer',
    author: 'Alice',
    text: 'Hello everyone, happy to be here!',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ createMessageCard } = require('../public/app.js'));
  });

  test('reply form shows .reply-quote-preview when parent message has text', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    expect(card.querySelector('.reply-quote-preview')).not.toBeNull();
  });

  test('reply form shows parent author in .reply-quote-preview-author', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    const authorEl = card.querySelector('.reply-quote-preview-author');
    expect(authorEl).not.toBeNull();
    expect(authorEl.textContent).toBe('Alice: ');
  });

  test('reply form shows parent text (truncated) in quote preview', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    const preview = card.querySelector('.reply-quote-preview');
    expect(preview.textContent).toContain('Hello everyone');
  });

  test('reply form does NOT show .reply-quote-preview when parent text is empty', () => {
    const emptyMsg = { ...baseMsg, id: 'msg-empty-text', text: '' };
    const card = createMessageCard(emptyMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    expect(card.querySelector('.reply-quote-preview')).toBeNull();
  });

  test('reply form does NOT show .reply-quote-preview when parent text is whitespace only', () => {
    const wsMsg = { ...baseMsg, id: 'msg-ws-text', text: '   ' };
    const card = createMessageCard(wsMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    expect(card.querySelector('.reply-quote-preview')).toBeNull();
  });

  test('quote preview truncates parent text longer than 100 chars', () => {
    const longMsg = { ...baseMsg, id: 'msg-long-text', text: 'X'.repeat(150) };
    const card = createMessageCard(longMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    const preview = card.querySelector('.reply-quote-preview');
    expect(preview.textContent).toContain('X'.repeat(100) + '…');
  });

  test('quote preview author rendered via textContent — XSS safe', () => {
    const xssMsg = { ...baseMsg, id: 'msg-xss-author', author: '<script>evil()</script>' };
    const card = createMessageCard(xssMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    const preview = card.querySelector('.reply-quote-preview');
    expect(preview.innerHTML).not.toContain('<script>');
  });

  test('quote preview text rendered via textContent — XSS safe', () => {
    const xssMsg = { ...baseMsg, id: 'msg-xss-text', text: '<img src=x onerror=evil()>' };
    const card = createMessageCard(xssMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    const preview = card.querySelector('.reply-quote-preview');
    expect(preview.innerHTML).not.toContain('<img');
  });

  test('quote preview appears before the reply textarea in the form', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-reply').click();
    const form = card.querySelector('.reply-form-wrapper');
    const children = Array.from(form.children);
    const previewIdx = children.findIndex(el => el.classList.contains('reply-quote-preview'));
    const textareaIdx = children.findIndex(el => el.tagName === 'TEXTAREA');
    expect(previewIdx).toBeGreaterThanOrEqual(0);
    expect(previewIdx).toBeLessThan(textareaIdx);
  });
});

// --- quote reply: Firebase payload ---
describe('quote reply — Firebase payload on submission', () => {
  const baseMsg = {
    id: 'msg-payload-1',
    author: 'Alice',
    text: 'Hello world',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  function setupForSubmission() {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance, dbRef } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    const { createMessageCard } = require('../public/app.js');
    return { createMessageCard, dbRef };
  }

  test('reply payload includes quotedText when parent has text', async () => {
    const { createMessageCard, dbRef } = setupForSubmission();
    const user = { uid: 'uid-bob', displayName: 'Bob' };
    const card = createMessageCard(baseMsg, user);
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Great post!';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    const updateArg = dbRef.update.mock.calls[0][0];
    const replyKey = Object.keys(updateArg).find(k => k.includes(`/messages/${baseMsg.id}/replies/`));
    expect(replyKey).toBeTruthy();
    expect(updateArg[replyKey].quotedText).toBe('Hello world');
  });

  test('reply payload includes quotedAuthor when parent has text', async () => {
    const { createMessageCard, dbRef } = setupForSubmission();
    const user = { uid: 'uid-bob', displayName: 'Bob' };
    const card = createMessageCard(baseMsg, user);
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Great post!';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    const updateArg = dbRef.update.mock.calls[0][0];
    const replyKey = Object.keys(updateArg).find(k => k.includes(`/messages/${baseMsg.id}/replies/`));
    expect(updateArg[replyKey].quotedAuthor).toBe('Alice');
  });

  test('reply payload does NOT include quotedText when parent text is empty', async () => {
    const { createMessageCard, dbRef } = setupForSubmission();
    const emptyMsg = { ...baseMsg, id: 'msg-empty', text: '' };
    const user = { uid: 'uid-bob', displayName: 'Bob' };
    const card = createMessageCard(emptyMsg, user);
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'A reply';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    const updateArg = dbRef.update.mock.calls[0][0];
    const replyKey = Object.keys(updateArg).find(k => k.includes(`/messages/${emptyMsg.id}/replies/`));
    expect(updateArg[replyKey].quotedText).toBeUndefined();
    expect(updateArg[replyKey].quotedAuthor).toBeUndefined();
  });

  test('reply payload does NOT include quotedText when parent text is whitespace only', async () => {
    const { createMessageCard, dbRef } = setupForSubmission();
    const wsMsg = { ...baseMsg, id: 'msg-ws', text: '   ' };
    const user = { uid: 'uid-bob', displayName: 'Bob' };
    const card = createMessageCard(wsMsg, user);
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'A reply';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    const updateArg = dbRef.update.mock.calls[0][0];
    const replyKey = Object.keys(updateArg).find(k => k.includes(`/messages/${wsMsg.id}/replies/`));
    expect(updateArg[replyKey].quotedText).toBeUndefined();
  });

  test('quotedText is truncated to 100 chars in the Firebase payload', async () => {
    const { createMessageCard, dbRef } = setupForSubmission();
    const longMsg = { ...baseMsg, id: 'msg-long', text: 'Z'.repeat(150) };
    const user = { uid: 'uid-bob', displayName: 'Bob' };
    const card = createMessageCard(longMsg, user);
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Short reply';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    const updateArg = dbRef.update.mock.calls[0][0];
    const replyKey = Object.keys(updateArg).find(k => k.includes(`/messages/${longMsg.id}/replies/`));
    expect(updateArg[replyKey].quotedText).toBe('Z'.repeat(100) + '…');
  });
});

// --- draft auto-save ---
describe('draft auto-save', () => {
  let saveDraft;
  let loadDraft;
  let clearDraft;
  let restoreDraft;
  let mocks;
  let authStateCallback;

  function setupApp() {
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.firebase = mocks.firebase;

    ({ saveDraft, loadDraft, clearDraft, restoreDraft } = require('../public/app.js'));
  }

  beforeEach(() => {
    jest.useFakeTimers();
    setupApp();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  test('saveDraft stores text in localStorage under guestbook_draft key', () => {
    saveDraft('Hello world');
    expect(localStorage.getItem('guestbook_draft')).toBe('Hello world');
  });

  test('saveDraft returns true on success', () => {
    expect(saveDraft('Hello')).toBe(true);
  });

  test('loadDraft returns stored text', () => {
    localStorage.setItem('guestbook_draft', 'My draft');
    expect(loadDraft()).toBe('My draft');
  });

  test('loadDraft returns null when no draft stored', () => {
    expect(loadDraft()).toBeNull();
  });

  test('clearDraft removes the key from localStorage', () => {
    localStorage.setItem('guestbook_draft', 'My draft');
    clearDraft();
    expect(localStorage.getItem('guestbook_draft')).toBeNull();
  });

  test('save-on-input: typing in textarea saves draft after 1 second debounce', () => {
    const input = document.getElementById('message-input');
    input.value = 'Draft message';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(localStorage.getItem('guestbook_draft')).toBeNull();

    jest.advanceTimersByTime(1000);
    expect(localStorage.getItem('guestbook_draft')).toBe('Draft message');
  });

  test('save-on-input: debounce resets on rapid typing — only final value is saved', () => {
    const input = document.getElementById('message-input');

    input.value = 'First';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(500);

    input.value = 'Second';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(1000);

    expect(localStorage.getItem('guestbook_draft')).toBe('Second');
  });

  test('save-on-input: empty value does not write to localStorage', () => {
    const input = document.getElementById('message-input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(1000);
    expect(localStorage.getItem('guestbook_draft')).toBeNull();
  });

  test('restore-on-init: draft is restored into textarea on sign-in', () => {
    localStorage.setItem('guestbook_draft', 'My saved draft');
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    expect(document.getElementById('message-input').value).toBe('My saved draft');
  });

  test('restore-on-init: char counter is updated to match restored draft length', () => {
    localStorage.setItem('guestbook_draft', 'Hello');
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    expect(document.getElementById('char-counter').textContent).toBe('5 / 250');
  });

  test('restore-on-init: draft over 250 chars is truncated to 250 before restoring', () => {
    localStorage.setItem('guestbook_draft', 'A'.repeat(300));
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    const input = document.getElementById('message-input');
    expect(input.value.length).toBe(250);
    expect(input.value).toBe('A'.repeat(250));
  });

  test('restore-on-init: shows draft-label when draft is restored', () => {
    localStorage.setItem('guestbook_draft', 'My saved draft');
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    const draftLabel = document.getElementById('draft-label');
    expect(draftLabel.style.display).not.toBe('none');
    expect(draftLabel.classList.contains('draft-label--visible')).toBe(true);
    expect(draftLabel.textContent).toBe('Draft restored');
  });

  test('restore-on-init: does not restore or show label when no draft is saved', () => {
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });

    expect(document.getElementById('message-input').value).toBe('');
    expect(document.getElementById('draft-label').style.display).toBe('none');
  });

  test('clear-on-submit: draft is removed from localStorage after successful post', async () => {
    localStorage.setItem('guestbook_draft', 'Draft to be cleared');
    authStateCallback({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    await Promise.resolve();
    await Promise.resolve();

    const input = document.getElementById('message-input');
    input.value = 'Hello!';
    document.getElementById('post-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(localStorage.getItem('guestbook_draft')).toBeNull();
  });

  test('clear-on-sign-out: draft is removed from localStorage when user signs out', () => {
    localStorage.setItem('guestbook_draft', 'My draft');
    authStateCallback(null);
    expect(localStorage.getItem('guestbook_draft')).toBeNull();
  });

  test('blur with empty textarea clears draft', () => {
    localStorage.setItem('guestbook_draft', 'Some draft');
    const input = document.getElementById('message-input');
    input.value = '';
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(localStorage.getItem('guestbook_draft')).toBeNull();
  });

  test('blur with non-empty textarea does not clear draft', () => {
    localStorage.setItem('guestbook_draft', 'Some draft');
    const input = document.getElementById('message-input');
    input.value = 'Still typing';
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    expect(localStorage.getItem('guestbook_draft')).toBe('Some draft');
  });

  test('graceful degradation: saveDraft returns false without throwing when localStorage probe throws', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveDraft('Hello')).not.toThrow();
    expect(saveDraft('Hello')).toBe(false);

    setItemSpy.mockRestore();
  });

  test('graceful degradation: loadDraft returns null without throwing when localStorage throws', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => loadDraft()).not.toThrow();
    expect(loadDraft()).toBeNull();

    getItemSpy.mockRestore();
  });

  test('graceful degradation: clearDraft does not throw when localStorage throws', () => {
    const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => clearDraft()).not.toThrow();

    removeItemSpy.mockRestore();
  });
});

// --- @mention notification ---
describe('@mention notification', () => {
  let maybeFireMentionNotification;
  let escapeRegex;

  function setupGlobals() {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
  }

  function setVisibility(state) {
    Object.defineProperty(document, 'visibilityState', {
      value: state,
      configurable: true,
      writable: true,
    });
  }

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    setVisibility('hidden');

    setupGlobals();

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    global.Notification = jest.fn().mockImplementation(() => ({
      addEventListener: jest.fn(),
      close: jest.fn(),
    }));
    global.Notification.permission = 'granted';

    ({ maybeFireMentionNotification, escapeRegex } = require('../public/app.js'));

    // Set currentUser via the exported module's closure by simulating auth state
    // We expose currentUser indirectly through the function's behaviour
  });

  afterEach(() => {
    setVisibility('visible');
    delete global.Notification;
  });

  function makeMsg(overrides = {}) {
    return {
      id: 'msg-mention-test',
      author: 'Alice',
      authorId: 'uid-alice',
      text: '@Bob hello there',
      timestamp: Date.now(),
      ...overrides,
    };
  }

  // Helper: simulate signed-in user by re-requiring with currentUser set via auth callback
  function buildWithUser(user) {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    setupGlobals();

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;

    let authCb;
    authInstance.onAuthStateChanged.mockImplementation(cb => { authCb = cb; });

    global.Notification = jest.fn().mockImplementation(() => ({
      addEventListener: jest.fn(),
      close: jest.fn(),
    }));
    global.Notification.permission = 'granted';

    const mod = require('../public/app.js');
    if (user) authCb(user);
    return mod;
  }

  test('fires notification when conditions are met (granted, hidden, not self, name matches)', () => {
    const mod = buildWithUser({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    setVisibility('hidden');
    global.Notification.permission = 'granted';

    mod.maybeFireMentionNotification(makeMsg({ text: '@Bob hello!', authorId: 'uid-alice' }));

    expect(global.Notification).toHaveBeenCalledTimes(1);
    expect(global.Notification).toHaveBeenCalledWith('You were mentioned on Guestbook', expect.objectContaining({
      body: expect.stringContaining('@Bob hello!'),
      icon: '/icon.png',
    }));
  });

  test('does not fire when Notification permission is not granted', () => {
    const mod = buildWithUser({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    setVisibility('hidden');
    global.Notification.permission = 'default';

    mod.maybeFireMentionNotification(makeMsg({ text: '@Bob hello!', authorId: 'uid-alice' }));

    expect(global.Notification).not.toHaveBeenCalled();
  });

  test('does not fire when tab is visible', () => {
    const mod = buildWithUser({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    setVisibility('visible');
    global.Notification.permission = 'granted';

    mod.maybeFireMentionNotification(makeMsg({ text: '@Bob hello!', authorId: 'uid-alice' }));

    expect(global.Notification).not.toHaveBeenCalled();
  });

  test('does not fire for self-mention (author is the current user)', () => {
    const mod = buildWithUser({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    setVisibility('hidden');
    global.Notification.permission = 'granted';

    mod.maybeFireMentionNotification(makeMsg({ text: '@Bob you sent this', authorId: 'uid-bob' }));

    expect(global.Notification).not.toHaveBeenCalled();
  });

  test('does not fire when current user display name is not mentioned', () => {
    const mod = buildWithUser({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    setVisibility('hidden');
    global.Notification.permission = 'granted';

    mod.maybeFireMentionNotification(makeMsg({ text: '@Alice hello!', authorId: 'uid-alice' }));

    expect(global.Notification).not.toHaveBeenCalled();
  });

  test('match is case-insensitive (@alice matches display name Alice)', () => {
    const mod = buildWithUser({ uid: 'uid-alice', displayName: 'Alice', photoURL: '' });
    setVisibility('hidden');
    global.Notification.permission = 'granted';

    mod.maybeFireMentionNotification(makeMsg({ text: '@alice hey!', authorId: 'uid-other' }));

    expect(global.Notification).toHaveBeenCalledTimes(1);
  });

  test('word boundary: @Alice does not match for display name Alice when followed by more word chars', () => {
    const mod = buildWithUser({ uid: 'uid-alice', displayName: 'Alice', photoURL: '' });
    setVisibility('hidden');
    global.Notification.permission = 'granted';

    mod.maybeFireMentionNotification(makeMsg({ text: '@AliceSmith hello', authorId: 'uid-other' }));

    expect(global.Notification).not.toHaveBeenCalled();
  });

  test('word boundary: @Alice matches when followed by a space', () => {
    const mod = buildWithUser({ uid: 'uid-alice', displayName: 'Alice', photoURL: '' });
    setVisibility('hidden');
    global.Notification.permission = 'granted';

    mod.maybeFireMentionNotification(makeMsg({ text: '@Alice hello', authorId: 'uid-other' }));

    expect(global.Notification).toHaveBeenCalledTimes(1);
  });

  test('notification body shows author and text snippet up to 80 chars', () => {
    const mod = buildWithUser({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    setVisibility('hidden');
    global.Notification.permission = 'granted';
    const longText = '@Bob ' + 'x'.repeat(100);

    mod.maybeFireMentionNotification(makeMsg({ text: longText, author: 'Alice', authorId: 'uid-alice' }));

    expect(global.Notification).toHaveBeenCalledTimes(1);
    const args = global.Notification.mock.calls[0];
    expect(args[1].body).toMatch(/^Alice: /);
    expect(args[1].body.length).toBeLessThanOrEqual('Alice: '.length + 80 + 1); // +1 for ellipsis char
  });

  test('escapeRegex escapes regex special characters', () => {
    const mod = buildWithUser(null);
    expect(mod.escapeRegex('C++')).toBe('C\\+\\+');
    expect(mod.escapeRegex('user.name')).toBe('user\\.name');
    expect(mod.escapeRegex('(test)')).toBe('\\(test\\)');
    expect(mod.escapeRegex('no-special')).toBe('no-special');
  });

  test('display name with special chars (e.g. C++) is matched correctly', () => {
    const mod = buildWithUser({ uid: 'uid-cpp', displayName: 'C++', photoURL: '' });
    setVisibility('hidden');
    global.Notification.permission = 'granted';

    mod.maybeFireMentionNotification(makeMsg({ text: 'Hello @C++ world', authorId: 'uid-other' }));

    expect(global.Notification).toHaveBeenCalledTimes(1);
  });

  test('notification is not fired when currentUser is null', () => {
    const mod = buildWithUser(null);
    setVisibility('hidden');
    global.Notification.permission = 'granted';

    mod.maybeFireMentionNotification(makeMsg({ text: '@Bob hello', authorId: 'uid-alice' }));

    expect(global.Notification).not.toHaveBeenCalled();
  });
});

// --- author profile panel ---
describe('author profile panel', () => {
  let createMessageCard;
  let openAuthorPanel;
  let closeAuthorPanel;

  const baseMsg = {
    id: 'ap-msg1',
    author: 'Alice',
    text: 'Hello world',
    timestamp: Date.now(),
    authorId: 'uid-alice',
    photoURL: null,
  };

  function setupModule() {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    const mod = require('../public/app.js');
    createMessageCard = mod.createMessageCard;
    openAuthorPanel = mod.openAuthorPanel;
    closeAuthorPanel = mod.closeAuthorPanel;
    return mod;
  }

  beforeEach(setupModule);

  // --- clickable author elements ---
  test('message-author element has author-name-btn class for cursor/hover styling', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.message-author').classList.contains('author-name-btn')).toBe(true);
  });

  test('avatar element has author-avatar-btn class for cursor styling', () => {
    const msgWithPhoto = { ...baseMsg, id: 'ap-photo', photoURL: 'https://example.com/a.jpg' };
    const card = createMessageCard(msgWithPhoto, null);
    expect(card.querySelector('.message-avatar').classList.contains('author-avatar-btn')).toBe(true);
  });

  test('avatar fallback element has author-avatar-btn class', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.avatar-fallback').classList.contains('author-avatar-btn')).toBe(true);
  });

  test('reply card author does NOT have author-name-btn class', () => {
    const { createReplyCard } = require('../public/app.js');
    const reply = { id: 'r1', author: 'Alice', text: 'Hi', timestamp: Date.now(), authorId: 'uid-alice' };
    const card = createReplyCard(reply, null, 'msg1');
    expect(card.querySelector('.reply-author').classList.contains('author-name-btn')).toBe(false);
  });

  // --- openAuthorPanel / closeAuthorPanel ---
  test('openAuthorPanel shows the backdrop and panel', async () => {
    const { dbRef } = makeFirebaseMock();
    // The global firebase mock's dbRef.once already returns empty snapshot
    await openAuthorPanel('uid-alice', 'Alice', null);

    expect(document.getElementById('author-panel-backdrop').style.display).not.toBe('none');
    expect(document.getElementById('author-panel').style.display).not.toBe('none');
  });

  test('openAuthorPanel sets author name via textContent (XSS safe)', async () => {
    await openAuthorPanel('uid-alice', '<script>alert(1)</script>', null);

    const nameEl = document.getElementById('author-panel-name');
    expect(nameEl.textContent).toBe('<script>alert(1)</script>');
    expect(nameEl.innerHTML).not.toContain('<script>');
  });

  test('openAuthorPanel adds author-panel--open class to panel', async () => {
    await openAuthorPanel('uid-alice', 'Alice', null);
    expect(document.getElementById('author-panel').classList.contains('author-panel--open')).toBe(true);
  });

  test('openAuthorPanel adds author-panel-backdrop--visible class to backdrop', async () => {
    await openAuthorPanel('uid-alice', 'Alice', null);
    expect(document.getElementById('author-panel-backdrop').classList.contains('author-panel-backdrop--visible')).toBe(true);
  });

  test('closeAuthorPanel removes open classes', async () => {
    jest.useFakeTimers();
    await openAuthorPanel('uid-alice', 'Alice', null);
    closeAuthorPanel();

    expect(document.getElementById('author-panel').classList.contains('author-panel--open')).toBe(false);
    expect(document.getElementById('author-panel-backdrop').classList.contains('author-panel-backdrop--visible')).toBe(false);
    jest.useRealTimers();
  });

  test('closeAuthorPanel hides elements after animation timeout', async () => {
    jest.useFakeTimers();
    await openAuthorPanel('uid-alice', 'Alice', null);
    closeAuthorPanel();
    jest.advanceTimersByTime(300);

    expect(document.getElementById('author-panel').style.display).toBe('none');
    expect(document.getElementById('author-panel-backdrop').style.display).toBe('none');
    jest.useRealTimers();
  });

  test('close button click closes the panel', async () => {
    jest.useFakeTimers();
    await openAuthorPanel('uid-alice', 'Alice', null);
    document.getElementById('author-panel-close').click();

    expect(document.getElementById('author-panel').classList.contains('author-panel--open')).toBe(false);
    jest.useRealTimers();
  });

  test('backdrop click closes the panel', async () => {
    jest.useFakeTimers();
    await openAuthorPanel('uid-alice', 'Alice', null);
    document.getElementById('author-panel-backdrop').click();

    expect(document.getElementById('author-panel').classList.contains('author-panel--open')).toBe(false);
    jest.useRealTimers();
  });

  test('Escape keydown closes the panel', async () => {
    jest.useFakeTimers();
    await openAuthorPanel('uid-alice', 'Alice', null);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(document.getElementById('author-panel').classList.contains('author-panel--open')).toBe(false);
    jest.useRealTimers();
  });

  test('non-Escape keydown does not close the panel', async () => {
    jest.useFakeTimers();
    await openAuthorPanel('uid-alice', 'Alice', null);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(document.getElementById('author-panel').classList.contains('author-panel--open')).toBe(true);
    jest.useRealTimers();
  });

  // --- message list rendering ---
  test('openAuthorPanel shows empty state when author has no messages in 24h window', async () => {
    // The default firebase mock returns an empty snapshot via once()
    await openAuthorPanel('uid-alice', 'Alice', null);

    const body = document.getElementById('author-panel-body');
    expect(body.querySelector('.author-panel-empty')).not.toBeNull();
    expect(body.querySelector('.author-panel-empty').textContent)
      .toBe('No messages from this author in the last 24 hours.');
  });

  test('openAuthorPanel shows "0 messages today" subtitle when no messages', async () => {
    await openAuthorPanel('uid-alice', 'Alice', null);
    expect(document.getElementById('author-panel-subtitle').textContent).toBe('0 messages today');
  });

  test('openAuthorPanel renders message previews for messages in 24h window', async () => {
    const now = Date.now();
    const { firebase: fb, authInstance: ai, dbRef: dr } = makeFirebaseMock();
    ai.onAuthStateChanged.mockImplementation(() => {});
    dr.once.mockResolvedValue({
      exists: () => true,
      forEach: fn => {
        fn({ key: 'msg-a', val: () => ({ author: 'Alice', authorId: 'uid-alice', text: 'Hello', timestamp: now - 1000 }) });
        fn({ key: 'msg-b', val: () => ({ author: 'Alice', authorId: 'uid-alice', text: 'World', timestamp: now - 2000 }) });
      },
    });
    global.firebase = fb;
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { openAuthorPanel: oap } = require('../public/app.js');
    await oap('uid-alice', 'Alice', null);

    const previews = document.getElementById('author-panel-body').querySelectorAll('.author-msg-preview');
    expect(previews.length).toBe(2);
  });

  test('openAuthorPanel shows "1 message today" subtitle (singular)', async () => {
    const now = Date.now();
    const { firebase: fb, authInstance: ai, dbRef: dr } = makeFirebaseMock();
    ai.onAuthStateChanged.mockImplementation(() => {});
    dr.once.mockResolvedValue({
      exists: () => true,
      forEach: fn => {
        fn({ key: 'msg-a', val: () => ({ author: 'Alice', authorId: 'uid-alice', text: 'Hi', timestamp: now - 1000 }) });
      },
    });
    global.firebase = fb;
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { openAuthorPanel: oap } = require('../public/app.js');
    await oap('uid-alice', 'Alice', null);

    expect(document.getElementById('author-panel-subtitle').textContent).toBe('1 message today');
  });

  test('message preview text is truncated at 80 chars and uses textContent (XSS safe)', async () => {
    const now = Date.now();
    const longText = '<script>evil()</script>' + 'x'.repeat(100);
    const { firebase: fb, authInstance: ai, dbRef: dr } = makeFirebaseMock();
    ai.onAuthStateChanged.mockImplementation(() => {});
    dr.once.mockResolvedValue({
      exists: () => true,
      forEach: fn => {
        fn({ key: 'msg-xss', val: () => ({ author: 'Alice', authorId: 'uid-alice', text: longText, timestamp: now - 1000 }) });
      },
    });
    global.firebase = fb;
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { openAuthorPanel: oap } = require('../public/app.js');
    await oap('uid-alice', 'Alice', null);

    const textEl = document.querySelector('.author-msg-text');
    expect(textEl).not.toBeNull();
    expect(textEl.innerHTML).not.toContain('<script>');
    expect(textEl.textContent.length).toBeLessThanOrEqual(81); // 80 chars + ellipsis
  });

  test('messages outside 24h window are filtered out', async () => {
    const now = Date.now();
    const old = now - 25 * 60 * 60 * 1000; // 25 hours ago
    const { firebase: fb, authInstance: ai, dbRef: dr } = makeFirebaseMock();
    ai.onAuthStateChanged.mockImplementation(() => {});
    dr.once.mockResolvedValue({
      exists: () => true,
      forEach: fn => {
        fn({ key: 'msg-old', val: () => ({ author: 'Alice', authorId: 'uid-alice', text: 'Old', timestamp: old }) });
        fn({ key: 'msg-new', val: () => ({ author: 'Alice', authorId: 'uid-alice', text: 'New', timestamp: now - 1000 }) });
      },
    });
    global.firebase = fb;
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { openAuthorPanel: oap } = require('../public/app.js');
    await oap('uid-alice', 'Alice', null);

    const previews = document.getElementById('author-panel-body').querySelectorAll('.author-msg-preview');
    expect(previews.length).toBe(1);
    expect(document.querySelector('.author-msg-text').textContent).toBe('New');
  });

  test('clicking message preview closes panel and highlights matching card', async () => {
    jest.useFakeTimers();
    const now = Date.now();
    const { firebase: fb, authInstance: ai, dbRef: dr } = makeFirebaseMock();
    ai.onAuthStateChanged.mockImplementation(() => {});
    dr.once.mockResolvedValue({
      exists: () => true,
      forEach: fn => {
        fn({ key: 'ap-msg1', val: () => ({ author: 'Alice', authorId: 'uid-alice', text: 'Hello', timestamp: now - 1000 }) });
      },
    });
    global.firebase = fb;
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { openAuthorPanel: oap } = require('../public/app.js');

    // Add the target card to DOM
    const targetCard = document.createElement('div');
    targetCard.id = 'msg-ap-msg1';
    targetCard.scrollIntoView = jest.fn();
    document.getElementById('messages-container').appendChild(targetCard);

    await oap('uid-alice', 'Alice', null);

    const preview = document.querySelector('.author-msg-preview');
    expect(preview).not.toBeNull();
    preview.click();

    expect(document.getElementById('author-panel').classList.contains('author-panel--open')).toBe(false);
    expect(targetCard.classList.contains('permalink-highlight')).toBe(true);
    expect(targetCard.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    jest.useRealTimers();
  });
});

// --- bio feature ---
describe('bio feature', () => {
  let authStateCallback;
  let mocks;

  function setupBioGlobals(fbMocks) {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.validateBio = utils.validateBio;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.firebase = fbMocks.firebase;
  }

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

    setupBioGlobals(mocks);
    require('../public/app.js');
  });

  function signIn(user = { uid: 'uid-me', displayName: 'Me', photoURL: '' }) {
    authStateCallback(user);
  }

  // --- bio render path in author panel ---
  test('bio is hidden when author has no bio set', async () => {
    const { openAuthorPanel: oap } = require('../public/app.js');
    await oap('uid-alice', 'Alice', null);

    const bioEl = document.getElementById('author-panel-bio');
    expect(bioEl.style.display).toBe('none');
  });

  test('bio is displayed when author has a bio', async () => {
    let callCount = 0;
    mocks.dbRef.once.mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 1) {
        // messages snapshot — no messages
        return Promise.resolve({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });
      }
      // profile snapshot with bio
      return Promise.resolve({
        exists: () => true,
        val: () => ({ bio: 'Developer from NYC' }),
        forEach: jest.fn(),
      });
    });
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    const mocks2 = makeFirebaseMock();
    mocks2.authInstance.onAuthStateChanged.mockImplementation(() => {});
    mocks2.dbRef.once.mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 1) {
        return Promise.resolve({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });
      }
      return Promise.resolve({ exists: () => true, val: () => ({ bio: 'Developer from NYC' }), forEach: jest.fn() });
    });
    setupBioGlobals(mocks2);
    const { openAuthorPanel: oap } = require('../public/app.js');
    callCount = 0;

    await oap('uid-alice', 'Alice', null);

    const bioEl = document.getElementById('author-panel-bio');
    expect(bioEl.style.display).not.toBe('none');
    expect(bioEl.textContent).toBe('Developer from NYC');
  });

  test('bio uses textContent (XSS safe)', async () => {
    let callCount = 0;
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    const mocks3 = makeFirebaseMock();
    mocks3.authInstance.onAuthStateChanged.mockImplementation(() => {});
    mocks3.dbRef.once.mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 1) {
        return Promise.resolve({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });
      }
      return Promise.resolve({
        exists: () => true,
        val: () => ({ bio: '<script>evil()</script>' }),
        forEach: jest.fn(),
      });
    });
    setupBioGlobals(mocks3);
    const { openAuthorPanel: oap } = require('../public/app.js');

    await oap('uid-alice', 'Alice', null);

    const bioEl = document.getElementById('author-panel-bio');
    expect(bioEl.innerHTML).not.toContain('<script>');
    expect(bioEl.textContent).toBe('<script>evil()</script>');
  });

  test('bio area is hidden when bio is empty string in profile', async () => {
    let callCount = 0;
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    const mocks4 = makeFirebaseMock();
    mocks4.authInstance.onAuthStateChanged.mockImplementation(() => {});
    mocks4.dbRef.once.mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 1) {
        return Promise.resolve({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });
      }
      return Promise.resolve({ exists: () => true, val: () => ({ bio: '' }), forEach: jest.fn() });
    });
    setupBioGlobals(mocks4);
    const { openAuthorPanel: oap } = require('../public/app.js');

    await oap('uid-alice', 'Alice', null);

    const bioEl = document.getElementById('author-panel-bio');
    expect(bioEl.style.display).toBe('none');
  });

  // --- openBioEditor: save success ---
  test('saving a valid bio calls db.ref().update() and shows toast', async () => {
    signIn();
    await Promise.resolve();
    await Promise.resolve();

    const { openBioEditor } = require('../public/app.js');
    openBioEditor();

    const input = document.querySelector('.bio-input');
    expect(input).not.toBeNull();
    input.value = 'Hello world bio';
    document.querySelector('.btn-bio-save').click();

    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.dbRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ bio: 'Hello world bio' })
    );
    expect(document.querySelector('.bio-edit-wrapper')).toBeNull();
    expect(document.querySelector('.permalink-toast')).not.toBeNull();
    expect(document.querySelector('.permalink-toast').textContent).toBe('Bio saved');
  });

  // --- openBioEditor: validation error ---
  test('saving a bio over 150 characters shows error without Firebase write', async () => {
    signIn();
    await Promise.resolve();
    await Promise.resolve();

    const { openBioEditor } = require('../public/app.js');
    openBioEditor();
    document.querySelector('.bio-input').value = 'A'.repeat(151);
    document.querySelector('.btn-bio-save').click();

    expect(document.querySelector('.bio-error').textContent).toBeTruthy();
    expect(mocks.dbRef.update).not.toHaveBeenCalled();
  });

  // --- openBioEditor: Firebase write error ---
  test('Firebase write error on bio save shows inline error', async () => {
    mocks.dbRef.update.mockRejectedValue(new Error('Firebase error'));
    signIn();
    await Promise.resolve();
    await Promise.resolve();

    const { openBioEditor } = require('../public/app.js');
    openBioEditor();
    document.querySelector('.bio-input').value = 'Valid bio text';
    document.querySelector('.btn-bio-save').click();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector('.bio-error').textContent).toBeTruthy();
    expect(document.querySelector('.bio-edit-wrapper')).not.toBeNull();
  });

  // --- openBioEditor: clear bio ---
  test('clearing bio (empty input) calls db.ref().remove()', async () => {
    signIn();
    await Promise.resolve();
    await Promise.resolve();

    const { openBioEditor } = require('../public/app.js');
    openBioEditor();
    document.querySelector('.bio-input').value = '';
    document.querySelector('.btn-bio-save').click();

    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.dbRef.remove).toHaveBeenCalled();
  });

  // --- openBioEditor: Escape key dismisses editor ---
  test('Escape key dismisses bio editor', async () => {
    signIn();
    await Promise.resolve();
    await Promise.resolve();

    const { openBioEditor } = require('../public/app.js');
    openBioEditor();
    expect(document.querySelector('.bio-edit-wrapper')).not.toBeNull();

    document.querySelector('.bio-input').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );

    expect(document.querySelector('.bio-edit-wrapper')).toBeNull();
  });

  // --- openBioEditor: Cancel button dismisses editor ---
  test('Cancel button dismisses bio editor without Firebase write', async () => {
    signIn();
    await Promise.resolve();
    await Promise.resolve();

    const { openBioEditor } = require('../public/app.js');
    openBioEditor();
    document.querySelector('.btn-bio-cancel').click();

    expect(document.querySelector('.bio-edit-wrapper')).toBeNull();
    expect(mocks.dbRef.update).not.toHaveBeenCalled();
  });
});

// --- sort comparators ---
describe('sort comparators (getSortComparator)', () => {
  let getSortComparator;

  function makeCardEl(timestamp, replyCount) {
    const el = document.createElement('div');
    el.className = 'message-card';
    el.dataset.timestamp = String(timestamp);
    el.dataset.replyCount = String(replyCount);
    return el;
  }

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ getSortComparator } = require('../public/app.js'));
  });

  test('newest comparator sorts higher timestamps first', () => {
    const cmp = getSortComparator('newest');
    const a = makeCardEl(1000, 0);
    const b = makeCardEl(2000, 0);
    expect(cmp(a, b)).toBeGreaterThan(0);
    expect(cmp(b, a)).toBeLessThan(0);
    expect(cmp(a, a)).toBe(0);
  });

  test('oldest comparator sorts lower timestamps first', () => {
    const cmp = getSortComparator('oldest');
    const a = makeCardEl(1000, 0);
    const b = makeCardEl(2000, 0);
    expect(cmp(a, b)).toBeLessThan(0);
    expect(cmp(b, a)).toBeGreaterThan(0);
    expect(cmp(a, a)).toBe(0);
  });

  test('active comparator sorts by descending reply count', () => {
    const cmp = getSortComparator('active');
    const a = makeCardEl(1000, 5);
    const b = makeCardEl(2000, 3);
    expect(cmp(a, b)).toBeLessThan(0);
    expect(cmp(b, a)).toBeGreaterThan(0);
  });

  test('active comparator uses descending timestamp as tie-breaker when reply counts are equal', () => {
    const cmp = getSortComparator('active');
    const a = makeCardEl(1000, 5);
    const b = makeCardEl(2000, 5);
    expect(cmp(a, b)).toBeGreaterThan(0);
    expect(cmp(b, a)).toBeLessThan(0);
  });

  test('active comparator returns 0 for identical timestamp and reply count', () => {
    const cmp = getSortComparator('active');
    const a = makeCardEl(1000, 5);
    const b = makeCardEl(1000, 5);
    expect(cmp(a, b)).toBe(0);
  });

  test('unknown sort value defaults to newest (descending timestamp)', () => {
    const cmp = getSortComparator('unknown');
    const a = makeCardEl(1000, 0);
    const b = makeCardEl(2000, 0);
    expect(cmp(a, b)).toBeGreaterThan(0);
    expect(cmp(b, a)).toBeLessThan(0);
  });

  test('newest comparator returns 0 for equal timestamps', () => {
    const cmp = getSortComparator('newest');
    const a = makeCardEl(1500, 0);
    const b = makeCardEl(1500, 0);
    expect(cmp(a, b)).toBe(0);
  });

  test('oldest comparator returns 0 for equal timestamps', () => {
    const cmp = getSortComparator('oldest');
    const a = makeCardEl(1500, 0);
    const b = makeCardEl(1500, 0);
    expect(cmp(a, b)).toBe(0);
  });
});

// --- Mute feature ---
describe('mute feature', () => {
  let createMessageCard;
  let loadMuted, saveMuted, isMuted, addMuted, removeMuted, updateMutedChip, refreshMutedPanel, filterMessages;

  const baseMsg = {
    id: 'mute-msg1',
    author: 'Bob',
    text: 'Hello there',
    timestamp: Date.now(),
    authorId: 'uid-bob',
    photoURL: null,
  };

  function setupModule() {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    localStorage.clear();

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    const mod = require('../public/app.js');
    createMessageCard = mod.createMessageCard;
    loadMuted = mod.loadMuted;
    saveMuted = mod.saveMuted;
    isMuted = mod.isMuted;
    addMuted = mod.addMuted;
    removeMuted = mod.removeMuted;
    updateMutedChip = mod.updateMutedChip;
    refreshMutedPanel = mod.refreshMutedPanel;
    filterMessages = mod.filterMessages;
  }

  beforeEach(setupModule);

  // --- localStorage helpers ---
  test('loadMuted returns empty array when localStorage is empty', () => {
    expect(loadMuted()).toEqual([]);
  });

  test('addMuted persists UID to localStorage', () => {
    addMuted('uid-bob');
    expect(loadMuted()).toContain('uid-bob');
  });

  test('isMuted returns true for a muted UID', () => {
    addMuted('uid-bob');
    expect(isMuted('uid-bob')).toBe(true);
  });

  test('isMuted returns false for an unmuted UID', () => {
    expect(isMuted('uid-bob')).toBe(false);
  });

  test('isMuted returns false for null/undefined uid', () => {
    expect(isMuted(null)).toBe(false);
    expect(isMuted(undefined)).toBe(false);
    expect(isMuted('')).toBe(false);
  });

  test('removeMuted removes UID from localStorage', () => {
    addMuted('uid-bob');
    removeMuted('uid-bob');
    expect(isMuted('uid-bob')).toBe(false);
  });

  test('addMuted returns true when adding a new UID', () => {
    expect(addMuted('uid-bob')).toBe(true);
  });

  test('addMuted returns true without duplicating when UID already present', () => {
    addMuted('uid-bob');
    const result = addMuted('uid-bob');
    expect(result).toBe(true);
    expect(loadMuted().filter(id => id === 'uid-bob')).toHaveLength(1);
  });

  test('addMuted shows toast and returns false when mute limit (50) is reached', () => {
    const existing = Array.from({ length: 50 }, (_, i) => 'uid-fill-' + i);
    localStorage.setItem('guestbook_muted', JSON.stringify(existing));

    const toastSpy = jest.spyOn(document.body, 'appendChild');
    const result = addMuted('uid-new');
    expect(result).toBe(false);
    expect(loadMuted()).toHaveLength(50);
    toastSpy.mockRestore();
  });

  // --- createMessageCard integration ---
  test('createMessageCard sets data-author-id attribute', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.dataset.authorId).toBe('uid-bob');
  });

  test('createMessageCard hides card when author is muted', () => {
    addMuted('uid-bob');
    const card = createMessageCard(baseMsg, null);
    expect(card.style.display).toBe('none');
  });

  test('createMessageCard does not hide card when author is not muted', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.style.display).not.toBe('none');
  });

  // --- updateMutedChip ---
  test('updateMutedChip hides chip when no muted authors', () => {
    updateMutedChip();
    expect(document.getElementById('muted-badge').style.display).toBe('none');
  });

  test('updateMutedChip shows chip when at least one author is muted', () => {
    addMuted('uid-bob');
    updateMutedChip();
    expect(document.getElementById('muted-badge').style.display).not.toBe('none');
  });

  test('updateMutedChip shows correct count in chip text', () => {
    addMuted('uid-bob');
    addMuted('uid-alice');
    updateMutedChip();
    expect(document.getElementById('muted-badge').textContent).toContain('2');
  });

  test('updateMutedChip hides muted panel when count drops to zero', () => {
    addMuted('uid-bob');
    updateMutedChip();
    removeMuted('uid-bob');
    updateMutedChip();
    const panel = document.getElementById('muted-panel');
    expect(panel.style.display).toBe('none');
  });

  // --- filterMessages integration ---
  test('filterMessages does not reveal muted author cards during search', () => {
    addMuted('uid-bob');
    const card = createMessageCard(baseMsg, null);
    card.style.display = 'none'; // simulate hidden muted card
    document.getElementById('messages-container').insertBefore(card, document.getElementById('loading-state'));

    document.getElementById('search-input').value = 'Hello';
    filterMessages();

    expect(card.style.display).toBe('none');
  });

  test('filterMessages restores non-muted cards when search is cleared', () => {
    const card = createMessageCard(baseMsg, null);
    card.style.display = 'none'; // simulate hidden by search
    document.getElementById('messages-container').insertBefore(card, document.getElementById('loading-state'));

    document.getElementById('search-input').value = '';
    filterMessages();

    expect(card.style.display).toBe('');
  });
});

// --- keyword mute feature ---
describe('keyword mute feature', () => {
  let createMessageCard;
  let loadMutedWords, saveMutedWords, isMutedByKeyword, addMutedWord, removeMutedWord;
  let updateMutedWordsBadge, refreshMutedWordsPanel, filterMessages;

  const baseMsg = {
    id: 'kw-msg1',
    author: 'Alice',
    text: 'I love talking about crypto coins',
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
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    const mod = require('../public/app.js');
    createMessageCard = mod.createMessageCard;
    loadMutedWords = mod.loadMutedWords;
    saveMutedWords = mod.saveMutedWords;
    isMutedByKeyword = mod.isMutedByKeyword;
    addMutedWord = mod.addMutedWord;
    removeMutedWord = mod.removeMutedWord;
    updateMutedWordsBadge = mod.updateMutedWordsBadge;
    refreshMutedWordsPanel = mod.refreshMutedWordsPanel;
    filterMessages = mod.filterMessages;
  }

  beforeEach(setupModule);

  // --- localStorage helpers ---
  test('loadMutedWords returns empty array when localStorage is empty', () => {
    expect(loadMutedWords()).toEqual([]);
  });

  test('addMutedWord persists word to localStorage', () => {
    addMutedWord('crypto');
    expect(loadMutedWords()).toContain('crypto');
  });

  test('addMutedWord returns "added" for a new word', () => {
    expect(addMutedWord('crypto')).toBe('added');
  });

  test('addMutedWord returns "duplicate" (case-insensitive) and does not add again', () => {
    addMutedWord('Crypto');
    const result = addMutedWord('crypto');
    expect(result).toBe('duplicate');
    expect(loadMutedWords()).toHaveLength(1);
  });

  test('addMutedWord returns "toolong" for words exceeding 50 characters', () => {
    const long = 'a'.repeat(51);
    expect(addMutedWord(long)).toBe('toolong');
    expect(loadMutedWords()).toHaveLength(0);
  });

  test('addMutedWord returns "limit" when 50 words are already muted', () => {
    const existing = Array.from({ length: 50 }, (_, i) => 'word' + i);
    localStorage.setItem('guestbook_muted_words', JSON.stringify(existing));
    expect(addMutedWord('newword')).toBe('limit');
    expect(loadMutedWords()).toHaveLength(50);
  });

  test('addMutedWord returns "empty" for blank input', () => {
    expect(addMutedWord('   ')).toBe('empty');
    expect(loadMutedWords()).toHaveLength(0);
  });

  test('removeMutedWord removes the word from localStorage (case-insensitive)', () => {
    addMutedWord('crypto');
    removeMutedWord('CRYPTO');
    expect(loadMutedWords()).not.toContain('crypto');
  });

  // --- isMutedByKeyword ---
  test('isMutedByKeyword returns true when text contains muted keyword (case-insensitive)', () => {
    addMutedWord('crypto');
    expect(isMutedByKeyword('I love CRYPTO coins')).toBe(true);
  });

  test('isMutedByKeyword returns false when text does not contain any muted keyword', () => {
    addMutedWord('crypto');
    expect(isMutedByKeyword('hello world')).toBe(false);
  });

  test('isMutedByKeyword matches substring', () => {
    addMutedWord('pol');
    expect(isMutedByKeyword('I dislike politics')).toBe(true);
  });

  test('isMutedByKeyword matches multi-word phrase as contiguous substring', () => {
    addMutedWord('good morning');
    expect(isMutedByKeyword('good morning everyone')).toBe(true);
    expect(isMutedByKeyword('good evening')).toBe(false);
  });

  test('isMutedByKeyword returns false for empty text', () => {
    addMutedWord('crypto');
    expect(isMutedByKeyword('')).toBe(false);
    expect(isMutedByKeyword(null)).toBe(false);
  });

  test('isMutedByKeyword returns false when no keywords are muted', () => {
    expect(isMutedByKeyword('any text here')).toBe(false);
  });

  // --- createMessageCard integration ---
  test('createMessageCard hides card when message text contains muted keyword', () => {
    addMutedWord('crypto');
    const card = createMessageCard(baseMsg, null);
    expect(card.style.display).toBe('none');
  });

  test('createMessageCard does not hide card when message text does not match muted keywords', () => {
    addMutedWord('politics');
    const card = createMessageCard(baseMsg, null);
    expect(card.style.display).not.toBe('none');
  });

  // --- updateMutedWordsBadge ---
  test('updateMutedWordsBadge hides badge when no muted words', () => {
    updateMutedWordsBadge();
    expect(document.getElementById('muted-words-badge').style.display).toBe('none');
  });

  test('updateMutedWordsBadge shows badge when at least one word is muted', () => {
    addMutedWord('crypto');
    updateMutedWordsBadge();
    expect(document.getElementById('muted-words-badge').style.display).not.toBe('none');
  });

  test('updateMutedWordsBadge shows correct count in badge text', () => {
    addMutedWord('crypto');
    addMutedWord('politics');
    updateMutedWordsBadge();
    expect(document.getElementById('muted-words-badge').textContent).toContain('2');
  });

  test('updateMutedWordsBadge hides muted-words panel when count drops to zero', () => {
    addMutedWord('crypto');
    updateMutedWordsBadge();
    removeMutedWord('crypto');
    updateMutedWordsBadge();
    const panel = document.getElementById('muted-words-panel');
    expect(panel.style.display).toBe('none');
  });

  // --- filterMessages integration ---
  test('filterMessages hides cards whose message-text contains a muted keyword', () => {
    addMutedWord('crypto');
    const card = createMessageCard(baseMsg, null);
    card.style.display = ''; // simulate visible card
    document.getElementById('messages-container').insertBefore(card, document.getElementById('loading-state'));

    document.getElementById('search-input').value = '';
    filterMessages();

    expect(card.style.display).toBe('none');
  });

  test('filterMessages does not reveal keyword-muted cards during search', () => {
    addMutedWord('crypto');
    const card = createMessageCard(baseMsg, null);
    card.style.display = 'none';
    document.getElementById('messages-container').insertBefore(card, document.getElementById('loading-state'));

    document.getElementById('search-input').value = 'crypto';
    filterMessages();

    expect(card.style.display).toBe('none');
  });

  test('filterMessages restores non-keyword-muted cards when search is cleared', () => {
    const card = createMessageCard({ ...baseMsg, text: 'hello world' }, null);
    card.style.display = 'none'; // simulate hidden by search
    document.getElementById('messages-container').insertBefore(card, document.getElementById('loading-state'));

    document.getElementById('search-input').value = '';
    filterMessages();

    expect(card.style.display).toBe('');
  });
});

// --- renderTrendingHashtags ---
describe('renderTrendingHashtags', () => {
  let renderTrendingHashtags;
  let filterMessages;

  function setupModule() {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    localStorage.clear();

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    const mod = require('../public/app.js');
    renderTrendingHashtags = mod.renderTrendingHashtags;
    filterMessages = mod.filterMessages;
  }

  function addHashtag(tag) {
    const span = document.createElement('span');
    span.className = 'hashtag';
    span.textContent = tag;
    document.getElementById('messages-container').appendChild(span);
  }

  beforeEach(setupModule);

  test('section is hidden when fewer than 2 distinct hashtags exist', () => {
    addHashtag('#coffee');
    renderTrendingHashtags();
    expect(document.getElementById('trending-section').style.display).toBe('none');
  });

  test('section is hidden when no hashtags exist', () => {
    renderTrendingHashtags();
    expect(document.getElementById('trending-section').style.display).toBe('none');
  });

  test('section is visible when 2 or more distinct hashtags exist', () => {
    addHashtag('#coffee');
    addHashtag('#tea');
    renderTrendingHashtags();
    expect(document.getElementById('trending-section').style.display).not.toBe('none');
  });

  test('shows top 5 hashtags at most', () => {
    ['#a', '#b', '#c', '#d', '#e', '#f'].forEach(t => addHashtag(t));
    renderTrendingHashtags();
    const chips = document.querySelectorAll('.trending-chip');
    expect(chips.length).toBe(5);
  });

  test('ranks chips by descending count', () => {
    addHashtag('#rare');
    addHashtag('#popular');
    addHashtag('#popular');
    addHashtag('#popular');
    renderTrendingHashtags();
    const chips = document.querySelectorAll('.trending-chip');
    expect(chips[0].querySelector('span').textContent).toBe('#popular');
    expect(chips[1].querySelector('span').textContent).toBe('#rare');
  });

  test('breaks ties alphabetically', () => {
    addHashtag('#beta');
    addHashtag('#alpha');
    renderTrendingHashtags();
    const chips = document.querySelectorAll('.trending-chip');
    expect(chips[0].querySelector('span').textContent).toBe('#alpha');
    expect(chips[1].querySelector('span').textContent).toBe('#beta');
  });

  test('chip displays tag name and count', () => {
    addHashtag('#coffee');
    addHashtag('#coffee');
    addHashtag('#tea');
    renderTrendingHashtags();
    const chips = document.querySelectorAll('.trending-chip');
    const coffeeChip = Array.from(chips).find(c => c.querySelector('span').textContent === '#coffee');
    expect(coffeeChip).not.toBeNull();
    expect(coffeeChip.textContent).toContain('\xD7 2');
  });

  test('chip has correct aria-label', () => {
    addHashtag('#coffee');
    addHashtag('#coffee');
    addHashtag('#tea');
    renderTrendingHashtags();
    const chips = document.querySelectorAll('.trending-chip');
    const coffeeChip = Array.from(chips).find(c => c.querySelector('span').textContent === '#coffee');
    expect(coffeeChip.getAttribute('aria-label')).toBe('Filter by #coffee (2 messages)');
  });

  test('chips are rendered as button elements', () => {
    addHashtag('#coding');
    addHashtag('#music');
    renderTrendingHashtags();
    const chips = document.querySelectorAll('.trending-chip');
    chips.forEach(chip => expect(chip.tagName).toBe('BUTTON'));
  });

  test('section is hidden when search is active', () => {
    addHashtag('#coffee');
    addHashtag('#tea');
    document.getElementById('search-input').value = '#coffee';
    renderTrendingHashtags();
    expect(document.getElementById('trending-section').style.display).toBe('none');
  });

  test('filterMessages hides trending section when search query is set', () => {
    addHashtag('#coffee');
    addHashtag('#tea');
    renderTrendingHashtags(); // show it first
    expect(document.getElementById('trending-section').style.display).not.toBe('none');

    document.getElementById('search-input').value = '#coffee';
    filterMessages();
    expect(document.getElementById('trending-section').style.display).toBe('none');
  });

  test('clicking a chip sets searchInput value to that hashtag', () => {
    addHashtag('#coffee');
    addHashtag('#tea');
    renderTrendingHashtags();

    const chips = document.querySelectorAll('.trending-chip');
    const coffeeChip = Array.from(chips).find(c => c.querySelector('span').textContent === '#coffee');
    coffeeChip.click();

    expect(document.getElementById('search-input').value).toBe('#coffee');
  });

  test('clicking a chip hides the trending section (search becomes active)', () => {
    addHashtag('#coffee');
    addHashtag('#tea');
    renderTrendingHashtags();

    const chips = document.querySelectorAll('.trending-chip');
    const coffeeChip = Array.from(chips).find(c => c.querySelector('span').textContent === '#coffee');
    coffeeChip.click();

    expect(document.getElementById('trending-section').style.display).toBe('none');
  });
});

// --- Thread Follow feature ---
describe('thread follow — subscription localStorage helpers', () => {
  let loadSubscriptions, saveSubscriptions, isSubscribed, addSubscription, removeSubscription, pruneExpiredSubscriptions;

  function setupModule() {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    localStorage.clear();

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    const mod = require('../public/app.js');
    loadSubscriptions = mod.loadSubscriptions;
    saveSubscriptions = mod.saveSubscriptions;
    isSubscribed = mod.isSubscribed;
    addSubscription = mod.addSubscription;
    removeSubscription = mod.removeSubscription;
    pruneExpiredSubscriptions = mod.pruneExpiredSubscriptions;
  }

  beforeEach(setupModule);

  test('loadSubscriptions returns empty array when localStorage is empty', () => {
    expect(loadSubscriptions()).toEqual([]);
  });

  test('addSubscription adds msgId to localStorage', () => {
    addSubscription('msg-abc');
    expect(loadSubscriptions()).toContain('msg-abc');
  });

  test('isSubscribed returns true after addSubscription', () => {
    addSubscription('msg-abc');
    expect(isSubscribed('msg-abc')).toBe(true);
  });

  test('isSubscribed returns false for unknown msgId', () => {
    expect(isSubscribed('msg-unknown')).toBe(false);
  });

  test('removeSubscription removes msgId from localStorage', () => {
    addSubscription('msg-abc');
    removeSubscription('msg-abc');
    expect(isSubscribed('msg-abc')).toBe(false);
  });

  test('addSubscription is idempotent (does not duplicate)', () => {
    addSubscription('msg-abc');
    addSubscription('msg-abc');
    expect(loadSubscriptions()).toHaveLength(1);
  });

  test('cap at 50 entries — oldest entry evicted when limit is reached', () => {
    for (let i = 0; i < 50; i++) addSubscription('msg-' + i);
    expect(loadSubscriptions()).toHaveLength(50);
    expect(loadSubscriptions()[0]).toBe('msg-0');

    addSubscription('msg-50');
    const list = loadSubscriptions();
    expect(list).toHaveLength(50);
    expect(list).not.toContain('msg-0'); // oldest evicted
    expect(list).toContain('msg-50');
  });

  test('pruneExpiredSubscriptions removes IDs not in DOM', () => {
    addSubscription('msg-exists');
    addSubscription('msg-missing');

    const card = document.createElement('div');
    card.id = 'msg-msg-exists';
    document.getElementById('messages-container').appendChild(card);

    pruneExpiredSubscriptions();

    expect(isSubscribed('msg-exists')).toBe(true);
    expect(isSubscribed('msg-missing')).toBe(false);
  });

  test('pruneExpiredSubscriptions keeps all when all IDs are in DOM', () => {
    addSubscription('msg-a');
    addSubscription('msg-b');

    ['msg-a', 'msg-b'].forEach(id => {
      const el = document.createElement('div');
      el.id = 'msg-' + id;
      document.getElementById('messages-container').appendChild(el);
    });

    pruneExpiredSubscriptions();
    expect(loadSubscriptions()).toHaveLength(2);
  });

  test('pruneExpiredSubscriptions no-ops when list is empty', () => {
    expect(() => pruneExpiredSubscriptions()).not.toThrow();
    expect(loadSubscriptions()).toEqual([]);
  });
});

describe('thread follow — follow button in createMessageCard', () => {
  let createMessageCard;

  const baseMsg = {
    id: 'follow-msg-1',
    author: 'Alice',
    text: 'Hello world',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  function setupModule() {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    localStorage.clear();

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    authInstance.onAuthStateChanged.mockImplementation(() => {});
    global.firebase = firebase;

    ({ createMessageCard } = require('../public/app.js'));
  }

  beforeEach(setupModule);

  test('follow button is not present when user is null (unauthenticated)', () => {
    const card = createMessageCard(baseMsg, null);
    expect(card.querySelector('.btn-follow')).toBeNull();
  });

  test('follow button is not present for the original message author', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-alice' });
    expect(card.querySelector('.btn-follow')).toBeNull();
  });

  test('follow button is present for authenticated non-author', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-follow')).not.toBeNull();
  });

  test('follow button has aria-label "Follow thread" when not subscribed', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-follow').getAttribute('aria-label')).toBe('Follow thread');
  });

  test('follow button has aria-label "Unfollow thread" when already subscribed', () => {
    localStorage.setItem('guestbook_subscriptions', JSON.stringify([baseMsg.id]));
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-follow').getAttribute('aria-label')).toBe('Unfollow thread');
  });

  test('follow button has btn-follow--active class when pre-subscribed', () => {
    localStorage.setItem('guestbook_subscriptions', JSON.stringify([baseMsg.id]));
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    expect(card.querySelector('.btn-follow').classList.contains('btn-follow--active')).toBe(true);
  });

  test('clicking follow button adds subscription to localStorage', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    card.querySelector('.btn-follow').click();
    const list = JSON.parse(localStorage.getItem('guestbook_subscriptions') || '[]');
    expect(list).toContain(baseMsg.id);
  });

  test('clicking follow button toggles to active state (aria-label + class)', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    const btn = card.querySelector('.btn-follow');
    btn.click();
    expect(btn.getAttribute('aria-label')).toBe('Unfollow thread');
    expect(btn.classList.contains('btn-follow--active')).toBe(true);
  });

  test('clicking follow button again unsubscribes (toggle off)', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    const btn = card.querySelector('.btn-follow');
    btn.click(); // follow
    btn.click(); // unfollow
    const list = JSON.parse(localStorage.getItem('guestbook_subscriptions') || '[]');
    expect(list).not.toContain(baseMsg.id);
    expect(btn.getAttribute('aria-label')).toBe('Follow thread');
    expect(btn.classList.contains('btn-follow--active')).toBe(false);
  });

  test('follow button appears in card-footer', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    const footer = card.querySelector('.card-footer');
    expect(footer.querySelector('.btn-follow')).not.toBeNull();
  });

  test('follow button appears after reply button in the footer', () => {
    const card = createMessageCard(baseMsg, { uid: 'uid-bob' });
    const footer = card.querySelector('.card-footer');
    const children = Array.from(footer.children);
    const replyIdx = children.findIndex(el => el.classList.contains('btn-reply'));
    const followIdx = children.findIndex(el => el.classList.contains('btn-follow'));
    expect(replyIdx).toBeGreaterThanOrEqual(0);
    expect(followIdx).toBeGreaterThan(replyIdx);
  });
});

describe('thread follow — auto-subscribe on reply post', () => {
  let createMessageCard;
  let authStateCallback;
  let mocks;

  const baseMsg = {
    id: 'auto-sub-msg-1',
    author: 'Alice',
    text: 'Hello world',
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  function setupModule() {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    localStorage.clear();

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.firebase = mocks.firebase;

    ({ createMessageCard } = require('../public/app.js'));
  }

  beforeEach(setupModule);

  test('auto-subscribes when non-author posts a reply', async () => {
    authStateCallback({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    const card = createMessageCard(baseMsg, { uid: 'uid-bob', displayName: 'Bob' });
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Nice message!';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    const list = JSON.parse(localStorage.getItem('guestbook_subscriptions') || '[]');
    expect(list).toContain(baseMsg.id);
  });

  test('does NOT auto-subscribe when original author replies to own message', async () => {
    authStateCallback({ uid: 'uid-alice', displayName: 'Alice', photoURL: '' });
    const card = createMessageCard(baseMsg, { uid: 'uid-alice', displayName: 'Alice' });
    // author's card has no follow button, but they can still reply
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Own reply';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    const list = JSON.parse(localStorage.getItem('guestbook_subscriptions') || '[]');
    expect(list).not.toContain(baseMsg.id);
  });

  test('auto-subscribe updates follow button to active state', async () => {
    authStateCallback({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    const card = createMessageCard(baseMsg, { uid: 'uid-bob', displayName: 'Bob' });
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Nice!';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    const followBtn = card.querySelector('.btn-follow');
    expect(followBtn.classList.contains('btn-follow--active')).toBe(true);
    expect(followBtn.getAttribute('aria-label')).toBe('Unfollow thread');
  });

  test('shows toast "You\'re now following this thread." on auto-subscribe', async () => {
    authStateCallback({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    const card = createMessageCard(baseMsg, { uid: 'uid-bob', displayName: 'Bob' });
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Nice!';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    const toast = document.querySelector('.permalink-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe("You're now following this thread.");
  });

  test('does NOT show toast or re-subscribe when already subscribed before reply', async () => {
    localStorage.setItem('guestbook_subscriptions', JSON.stringify([baseMsg.id]));
    authStateCallback({ uid: 'uid-bob', displayName: 'Bob', photoURL: '' });
    const card = createMessageCard(baseMsg, { uid: 'uid-bob', displayName: 'Bob' });
    card.querySelector('.btn-reply').click();
    card.querySelector('.reply-textarea').value = 'Already following!';
    card.querySelector('.btn-reply-post').click();

    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector('.permalink-toast')).toBeNull();
    const list = JSON.parse(localStorage.getItem('guestbook_subscriptions') || '[]');
    expect(list.filter(id => id === baseMsg.id)).toHaveLength(1);
  });
});

describe('thread follow — maybeFireSubscriptionNotification', () => {
  let maybeFireSubscriptionNotification;
  let authStateCallback;
  let mocks;

  const currentUserMock = { uid: 'uid-me', displayName: 'Me', photoURL: '' };

  const otherMsg = {
    id: 'sub-notif-msg-1',
    author: 'Alice',
    text: 'Hello',
    timestamp: 1000,
    authorId: 'uid-alice',
  };

  const incomingReply = {
    id: 'r1',
    author: 'Bob',
    text: 'Great thread!',
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
    localStorage.clear();
    delete global.Notification;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.firebase = mocks.firebase;

    ({ maybeFireSubscriptionNotification } = require('../public/app.js'));
    authStateCallback(currentUserMock);
    setVisibility('hidden');
    localStorage.setItem('guestbook_subscriptions', JSON.stringify([otherMsg.id]));
  });

  afterEach(() => {
    delete global.Notification;
    setVisibility('visible');
  });

  test('does not throw when Notification API is unavailable', () => {
    addCard(otherMsg.id);
    expect(() => maybeFireSubscriptionNotification(otherMsg, incomingReply)).not.toThrow();
  });

  test('fires notification for subscribed thread when all conditions are met', () => {
    const Ctor = mockNotificationCtor('granted');
    addCard(otherMsg.id);
    maybeFireSubscriptionNotification(otherMsg, incomingReply);
    expect(Ctor).toHaveBeenCalledTimes(1);
  });

  test('notification title is "{replierName} replied in a thread you\'re following"', () => {
    mockNotificationCtor('granted');
    addCard(otherMsg.id);
    maybeFireSubscriptionNotification(otherMsg, incomingReply);
    expect(global.Notification.mock.calls[0][0]).toBe('Bob replied in a thread you\'re following');
  });

  test('notification body is the reply snippet', () => {
    mockNotificationCtor('granted');
    addCard(otherMsg.id);
    maybeFireSubscriptionNotification(otherMsg, incomingReply);
    expect(global.Notification.mock.calls[0][1].body).toBe('Great thread!');
  });

  test('notification body is truncated to 80 chars with ellipsis when reply is long', () => {
    mockNotificationCtor('granted');
    addCard(otherMsg.id);
    const longReply = { ...incomingReply, text: 'A'.repeat(100) };
    maybeFireSubscriptionNotification(otherMsg, longReply);
    const body = global.Notification.mock.calls[0][1].body;
    expect(body).toBe('A'.repeat(80) + '…');
  });

  test('notification icon is /icon.png', () => {
    mockNotificationCtor('granted');
    addCard(otherMsg.id);
    maybeFireSubscriptionNotification(otherMsg, incomingReply);
    expect(global.Notification.mock.calls[0][1].icon).toBe('/icon.png');
  });

  test('does NOT fire when message is not subscribed', () => {
    const Ctor = mockNotificationCtor('granted');
    addCard(otherMsg.id);
    localStorage.setItem('guestbook_subscriptions', JSON.stringify([]));
    maybeFireSubscriptionNotification(otherMsg, incomingReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does NOT fire when replier is the current user (self-reply)', () => {
    const Ctor = mockNotificationCtor('granted');
    addCard(otherMsg.id);
    const selfReply = { ...incomingReply, authorId: 'uid-me' };
    maybeFireSubscriptionNotification(otherMsg, selfReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does NOT fire when tab is visible', () => {
    const Ctor = mockNotificationCtor('granted');
    setVisibility('visible');
    addCard(otherMsg.id);
    maybeFireSubscriptionNotification(otherMsg, incomingReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does NOT fire when permission is "denied"', () => {
    const Ctor = mockNotificationCtor('denied');
    addCard(otherMsg.id);
    maybeFireSubscriptionNotification(otherMsg, incomingReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does NOT fire when permission is "default"', () => {
    const Ctor = mockNotificationCtor('default');
    addCard(otherMsg.id);
    maybeFireSubscriptionNotification(otherMsg, incomingReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('does NOT fire when message card is not in the DOM', () => {
    const Ctor = mockNotificationCtor('granted');
    maybeFireSubscriptionNotification(otherMsg, incomingReply);
    expect(Ctor).not.toHaveBeenCalled();
  });

  test('clicking notification calls window.focus() and scrolls to parent message', () => {
    const Ctor = mockNotificationCtor('granted');
    const card = addCard(otherMsg.id);
    card.scrollIntoView = jest.fn();
    const focusSpy = jest.spyOn(window, 'focus').mockImplementation(() => {});

    maybeFireSubscriptionNotification(otherMsg, incomingReply);

    const notifInstance = Ctor.instances[0];
    const clickArgs = notifInstance.addEventListener.mock.calls.find(c => c[0] === 'click');
    expect(clickArgs).toBeDefined();
    clickArgs[1]();

    expect(focusSpy).toHaveBeenCalled();
    expect(card.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

    focusSpy.mockRestore();
  });
});

// ============================================================
// Poll feature
// ============================================================
describe('poll — createMessageCard renders poll card', () => {
  let createMessageCard;

  const pollMsg = {
    id: 'poll1',
    type: 'poll',
    author: 'Alice',
    text: 'What is your favorite color?',
    poll: { options: { '0': 'Red', '1': 'Blue', '2': 'Green' } },
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ createMessageCard } = require('../public/app.js'));
  });

  test('renders poll-card-badge with Poll text', () => {
    const card = createMessageCard(pollMsg, null);
    const badge = card.querySelector('.poll-card-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('Poll');
  });

  test('renders .poll-body with one button per option', () => {
    const card = createMessageCard(pollMsg, null);
    const btns = card.querySelectorAll('.poll-option-btn');
    expect(btns.length).toBe(3);
  });

  test('each poll option button shows correct label via textContent', () => {
    const card = createMessageCard(pollMsg, null);
    const labels = Array.from(card.querySelectorAll('.poll-option-label')).map(el => el.textContent);
    expect(labels).toContain('Red');
    expect(labels).toContain('Blue');
    expect(labels).toContain('Green');
  });

  test('option label text is set via textContent so the DOM never parses it as HTML (XSS safe)', () => {
    const xssPollMsg = {
      ...pollMsg,
      id: 'poll-xss',
      poll: { options: { '0': '<b>bold</b>', '1': 'Safe' } },
    };
    const card = createMessageCard(xssPollMsg, null);
    // The label element must not contain any child HTML elements (textContent only)
    const labels = card.querySelectorAll('.poll-option-label');
    expect(labels[0].children.length).toBe(0);
    expect(labels[0].textContent).toBe('<b>bold</b>');
    // No <b> element should appear inside the label
    expect(labels[0].querySelector('b')).toBeNull();
  });

  test('does NOT render edit button for poll messages (no editing after votes)', () => {
    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(pollMsg, ownUser);
    expect(card.querySelector('.btn-edit')).toBeNull();
  });

  test('renders delete button for own poll message', () => {
    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(pollMsg, ownUser);
    expect(card.querySelector('.btn-delete')).not.toBeNull();
  });

  test('options are disabled for unauthenticated visitors', () => {
    const card = createMessageCard(pollMsg, null);
    const btns = card.querySelectorAll('.poll-option-btn');
    btns.forEach(btn => expect(btn.disabled).toBe(true));
  });

  test('shows sign-in hint for unauthenticated visitors', () => {
    const card = createMessageCard(pollMsg, null);
    const hint = card.querySelector('.poll-signin-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toContain('Sign in');
  });

  test('options are enabled for authenticated users who have not voted', () => {
    const card = createMessageCard({ ...pollMsg, id: 'poll-auth' }, { uid: 'uid-bob' });
    const btns = card.querySelectorAll('.poll-option-btn');
    btns.forEach(btn => expect(btn.disabled).toBe(false));
  });

  test('renders the question text in .message-text', () => {
    const card = createMessageCard(pollMsg, null);
    const textEl = card.querySelector('.message-text');
    expect(textEl).not.toBeNull();
    expect(textEl.textContent).toContain('What is your favorite color?');
  });

  test('does not render .poll-body for non-poll messages', () => {
    const regularMsg = { id: 'msg-r1', author: 'Alice', text: 'Hello', timestamp: Date.now(), authorId: 'uid-alice' };
    const card = createMessageCard(regularMsg, null);
    expect(card.querySelector('.poll-body')).toBeNull();
  });
});

describe('poll — post form creates poll payload', () => {
  let mocks;
  let authStateCallback;

  function loadUtils() {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.fetchCountryData = jest.fn().mockResolvedValue(null);
    global.countryCodeToFlag = utils.countryCodeToFlag;
  }

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation(cb => { authStateCallback = cb; });
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 });

    loadUtils();
    global.firebase = mocks.firebase;
    require('../public/app.js');
  });

  function simulateSignIn(user) {
    authStateCallback(user || { uid: 'uid-test', displayName: 'Tester', photoURL: '' });
  }

  function activatePollMode() {
    document.getElementById('poll-toggle-btn').click();
  }

  test('clicking poll toggle button shows poll-composer and hides text-composer', () => {
    simulateSignIn();
    activatePollMode();
    expect(document.getElementById('poll-composer').style.display).not.toBe('none');
    expect(document.getElementById('text-composer').style.display).toBe('none');
  });

  test('clicking poll toggle again restores text-composer', () => {
    simulateSignIn();
    activatePollMode();
    document.getElementById('poll-toggle-btn').click();
    expect(document.getElementById('text-composer').style.display).not.toBe('none');
    expect(document.getElementById('poll-composer').style.display).toBe('none');
  });

  test('poll toggle sets aria-pressed="true" when active', () => {
    simulateSignIn();
    activatePollMode();
    expect(document.getElementById('poll-toggle-btn').getAttribute('aria-pressed')).toBe('true');
  });

  test('poll submit shows error when question is empty', async () => {
    simulateSignIn();
    activatePollMode();
    const optInputs = document.querySelectorAll('.poll-option-input');
    if (optInputs[0]) optInputs[0].value = 'Option A';
    if (optInputs[1]) optInputs[1].value = 'Option B';

    document.getElementById('post-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(document.getElementById('empty-error-msg').style.display).toBe('block');
    expect(mocks.dbRef.update).not.toHaveBeenCalled();
  });

  test('poll submit shows error when fewer than 2 options filled', async () => {
    simulateSignIn();
    activatePollMode();
    document.getElementById('poll-question-input').value = 'Best language?';

    document.getElementById('post-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(document.getElementById('empty-error-msg').style.display).toBe('block');
    expect(mocks.dbRef.update).not.toHaveBeenCalled();
  });

  test('valid poll submits correct Firebase payload', async () => {
    simulateSignIn({ uid: 'uid-test', displayName: 'Tester', photoURL: '' });
    activatePollMode();
    document.getElementById('poll-question-input').value = 'Favorite language?';
    const optInputs = document.querySelectorAll('.poll-option-input');
    if (optInputs[0]) optInputs[0].value = 'Python';
    if (optInputs[1]) optInputs[1].value = 'JavaScript';

    document.getElementById('post-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.dbRef.update).toHaveBeenCalledTimes(1);
    const updateArg = mocks.dbRef.update.mock.calls[0][0];
    const msgEntry = Object.values(updateArg).find(v => v && v.type === 'poll');
    expect(msgEntry).toBeDefined();
    expect(msgEntry.type).toBe('poll');
    expect(msgEntry.text).toBe('Favorite language?');
    expect(msgEntry.poll).toBeDefined();
    expect(Object.values(msgEntry.poll.options)).toContain('Python');
    expect(Object.values(msgEntry.poll.options)).toContain('JavaScript');
  });

  test('successful poll submit switches back to text mode', async () => {
    simulateSignIn();
    activatePollMode();
    document.getElementById('poll-question-input').value = 'Best city?';
    const optInputs = document.querySelectorAll('.poll-option-input');
    if (optInputs[0]) optInputs[0].value = 'NYC';
    if (optInputs[1]) optInputs[1].value = 'London';

    document.getElementById('post-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(document.getElementById('text-composer').style.display).not.toBe('none');
    expect(document.getElementById('poll-composer').style.display).toBe('none');
  });
});

describe('poll — vote casting and already-voted guard', () => {
  let createMessageCard;
  let mocks;

  const pollMsg = {
    id: 'vote-poll-1',
    type: 'poll',
    author: 'Alice',
    text: 'Pick one',
    poll: { options: { '0': 'Yes', '1': 'No' } },
    timestamp: Date.now(),
    authorId: 'uid-alice',
  };

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    mocks = makeFirebaseMock();
    mocks.dbRef.set = jest.fn().mockResolvedValue(undefined);
    mocks.authInstance.onAuthStateChanged.mockImplementation(() => {});

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.firebase = mocks.firebase;

    ({ createMessageCard } = require('../public/app.js'));
  });

  test('clicking a poll option calls db.ref().set() with the option index', async () => {
    const user = { uid: 'uid-voter', displayName: 'Voter' };
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn() });

    const card = createMessageCard({ ...pollMsg }, user);
    document.body.appendChild(card);

    const btns = card.querySelectorAll('.poll-option-btn');
    btns[0].click();

    await Promise.resolve();
    await Promise.resolve();

    const setCalls = mocks.dbRef.set ? mocks.dbRef.set.mock.calls : [];
    expect(setCalls.some(call => call[0] === 0)).toBe(true);

    document.body.removeChild(card);
  });

  test('clicking a poll option disables all option buttons (already-voted guard)', async () => {
    const user = { uid: 'uid-voter2', displayName: 'Voter2' };
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn() });

    const card = createMessageCard({ ...pollMsg, id: 'vote-poll-2' }, user);
    document.body.appendChild(card);

    const btns = card.querySelectorAll('.poll-option-btn');
    btns[1].click();

    btns.forEach(btn => expect(btn.disabled).toBe(true));

    document.body.removeChild(card);
  });

  test('voted option gets poll-option-btn--voted class', async () => {
    const user = { uid: 'uid-voter3', displayName: 'Voter3' };
    mocks.dbRef.once.mockResolvedValue({ exists: () => false, forEach: jest.fn() });

    const card = createMessageCard({ ...pollMsg, id: 'vote-poll-3' }, user);
    document.body.appendChild(card);

    const btns = card.querySelectorAll('.poll-option-btn');
    btns[0].click();

    expect(btns[0].classList.contains('poll-option-btn--voted')).toBe(true);

    document.body.removeChild(card);
  });

  test('options are disabled from start when user already voted (pre-existing vote)', async () => {
    const user = { uid: 'uid-prev-voter', displayName: 'PrevVoter' };

    const votesSnap = {
      exists: () => true,
      forEach: jest.fn(),
      child: (uid) => uid === user.uid
        ? { exists: () => true, val: () => 0 }
        : { exists: () => false, val: () => null },
    };
    mocks.dbRef.on.mockImplementation((event, cb) => {
      if (event === 'value') cb(votesSnap);
      return 'listener-token';
    });

    const card = createMessageCard({ ...pollMsg, id: 'vote-poll-4' }, user);
    document.body.appendChild(card);

    const btns = card.querySelectorAll('.poll-option-btn');
    btns.forEach(btn => expect(btn.disabled).toBe(true));

    document.body.removeChild(card);
  });
});

describe('poll — validatePoll', () => {
  let validatePoll;

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ validatePoll } = require('../public/app.js'));
  });

  function setQuestion(val) {
    const q = document.getElementById('poll-question-input');
    if (q) q.value = val;
  }

  function setOptions(values) {
    const container = document.getElementById('poll-options-container');
    if (!container) return;
    container.innerHTML = '';
    values.forEach(v => {
      const row = document.createElement('div');
      row.className = 'poll-option-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'poll-option-input';
      input.value = v;
      row.appendChild(input);
      container.appendChild(row);
    });
  }

  test('returns null when question is empty', () => {
    setQuestion('');
    setOptions(['Yes', 'No']);
    expect(validatePoll()).toBeNull();
  });

  test('returns null when fewer than 2 options are filled', () => {
    setQuestion('A question?');
    setOptions(['Only one', '']);
    expect(validatePoll()).toBeNull();
  });

  test('returns question and options when valid', () => {
    setQuestion('Best fruit?');
    setOptions(['Apple', 'Banana']);
    const result = validatePoll();
    expect(result).not.toBeNull();
    expect(result.question).toBe('Best fruit?');
    expect(result.options).toContain('Apple');
    expect(result.options).toContain('Banana');
  });

  test('returns null when question exceeds 120 chars', () => {
    setQuestion('Q'.repeat(121));
    setOptions(['A', 'B']);
    expect(validatePoll()).toBeNull();
  });

  test('returns null when an option exceeds 60 chars', () => {
    setQuestion('Short question?');
    setOptions(['A'.repeat(61), 'B']);
    expect(validatePoll()).toBeNull();
  });

  test('filters out blank options when at least 2 are filled', () => {
    setQuestion('Choose?');
    setOptions(['Alpha', 'Beta', '']);
    const result = validatePoll();
    expect(result).not.toBeNull();
    expect(result.options.length).toBe(2);
    expect(result.options).not.toContain('');
  });
});

describe('gif — isGifUrlAllowed', () => {
  let isGifUrlAllowed;

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ isGifUrlAllowed } = require('../public/app.js'));
  });

  test('allows media.tenor.com URLs', () => {
    expect(isGifUrlAllowed('https://media.tenor.com/abc/file.gif')).toBe(true);
  });

  test('rejects non-tenor domains', () => {
    expect(isGifUrlAllowed('https://media.giphy.com/abc.gif')).toBe(false);
    expect(isGifUrlAllowed('https://example.com/evil.gif')).toBe(false);
    expect(isGifUrlAllowed('https://evil.media.tenor.com.bad.com/file.gif')).toBe(false);
  });

  test('rejects malformed URLs', () => {
    expect(isGifUrlAllowed('not-a-url')).toBe(false);
    expect(isGifUrlAllowed('')).toBe(false);
  });
});

describe('gif — createMessageCard renders gif card', () => {
  let createMessageCard;

  const gifMsg = {
    id: 'gif1',
    type: 'gif',
    author: 'Bob',
    text: 'funny cat gif',
    gifUrl: 'https://media.tenor.com/abc/cat.gif',
    gifPreviewUrl: 'https://media.tenor.com/abc/cat-tiny.gif',
    gifAlt: 'Funny cat dancing',
    timestamp: Date.now(),
    authorId: 'uid-bob',
  };

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ createMessageCard } = require('../public/app.js'));
  });

  test('renders gif-card-badge with GIF text', () => {
    const card = createMessageCard(gifMsg, null);
    const badge = card.querySelector('.gif-card-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('GIF');
  });

  test('renders .gif-message-img with correct src', () => {
    const card = createMessageCard(gifMsg, null);
    const img = card.querySelector('.gif-message-img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe(gifMsg.gifUrl);
  });

  test('sets alt attribute from gifAlt field', () => {
    const card = createMessageCard(gifMsg, null);
    const img = card.querySelector('.gif-message-img');
    expect(img.getAttribute('alt')).toBe('Funny cat dancing');
  });

  test('falls back to "GIF" when gifAlt is empty', () => {
    const msg = { ...gifMsg, id: 'gif-noalt', gifAlt: '' };
    const card = createMessageCard(msg, null);
    const img = card.querySelector('.gif-message-img');
    expect(img.getAttribute('alt')).toBe('GIF');
  });

  test('does NOT render gif img for non-tenor gifUrl (security)', () => {
    const msg = { ...gifMsg, id: 'gif-bad', gifUrl: 'https://evil.com/bad.gif' };
    const card = createMessageCard(msg, null);
    expect(card.querySelector('.gif-message-img')).toBeNull();
  });

  test('does NOT render edit button for gif messages', () => {
    const ownUser = { uid: 'uid-bob' };
    const card = createMessageCard(gifMsg, ownUser);
    expect(card.querySelector('.btn-edit')).toBeNull();
  });

  test('renders delete button for own gif message', () => {
    const ownUser = { uid: 'uid-bob' };
    const card = createMessageCard(gifMsg, ownUser);
    expect(card.querySelector('.btn-delete')).not.toBeNull();
  });

  test('does not render .poll-body for gif messages', () => {
    const card = createMessageCard(gifMsg, null);
    expect(card.querySelector('.poll-body')).toBeNull();
  });

  test('message-text element is empty for gif messages', () => {
    const card = createMessageCard(gifMsg, null);
    const textEl = card.querySelector('.message-text');
    expect(textEl).not.toBeNull();
    expect(textEl.textContent.trim()).toBe('');
  });
});

// ========================================
// Image Attachment — validateImageFile
// ========================================
describe('image — validateImageFile', () => {
  let validateImageFile;

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ validateImageFile } = require('../public/app.js'));
  });

  test('rejects null (no file)', () => {
    const result = validateImageFile(null);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/no file/i);
  });

  test('rejects unsupported MIME type (gif)', () => {
    const file = { type: 'image/gif', size: 1000 };
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/jpeg|png|webp/i);
  });

  test('rejects files over 5 MB', () => {
    const file = { type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 };
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/5 mb/i);
  });

  test('accepts valid JPEG within size limit', () => {
    const file = { type: 'image/jpeg', size: 1024 * 100 };
    expect(validateImageFile(file).valid).toBe(true);
  });

  test('accepts valid PNG within size limit', () => {
    const file = { type: 'image/png', size: 1024 * 200 };
    expect(validateImageFile(file).valid).toBe(true);
  });

  test('accepts valid WebP within size limit', () => {
    const file = { type: 'image/webp', size: 1024 * 50 };
    expect(validateImageFile(file).valid).toBe(true);
  });

  test('accepts exactly 5 MB', () => {
    const file = { type: 'image/png', size: 5 * 1024 * 1024 };
    expect(validateImageFile(file).valid).toBe(true);
  });
});

// ========================================
// Image Attachment — generateImageAlt
// ========================================
describe('image — generateImageAlt', () => {
  let generateImageAlt;

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ generateImageAlt } = require('../public/app.js'));
  });

  test('includes the display name', () => {
    expect(generateImageAlt('Alice')).toBe('Image posted by Alice');
  });

  test('falls back to Anonymous when displayName is empty string', () => {
    expect(generateImageAlt('')).toBe('Image posted by Anonymous');
  });

  test('falls back to Anonymous when displayName is null', () => {
    expect(generateImageAlt(null)).toBe('Image posted by Anonymous');
  });
});

// ========================================
// Image Attachment — createMessageCard renders image card
// ========================================
describe('image — createMessageCard renders image card', () => {
  let createMessageCard;

  const imageMsg = {
    id: 'img1',
    type: 'image',
    author: 'Carol',
    text: 'Image posted by Carol',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/proj/o/file.jpg?alt=media',
    imageAlt: 'Image posted by Carol',
    timestamp: Date.now(),
    authorId: 'uid-carol',
  };

  beforeAll(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    ({ createMessageCard } = require('../public/app.js'));
  });

  test('renders .image-message-img element', () => {
    const card = createMessageCard(imageMsg, null);
    expect(card.querySelector('.image-message-img')).not.toBeNull();
  });

  test('sets src from imageUrl via DOM property (XSS-safe)', () => {
    const card = createMessageCard(imageMsg, null);
    const img = card.querySelector('.image-message-img');
    expect(img.src).toContain('firebasestorage.googleapis.com');
  });

  test('sets alt from imageAlt via DOM property', () => {
    const card = createMessageCard(imageMsg, null);
    const img = card.querySelector('.image-message-img');
    expect(img.alt).toBe('Image posted by Carol');
  });

  test('falls back to "Image" when imageAlt is empty', () => {
    const msg = { ...imageMsg, id: 'img-noalt', imageAlt: '' };
    const card = createMessageCard(msg, null);
    const img = card.querySelector('.image-message-img');
    expect(img.alt).toBe('Image');
  });

  test('message-text element is empty for image messages', () => {
    const card = createMessageCard(imageMsg, null);
    const textEl = card.querySelector('.message-text');
    expect(textEl).not.toBeNull();
    expect(textEl.textContent.trim()).toBe('');
  });

  test('does not render edit button for image messages', () => {
    const ownUser = { uid: 'uid-carol' };
    const card = createMessageCard(imageMsg, ownUser);
    expect(card.querySelector('.btn-edit')).toBeNull();
  });

  test('renders delete button for own image message', () => {
    const ownUser = { uid: 'uid-carol' };
    const card = createMessageCard(imageMsg, ownUser);
    expect(card.querySelector('.btn-delete')).not.toBeNull();
  });

  test('does not render .gif-message-img for image messages', () => {
    const card = createMessageCard(imageMsg, null);
    expect(card.querySelector('.gif-message-img')).toBeNull();
  });
});

// ========================================
// Daily Writing Prompt
// ========================================
describe('Daily Writing Prompt', () => {
  let getPromptDayIndex, getPromptForDay, isPromptDismissed, dismissPrompt,
      createPromptCard, hidePromptCard, maybeShowPromptCard, initPromptCard, PROMPTS;

  beforeAll(() => {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.validateBio = utils.validateBio || (() => ({ valid: true, text: '' }));
    global.validateWebsiteURL = utils.validateWebsiteURL || (() => ({ valid: false }));
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.countryCodeToFlag = utils.countryCodeToFlag;
    global.wrapSelection = utils.wrapSelection || (() => {});
    global.updateEditCounter = utils.updateEditCounter || (() => {});
    global.fetchCountryData = utils.fetchCountryData || (() => Promise.resolve(null));

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    document.body.innerHTML = APP_HTML;
    jest.resetModules();
    ({ getPromptDayIndex, getPromptForDay, isPromptDismissed, dismissPrompt,
       createPromptCard, hidePromptCard, maybeShowPromptCard, initPromptCard, PROMPTS }
      = require('../public/app.js'));
  });

  beforeEach(() => {
    localStorage.clear();
  });

  test('PROMPTS has at least 30 unique entries', () => {
    expect(PROMPTS.length).toBeGreaterThanOrEqual(30);
    const unique = new Set(PROMPTS);
    expect(unique.size).toBe(PROMPTS.length);
  });

  test('all prompt strings are non-empty', () => {
    PROMPTS.forEach(p => expect(typeof p).toBe('string'));
    PROMPTS.forEach(p => expect(p.trim().length).toBeGreaterThan(0));
  });

  test('getPromptForDay returns a string from PROMPTS', () => {
    const prompt = getPromptForDay(0);
    expect(PROMPTS).toContain(prompt);
  });

  test('getPromptForDay is deterministic for the same day index', () => {
    const a = getPromptForDay(42);
    const b = getPromptForDay(42);
    expect(a).toBe(b);
  });

  test('getPromptForDay cycles via modulo — index 0 equals index PROMPTS.length', () => {
    expect(getPromptForDay(0)).toBe(getPromptForDay(PROMPTS.length));
  });

  test('isPromptDismissed returns false when key is absent', () => {
    expect(isPromptDismissed(999)).toBe(false);
  });

  test('isPromptDismissed returns true after dismissPrompt is called', () => {
    dismissPrompt(7);
    expect(isPromptDismissed(7)).toBe(true);
  });

  test('dismissPrompt for one day does not affect another day', () => {
    dismissPrompt(10);
    expect(isPromptDismissed(11)).toBe(false);
  });

  test('createPromptCard returns element with class prompt-card', () => {
    const card = createPromptCard();
    expect(card.className).toBe('prompt-card');
    expect(card.id).toBe('prompt-card');
  });

  test('createPromptCard has a dismiss button with aria-label', () => {
    const card = createPromptCard();
    const btn = card.querySelector('.prompt-card-dismiss');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Dismiss prompt');
    expect(btn.textContent).toBe('✕');
  });

  test('createPromptCard has a .prompt-text paragraph set via textContent', () => {
    const card = createPromptCard();
    const p = card.querySelector('.prompt-text');
    expect(p).not.toBeNull();
    expect(p.textContent.trim().length).toBeGreaterThan(0);
    expect(PROMPTS).toContain(p.textContent);
  });

  test('createPromptCard prompt text does not contain HTML tags (XSS safe)', () => {
    const card = createPromptCard();
    const p = card.querySelector('.prompt-text');
    expect(p.innerHTML).not.toMatch(/<[a-z]/i);
  });

  test('createPromptCard has a start-writing button', () => {
    const card = createPromptCard();
    const btn = card.querySelector('.prompt-card-start-btn');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Start writing');
  });

  test('createPromptCard has a label with lightbulb emoji', () => {
    const card = createPromptCard();
    const label = card.querySelector('.prompt-card-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('💡');
  });

  test('hidePromptCard sets display:none on the card', () => {
    // initPromptCard sets the module-level promptCardEl and inserts the card into DOM
    initPromptCard();
    const card = document.getElementById('prompt-card');
    expect(card).not.toBeNull();
    card.style.display = '';
    hidePromptCard();
    expect(document.getElementById('prompt-card').style.display).toBe('none');
  });
});

// ========================================
// Custom Profile Avatar — handleAvatarUpload
// ========================================
describe('avatar — handleAvatarUpload', () => {
  let mocks, authStateCallback, handleAvatarUpload;

  const AVATAR_HTML = [
    '<div id="user-avatar-wrap">',
    '<button id="avatar-upload-btn"></button>',
    '<input type="file" id="avatar-file-input" style="display:none;" />',
    '<button id="remove-avatar-btn" style="display:none;"></button>',
    '</div>',
  ].join('');

  function setupGlobals() {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.validateBio = utils.validateBio || (() => ({ valid: true, text: '' }));
    global.validateWebsiteURL = utils.validateWebsiteURL || (() => ({ valid: false }));
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.countryCodeToFlag = utils.countryCodeToFlag;
    global.wrapSelection = utils.wrapSelection || (() => {});
    global.fetchCountryData = utils.fetchCountryData || (() => Promise.resolve(null));
  }

  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    document.body.insertAdjacentHTML('beforeend', AVATAR_HTML);

    mocks = makeFirebaseMock();
    mocks.dbRef.set = jest.fn().mockResolvedValue(undefined);
    mocks.authInstance.onAuthStateChanged.mockImplementation((cb) => { authStateCallback = cb; });

    setupGlobals();
    global.firebase = mocks.firebase;

    ({ handleAvatarUpload } = require('../public/app.js'));

    // Sign in as a non-anonymous user; loadUserAlias returns no profile (no existing avatarUrl)
    mocks.dbRef.once
      .mockResolvedValueOnce({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 })
      .mockResolvedValueOnce({ exists: () => false });
    authStateCallback({ uid: 'uid-me', displayName: 'Alice', photoURL: '', isAnonymous: false });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  test('rejects disallowed MIME type (gif) — shows toast, no storage call', async () => {
    await handleAvatarUpload({ type: 'image/gif', size: 100 });

    const toast = document.querySelector('.permalink-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toMatch(/jpeg|png|webp/i);
    expect(mocks.storageRef.put).not.toHaveBeenCalled();
  });

  test('rejects file exceeding 2 MB — shows toast, no storage call', async () => {
    await handleAvatarUpload({ type: 'image/jpeg', size: 2 * 1024 * 1024 + 1 });

    const toast = document.querySelector('.permalink-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toMatch(/2 mb/i);
    expect(mocks.storageRef.put).not.toHaveBeenCalled();
  });

  test('valid file triggers storage.ref().put() and writes download URL to db', async () => {
    const downloadUrl = 'https://example.com/new-avatar.jpg';
    mocks.storageRef.put.mockReturnValue({
      on: jest.fn((evt, onProgress, onError, onComplete) => { onComplete(); }),
      cancel: jest.fn(),
      snapshot: { ref: { getDownloadURL: jest.fn().mockResolvedValue(downloadUrl) } },
    });

    const file = { type: 'image/jpeg', size: 512 };
    await handleAvatarUpload(file);

    expect(mocks.storageRef.put).toHaveBeenCalledWith(file);
    expect(mocks.dbRef.set).toHaveBeenCalledWith(downloadUrl);
  });
});

// ========================================
// Custom Profile Avatar — handleAvatarRemove
// ========================================
describe('avatar — handleAvatarRemove', () => {
  let mocks, authStateCallback, handleAvatarRemove;

  const AVATAR_HTML = [
    '<div id="user-avatar-wrap">',
    '<button id="avatar-upload-btn"></button>',
    '<input type="file" id="avatar-file-input" style="display:none;" />',
    '<button id="remove-avatar-btn" style="display:none;"></button>',
    '</div>',
  ].join('');

  function setupGlobals() {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.validateBio = utils.validateBio || (() => ({ valid: true, text: '' }));
    global.validateWebsiteURL = utils.validateWebsiteURL || (() => ({ valid: false }));
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.countryCodeToFlag = utils.countryCodeToFlag;
    global.wrapSelection = utils.wrapSelection || (() => {});
    global.fetchCountryData = utils.fetchCountryData || (() => Promise.resolve(null));
  }

  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;
    document.body.insertAdjacentHTML('beforeend', AVATAR_HTML);

    mocks = makeFirebaseMock();
    mocks.dbRef.set = jest.fn().mockResolvedValue(undefined);
    mocks.authInstance.onAuthStateChanged.mockImplementation((cb) => { authStateCallback = cb; });

    setupGlobals();
    global.firebase = mocks.firebase;

    ({ handleAvatarRemove } = require('../public/app.js'));

    // Sign in with a profile that has an existing avatarUrl so userAvatarUrl is set
    mocks.dbRef.once
      .mockResolvedValueOnce({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 })
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => ({ avatarUrl: 'https://example.com/old-avatar.jpg' }),
      });
    authStateCallback({
      uid: 'uid-me',
      displayName: 'Alice',
      photoURL: 'https://google.com/g-photo.jpg',
      isAnonymous: false,
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  test('calls storage.ref().delete() and db.ref().remove() on success', async () => {
    mocks.dbRef.remove.mockClear();
    await handleAvatarRemove();

    expect(mocks.storageRef.delete).toHaveBeenCalled();
    expect(mocks.dbRef.remove).toHaveBeenCalled();
  });

  test('swallows storage/object-not-found — still removes DB key, no failure toast', async () => {
    const notFoundErr = Object.assign(new Error('not found'), { code: 'storage/object-not-found' });
    mocks.storageRef.delete.mockRejectedValueOnce(notFoundErr);
    mocks.dbRef.remove.mockClear();

    await handleAvatarRemove();

    expect(mocks.dbRef.remove).toHaveBeenCalled();
    // The not-found error must not surface as a failure toast
    const toasts = Array.from(document.querySelectorAll('.permalink-toast'));
    const failureToast = toasts.find(t => /failed/i.test(t.textContent));
    expect(failureToast).toBeUndefined();
  });

  test('other storage errors surface a failure toast', async () => {
    const storageErr = Object.assign(new Error('network'), { code: 'storage/server-file-wrong-size' });
    mocks.storageRef.delete.mockRejectedValueOnce(storageErr);

    await handleAvatarRemove();

    const toast = document.querySelector('.permalink-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toMatch(/failed/i);
  });
});

// ========================================
// Custom Profile Avatar — refreshAllUserAvatars
// ========================================
describe('avatar — refreshAllUserAvatars', () => {
  let mocks, authStateCallback, refreshAllUserAvatars;

  beforeAll(async () => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    mocks = makeFirebaseMock();
    mocks.authInstance.onAuthStateChanged.mockImplementation((cb) => { authStateCallback = cb; });

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.validateBio = utils.validateBio || (() => ({ valid: true, text: '' }));
    global.validateWebsiteURL = utils.validateWebsiteURL || (() => ({ valid: false }));
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.countryCodeToFlag = utils.countryCodeToFlag;
    global.wrapSelection = utils.wrapSelection || (() => {});
    global.fetchCountryData = utils.fetchCountryData || (() => Promise.resolve(null));
    global.firebase = mocks.firebase;

    ({ refreshAllUserAvatars } = require('../public/app.js'));

    // Sign in as non-anonymous user (no existing avatarUrl needed for this function)
    mocks.dbRef.once
      .mockResolvedValueOnce({ exists: () => false, forEach: jest.fn(), numChildren: () => 0 })
      .mockResolvedValueOnce({ exists: () => false });
    authStateCallback({ uid: 'uid-me', displayName: 'Alice', photoURL: '', isAnonymous: false });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  function addMessageCard(container, { authorId }) {
    const card = document.createElement('div');
    card.className = 'message-card';
    card.setAttribute('data-author-id', authorId);

    const header = document.createElement('div');
    header.className = 'message-header';

    const avatar = document.createElement('img');
    avatar.className = 'message-avatar';
    avatar.src = 'https://example.com/old.jpg';
    header.appendChild(avatar);
    card.appendChild(header);
    container.appendChild(card);
    return card;
  }

  beforeEach(() => {
    const container = document.getElementById('messages-container');
    container.querySelectorAll('.message-card').forEach(c => c.remove());
  });

  test('replaces avatar elements in matching cards', () => {
    const container = document.getElementById('messages-container');
    const ownCard = addMessageCard(container, { authorId: 'uid-me' });

    refreshAllUserAvatars('https://example.com/new-avatar.jpg');

    const header = ownCard.querySelector('.message-header');
    expect(header.querySelector('img[src="https://example.com/old.jpg"]')).toBeNull();
    expect(header.querySelector('.message-avatar, .avatar-fallback')).not.toBeNull();
  });

  test('leaves cards for other users untouched', () => {
    const container = document.getElementById('messages-container');
    addMessageCard(container, { authorId: 'uid-me' });
    const otherCard = addMessageCard(container, { authorId: 'uid-other' });

    refreshAllUserAvatars('https://example.com/new-avatar.jpg');

    const otherAvatar = otherCard.querySelector('.message-header img');
    expect(otherAvatar).not.toBeNull();
    expect(otherAvatar.src).toContain('old.jpg');
  });
});

// --- Voice message feature ---
describe('voice message — createMessageCard for audio type', () => {
  let createMessageCard;

  beforeAll(() => {
    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.countryCodeToFlag = utils.countryCodeToFlag;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    document.body.innerHTML = APP_HTML;
    jest.resetModules();
    ({ createMessageCard } = require('../public/app.js'));
  });

  const audioMsg = {
    id: 'audio-msg-1',
    type: 'audio',
    text: 'Voice message',
    audioUrl: 'https://firebasestorage.googleapis.com/v0/b/proj/o/voice-messages%2Fuid%2F123.webm',
    audioDuration: 15,
    author: 'Alice',
    authorId: 'uid-alice',
    timestamp: Date.now(),
    photoURL: '',
  };

  test('renders audio card with class message-card', () => {
    const card = createMessageCard(audioMsg, null);
    expect(card.className).toBe('message-card');
    expect(card.dataset.type).toBe('audio');
  });

  test('renders voice-card-badge in header', () => {
    const card = createMessageCard(audioMsg, null);
    const badge = card.querySelector('.voice-card-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('Voice');
  });

  test('renders an <audio> element with the audioUrl as src', () => {
    const card = createMessageCard(audioMsg, null);
    const audioEl = card.querySelector('audio.voice-message-player');
    expect(audioEl).not.toBeNull();
    expect(audioEl.src).toBe(audioMsg.audioUrl);
  });

  test('audio player has controls attribute', () => {
    const card = createMessageCard(audioMsg, null);
    const audioEl = card.querySelector('audio.voice-message-player');
    expect(audioEl.controls).toBe(true);
  });

  test('does not render message text body for audio type', () => {
    const card = createMessageCard(audioMsg, null);
    const textEl = card.querySelector('.message-text');
    expect(textEl).not.toBeNull();
    expect(textEl.textContent).toBe('');
  });

  test('does not render edit button for audio message', () => {
    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(audioMsg, ownUser);
    expect(card.querySelector('.btn-edit')).toBeNull();
  });

  test('renders delete button for own audio message', () => {
    const ownUser = { uid: 'uid-alice' };
    const card = createMessageCard(audioMsg, ownUser);
    expect(card.querySelector('.btn-delete')).not.toBeNull();
  });

  test('does not render audio player when audioUrl is absent', () => {
    const msgNoUrl = { ...audioMsg, audioUrl: undefined };
    const card = createMessageCard(msgNoUrl, null);
    expect(card.querySelector('audio.voice-message-player')).toBeNull();
  });
});

describe('voice mode — enableVoiceMode and disableVoiceMode', () => {
  let enableVoiceMode, disableVoiceMode, resetVoiceComposer, voiceFormatDuration;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = APP_HTML;

    const { firebase, authInstance } = makeFirebaseMock();
    global.firebase = firebase;
    authInstance.onAuthStateChanged.mockImplementation(() => {});

    const utils = require('../public/utils');
    global.getEmulatorConfig = utils.getEmulatorConfig;
    global.validateMessage = utils.validateMessage;
    global.validateDisplayName = utils.validateDisplayName;
    global.formatTimestamp = utils.formatTimestamp;
    global.isNearBottom = utils.isNearBottom;
    global.getInitialTheme = utils.getInitialTheme;
    global.parseTextSegments = utils.parseTextSegments;
    global.renderTextWithLinks = utils.renderTextWithLinks;
    global.renderMessageText = utils.renderMessageText;
    global.isNewSinceLastVisit = utils.isNewSinceLastVisit;
    global.countryCodeToFlag = utils.countryCodeToFlag;
    global.fetchCountryData = jest.fn().mockResolvedValue(null);

    ({ enableVoiceMode, disableVoiceMode, resetVoiceComposer, voiceFormatDuration } = require('../public/app.js'));
  });

  test('enableVoiceMode hides text-composer and shows voice-composer', () => {
    enableVoiceMode();
    expect(document.getElementById('text-composer').style.display).toBe('none');
    expect(document.getElementById('voice-composer').style.display).toBe('');
  });

  test('enableVoiceMode sets voice-toggle-btn aria-pressed to true', () => {
    enableVoiceMode();
    expect(document.getElementById('voice-toggle-btn').getAttribute('aria-pressed')).toBe('true');
  });

  test('disableVoiceMode restores text-composer and hides voice-composer', () => {
    enableVoiceMode();
    disableVoiceMode();
    expect(document.getElementById('text-composer').style.display).toBe('');
    expect(document.getElementById('voice-composer').style.display).toBe('none');
  });

  test('disableVoiceMode sets voice-toggle-btn aria-pressed to false', () => {
    enableVoiceMode();
    disableVoiceMode();
    expect(document.getElementById('voice-toggle-btn').getAttribute('aria-pressed')).toBe('false');
  });

  test('voiceFormatDuration formats 0 seconds as 0:00', () => {
    expect(voiceFormatDuration(0)).toBe('0:00');
  });

  test('voiceFormatDuration formats 59 seconds as 0:59', () => {
    expect(voiceFormatDuration(59)).toBe('0:59');
  });

  test('voiceFormatDuration formats 60 seconds as 1:00', () => {
    expect(voiceFormatDuration(60)).toBe('1:00');
  });

  test('voiceFormatDuration formats 65 seconds as 1:05', () => {
    expect(voiceFormatDuration(65)).toBe('1:05');
  });
});

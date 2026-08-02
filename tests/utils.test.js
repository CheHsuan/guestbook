const { validateMessage, formatTimestamp, sanitizeText, getCharCounterState, getEmulatorConfig, isNearBottom, getInitialTheme, parseTextSegments, parseMessageSegments } = require('../public/utils');

// ========================================
// validateMessage
// ========================================
describe('validateMessage', () => {
    test('rejects empty string', () => {
        const result = validateMessage('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Please write a message before posting.');
    });

    test('rejects whitespace-only string', () => {
        const result = validateMessage('   \n\t  ');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Please write a message before posting.');
    });

    test('rejects non-string input (null)', () => {
        const result = validateMessage(null);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Message must be a string.');
    });

    test('rejects non-string input (number)', () => {
        const result = validateMessage(123);
        expect(result.valid).toBe(false);
    });

    test('rejects message over 250 characters', () => {
        const longText = 'A'.repeat(251);
        const result = validateMessage(longText);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Message must be 250 characters or less.');
    });

    test('accepts message at exactly 250 characters', () => {
        const text = 'A'.repeat(250);
        const result = validateMessage(text);
        expect(result.valid).toBe(true);
        expect(result.text).toBe(text);
    });

    test('accepts normal message', () => {
        const result = validateMessage('Hello world!');
        expect(result.valid).toBe(true);
        expect(result.text).toBe('Hello world!');
    });

    test('trims whitespace from valid message', () => {
        const result = validateMessage('  Hello world!  ');
        expect(result.valid).toBe(true);
        expect(result.text).toBe('Hello world!');
    });

    test('accepts message with emoji', () => {
        const result = validateMessage('Hello 🎉🔥');
        expect(result.valid).toBe(true);
    });

    test('accepts message with Chinese characters', () => {
        const result = validateMessage('你好世界');
        expect(result.valid).toBe(true);
    });

    test('accepts message with special characters', () => {
        const result = validateMessage('"quotes" \'single\' & < > / \\ | {} [] ()');
        expect(result.valid).toBe(true);
    });
});

// ========================================
// sanitizeText (XSS prevention)
// ========================================
describe('sanitizeText', () => {
    test('escapes HTML script tags', () => {
        const result = sanitizeText('<script>alert("XSS")</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;script&gt;');
    });

    test('escapes img tag with onerror', () => {
        const result = sanitizeText('<img src=x onerror=alert("hack")>');
        expect(result).not.toContain('<img');
        expect(result).toContain('&lt;img');
    });

    test('escapes bold tags', () => {
        const result = sanitizeText('<b>bold</b>');
        expect(result).toContain('&lt;b&gt;');
    });

    test('preserves normal text', () => {
        const result = sanitizeText('Hello world!');
        expect(result).toBe('Hello world!');
    });

    test('handles empty string', () => {
        expect(sanitizeText('')).toBe('');
    });

    test('handles non-string input', () => {
        expect(sanitizeText(null)).toBe('');
        expect(sanitizeText(undefined)).toBe('');
    });

    test('escapes double quotes', () => {
        const result = sanitizeText('say "hello"');
        expect(result).toContain('&quot;');
    });

    test('escapes ampersands', () => {
        const result = sanitizeText('Tom & Jerry');
        expect(result).toContain('&amp;');
    });
});

// ========================================
// formatTimestamp
// ========================================
describe('formatTimestamp', () => {
    test('returns empty string for null/undefined', () => {
        expect(formatTimestamp(null)).toBe('');
        expect(formatTimestamp(undefined)).toBe('');
        expect(formatTimestamp(0)).toBe('');
    });

    test('formats today timestamp as time only', () => {
        const now = new Date();
        now.setHours(14, 30, 0, 0); // 2:30 PM today
        const result = formatTimestamp(now.getTime());
        // Should contain time but not a month name
        expect(result).toBeTruthy();
        expect(result.length).toBeLessThan(15);
    });

    test('formats yesterday timestamp with date', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(10, 0, 0, 0);
        const result = formatTimestamp(yesterday.getTime());
        // Should contain month abbreviation
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(5);
    });

    test('returns a string for valid timestamp', () => {
        const result = formatTimestamp(Date.now());
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});

// ========================================
// getCharCounterState
// ========================================
describe('getCharCounterState', () => {
    test('shows normal state for short text', () => {
        const state = getCharCounterState(50);
        expect(state.text).toBe('50 / 250');
        expect(state.level).toBe('normal');
    });

    test('shows warning at 200 characters', () => {
        const state = getCharCounterState(200);
        expect(state.text).toBe('200 / 250');
        expect(state.level).toBe('warning');
    });

    test('shows danger at 230 characters', () => {
        const state = getCharCounterState(230);
        expect(state.text).toBe('230 / 250');
        expect(state.level).toBe('danger');
    });

    test('shows danger at 250 characters', () => {
        const state = getCharCounterState(250);
        expect(state.text).toBe('250 / 250');
        expect(state.level).toBe('danger');
    });

    test('shows normal at 0 characters', () => {
        const state = getCharCounterState(0);
        expect(state.text).toBe('0 / 250');
        expect(state.level).toBe('normal');
    });

    test('shows normal at 199 characters', () => {
        const state = getCharCounterState(199);
        expect(state.level).toBe('normal');
    });

    test('shows warning at 229 characters', () => {
        const state = getCharCounterState(229);
        expect(state.level).toBe('warning');
    });
});

// ========================================
// getEmulatorConfig
// ========================================
describe('getEmulatorConfig', () => {
    test('returns config for localhost', () => {
        const config = getEmulatorConfig('localhost');
        expect(config).not.toBeNull();
        expect(config.apiKey).toBe('local-emulator');
        expect(config.databaseURL).toContain('localhost:9000');
        expect(config.projectId).toBe('local');
    });

    test('returns config for 127.0.0.1', () => {
        const config = getEmulatorConfig('127.0.0.1');
        expect(config).not.toBeNull();
        expect(config.databaseURL).toContain('localhost:9000');
    });

    test('returns null for production hostname', () => {
        expect(getEmulatorConfig('guestbook.slashstack.app')).toBeNull();
    });

    test('returns null for empty string', () => {
        expect(getEmulatorConfig('')).toBeNull();
    });

    test('returns null for undefined', () => {
        expect(getEmulatorConfig(undefined)).toBeNull();
    });

    test('config includes all required Firebase fields', () => {
        const config = getEmulatorConfig('localhost');
        expect(config).toHaveProperty('apiKey');
        expect(config).toHaveProperty('authDomain');
        expect(config).toHaveProperty('databaseURL');
        expect(config).toHaveProperty('projectId');
    });
});

// ========================================
// getInitialTheme
// ========================================
describe('getInitialTheme', () => {
    function makeStorage(value) {
        return { getItem: () => value };
    }

    test('returns "dark" when localStorage has "dark"', () => {
        expect(getInitialTheme(makeStorage('dark'), false)).toBe('dark');
    });

    test('returns "light" when localStorage has "light"', () => {
        expect(getInitialTheme(makeStorage('light'), true)).toBe('light');
    });

    test('falls back to "dark" when localStorage is empty and OS prefers dark', () => {
        expect(getInitialTheme(makeStorage(null), true)).toBe('dark');
    });

    test('falls back to "light" when localStorage is empty and OS prefers light', () => {
        expect(getInitialTheme(makeStorage(null), false)).toBe('light');
    });

    test('ignores unrecognised localStorage values and falls back to OS preference', () => {
        expect(getInitialTheme(makeStorage('system'), true)).toBe('dark');
        expect(getInitialTheme(makeStorage('system'), false)).toBe('light');
    });

    test('falls back silently to OS preference when localStorage throws', () => {
        const badStorage = { getItem: () => { throw new Error('QuotaExceededError'); } };
        expect(getInitialTheme(badStorage, true)).toBe('dark');
        expect(getInitialTheme(badStorage, false)).toBe('light');
    });

    test('falls back to OS preference when storage is null', () => {
        expect(getInitialTheme(null, true)).toBe('dark');
        expect(getInitialTheme(null, false)).toBe('light');
    });
});

// ========================================
// parseTextSegments
// ========================================
describe('parseTextSegments', () => {
    test('plain URL only', () => {
        const segs = parseTextSegments('https://example.com');
        expect(segs).toHaveLength(1);
        expect(segs[0]).toMatchObject({ type: 'url', value: 'https://example.com', display: 'https://example.com' });
    });

    test('URL mid-sentence', () => {
        const segs = parseTextSegments('check out https://example.com cool');
        expect(segs).toHaveLength(3);
        expect(segs[0]).toEqual({ type: 'text', value: 'check out ' });
        expect(segs[1]).toMatchObject({ type: 'url', value: 'https://example.com' });
        expect(segs[2]).toEqual({ type: 'text', value: ' cool' });
    });

    test('URL at end of sentence', () => {
        const segs = parseTextSegments('visit https://example.com');
        expect(segs).toHaveLength(2);
        expect(segs[0]).toEqual({ type: 'text', value: 'visit ' });
        expect(segs[1]).toMatchObject({ type: 'url', value: 'https://example.com' });
    });

    test('multiple URLs', () => {
        const segs = parseTextSegments('https://a.com and https://b.com');
        const urls = segs.filter(s => s.type === 'url');
        expect(urls).toHaveLength(2);
        expect(urls[0].value).toBe('https://a.com');
        expect(urls[1].value).toBe('https://b.com');
    });

    test('no URL returns single text segment', () => {
        const segs = parseTextSegments('just plain text');
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: 'text', value: 'just plain text' });
    });

    test('javascript: scheme is NOT linked', () => {
        const segs = parseTextSegments('javascript:alert(1)');
        expect(segs.every(s => s.type === 'text')).toBe(true);
    });

    test('long URL display label is truncated to 50 chars + ellipsis', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(60);
        const segs = parseTextSegments(longUrl);
        expect(segs[0].type).toBe('url');
        expect(segs[0].value).toBe(longUrl);
        expect(segs[0].display).toBe(longUrl.slice(0, 50) + '…');
    });

    test('trailing period stripped from URL', () => {
        const segs = parseTextSegments('see https://example.com.');
        const urlSeg = segs.find(s => s.type === 'url');
        expect(urlSeg.value).toBe('https://example.com');
        expect(segs.some(s => s.type === 'text' && s.value === '.')).toBe(true);
    });

    test('empty string returns empty array', () => {
        expect(parseTextSegments('')).toEqual([]);
    });

    test('null returns empty array', () => {
        expect(parseTextSegments(null)).toEqual([]);
    });
});

// ========================================
// isNearBottom
// ========================================
describe('isNearBottom', () => {
    test('returns true when scroll position equals body height minus threshold', () => {
        expect(isNearBottom(800, 1000, 200)).toBe(true);
    });

    test('returns true when scroll position is past the threshold', () => {
        expect(isNearBottom(850, 1000, 200)).toBe(true);
    });

    test('returns false when scroll position is above the threshold', () => {
        expect(isNearBottom(799, 1000, 200)).toBe(false);
    });

    test('uses default threshold of 200', () => {
        expect(isNearBottom(800, 1000)).toBe(true);
        expect(isNearBottom(799, 1000)).toBe(false);
    });

    test('works with custom threshold', () => {
        expect(isNearBottom(950, 1000, 50)).toBe(true);
        expect(isNearBottom(949, 1000, 50)).toBe(false);
    });

    test('returns true when at exact bottom', () => {
        expect(isNearBottom(1000, 1000, 200)).toBe(true);
    });

    test('returns false when far from bottom', () => {
        expect(isNearBottom(100, 10000, 200)).toBe(false);
    });
});

// ========================================
// parseMessageSegments
// ========================================
describe('parseMessageSegments', () => {
    test('plain text returns single text segment', () => {
        const segs = parseMessageSegments('Hello world');
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: 'text', value: 'Hello world' });
    });

    test('@mention returns mention segment', () => {
        const segs = parseMessageSegments('@Alice');
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ type: 'mention', value: 'Alice' });
    });

    test('@mention mid-sentence splits correctly', () => {
        const segs = parseMessageSegments('Hey @Bob, how are you?');
        const mention = segs.find(s => s.type === 'mention');
        expect(mention).toBeDefined();
        expect(mention.value).toBe('Bob');
    });

    test('multiple @mentions are all parsed', () => {
        const segs = parseMessageSegments('@Alice and @Bob');
        const mentions = segs.filter(s => s.type === 'mention');
        expect(mentions).toHaveLength(2);
        expect(mentions[0].value).toBe('Alice');
        expect(mentions[1].value).toBe('Bob');
    });

    test('URL is still parsed as url segment', () => {
        const segs = parseMessageSegments('visit https://example.com now');
        const url = segs.find(s => s.type === 'url');
        expect(url).toBeDefined();
        expect(url.value).toBe('https://example.com');
    });

    test('mix of @mention and URL', () => {
        const segs = parseMessageSegments('@Alice check https://example.com');
        const mention = segs.find(s => s.type === 'mention');
        const url = segs.find(s => s.type === 'url');
        expect(mention).toBeDefined();
        expect(url).toBeDefined();
    });

    test('empty string returns empty array', () => {
        expect(parseMessageSegments('')).toEqual([]);
    });

    test('null returns empty array', () => {
        expect(parseMessageSegments(null)).toEqual([]);
    });

    test('@mention only captures one word (no spaces in mention)', () => {
        const segs = parseMessageSegments('@John Doe');
        const mentions = segs.filter(s => s.type === 'mention');
        expect(mentions).toHaveLength(1);
        expect(mentions[0].value).toBe('John');
    });

    test('@ without following word is plain text', () => {
        const segs = parseMessageSegments('email me @ later');
        const mentions = segs.filter(s => s.type === 'mention');
        expect(mentions).toHaveLength(0);
    });
});


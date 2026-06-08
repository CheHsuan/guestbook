const { validateMessage, formatTimestamp, sanitizeText, getCharCounterState, getEmulatorConfig } = require('../public/utils');

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

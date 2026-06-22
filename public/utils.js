// ========================================
// Utility Functions (testable, pure)
// ========================================

/**
 * Validate a message before posting.
 * Returns { valid: boolean, error?: string }
 */
function validateMessage(text) {
    if (typeof text !== 'string') {
        return { valid: false, error: 'Message must be a string.' };
    }

    const trimmed = text.trim();

    if (!trimmed) {
        return { valid: false, error: 'Please write a message before posting.' };
    }

    if (trimmed.length > 250) {
        return { valid: false, error: 'Message must be 250 characters or less.' };
    }

    return { valid: true, text: trimmed };
}

/**
 * Format a timestamp for display.
 * If today → "05:14 PM"
 * Otherwise → "Feb 23, 05:14 PM"
 */
function formatTimestamp(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Sanitize text for safe display.
 * This mimics what textContent does — ensures no HTML is rendered.
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    const div = typeof document !== 'undefined'
        ? document.createElement('div')
        : null;

    if (div) {
        div.textContent = text;
        return div.innerHTML; // Returns HTML-escaped version
    }

    // Fallback for Node.js environment (tests)
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Compute character counter state.
 * Returns { text: string, level: 'normal' | 'warning' | 'danger' }
 */
function getCharCounterState(length) {
    const text = `${length} / 250`;
    let level = 'normal';
    if (length >= 230) {
        level = 'danger';
    } else if (length >= 200) {
        level = 'warning';
    }
    return { text, level };
}

// Returns true when scroll position is within threshold px of the bottom.
function isNearBottom(scrollPosition, bodyHeight, threshold = 200) {
    return scrollPosition >= bodyHeight - threshold;
}

// Emulator-only placeholder values — NOT real credentials (see CLAUDE.md).
function getEmulatorConfig(hostname) {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return {
            apiKey: 'local-emulator',
            authDomain: 'localhost',
            databaseURL: 'http://localhost:9000?ns=local',
            projectId: 'local',
        };
    }
    return null;
}

/**
 * Resolve the initial theme from persisted storage and OS preference.
 * @param {Storage|null} storage - localStorage or a test stub (may throw).
 * @param {boolean} matchesDark  - result of matchMedia('prefers-color-scheme: dark').matches.
 * @returns {'dark'|'light'}
 */
function getInitialTheme(storage, matchesDark) {
    try {
        var saved = storage ? storage.getItem('theme') : null;
        if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) { /* localStorage unavailable — fall through */ }
    return matchesDark ? 'dark' : 'light';
}

// Export for testing (Node.js / Jest)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateMessage, formatTimestamp, sanitizeText, getCharCounterState, getEmulatorConfig, isNearBottom, getInitialTheme };
}

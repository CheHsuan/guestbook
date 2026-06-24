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

/**
 * Split rawText into segments for rendering with clickable links.
 * Each segment is { type: 'text'|'url', value: string, display?: string }.
 * Only http/https URLs are linked; trailing punctuation (.,)) is stripped from
 * the URL and emitted as a separate text segment.
 */
function parseTextSegments(rawText) {
    if (!rawText) return [];

    const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
    const TRAILING_PUNCT = /[.,)]+$/;
    const parts = rawText.split(URL_REGEX);
    const segments = [];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        if (i % 2 === 1) {
            // Odd indices are URL captures from the split regex
            const trailingMatch = TRAILING_PUNCT.exec(part);
            const url = trailingMatch ? part.slice(0, trailingMatch.index) : part;
            const punct = trailingMatch ? trailingMatch[0] : '';

            let isValid = false;
            try {
                const parsed = new URL(url);
                isValid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
            } catch (_) {
                isValid = false;
            }

            if (isValid) {
                const display = url.length > 50 ? url.slice(0, 50) + '…' : url;
                segments.push({ type: 'url', value: url, display });
                if (punct) segments.push({ type: 'text', value: punct });
            } else {
                segments.push({ type: 'text', value: part });
            }
        } else {
            segments.push({ type: 'text', value: part });
        }
    }

    return segments;
}

/**
 * Render rawText into container element, converting http/https URLs into
 * clickable anchors (target="_blank", rel="noopener noreferrer").
 * Non-URL text is appended as safe Text nodes; href is only set on
 * validated http/https URLs so there is no XSS vector via the URL.
 */
function renderTextWithLinks(container, rawText) {
    while (container.firstChild) container.removeChild(container.firstChild);
    for (const seg of parseTextSegments(rawText)) {
        if (seg.type === 'url') {
            const a = document.createElement('a');
            a.href = seg.value;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = seg.display;
            container.appendChild(a);
        } else {
            container.appendChild(document.createTextNode(seg.value));
        }
    }
}

// Export for testing (Node.js / Jest)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateMessage, formatTimestamp, sanitizeText, getCharCounterState, getEmulatorConfig, isNearBottom, getInitialTheme, parseTextSegments, renderTextWithLinks };
}

// ========================================
// Utility Functions (testable, pure)
// ========================================

/**
 * Validate a profile website URL.
 * Returns { valid: boolean, error?: string, url?: string }
 */
function validateWebsiteURL(text) {
    if (typeof text !== 'string') {
        return { valid: false, error: 'Website URL must be a string.' };
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'URL cannot be empty.' };
    }
    if (trimmed.length > 200) {
        return { valid: false, error: 'URL must be 200 characters or less.' };
    }
    if (/^javascript:/i.test(trimmed)) {
        return { valid: false, error: 'Invalid URL.' };
    }
    if (!/^https?:\/\//i.test(trimmed)) {
        return { valid: false, error: 'URL must start with http:// or https://.' };
    }
    try {
        const parsed = new URL(trimmed);
        if (!parsed.hostname.includes('.')) {
            return { valid: false, error: 'URL must have a valid hostname (e.g. example.com).' };
        }
    } catch (_) {
        return { valid: false, error: 'Invalid URL.' };
    }
    return { valid: true, url: trimmed };
}

/**
 * Validate a profile bio.
 * Returns { valid: boolean, error?: string, text?: string }
 */
function validateBio(text) {
    if (typeof text !== 'string') {
        return { valid: false, error: 'Bio must be a string.' };
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Bio cannot be empty.' };
    }
    if (trimmed.length > 150) {
        return { valid: false, error: 'Bio must be 150 characters or less.' };
    }
    return { valid: true, text: trimmed };
}

/**
 * Validate a custom display name / alias.
 * Returns { valid: boolean, error?: string, text?: string }
 */
function validateDisplayName(text) {
    if (typeof text !== 'string') {
        return { valid: false, error: 'Display name must be a string.' };
    }
    const trimmed = text.trim();
    if (trimmed.length < 1) {
        return { valid: false, error: 'Display name cannot be empty.' };
    }
    if (trimmed.length > 40) {
        return { valid: false, error: 'Display name must be 40 characters or less.' };
    }
    return { valid: true, text: trimmed };
}

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

/**
 * Parse rawText into segments for rendering with links, @mentions, and #hashtags.
 * Segment types: 'text' | 'url' | 'mention' | 'hashtag'
 * @mention tokens match /\B@(\w+)/ — one contiguous word after @, not at word boundary start.
 * #hashtag tokens match /\B#[a-zA-Z][a-zA-Z0-9_]{1,29}/ — starts with letter, 2–30 chars, not word-embedded.
 */
function parseMessageSegments(rawText) {
    if (!rawText) return [];

    const COMBINED_REGEX = /(https?:\/\/[^\s<>"]+)|(\B@\w+)|(\B#[a-zA-Z][a-zA-Z0-9_]{1,29})/g;
    const TRAILING_PUNCT = /[.,)]+$/;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = COMBINED_REGEX.exec(rawText)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', value: rawText.slice(lastIndex, match.index) });
        }

        if (match[1]) {
            // URL match
            const raw = match[1];
            const trailingMatch = TRAILING_PUNCT.exec(raw);
            const url = trailingMatch ? raw.slice(0, trailingMatch.index) : raw;
            const punct = trailingMatch ? trailingMatch[0] : '';

            let isValid = false;
            try {
                const parsed = new URL(url);
                isValid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
            } catch (_) {}

            if (isValid) {
                const display = url.length > 50 ? url.slice(0, 50) + '…' : url;
                segments.push({ type: 'url', value: url, display });
                if (punct) segments.push({ type: 'text', value: punct });
                // Adjust lastIndex to account for stripped trailing punctuation
                COMBINED_REGEX.lastIndex = match.index + url.length + punct.length;
            } else {
                segments.push({ type: 'text', value: raw });
            }
        } else if (match[2]) {
            // @mention match — value is the word without @
            segments.push({ type: 'mention', value: match[2].slice(1) });
        } else if (match[3]) {
            // #hashtag match — value includes the # prefix
            segments.push({ type: 'hashtag', value: match[3] });
        }

        lastIndex = COMBINED_REGEX.lastIndex;
    }

    if (lastIndex < rawText.length) {
        segments.push({ type: 'text', value: rawText.slice(lastIndex) });
    }

    return segments;
}

/**
 * Parse a plain-text string into inline-markdown sub-segments.
 * Recognises **bold**, *italic*, and `code` markers.
 * Content between markers must contain at least one non-whitespace character;
 * otherwise the markers are emitted as plain text. Nested formatting is not
 * supported — markers inside captured content are treated as literal text.
 * Returns an array of { type: 'text'|'bold'|'italic'|'code', value: string }.
 */
function parseInlineMarkdown(text) {
    if (!text) return [{ type: 'text', value: text || '' }];

    // Order matters: code first (backtick), then bold (**), then italic (*).
    // [^`]+ / [^*]+ prevents markers from appearing inside captured content,
    // which both avoids nesting and keeps the regex unambiguous.
    const INLINE_RE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = INLINE_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        const codeContent = match[1];
        const boldContent = match[2];
        const italicContent = match[3];
        const content = codeContent !== undefined ? codeContent
            : boldContent !== undefined ? boldContent
            : italicContent;
        const hasNonWhitespace = /\S/.test(content);

        if (!hasNonWhitespace) {
            segments.push({ type: 'text', value: match[0] });
        } else if (codeContent !== undefined) {
            segments.push({ type: 'code', value: codeContent });
        } else if (boldContent !== undefined) {
            segments.push({ type: 'bold', value: boldContent });
        } else {
            segments.push({ type: 'italic', value: italicContent });
        }

        lastIndex = INLINE_RE.lastIndex;
    }

    if (lastIndex < text.length) {
        segments.push({ type: 'text', value: text.slice(lastIndex) });
    }

    return segments.length > 0 ? segments : [{ type: 'text', value: text }];
}

/**
 * Render rawText into container, converting URLs to clickable anchors and
 * @Word tokens to <span class="mention">. XSS-safe — no innerHTML on user data.
 * Inline Markdown (**bold**, *italic*, `code`) is applied to plain-text segments.
 */
function renderMessageText(container, rawText) {
    while (container.firstChild) container.removeChild(container.firstChild);
    for (const seg of parseMessageSegments(rawText)) {
        if (seg.type === 'url') {
            const a = document.createElement('a');
            a.href = seg.value;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = seg.display;
            container.appendChild(a);
        } else if (seg.type === 'mention') {
            const span = document.createElement('span');
            span.className = 'mention';
            span.textContent = '@' + seg.value;
            container.appendChild(span);
        } else if (seg.type === 'hashtag') {
            const span = document.createElement('span');
            span.className = 'hashtag';
            span.textContent = seg.value;
            container.appendChild(span);
        } else {
            for (const md of parseInlineMarkdown(seg.value)) {
                if (md.type === 'bold') {
                    const el = document.createElement('strong');
                    el.textContent = md.value;
                    container.appendChild(el);
                } else if (md.type === 'italic') {
                    const el = document.createElement('em');
                    el.textContent = md.value;
                    container.appendChild(el);
                } else if (md.type === 'code') {
                    const el = document.createElement('code');
                    el.textContent = md.value;
                    container.appendChild(el);
                } else {
                    container.appendChild(document.createTextNode(md.value));
                }
            }
        }
    }
}

/**
 * Returns true when timestamp is strictly newer than lastVisitTimestamp.
 * Returns false on first visit (null/undefined lastVisitTimestamp) or when
 * localStorage is unavailable.
 */
function isNewSinceLastVisit(timestamp, lastVisitTimestamp) {
    if (!lastVisitTimestamp) return false;
    return timestamp > lastVisitTimestamp;
}

/**
 * Wrap the textarea's selected text with before/after markers.
 * If no text is selected, inserts before+after and places cursor between them.
 * Updates textarea.value and selection in place.
 */
function wrapSelection(textarea, before, after) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.slice(start, end);

    textarea.value = value.slice(0, start) + before + selected + after + value.slice(end);

    if (selected.length > 0) {
        textarea.setSelectionRange(start + before.length, end + before.length);
    } else {
        const cursor = start + before.length;
        textarea.setSelectionRange(cursor, cursor);
    }
}

/**
 * Convert a 2-letter ISO 3166-1 alpha-2 country code to a flag emoji.
 * Returns the flag emoji string, or null for any invalid input.
 */
function countryCodeToFlag(code) {
    if (typeof code !== 'string' || !/^[A-Z]{2}$/.test(code)) return null;
    return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

/**
 * Fetch the poster's country from ipapi.co/json/ with a 3-second AbortController timeout.
 * Returns { countryCode, countryName } on success, or null on any failure.
 */
async function fetchCountryData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        const data = await response.json();
        if (!data.country_code || !/^[A-Z]{2}$/.test(data.country_code)) return null;
        return { countryCode: data.country_code, countryName: data.country_name || '' };
    } catch (_) {
        return null;
    }
}

// Export for testing (Node.js / Jest)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateWebsiteURL, validateBio, validateDisplayName, validateMessage, formatTimestamp, sanitizeText, getCharCounterState, getEmulatorConfig, isNearBottom, getInitialTheme, parseTextSegments, renderTextWithLinks, parseMessageSegments, parseInlineMarkdown, renderMessageText, wrapSelection, isNewSinceLastVisit, countryCodeToFlag, fetchCountryData };
}

/**
 * LeetForces Extension Bundled Content Script
 * Generated automatically by scripts/build.js
 */
(function() {
    'use strict';

/* --- src/constants.js --- */
/**
 * LeetForces Constants
 */

const DEFAULT_CPP_TEMPLATE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t = 1;
    // cin >> t;
    while (t--) {
        
    }
    return 0;
}`;

// Line 11 (1-indexed), Column 9 (1-indexed, i.e., after 8 spaces indentation inside while loop)
const DEFAULT_CURSOR_LINE = 11;
const DEFAULT_CURSOR_COLUMN = 9;

const STORAGE_KEYS = {
    CODE_PREFIX: 'leetforces_code_',
    LAST_PROBLEM_KEY: 'leetforces_last_problem_key',
    PREFERRED_LANG: 'leetforces_preferred_lang',
    SETTINGS: 'leetforces_settings'
};


/* --- src/contextExtractor.js --- */
/**
 * Context Extractor for Codeforces Problem Pages
 * Extracts contest ID, problem index, problem name, and sample test cases directly from DOM.
 */

/**
 * Extracts raw text from Codeforces <pre> elements, handling test-example-line divs if present.
 * @param {Element} preElement 
 * @returns {string}
 */
function extractPreText(preElement) {
    if (!preElement) return '';
    const lineDivs = preElement.querySelectorAll('.test-example-line');
    if (lineDivs && lineDivs.length > 0) {
        return Array.from(lineDivs)
            .map(div => div.textContent.trimEnd())
            .join('\n');
    }
    // Standard text fallback
    const text = preElement.innerText !== undefined ? preElement.innerText : preElement.textContent;
    return text ? text.trim() : '';
}

/**
 * Extracts problem context details from page URL and DOM.
 * @param {Document} doc - Document object (defaults to window.document)
 * @param {string} currentUrl - URL string (defaults to window.location.href)
 * @returns {{
 *   contestId: string|null,
 *   problemIndex: string|null,
 *   problemName: string|null,
 *   problemKey: string|null,
 *   sampleTests: Array<{ input: string, output: string }>
 * }}
 */
function extractProblemContext(doc = document, currentUrl = window.location.href) {
    let contestId = null;
    let problemIndex = null;
    let problemName = null;

    // 1. Try URL parsing first
    // Patterns:
    // /contest/{contestId}/problem/{problemIndex}
    // /problemset/problem/{contestId}/{problemIndex}
    // /gym/{contestId}/problem/{problemIndex}
    // /group/{groupId}/contest/{contestId}/problem/{problemIndex}
    const contestMatch = currentUrl.match(/\/(?:contest|gym|problemset\/problem)\/(\d+)(?:\/problem\/|\/)([A-Za-z0-9]+)/);
    if (contestMatch) {
        contestId = contestMatch[1];
        problemIndex = contestMatch[2].toUpperCase();
        console.log('[LeetForces] URL parsed: contestId=' + contestId + ', problemIndex=' + problemIndex);
    } else {
        console.warn('[LeetForces] URL pattern did not match:', currentUrl);
    }

    // 2. DOM Parsing for Title & Index
    const titleElement = doc.querySelector('.problem-statement .header .title');
    if (titleElement) {
        const fullTitle = titleElement.textContent.trim(); // e.g. "G. Problem Name" or "A. Watermelon"
        const dotIndex = fullTitle.indexOf('.');
        if (dotIndex !== -1) {
            const parsedIndex = fullTitle.substring(0, dotIndex).trim();
            const parsedName = fullTitle.substring(dotIndex + 1).trim();
            if (!problemIndex) {
                problemIndex = parsedIndex.toUpperCase();
            }
            problemName = parsedName;
        } else {
            problemName = fullTitle;
        }
    }

    // Fallback if title element wasn't found or had different format
    if (!problemName && titleElement) {
        problemName = titleElement.textContent.trim();
    }

    // 3. Extract Sample Tests from DOM
    const sampleTests = [];
    const sampleTestNodes = doc.querySelectorAll('.sample-test');
    
    if (sampleTestNodes.length > 0) {
        sampleTestNodes.forEach(testNode => {
            const inputPre = testNode.querySelector('.input pre');
            const outputPre = testNode.querySelector('.output pre');
            if (inputPre && outputPre) {
                sampleTests.push({
                    input: extractPreText(inputPre),
                    output: extractPreText(outputPre)
                });
            }
        });
    } else {
        // Fallback: Query all .input pre and .output pre on the page directly
        const inputs = doc.querySelectorAll('.input pre');
        const outputs = doc.querySelectorAll('.output pre');
        const count = Math.min(inputs.length, outputs.length);

        for (let i = 0; i < count; i++) {
            sampleTests.push({
                input: extractPreText(inputs[i]),
                output: extractPreText(outputs[i])
            });
        }
    }

    // 4. Construct unique problemKey
    let problemKey = null;
    if (contestId && problemIndex) {
        problemKey = `cf_${contestId}_${problemIndex}`;
    } else if (problemIndex) {
        problemKey = `cf_unknown_${problemIndex}`;
    } else if (problemName) {
        problemKey = `cf_name_${problemName.replace(/\s+/g, '_').toLowerCase()}`;
    }

    return {
        contestId,
        problemIndex,
        problemName: problemName || 'Unknown Problem',
        problemKey,
        sampleTests
    };
}


/* --- src/formExtractor.js --- */
/**
 * Codeforces Submission Form & CSRF Token Extractor
 * Locates the real Codeforces submission form and extracts token & exact field names.
 */

/**
 * Checks if a form element is a valid Codeforces solution submit form.
 * @param {Element} form 
 * @returns {boolean}
 */
function isValidSubmitForm(form) {
    if (!form) return false;
    const action = (form.getAttribute('action') || form.action || '').toLowerCase();

    // Ignore known non-submission endpoints
    const blacklistedActions = ['/data/problemtags', 'search', 'comment', 'vote', 'rating', 'login', 'logout'];
    for (const item of blacklistedActions) {
        if (action.includes(item)) return false;
    }

    // Must contain submit indicators
    if (action.includes('submit') || action.includes('problem')) return true;
    if (form.querySelector('select[name="programTypeId"], select[name="tab"], textarea[name="source"], input[name="sourceFile"]')) return true;
    if (form.classList && (form.classList.contains('submit-form') || form.id === 'singlePageSubmitForm')) return true;

    return false;
}

/**
 * Extracts submission form action, CSRF token, field names, and language options.
 * @param {Document} doc - Document object (defaults to window.document)
 * @param {object} [context] - Extracted problem context ({ contestId, problemIndex })
 * @returns {{
 *   formFound: boolean,
 *   formAction: string|null,
 *   csrfToken: string|null,
 *   fields: {
 *     csrfTokenField: string,
 *     programTypeIdField: string,
 *     problemCodeField: string,
 *     sourceField: string
 *   },
 *   availableLanguages: Array<{ value: string, title: string, isSelected: boolean }>
 * }}
 */
function extractSubmissionFormDetails(doc = document, context = {}) {
    // 1. Locate all forms and find the real submit form
    const allForms = Array.from(doc.querySelectorAll('form'));
    let submitForm = allForms.find(isValidSubmitForm) || null;

    // Fallback: Check standard selectors if direct search didn't match
    if (!submitForm) {
        const fallbackSelectors = [
            'form.submit-form',
            'form[action*="submit"]',
            'form#singlePageSubmitForm'
        ];
        for (const selector of fallbackSelectors) {
            const el = doc.querySelector(selector);
            if (el && isValidSubmitForm(el)) {
                submitForm = el;
                break;
            }
        }
    }

    // 2. Extract CSRF Token
    let csrfToken = null;
    let csrfFieldName = 'csrf_token';

    // Search inside submitForm or document for csrf input
    const csrfInput = (submitForm || doc).querySelector('input[name="csrf_token"], input[name="_csrf"]');
    if (csrfInput) {
        csrfToken = csrfInput.value;
        if (csrfInput.name) csrfFieldName = csrfInput.name;
    }

    if (!csrfToken) {
        const csrfSpan = doc.querySelector('.csrf-token, span[data-csrf]');
        if (csrfSpan) {
            csrfToken = csrfSpan.getAttribute('data-csrf') || csrfSpan.textContent.trim();
        }
    }

    if (!csrfToken) {
        const csrfMeta = doc.querySelector('meta[name="X-Csrf-Token"], meta[name="csrf-token"]');
        if (csrfMeta) {
            csrfToken = csrfMeta.getAttribute('content');
        }
    }

    // Search scripts for inline _csrf or csrf_token assignment
    if (!csrfToken) {
        const scripts = doc.querySelectorAll('script');
        for (const script of scripts) {
            const text = script.textContent || '';
            const match = text.match(/(?:csrf_token|_csrf)\s*[:=]\s*["']([a-f0-9]{32})["']/i);
            if (match) {
                csrfToken = match[1];
                break;
            }
        }
    }

    if (!csrfToken && typeof window !== 'undefined' && window._csrf) {
        csrfToken = window._csrf;
    }

    // 3. Extract Field Names & Available Languages (check document-wide)
    let programTypeIdField = 'programTypeId';
    let problemCodeField = 'submittedProblemCode';
    let sourceField = 'source';
    const availableLanguages = [];

    const root = doc; // Search document-wide for compiler select & fields

    // Language Select Field
    const langSelect = root.querySelector('select[name="programTypeId"], select[name="tab"]');
    if (langSelect) {
        if (langSelect.name) programTypeIdField = langSelect.name;

        const options = langSelect.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value) {
                availableLanguages.push({
                    value: opt.value,
                    title: opt.textContent.trim(),
                    isSelected: opt.selected
                });
            }
        });
    }

    // Problem Code Field
    const problemInput = root.querySelector('select[name="submittedProblemCode"], input[name="submittedProblemCode"]');
    if (problemInput && problemInput.name) {
        problemCodeField = problemInput.name;
    }

    // Source Code Field
    const sourceTextarea = root.querySelector('textarea[name="source"], textarea#sourceCodeTextarea, input[name="sourceFile"]');
    if (sourceTextarea && sourceTextarea.name) {
        sourceField = sourceTextarea.name;
    }

    // 4. Determine canonical form action
    let formAction = submitForm ? (submitForm.getAttribute('action') || submitForm.action) : null;
    
    // If formAction is missing, invalid, or points to unrelated path, construct canonical URL
    if (!formAction || formAction.includes('problemTags') || !formAction.includes('submit')) {
        if (context.contestId && context.problemIndex) {
            formAction = `/contest/${context.contestId}/problem/${context.problemIndex}?action=submitSolutionFormProcessor`;
        } else {
            formAction = '/problemset/submit?action=submitSolutionFormProcessor';
        }
    }

    return {
        formFound: !!submitForm || availableLanguages.length > 0,
        formAction,
        csrfToken: csrfToken || null,
        fields: {
            csrfTokenField: csrfFieldName,
            programTypeIdField,
            problemCodeField,
            sourceField
        },
        availableLanguages
    };
}


/* --- src/handleExtractor.js --- */
/**
 * Codeforces Handle Extractor
 * Extracts the currently logged-in user's handle from the page header,
 * needed to poll their own submission list for verdicts.
 */

/**
 * @param {Document} doc
 * @returns {string|null}
 */
function extractLoggedInHandle(doc = document) {
    // The header's profile link is the reliable place to look; other
    // /profile/ links on the page (comments, standings) are not the viewer.
    const header = doc.querySelector('#header') || doc;
    const link = header.querySelector('a[href^="/profile/"]');
    if (link) {
        const match = link.getAttribute('href').match(/\/profile\/([^/?#]+)/);
        if (match) return decodeURIComponent(match[1]);
        if (link.textContent) return link.textContent.trim();
    }
    return null;
}


/* --- src/storage.js --- */
/**
 * Storage Abstraction for LeetForces
 * Uses chrome.storage.local when available, falling back to localStorage.
 */



async function getSavedCode(problemKey) {
    if (!problemKey) return null;
    const storageKey = STORAGE_KEYS.CODE_PREFIX + problemKey;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.get([storageKey], result => {
                resolve(result[storageKey] || null);
            });
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(storageKey);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage read failed', e);
    }
    return null;
}

async function saveCode(problemKey, code) {
    if (!problemKey) return;
    if (typeof code !== 'string' || !code.trim()) return;
    const storageKey = STORAGE_KEYS.CODE_PREFIX + problemKey;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            try {
                chrome.storage.local.set({ [storageKey]: code }, resolve);
            } catch (_) {
                resolve();
            }
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, code);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}

async function getLastProblemKey() {
    const storageKey = STORAGE_KEYS.LAST_PROBLEM_KEY;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.get([storageKey], result => {
                resolve(result[storageKey] || null);
            });
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(storageKey);
        }
    } catch (e) {
        return null;
    }
}

async function setLastProblemKey(problemKey) {
    const storageKey = STORAGE_KEYS.LAST_PROBLEM_KEY;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.set({ [storageKey]: problemKey }, resolve);
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, problemKey);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}

async function getPreferredLanguage() {
    const storageKey = STORAGE_KEYS.PREFERRED_LANG;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.get([storageKey], result => {
                resolve(result[storageKey] || null);
            });
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(storageKey);
        }
    } catch (e) {
        return null;
    }
}

async function savePreferredLanguage(title) {
    if (!title) return;
    const storageKey = STORAGE_KEYS.PREFERRED_LANG;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.set({ [storageKey]: title }, resolve);
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, title);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}


/* --- src/editorManager.js --- */
/**
 * Editor Manager for LeetForces
 * Manages editor detection, template injection, cursor positioning, and state persistence.
 *
 * Chrome content scripts run in an isolated world, so window.ace is invisible.
 * When direct detection fails, we talk to src/pageBridge.js (MAIN world) via CustomEvents.
 */




/**
 * Computes character offset in raw string for target line and column (1-indexed).
 * @param {string} text
 * @param {number} targetLine
 * @param {number} targetCol
 * @returns {number}
 */
function computeCursorOffset(text, targetLine, targetCol) {
    const lines = text.split('\n');
    let offset = 0;
    const maxLineIndex = Math.min(targetLine - 1, lines.length - 1);

    for (let i = 0; i < maxLineIndex; i++) {
        offset += lines[i].length + 1; // +1 for newline character
    }

    const currentLine = lines[maxLineIndex] || '';
    const colOffset = Math.min(targetCol - 1, currentLine.length);
    return offset + colOffset;
}

/**
 * Synchronous page-bridge RPC (CustomEvent handlers run in the same turn).
 * @param {string} method
 * @param {any[]} [args]
 * @returns {any}
 */
function callPageBridge(method, args = []) {
    if (typeof document === 'undefined') return null;
    const id = `lf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let payload = null;

    const onResponse = (event) => {
        if (event.detail && event.detail.id === id) {
            payload = event.detail;
        }
    };

    document.addEventListener('leetforces-bridge-response', onResponse);
    document.dispatchEvent(new CustomEvent('leetforces-bridge-request', {
        detail: { id, method, args }
    }));
    document.removeEventListener('leetforces-bridge-response', onResponse);

    if (!payload || payload.error) return null;
    return payload.result;
}

function createBridgeEditor(type) {
    return {
        type: 'bridge',
        bridgeType: type,
        element: null,
        instance: { __leetforcesBridge: true }
    };
}

function detectEditorDirect(doc = document) {
    // 1. Ace (only works if running in page / MAIN world)
    const aceEl = doc.querySelector('.ace_editor');
    if (aceEl && typeof window !== 'undefined' && window.ace) {
        try {
            const aceInstance = window.ace.edit(aceEl);
            if (aceInstance) {
                return { type: 'ace', element: aceEl, instance: aceInstance };
            }
        } catch (e) {
            if (aceEl.env && aceEl.env.editor) {
                return { type: 'ace', element: aceEl, instance: aceEl.env.editor };
            }
        }
    }

    // 2. Monaco
    const monacoEl = doc.querySelector('.monaco-editor');
    if (monacoEl && typeof window !== 'undefined' && window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        if (editors && editors.length > 0) {
            return { type: 'monaco', element: monacoEl, instance: editors[0] };
        }
    }

    // 3. CodeMirror 5
    const cmEl = doc.querySelector('.CodeMirror');
    if (cmEl && cmEl.CodeMirror) {
        return { type: 'codemirror', element: cmEl, instance: cmEl.CodeMirror };
    }

    // 4. Submit-form textarea (prefer CF selectors; avoid random page textareas)
    const textareaSelectors = [
        'form.submit-form textarea[name="source"]',
        'form#singlePageSubmitForm textarea[name="source"]',
        'form[action*="submit"] textarea[name="source"]',
        'textarea#sourceCodeTextarea',
        'textarea[name="source"]',
        'textarea.source-code'
    ];

    for (const selector of textareaSelectors) {
        const textarea = doc.querySelector(selector);
        if (textarea) {
            return { type: 'textarea', element: textarea, instance: textarea };
        }
    }

    return { type: 'unknown', element: null, instance: null };
}

/**
 * Detects code editor on the page (Ace, Monaco, CodeMirror, Textarea, or page bridge).
 * @param {Document} doc
 * @returns {{ type: string, element: Element|null, instance: any|null, bridgeType?: string }}
 */
function detectEditor(doc = document) {
    const direct = detectEditorDirect(doc);
    if (direct.type !== 'unknown' && direct.instance) {
        return direct;
    }

    // Isolated content script: talk to MAIN-world pageBridge
    const bridged = callPageBridge('detect');
    if (bridged && bridged.ready && bridged.type && bridged.type !== 'unknown') {
        return createBridgeEditor(bridged.type);
    }

    // Ace DOM present but not ready yet
    if (doc.querySelector('.ace_editor') || (bridged && bridged.type === 'ace')) {
        return { type: 'unknown', element: doc.querySelector('.ace_editor'), instance: null };
    }

    return { type: 'unknown', element: null, instance: null };
}

/**
 * Gets current value from editor instance.
 * @param {{ type: string, instance: any }} editor
 * @returns {string}
 */
function getEditorValue(editor) {
    if (!editor || !editor.instance) return '';
    switch (editor.type) {
        case 'bridge': {
            const value = callPageBridge('getValue');
            return typeof value === 'string' ? value : '';
        }
        case 'ace':
            return editor.instance.getValue();
        case 'monaco':
            return editor.instance.getValue();
        case 'codemirror':
            return editor.instance.getValue();
        case 'textarea':
            return editor.instance.value;
        default:
            return '';
    }
}

/**
 * Sets value into editor instance.
 * @param {{ type: string, instance: any }} editor
 * @param {string} code
 */
function setEditorValue(editor, code) {
    if (!editor || !editor.instance) return;
    switch (editor.type) {
        case 'bridge':
            callPageBridge('setValue', [code]);
            break;
        case 'ace':
            editor.instance.setValue(code, -1);
            break;
        case 'monaco':
            editor.instance.setValue(code);
            break;
        case 'codemirror':
            editor.instance.setValue(code);
            break;
        case 'textarea':
            editor.instance.value = code;
            editor.instance.dispatchEvent(new Event('input', { bubbles: true }));
            editor.instance.dispatchEvent(new Event('change', { bubbles: true }));
            break;
    }
}

/**
 * Positions editor cursor at target line and column (1-indexed), focusing the editor.
 * @param {{ type: string, instance: any, element: Element }} editor
 * @param {number} line - Target line number (1-indexed)
 * @param {number} col - Target column number (1-indexed)
 */
function setEditorCursor(editor, line = DEFAULT_CURSOR_LINE, col = DEFAULT_CURSOR_COLUMN) {
    if (!editor || !editor.instance) return;

    try {
        switch (editor.type) {
            case 'bridge':
                callPageBridge('setCursor', [line, col]);
                break;
            case 'ace':
                editor.instance.focus();
                editor.instance.gotoLine(line, col - 1, true);
                break;
            case 'monaco':
                editor.instance.focus();
                editor.instance.setPosition({ lineNumber: line, column: col });
                editor.instance.revealLineInCenter(line);
                break;
            case 'codemirror':
                editor.instance.focus();
                editor.instance.setCursor({ line: line - 1, ch: col - 1 });
                break;
            case 'textarea': {
                const textarea = editor.instance;
                textarea.focus();
                const code = textarea.value;
                const offset = computeCursorOffset(code, line, col);
                textarea.setSelectionRange(offset, offset);
                break;
            }
        }
    } catch (err) {
        console.warn('LeetForces: Failed to set cursor position', err);
    }
}

/**
 * Initializes problem code for the detected editor.
 * @param {string} problemKey
 * @param {{ type: string, instance: any, element: Element }} editor
 * @returns {Promise<{ isNewProblem: boolean, codeUsed: string }>}
 */
async function initializeProblemEditor(problemKey, editor) {
    if (!problemKey || !editor || !editor.instance) {
        return { isNewProblem: false, codeUsed: '' };
    }

    const lastProblemKey = await getLastProblemKey();
    const isNewProblem = lastProblemKey !== problemKey;

    let savedCode = await getSavedCode(problemKey);
    let codeToApply = DEFAULT_CPP_TEMPLATE;

    if (savedCode && savedCode.trim().length > 0) {
        codeToApply = savedCode;
    } else {
        codeToApply = DEFAULT_CPP_TEMPLATE;
        await saveCode(problemKey, codeToApply);
    }

    await setLastProblemKey(problemKey);
    setEditorValue(editor, codeToApply);

    if (codeToApply === DEFAULT_CPP_TEMPLATE || !savedCode) {
        setTimeout(() => {
            setEditorCursor(editor, DEFAULT_CURSOR_LINE, DEFAULT_CURSOR_COLUMN);
        }, 50);
    }

    attachAutoSaveListener(problemKey, editor);

    return { isNewProblem, codeUsed: codeToApply };
}

/**
 * Attaches event listener to auto-save code changes for current problemKey.
 * @param {string} problemKey
 * @param {{ type: string, instance: any, element: Element }} editor
 */
function attachAutoSaveListener(problemKey, editor) {
    if (!problemKey || !editor || !editor.instance) return;

    let debounceTimer = null;
    const triggerSave = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const currentCode = getEditorValue(editor);
            if (currentCode) {
                saveCode(problemKey, currentCode);
            }
        }, 400);
    };

    switch (editor.type) {
        case 'bridge':
            callPageBridge('bindChange');
            document.addEventListener('leetforces-bridge-change', triggerSave);
            break;
        case 'ace':
            editor.instance.on('change', triggerSave);
            break;
        case 'monaco':
            editor.instance.onDidChangeModelContent(triggerSave);
            break;
        case 'codemirror':
            editor.instance.on('change', triggerSave);
            break;
        case 'textarea':
            editor.instance.addEventListener('input', triggerSave);
            editor.instance.addEventListener('change', triggerSave);
            break;
    }
}


/* --- src/languageMap.js --- */
/**
 * Codeforces Language & Compiler Mapping Engine
 * Maps human-readable names to Codeforces internal compiler IDs (programTypeId).
 */

// Standard Codeforces Compiler Mapping
const KNOWN_COMPILER_MAP = {
    'GNU G++20 (64 bit)': '89',
    'GNU G++17 7.3.0': '54',
    'GNU G++23 64 bit': '91',
    'GNU C++11 5.1.0': '43',
    'GNU C++14 6.4.0': '50',
    'Clang++20 Diagnostics': '92',
    'Python 3.8.10': '31',
    'PyPy 3.9 (7.3.11)': '70',
    'PyPy 3.10 (7.3.12)': '80',
    'Java 21 64bit': '87',
    'Java 11 64bit': '60',
    'Java 8 64bit': '36',
    'Kotlin 1.9.20': '88',
    'Rust 2021': '75',
    'Go 1.22.2': '83',
    'C# 10': '65',
    'C# Mono 6.8': '9',
    'JavaScript V8 4.8.0': '34',
    'Node.js 20.10.0': '55'
};

/**
 * Resolves the best matching programTypeId from available form languages based on user preference.
 * @param {string} preferredLang - User's preferred language string (e.g. "GNU G++20", "Python 3", "Java 21", "89")
 * @param {Array<{ value: string, title: string, isSelected: boolean }>} availableLanguages - Extracted form languages
 * @returns {string|null} - Selected programTypeId value
 */
function resolveLanguageId(preferredLang, availableLanguages = []) {
    if (!availableLanguages || availableLanguages.length === 0) {
        return KNOWN_COMPILER_MAP[preferredLang] || preferredLang || '89';
    }

    if (!preferredLang) {
        // Fallback to currently selected option or first option
        const selected = availableLanguages.find(l => l.isSelected);
        return selected ? selected.value : availableLanguages[0].value;
    }

    const preferredStr = String(preferredLang).toLowerCase().trim();

    // 1. Direct match on option value
    const matchByValue = availableLanguages.find(l => String(l.value) === preferredStr);
    if (matchByValue) return matchByValue.value;

    // 2. Direct match on title
    const matchByExactTitle = availableLanguages.find(l => l.title.toLowerCase() === preferredStr);
    if (matchByExactTitle) return matchByExactTitle.value;

    // 3. Match via KNOWN_COMPILER_MAP
    for (const [key, value] of Object.entries(KNOWN_COMPILER_MAP)) {
        if (key.toLowerCase().includes(preferredStr) || preferredStr.includes(key.toLowerCase())) {
            const matchInAvailable = availableLanguages.find(l => String(l.value) === String(value));
            if (matchInAvailable) return matchInAvailable.value;
        }
    }

    // 4. Fuzzy substring match on title (e.g. "g++20" or "python" or "java 21")
    const matchBySubstring = availableLanguages.find(l => l.title.toLowerCase().includes(preferredStr));
    if (matchBySubstring) return matchBySubstring.value;

    // 5. Default fallback to selected or first
    const selected = availableLanguages.find(l => l.isSelected);
    return selected ? selected.value : availableLanguages[0].value;
}

/**
 * Dynamically populates an HTML <select> element with available compiler options.
 * @param {HTMLSelectElement} selectElement 
 * @param {Array<{ value: string, title: string, isSelected: boolean }>} availableLanguages 
 * @param {string} preferredLang 
 */
function populateLanguageSelector(selectElement, availableLanguages = [], preferredLang = '') {
    if (!selectElement) return;

    const doc = selectElement.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    selectElement.innerHTML = '';
    const resolvedId = resolveLanguageId(preferredLang, availableLanguages);

    if (availableLanguages.length === 0) {
        // Render from KNOWN_COMPILER_MAP if form options not available
        for (const [name, id] of Object.entries(KNOWN_COMPILER_MAP)) {
            const opt = doc.createElement('option');
            opt.value = id;
            opt.textContent = name;
            if (id === resolvedId) opt.selected = true;
            selectElement.appendChild(opt);
        }
        return;
    }

    availableLanguages.forEach(lang => {
        const opt = doc.createElement('option');
        opt.value = lang.value;
        opt.textContent = lang.title;
        if (String(lang.value) === String(resolvedId)) {
            opt.selected = true;
        }
        selectElement.appendChild(opt);
    });
}


/* --- src/submitter.js --- */
/**
 * Codeforces Submitter Engine
 * Submits solution using extracted CSRF token, field names, and logged-in user session cookies.
 */

/**
 * Extracts submission ID from Codeforces response URL or response HTML body.
 * @param {string} responseText 
 * @param {string} responseUrl 
 * @returns {string|null}
 */
function extractSubmissionIdFromResponse(responseText = '', responseUrl = '') {
    // 1. Extract from redirect URL if available
    // e.g. https://codeforces.com/contest/1234/submission/987654321
    // e.g. https://codeforces.com/problemset/submission/1234/987654321
    if (responseUrl) {
        const urlMatch = responseUrl.match(/\/submission\/(\d+)/i) || responseUrl.match(/submissionId=(\d+)/i);
        if (urlMatch) {
            return urlMatch[1];
        }
    }

    if (!responseText) return null;

    // 2. Extract from HTML data attributes e.g. <tr data-submission-id="987654321">
    const dataAttrMatch = responseText.match(/data-submission-id=["']?(\d+)["']?/i);
    if (dataAttrMatch) {
        return dataAttrMatch[1];
    }

    // 3. Extract from submission links e.g. href="/contest/1234/submission/987654321"
    const linkMatch = responseText.match(/\/submission\/(\d+)/i);
    if (linkMatch) {
        return linkMatch[1];
    }

    // 4. Extract from JS variable or inline script e.g. submissionId = 987654321
    const jsVarMatch = responseText.match(/submissionId\s*[:=]\s*["']?(\d+)["']?/i);
    if (jsVarMatch) {
        return jsVarMatch[1];
    }

    return null;
}

/**
 * Builds FormData payload for Codeforces submission form.
 * @param {object} options 
 * @returns {FormData}
 */
function buildSubmissionFormData(options) {
    const {
        csrfToken,
        fields = {},
        programTypeId,
        problemCode,
        sourceCode
    } = options;

    const csrfFieldName = fields.csrfTokenField || 'csrf_token';
    const programTypeIdField = fields.programTypeIdField || 'programTypeId';
    const problemCodeField = fields.problemCodeField || 'submittedProblemCode';
    const sourceField = fields.sourceField || 'source';

    const formData = new FormData();
    formData.append(csrfFieldName, csrfToken || '');
    formData.append('ftaa', (typeof window !== 'undefined' && window.ftaa) || '');
    formData.append('bfaa', (typeof window !== 'undefined' && window.bfaa) || '');
    formData.append('action', 'submitSolutionFormProcessor');
    formData.append(problemCodeField, problemCode || '');
    formData.append(programTypeIdField, programTypeId || '89');
    formData.append(sourceField, sourceCode || '');
    formData.append('tabSize', '4');
    formData.append('sourceFile', '');

    return formData;
}

/**
 * Submits solution code to Codeforces using existing user session.
 * @param {object} options - Submission options
 * @param {string} options.formAction - Submission endpoint URL
 * @param {string} options.csrfToken - CSRF token
 * @param {object} options.fields - Field names mapping
 * @param {string} options.programTypeId - Selected compiler ID
 * @param {string} options.problemCode - Problem code (e.g. "G")
 * @param {string} options.sourceCode - Solution code
 * @param {function} [fetchImpl] - Fetch function implementation
 * @returns {Promise<{
 *   success: boolean,
 *   submissionId: string|null,
 *   redirectUrl: string|null,
 *   error: string|null,
 *   responseText: string
 * }>}
 */
async function submitSolutionToCodeforces(options, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    const {
        formAction,
        csrfToken,
        fields,
        programTypeId,
        problemCode,
        sourceCode
    } = options;

    if (!csrfToken) {
        return { success: false, submissionId: null, redirectUrl: null, error: 'CSRF token is missing', responseText: '' };
    }
    if (!sourceCode || sourceCode.trim().length === 0) {
        return { success: false, submissionId: null, redirectUrl: null, error: 'Source code is empty', responseText: '' };
    }

    if (!fetchImpl) {
        return { success: false, submissionId: null, redirectUrl: null, error: 'Fetch API is not available', responseText: '' };
    }

    // Determine target URL (always absolute against codeforces.com)
    let targetUrl = formAction || (typeof window !== 'undefined' ? window.location.href : '');
    if (targetUrl.startsWith('/')) {
        targetUrl = `https://codeforces.com${targetUrl}`;
    }
    if (!targetUrl.includes('action=submitSolutionFormProcessor')) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl += `${separator}action=submitSolutionFormProcessor`;
    }

    const formData = buildSubmissionFormData({ csrfToken, fields, programTypeId, problemCode, sourceCode });

    try {
        const response = await fetchImpl(targetUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include', // Includes user's logged-in Codeforces session cookies
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const responseText = await response.text();
        const finalUrl = response.url || targetUrl;
        const submissionId = extractSubmissionIdFromResponse(responseText, finalUrl);

        if (response.ok || submissionId) {
            return {
                success: true,
                submissionId,
                redirectUrl: finalUrl,
                error: null,
                responseText
            };
        } else {
            return {
                success: false,
                submissionId: null,
                redirectUrl: finalUrl,
                error: `HTTP Error ${response.status}: ${response.statusText}`,
                responseText
            };
        }
    } catch (err) {
        return {
            success: false,
            submissionId: null,
            redirectUrl: null,
            error: err.message || 'Network submission error',
            responseText: ''
        };
    }
}


/* --- src/testRunner.js --- */
/**
 * Local Test Runner
 * Executes user code against extracted sample tests using the Piston public execution API
 * (https://github.com/engineer-man/piston). Free, no API key required.
 */

const PISTON_EXECUTE_URL = 'https://emkc.org/api/v2/piston/execute';

// Maps Codeforces compiler titles to Piston language identifiers.
// Order matters: more specific patterns should come first.
const CF_TO_PISTON_LANGUAGE = [
    { match: /g\+\+|gnu c\+\+|clang\+\+/i, language: 'cpp' },
    { match: /pypy|python/i, language: 'python' },
    { match: /java\b/i, language: 'java' },
    { match: /kotlin/i, language: 'kotlin' },
    { match: /rust/i, language: 'rust' },
    { match: /^go\b|golang/i, language: 'go' },
    { match: /c#|mono/i, language: 'csharp' },
    { match: /javascript|node\.js/i, language: 'javascript' }
];

/**
 * Resolves a Piston language identifier from a Codeforces compiler title.
 * @param {string} languageTitle - e.g. "GNU G++20 (64 bit)"
 * @returns {string|null}
 */
function resolvePistonLanguage(languageTitle = '') {
    const entry = CF_TO_PISTON_LANGUAGE.find(e => e.match.test(languageTitle));
    return entry ? entry.language : null;
}

/**
 * Normalizes output for comparison: unifies line endings, strips trailing
 * whitespace per line, and drops trailing blank lines. Codeforces judges
 * ignore trailing whitespace, so local comparison should too.
 * @param {string} text
 * @returns {string}
 */
function normalizeOutput(text = '') {
    return text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.replace(/[ \t]+$/g, ''))
        .join('\n')
        .replace(/\n+$/, '');
}

/**
 * Executes source code once against a single stdin input via Piston.
 * @param {object} options
 * @param {string} options.language - Piston language identifier
 * @param {string} options.sourceCode
 * @param {string} options.input
 * @param {function} fetchImpl
 * @returns {Promise<object>} Raw Piston response
 */
async function runSingleTest({ language, sourceCode, input }, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    if (!fetchImpl) throw new Error('Fetch API is not available');

    const response = await fetchImpl(PISTON_EXECUTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language,
            version: '*',
            files: [{ content: sourceCode }],
            stdin: input || ''
        })
    });

    if (!response.ok) {
        throw new Error(`Piston API error: HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Runs source code against all extracted sample tests, sequentially.
 * @param {object} options
 * @param {string} options.languageTitle - Human readable CF language (e.g. "GNU G++20 (64 bit)")
 * @param {string} options.sourceCode
 * @param {Array<{input:string, output:string}>} options.sampleTests
 * @param {function} [fetchImpl]
 * @returns {Promise<{
 *   overallPassed: boolean,
 *   results: Array<{index:number, passed:boolean, status:string, expected:string, actual:string, stderr:string}>,
 *   error: string|null
 * }>}
 */
async function runSampleTests({ languageTitle, sourceCode, sampleTests = [] }, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    const language = resolvePistonLanguage(languageTitle);
    if (!language) {
        return { overallPassed: false, results: [], error: `Unsupported language for local run: "${languageTitle}"` };
    }
    if (!sourceCode || !sourceCode.trim()) {
        return { overallPassed: false, results: [], error: 'Source code is empty' };
    }
    if (!sampleTests || sampleTests.length === 0) {
        return { overallPassed: false, results: [], error: 'No sample tests were found on this page' };
    }

    const results = [];

    for (let i = 0; i < sampleTests.length; i++) {
        const test = sampleTests[i];

        try {
            const execResult = await runSingleTest({ language, sourceCode, input: test.input }, fetchImpl);

            const compileFailed = execResult.compile && execResult.compile.code !== 0;
            if (compileFailed) {
                results.push({
                    index: i + 1,
                    passed: false,
                    status: 'COMPILATION_ERROR',
                    expected: test.output,
                    actual: '',
                    stderr: execResult.compile.stderr || execResult.compile.output || ''
                });
                for (let j = i + 1; j < sampleTests.length; j++) {
                    results.push({ index: j + 1, passed: false, status: 'SKIPPED', expected: sampleTests[j].output, actual: '', stderr: '' });
                }
                break;
            }

            const run = execResult.run || {};
            const actualOutput = run.stdout || '';
            const passed = normalizeOutput(actualOutput) === normalizeOutput(test.output);

            let status = 'WRONG_ANSWER';
            if (passed) {
                status = 'PASSED';
            } else if (run.signal || (run.code !== 0 && run.code !== null)) {
                status = 'RUNTIME_ERROR';
            }

            results.push({
                index: i + 1,
                passed,
                status,
                expected: test.output,
                actual: actualOutput,
                stderr: run.stderr || ''
            });
        } catch (err) {
            results.push({
                index: i + 1,
                passed: false,
                status: 'ERROR',
                expected: test.output,
                actual: '',
                stderr: err.message || String(err)
            });
        }
    }

    const overallPassed = results.length > 0 && results.every(r => r.passed);
    return { overallPassed, results, error: null };
}


/* --- src/verdictPoller.js --- */
/**
 * Codeforces Verdict Poller Engine
 * Repeatedly queries Codeforces contest status API anonymously for submission status until testing completes.
 * Uses ZERO personal user data or handles.
 */

/**
 * Formats raw Codeforces API submission object into clean user-facing status details.
 * @param {object} submission - Submission object from Codeforces API
 * @returns {{
 *   statusKey: string,
 *   formattedText: string,
 *   testCaseNumber: number|null,
 *   isTesting: boolean,
 *   timeMs: number,
 *   memoryBytes: number,
 *   rawVerdict: string|null
 * }}
 */
function formatVerdict(submission) {
    if (!submission) {
        return {
            statusKey: 'TESTING',
            formattedText: 'In Queue...',
            testCaseNumber: null,
            isTesting: true,
            timeMs: 0,
            memoryBytes: 0,
            rawVerdict: null
        };
    }

    const rawVerdict = submission.verdict;
    const passedCount = submission.passedTestCount || 0;
    const testCaseNumber = rawVerdict && rawVerdict !== 'OK' && rawVerdict !== 'TESTING' && rawVerdict !== 'COMPILATION_ERROR' 
        ? passedCount + 1 
        : null;

    const timeMs = submission.timeConsumedMillis || 0;
    const memoryBytes = submission.memoryConsumedBytes || 0;

    if (!rawVerdict || rawVerdict === 'TESTING') {
        return {
            statusKey: 'TESTING',
            formattedText: passedCount > 0 ? `Testing on test ${passedCount + 1}...` : 'Testing...',
            testCaseNumber: passedCount + 1,
            isTesting: true,
            timeMs,
            memoryBytes,
            rawVerdict: 'TESTING'
        };
    }

    switch (rawVerdict) {
        case 'OK':
            return {
                statusKey: 'ACCEPTED',
                formattedText: 'Accepted',
                testCaseNumber: null,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'WRONG_ANSWER':
            return {
                statusKey: 'WRONG_ANSWER',
                formattedText: `Wrong Answer on test ${testCaseNumber}`,
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'TIME_LIMIT_EXCEEDED':
            return {
                statusKey: 'TIME_LIMIT_EXCEEDED',
                formattedText: `Time Limit Exceeded on test ${testCaseNumber}`,
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'MEMORY_LIMIT_EXCEEDED':
            return {
                statusKey: 'MEMORY_LIMIT_EXCEEDED',
                formattedText: `Memory Limit Exceeded on test ${testCaseNumber}`,
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'RUNTIME_ERROR':
            return {
                statusKey: 'RUNTIME_ERROR',
                formattedText: `Runtime Error on test ${testCaseNumber}`,
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'COMPILATION_ERROR':
            return {
                statusKey: 'COMPILATION_ERROR',
                formattedText: 'Compilation Error',
                testCaseNumber: null,
                isTesting: false,
                timeMs: 0,
                memoryBytes: 0,
                rawVerdict
            };
        case 'CHALLENGED':
            return {
                statusKey: 'CHALLENGED',
                formattedText: 'Hacked',
                testCaseNumber: null,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        default:
            return {
                statusKey: rawVerdict,
                formattedText: rawVerdict.replace(/_/g, ' '),
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
    }
}

/**
 * Fetches recent submissions for a contest anonymously from Codeforces public API.
 * @param {string|number} contestId 
 * @param {function} [fetchImpl] 
 * @returns {Promise<Array<object>>}
 */
async function fetchContestSubmissions(contestId, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    if (!contestId || !fetchImpl) return [];
    const url = `https://codeforces.com/api/contest.status?contestId=${encodeURIComponent(contestId)}&from=1&count=20`;

    try {
        const response = await fetchImpl(url);
        if (!response.ok) return [];
        const json = await response.json();
        if (json && json.status === 'OK' && Array.isArray(json.result)) {
            return json.result;
        }
    } catch (e) {
        console.warn('[LeetForces] Codeforces API fetch failed:', e);
    }
    return [];
}

/**
 * Polls Codeforces API anonymously for verdict of a specific submission.
 * @param {object} options 
 * @param {string|number} [options.submissionId] - Submission ID to match
 * @param {string|number} [options.contestId] - Contest ID
 * @param {string} [options.problemIndex] - Problem Index fallback
 * @param {number} [options.intervalMs] - Polling interval in ms (default 2000)
 * @param {number} [options.maxAttempts] - Maximum polling attempts (default 30)
 * @param {function} [options.onUpdate] - Callback function invoked on each status check
 * @param {function} [options.fetchImpl] - Optional custom fetch
 * @returns {Promise<object>} - Resolved final verdict details
 */
async function pollVerdictForSubmission(options = {}) {
    const {
        submissionId,
        contestId,
        problemIndex,
        intervalMs = 2000,
        maxAttempts = 30,
        onUpdate,
        fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)
    } = options;

    let attempts = 0;

    return new Promise(resolve => {
        const checkStatus = async () => {
            attempts++;
            const submissions = await fetchContestSubmissions(contestId, fetchImpl);

            let matchedSub = null;

            if (submissionId) {
                matchedSub = submissions.find(s => String(s.id) === String(submissionId));
            }

            if (!matchedSub && problemIndex) {
                matchedSub = submissions.find(s => 
                    s.problem && String(s.problem.index).toUpperCase() === String(problemIndex).toUpperCase()
                );
            }

            if (!matchedSub && submissions.length > 0) {
                matchedSub = submissions[0];
            }

            const formatted = formatVerdict(matchedSub);
            formatted.attempts = attempts;
            formatted.submissionId = matchedSub ? matchedSub.id : submissionId;

            if (typeof onUpdate === 'function') {
                onUpdate(formatted);
            }

            if (!formatted.isTesting || attempts >= maxAttempts) {
                resolve(formatted);
            } else {
                setTimeout(checkStatus, intervalMs);
            }
        };

        checkStatus();
    });
}


/* --- src/verdictUI.js --- */
/**
 * Codeforces Verdict UI Renderer
 * Renders submission verdicts as a shadcn-style "alert": a soft tinted
 * background with a colored left border, plus a small low-contrast badge
 * for the status label. All colors come from theme.css's semantic tokens
 * via CSS classes — this module has no hardcoded hex values in its markup.
 */

// Mirrors the semantic tokens in theme.css. Kept here (not read from the
// DOM) so getVerdictTheme stays a pure, easily-testable function; keep
// these in sync with --lf-success / --lf-error / --lf-warning / --lf-neutral / --lf-info.
const VERDICT_THEMES = {
    ACCEPTED: { variant: 'success', color: '#4ade80', badgeLabel: 'Accepted', icon: '✓', isPending: false },
    OK: { variant: 'success', color: '#4ade80', badgeLabel: 'Accepted', icon: '✓', isPending: false },
    WRONG_ANSWER: { variant: 'error', color: '#f87171', badgeLabel: 'Wrong answer', icon: '✕', isPending: false },
    TIME_LIMIT_EXCEEDED: { variant: 'warning', color: '#fbbf24', badgeLabel: 'Time limit exceeded', icon: '⏱', isPending: false },
    MEMORY_LIMIT_EXCEEDED: { variant: 'warning', color: '#fbbf24', badgeLabel: 'Memory limit exceeded', icon: '💾', isPending: false },
    RUNTIME_ERROR: { variant: 'error', color: '#f87171', badgeLabel: 'Runtime error', icon: '💥', isPending: false },
    COMPILATION_ERROR: { variant: 'neutral', color: '#a1a1aa', badgeLabel: 'Compilation error', icon: '⚡', isPending: false },
    CHALLENGED: { variant: 'error', color: '#f87171', badgeLabel: 'Hacked', icon: '🎯', isPending: false },
    TESTING: { variant: 'info', color: '#60a5fa', badgeLabel: 'Testing', icon: '⏳', isPending: true }
};

/**
 * Returns theme tokens for a given verdict statusKey.
 * @param {string} statusKey
 * @returns {{ variant: string, color: string, badgeLabel: string, icon: string, isPending: boolean }}
 */
function getVerdictTheme(statusKey = 'TESTING') {
    return VERDICT_THEMES[statusKey] || VERDICT_THEMES.TESTING;
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Renders or updates the verdict result panel element in the UI.
 * @param {HTMLElement} containerEl - Target DOM container
 * @param {object} verdictData - Object returned by formatVerdict / pollVerdictForSubmission
 */
function renderVerdictPanel(containerEl, verdictData = {}) {
    if (!containerEl) return;

    const {
        statusKey = 'TESTING',
        formattedText = 'Testing...',
        submissionId = null,
        timeMs = 0,
        memoryBytes = 0
    } = verdictData;

    const theme = getVerdictTheme(statusKey);
    const memoryMb = (memoryBytes / (1024 * 1024)).toFixed(1);
    
    const colors = {
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24',
        neutral: '#a1a1aa',
        info: '#60a5fa'
    };
    const bgColors = {
        success: 'rgba(74, 222, 128, 0.10)',
        error: 'rgba(248, 113, 113, 0.10)',
        warning: 'rgba(251, 191, 36, 0.10)',
        neutral: 'rgba(161, 161, 170, 0.10)',
        info: 'rgba(96, 165, 250, 0.10)'
    };
    const color = colors[theme.variant] || colors.neutral;
    const bgColor = bgColors[theme.variant] || bgColors.neutral;
    
    const iconStyle = theme.isPending ? 'animation: lfPulse 1.2s infinite ease-in-out;' : '';

    const metaParts = [];
    if (submissionId) metaParts.push(`ID <strong>${escapeHtml(String(submissionId))}</strong>`);
    if (timeMs > 0) metaParts.push(`<strong>${timeMs} ms</strong>`);
    if (memoryBytes > 0) metaParts.push(`<strong>${memoryMb} MB</strong>`);
    if (theme.isPending) metaParts.push('Updating in real time…');

    containerEl.innerHTML = `
        <style>
            @keyframes lfPulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.15); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
            }
        </style>
        <div style="display:flex; flex-direction:column; gap:4px; padding:12px; border-radius:8px; border-left:3px solid ${color}; background:${bgColor}; font-size:13px; margin-top:8px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:600;">
                <span><span style="${iconStyle}">${theme.icon}</span> ${escapeHtml(formattedText)}</span>
                <span style="display:inline-flex; align-items:center; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:600; background:${bgColor}; color:${color};">${escapeHtml(theme.badgeLabel)}</span>
            </div>
            ${metaParts.length > 0 ? `<div style="display:flex; gap:16px; font-size:12px; color:#a1a1aa; margin-top:4px;">${metaParts.map(p => `<span>${p}</span>`).join('')}</div>` : ''}
        </div>
    `;
}


/* --- src/controlPanel.js --- */
/**
 * LeetForces Control Panel
 * Injects a floating Run/Submit control bar into Codeforces problem pages.
 * All visual styling comes from the token + component classes defined in
 * theme.css (loaded once via manifest content_scripts.css) — no hardcoded
 * hex colors or magic-number spacing live here.
 */





const PANEL_ID = 'leetforces-control-panel';

// Single-color mark, sized to match --lf-header-mark (18px box). No animation.
const BRAND_MARK_SVG = `
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 4L11 12L5 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13 20H19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const STATUS_TO_BADGE_VARIANT = {
    PASSED: 'success',
    ACCEPTED: 'success',
    WRONG_ANSWER: 'error',
    RUNTIME_ERROR: 'error',
    ERROR: 'error',
    COMPILATION_ERROR: 'warning',
    TIME_LIMIT_EXCEEDED: 'warning',
    MEMORY_LIMIT_EXCEEDED: 'warning',
    SKIPPED: 'neutral',
    TESTING: 'info'
};

function badgeVariant(status) {
    return STATUS_TO_BADGE_VARIANT[status] || 'neutral';
}

function alertVariantClass(variant) {
    if (variant === 'success' || variant === 'warning' || variant === 'info') return variant;
    if (variant === 'neutral') return 'neutral';
    return 'error';
}

function buildTestResultHtml(r) {
    const variant = badgeVariant(r.status);
    const label = r.passed ? 'Pass' : r.status.replace(/_/g, ' ').toLowerCase();
    const showDiff = !r.passed && r.status !== 'SKIPPED';
    const colors = {
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24',
        neutral: '#a1a1aa',
        info: '#60a5fa'
    };
    const bgColors = {
        success: 'rgba(74, 222, 128, 0.10)',
        error: 'rgba(248, 113, 113, 0.10)',
        warning: 'rgba(251, 191, 36, 0.10)',
        neutral: 'rgba(161, 161, 170, 0.10)',
        info: 'rgba(96, 165, 250, 0.10)'
    };
    const color = colors[variant] || colors.neutral;
    const bgColor = bgColors[variant] || bgColors.neutral;

    return `
        <div style="display:flex; flex-direction:column; gap:4px; padding:12px; border-radius:8px; border-left:3px solid ${color}; background:${bgColor}; font-size:13px; margin-top:8px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:600;">
                <span>Test ${r.index}</span>
                <span style="display:inline-flex; align-items:center; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:600; background:${bgColor}; color:${color};">${escapeHtml(label)}</span>
            </div>
            ${showDiff ? `
                <div style="white-space:pre-wrap; font-family:ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; font-size:12px; color:#a1a1aa; background:#131316; border:1px solid #27272a; border-radius:6px; padding:8px; margin-top:4px;">Expected\n${escapeHtml(r.expected)}</div>
                <div style="white-space:pre-wrap; font-family:ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; font-size:12px; color:#a1a1aa; background:#131316; border:1px solid #27272a; border-radius:6px; padding:8px; margin-top:4px;">Got\n${escapeHtml(r.actual || r.stderr || '(empty)')}</div>
            ` : ''}
        </div>
    `;
}

function buildTestResultsHtml(results) {
    if (!results || results.length === 0) return '';
    return results.map(buildTestResultHtml).join('');
}

function buildRunSummaryHtml(overallPassed, count) {
    const color = overallPassed ? '#4ade80' : '#f87171';
    const bgColor = overallPassed ? 'rgba(74, 222, 128, 0.10)' : 'rgba(248, 113, 113, 0.10)';
    return `
        <div style="display:flex; flex-direction:column; gap:4px; padding:12px; border-radius:8px; border-left:3px solid ${color}; background:${bgColor}; font-size:13px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:600;">
                <span>${overallPassed ? 'All sample tests passed' : 'Some sample tests failed'}</span>
                <span style="display:inline-flex; align-items:center; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:600; background:${bgColor}; color:${color};">${count} test${count === 1 ? '' : 's'}</span>
            </div>
        </div>
    `;
}

function buildMessageHtml(text, variant = 'neutral') {
    const colors = {
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24',
        neutral: '#a1a1aa',
        info: '#60a5fa'
    };
    const bgColors = {
        success: 'rgba(74, 222, 128, 0.10)',
        error: 'rgba(248, 113, 113, 0.10)',
        warning: 'rgba(251, 191, 36, 0.10)',
        neutral: 'rgba(161, 161, 170, 0.10)',
        info: 'rgba(96, 165, 250, 0.10)'
    };
    const color = colors[variant] || colors.neutral;
    const bgColor = bgColors[variant] || bgColors.neutral;
    return `<div style="display:flex; flex-direction:column; gap:4px; padding:12px; border-radius:8px; border-left:3px solid ${color}; background:${bgColor}; font-size:13px;"><div style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:600;"><span>${escapeHtml(text)}</span></div></div>`;
}

function getSelectedLanguageTitle(formDetails, selectEl) {
    if (selectEl && selectEl.value) {
        const opt = (formDetails.availableLanguages || []).find(l => String(l.value) === String(selectEl.value));
        if (opt) return opt.title;
    }
    const selected = (formDetails.availableLanguages || []).find(l => l.isSelected);
    return selected ? selected.title : 'GNU G++20 (64 bit)';
}


/**
 * Injects the Run/Submit control panel into the page. Safe to call once;
 * subsequent calls return the existing panel instead of duplicating it.
 * @param {object} deps
 * @returns {HTMLElement}
 */
function injectControlPanel({
    doc = document,
    editor,
    context,
    formDetails,
    handle,
    submitSolution,
    pollVerdict,
    renderVerdict
}) {
    const existing = doc.getElementById(PANEL_ID);
    if (existing) return existing;

    const panel = doc.createElement('div');
    panel.id = PANEL_ID;
    // Fallback inline styles in case CSS doesn't load
    panel.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        width: 360px;
        max-height: 70vh;
        overflow-y: auto;
        padding: 16px;
        background: #0b0b0d;
        border: 1px solid #27272a;
        border-radius: 12px;
        color: #f4f4f5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    `;

    panel.innerHTML = `
        <div class="lf-header" style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding-bottom:12px; margin-bottom:12px; border-bottom:1px solid #27272a;">
            <div class="lf-header-title" style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:#f4f4f5;">
                <span class="lf-header-mark" style="display:inline-flex; width:18px; height:18px; color:#6366f1; flex-shrink:0;">${BRAND_MARK_SVG}</span>
                <span>LeetForces</span>
            </div>
            <span class="lf-problem-key" style="font-size:12px; color:#a1a1aa; font-family:ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;">${escapeHtml(context.problemKey || '')}</span>
        </div>
        <div class="lf-toolbar" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <select id="leetforces-lang-select" class="lf-select" aria-label="Language" style="appearance:none; -webkit-appearance:none; flex:1; min-width:0; height:34px; padding:0 24px 0 12px; background:#131316; border:1px solid #27272a; border-radius:8px; color:#f4f4f5; font-size:13px; font-family:inherit; cursor:pointer;"></select>
        </div>
        <div class="lf-toolbar" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <button id="leetforces-run-btn" class="lf-btn lf-btn-secondary" type="button" style="display:inline-flex; align-items:center; justify-content:center; height:34px; padding:0 16px; border:1px solid #27272a; border-radius:8px; background:#131316; color:#f4f4f5; font-size:13px; font-weight:500; font-family:inherit; cursor:pointer; flex:1;">Run</button>
            <button id="leetforces-submit-btn" class="lf-btn lf-btn-primary" type="button" style="display:inline-flex; align-items:center; justify-content:center; height:34px; padding:0 16px; border:1px solid #6366f1; border-radius:8px; background:#6366f1; color:#f5f5ff; font-size:13px; font-weight:500; font-family:inherit; cursor:pointer; flex:1;">Submit</button>
        </div>
        <div id="leetforces-run-results" style="margin-top:8px;"></div>
        <div id="leetforces-verdict-panel" style="margin-top:8px;"></div>
    `;
    doc.body.appendChild(panel);

    const langSelect = panel.querySelector('#leetforces-lang-select');
    const runBtn = panel.querySelector('#leetforces-run-btn');
    const submitBtn = panel.querySelector('#leetforces-submit-btn');
    const runResultsEl = panel.querySelector('#leetforces-run-results');
    const verdictEl = panel.querySelector('#leetforces-verdict-panel');

    populateLanguageSelector(langSelect, formDetails.availableLanguages || [], '');

    // Keep formDetails' isSelected flags in sync so submission uses the user's choice.
    langSelect.addEventListener('change', () => {
        (formDetails.availableLanguages || []).forEach(l => {
            l.isSelected = String(l.value) === String(langSelect.value);
        });
    });

    runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        runBtn.textContent = 'Running...';
        runResultsEl.innerHTML = '';

        try {
            const sourceCode = getEditorValue(editor);
            const languageTitle = getSelectedLanguageTitle(formDetails, langSelect);

            const { overallPassed, results, error } = await runSampleTests({
                languageTitle,
                sourceCode,
                sampleTests: context.sampleTests
            });

            if (error) {
                runResultsEl.innerHTML = buildMessageHtml(error, 'error');
            } else {
                runResultsEl.innerHTML = buildRunSummaryHtml(overallPassed, results.length) + buildTestResultsHtml(results);
            }
        } catch (err) {
            runResultsEl.innerHTML = buildMessageHtml(err.message || 'Run failed', 'error');
        } finally {
            runBtn.disabled = false;
            runBtn.textContent = 'Run';
        }
    });

    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        verdictEl.innerHTML = '';

        try {
            const sourceCode = getEditorValue(editor);
            const languageTitle = getSelectedLanguageTitle(formDetails, langSelect);

            const result = await submitSolution(sourceCode, languageTitle);

            if (!result.success) {
                verdictEl.innerHTML = buildMessageHtml(`Submission failed: ${result.error || 'unknown error'}`, 'error');
                return;
            }

            if (!handle) {
                verdictEl.innerHTML = buildMessageHtml(
                    `Submitted (ID ${result.submissionId || '?'}), but couldn't detect your handle to poll the verdict automatically.`,
                    'warning'
                );
                return;
            }

            renderVerdict(verdictEl, { statusKey: 'TESTING', formattedText: 'Submitted, waiting for verdict...' });

            await pollVerdict({
                handle,
                submissionId: result.submissionId,
                onUpdate: (verdictData) => renderVerdict(verdictEl, verdictData)
            });
        } catch (err) {
            verdictEl.innerHTML = buildMessageHtml(err.message || 'Submit failed', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });

    return panel;
}


/* --- src/content.js --- */
/**
 * Main Content Script for LeetForces
 * Orchestrates context extraction, form extraction, floating panel, submit, and verdict polling.
 */










async function initLeetForcesPage(doc = document) {
    try {
        console.log('[LeetForces] Initializing problem page script...');

        const context = extractProblemContext(doc);
        console.log('[LeetForces] Extracted Problem Context:', context);

        const formDetails = extractSubmissionFormDetails(doc, context);
        console.log('[LeetForces] Extracted Form & CSRF Details:', formDetails);

        const submitHandler = async (sourceCode, preferredLang = 'GNU G++20 (64 bit)') => {
            const programTypeId = resolveLanguageId(
                preferredLang,
                (formDetails && formDetails.availableLanguages) || []
            );
            return submitSolutionToCodeforces({
                formAction: formDetails.formAction,
                csrfToken: formDetails.csrfToken,
                fields: formDetails.fields || {},
                programTypeId,
                problemCode: (context && context.problemIndex) || 'A',
                sourceCode
            });
        };

        if (typeof window !== 'undefined') {
            window.__LEETFORCES_DATA__ = {
                context,
                formDetails,
                compilerMap: KNOWN_COMPILER_MAP,
                resolveLanguageId: (lang) => resolveLanguageId(lang, (formDetails && formDetails.availableLanguages) || []),
                populateLanguageSelector: (selectEl, pref) => populateLanguageSelector(selectEl, (formDetails && formDetails.availableLanguages) || [], pref),
                submitSolution: submitHandler,
                pollVerdict: (opts) => pollVerdictForSubmission({
                    ...opts,
                    contestId: context.contestId,
                    problemIndex: context.problemIndex
                }),
                renderVerdict: renderVerdictPanel,
                getVerdictTheme,
                formatVerdict,
                timestamp: Date.now()
            };
        }

        if (context && context.problemKey) {
            const handle = extractLoggedInHandle(doc);
            console.log('[LeetForces] Extracted handle:', handle);

            // Create a simple editor wrapper - for now, we'll use the CF textarea directly
            // The floating panel doesn't have its own editor in this simplified version
            const editor = {
                getValue: () => {
                    const textarea = doc.querySelector('textarea[name="source"]');
                    return textarea ? textarea.value : '';
                }
            };

            injectControlPanel({
                doc,
                editor,
                context,
                formDetails,
                handle,
                submitSolution: submitHandler,
                pollVerdict: (opts) => pollVerdictForSubmission({
                    ...opts,
                    contestId: context.contestId,
                    problemIndex: context.problemIndex
                }),
                renderVerdict: renderVerdictPanel
            });
            console.log('[LeetForces] Control panel injected.');
        } else {
            console.warn('[LeetForces] No problemKey extracted; panel not injected.');
        }

        return { context, formDetails, submitHandler };
    } catch (err) {
        console.error('[LeetForces] Failed to initialize:', err);
        return { context: null, formDetails: null, submitHandler: null, error: err };
    }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const boot = () => {
        initLeetForcesPage(document).catch((err) => {
            console.error('[LeetForces] Boot error:', err);
        });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}


})();

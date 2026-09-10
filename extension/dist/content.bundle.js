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
 * Renders submission verdicts with distinct colors, badges, metrics, and animated pending states.
 */

/**
 * Returns color, background, border, badge, and icon tokens for a given verdict statusKey.
 * @param {string} statusKey 
 * @returns {{
 *   color: string,
 *   bgColor: string,
 *   borderColor: string,
 *   badgeLabel: string,
 *   icon: string,
 *   isPending: boolean
 * }}
 */
function getVerdictTheme(statusKey = 'TESTING') {
    switch (statusKey) {
        case 'ACCEPTED':
        case 'OK':
            return {
                color: '#22c55e',
                bgColor: 'rgba(34, 197, 94, 0.12)',
                borderColor: 'rgba(34, 197, 94, 0.4)',
                badgeLabel: 'ACCEPTED',
                icon: '✓',
                isPending: false
            };
        case 'WRONG_ANSWER':
            return {
                color: '#ef4444',
                bgColor: 'rgba(239, 68, 68, 0.12)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                badgeLabel: 'WRONG ANSWER',
                icon: '✕',
                isPending: false
            };
        case 'TIME_LIMIT_EXCEEDED':
            return {
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.12)',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                badgeLabel: 'TIME LIMIT EXCEEDED',
                icon: '⏱',
                isPending: false
            };
        case 'MEMORY_LIMIT_EXCEEDED':
            return {
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.12)',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                badgeLabel: 'MEMORY LIMIT EXCEEDED',
                icon: '💾',
                isPending: false
            };
        case 'RUNTIME_ERROR':
            return {
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.12)',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                badgeLabel: 'RUNTIME ERROR',
                icon: '💥',
                isPending: false
            };
        case 'COMPILATION_ERROR':
            return {
                color: '#94a3b8',
                bgColor: 'rgba(148, 163, 184, 0.12)',
                borderColor: 'rgba(148, 163, 184, 0.4)',
                badgeLabel: 'COMPILATION ERROR',
                icon: '⚡',
                isPending: false
            };
        case 'CHALLENGED':
            return {
                color: '#ec4899',
                bgColor: 'rgba(236, 72, 153, 0.12)',
                borderColor: 'rgba(236, 72, 153, 0.4)',
                badgeLabel: 'HACKED',
                icon: '🎯',
                isPending: false
            };
        case 'TESTING':
        default:
            return {
                color: '#38bdf8',
                bgColor: 'rgba(56, 189, 248, 0.12)',
                borderColor: 'rgba(56, 189, 248, 0.4)',
                badgeLabel: 'TESTING',
                icon: '⏳',
                isPending: true
            };
    }
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

    containerEl.className = 'leetforces-verdict-card';
    containerEl.style.cssText = `
        background: ${theme.bgColor};
        border: 1px solid ${theme.borderColor};
        color: ${theme.color};
        padding: 16px;
        border-radius: 10px;
        font-family: system-ui, -apple-system, sans-serif;
        margin-top: 12px;
        transition: all 0.3s ease;
    `;

    const spinnerStyle = theme.isPending ? `
        @keyframes leetforcesPulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
        .leetforces-icon-spin {
            display: inline-block;
            animation: leetforcesPulse 1.2s infinite ease-in-out;
        }
    ` : '';

    const iconHtml = theme.isPending 
        ? `<span class="leetforces-icon-spin">${theme.icon}</span>` 
        : `<span>${theme.icon}</span>`;

    containerEl.innerHTML = `
        <style>${spinnerStyle}</style>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.15rem;">
                ${iconHtml}
                <span>${formattedText}</span>
            </div>
            <span style="background: ${theme.borderColor}; color: ${theme.color}; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                ${theme.badgeLabel}
            </span>
        </div>
        <div style="display: flex; gap: 16px; font-size: 0.85rem; opacity: 0.9; margin-top: 6px;">
            ${submissionId ? `<span>ID: <strong>${submissionId}</strong></span>` : ''}
            ${timeMs > 0 ? `<span>Time: <strong>${timeMs} ms</strong></span>` : ''}
            ${memoryBytes > 0 ? `<span>Memory: <strong>${memoryMb} MB</strong></span>` : ''}
            ${theme.isPending ? `<span style="font-style: italic;">Updating in real-time...</span>` : ''}
        </div>
    `;
}


/* --- src/controlPanel.js --- */
/**
 * LeetForces Workspace
 * LeetCode-style split view on Codeforces problem pages:
 * left = problem statement, right = language + editor + Run/Submit + live verdicts.
 * Submits through the logged-in Codeforces session — no file download/upload.
 */








const WORKSPACE_ID = 'leetforces-workspace';
const PANEL_ID = 'leetforces-control-panel'; // kept for tests / legacy queries
const DEFAULT_LANG = 'GNU G++20 (64 bit)';

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function el(doc, tag, attrs = {}, text) {
    const node = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'style') {
            const css = typeof value === 'string'
                ? value
                : Object.entries(value).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${v}`).join(';');
            if (node.style) node.style.cssText = css;
            else node.style = { cssText: css };
        } else if (key === 'id') {
            node.id = value;
            if (node.attributes) node.attributes.id = value;
            if (typeof node.setAttribute === 'function') node.setAttribute('id', value);
        } else if (typeof node.setAttribute === 'function') {
            node.setAttribute(key, value);
        } else {
            node[key] = value;
            if (node.attributes) node.attributes[key] = value;
        }
    }
    if (text !== undefined) node.textContent = text;
    return node;
}

function placeCursorInTextarea(textarea, line, col) {
    try {
        if (!textarea || typeof textarea.setSelectionRange !== 'function') return;
        const offset = computeCursorOffset(String(textarea.value || ''), line, col);
        if (typeof textarea.focus === 'function') textarea.focus();
        textarea.setSelectionRange(offset, offset);
    } catch (_) { /* ignore */ }
}

function safeSaveCode(problemKey, code) {
    if (!problemKey || typeof code !== 'string' || !code.trim()) return;
    try {
        const p = saveCode(problemKey, code);
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) { /* ignore */ }
}

function buildTestResultsHtml(results) {
    if (!results || results.length === 0) return '';
    return results.map(r => {
        const color = r.passed ? '#22c55e' : (r.status === 'SKIPPED' ? '#64748b' : '#ef4444');
        const label = r.passed ? 'PASS' : String(r.status || '').replace(/_/g, ' ');
        const showDiff = !r.passed && r.status !== 'SKIPPED';
        return `
            <div style="border-left:3px solid ${color}; padding:8px 10px; margin-top:8px; font-size:12px; font-family:ui-monospace,Menlo,monospace;">
                <div style="color:${color}; font-weight:700;">Case ${r.index}: ${label}</div>
                ${showDiff ? `
                    <div style="opacity:0.9; white-space:pre-wrap; margin-top:4px; color:#cbd5e1;">Expected:\n${escapeHtml(r.expected)}</div>
                    <div style="opacity:0.9; white-space:pre-wrap; margin-top:4px; color:#cbd5e1;">Output:\n${escapeHtml(r.actual || r.stderr || '(empty)')}</div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderLocalVerdict(container, verdictData = {}) {
    if (!container) return;
    const {
        statusKey = 'TESTING',
        formattedText = 'Testing...',
        submissionId = null,
        timeMs = 0,
        memoryBytes = 0
    } = verdictData;
    const theme = getVerdictTheme(statusKey);
    const memoryMb = memoryBytes ? (memoryBytes / (1024 * 1024)).toFixed(1) : null;

    container.style.cssText = `
        margin-top: 8px; padding: 12px 14px; border-radius: 10px;
        background: ${theme.bgColor}; border: 1px solid ${theme.borderColor}; color: ${theme.color};
        font-family: system-ui, -apple-system, sans-serif;
    `;
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <div style="font-weight:750; font-size:15px;">${theme.icon} ${escapeHtml(formattedText)}</div>
            <span style="font-size:11px; font-weight:700; letter-spacing:0.04em; padding:3px 8px; border-radius:999px; background:${theme.borderColor};">${escapeHtml(theme.badgeLabel)}</span>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:8px; font-size:12px; opacity:0.95;">
            ${submissionId ? `<span>Submission <strong>${escapeHtml(String(submissionId))}</strong></span>` : ''}
            ${timeMs > 0 ? `<span>Time <strong>${timeMs} ms</strong></span>` : ''}
            ${memoryMb ? `<span>Memory <strong>${memoryMb} MB</strong></span>` : ''}
            ${theme.isPending ? `<span style="font-style:italic;">Polling Codeforces…</span>` : ''}
        </div>
    `;
}

/**
 * Injects LeetCode-style workspace. Safe to call multiple times (rebuilds).
 * @returns {Promise<HTMLElement>}
 */
async function injectControlPanel({
    doc = document,
    context = {},
    formDetails = {},
    submitSolution,
    pollVerdict,
    renderVerdict
}) {
    const prev = doc.getElementById(WORKSPACE_ID) || doc.getElementById(PANEL_ID);
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);

    // Hide native CF chrome while workspace is active
    const body = doc.body;
    if (!body) throw new Error('document.body is not available');

    if (!doc.getElementById('leetforces-hide-native')) {
        const style = el(doc, 'style', { id: 'leetforces-hide-native' });
        style.textContent = `
            body.leetforces-active > *:not(#leetforces-workspace):not(script):not(style) { display: none !important; }
            #leetforces-workspace, #leetforces-workspace * { box-sizing: border-box; }
            #leetforces-workspace pre, #leetforces-workspace .problem-statement {
                white-space: pre-wrap; word-break: break-word;
            }
            #leetforces-code-editor:focus { outline: 1px solid #38bdf8; outline-offset: -1px; }
            #leetforces-run-btn:hover, #leetforces-submit-btn:hover { filter: brightness(1.08); }
            #leetforces-run-btn:disabled, #leetforces-submit-btn:disabled { opacity: 0.65; cursor: wait; }
        `;
        (doc.head || body).appendChild(style);
    }
    if (body.classList && body.classList.add) body.classList.add('leetforces-active');
    else body.className = `${body.className || ''} leetforces-active`.trim();

    const workspace = el(doc, 'div', {
        id: WORKSPACE_ID,
        style: `
            position: fixed; inset: 0; z-index: 2147483000;
            display: flex; flex-direction: column;
            background: #0b1120; color: #e2e8f0;
            font-family: system-ui, -apple-system, Segoe UI, sans-serif;
        `
    });

    // Also expose legacy panel id on inner shell for tests
    const shell = el(doc, 'div', {
        id: PANEL_ID,
        style: 'display:flex; flex-direction:column; height:100%; min-height:0;'
    });

    // Top bar
    const top = el(doc, 'div', {
        style: `
            flex:0 0 auto; display:flex; align-items:center; justify-content:space-between;
            gap:12px; padding:10px 14px; border-bottom:1px solid #1e293b; background:#0f172a;
        `
    });
    const topLeft = el(doc, 'div', { style: 'display:flex; align-items:baseline; gap:10px; min-width:0;' });
    topLeft.appendChild(el(doc, 'span', {
        style: 'font-weight:800; font-size:15px; color:#f8fafc; letter-spacing:0.02em;'
    }, 'LeetForces'));
    topLeft.appendChild(el(doc, 'span', {
        style: 'font-size:13px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;'
    }, context.problemName
        ? `${context.problemIndex || ''}. ${context.problemName}`
        : (context.problemKey || 'Problem')));
    const topRight = el(doc, 'div', { style: 'display:flex; align-items:center; gap:8px;' });
    const classicBtn = el(doc, 'button', {
        id: 'leetforces-classic-btn',
        type: 'button',
        style: 'background:#1e293b; border:1px solid #334155; color:#cbd5e1; border-radius:8px; padding:7px 10px; font-size:12px; cursor:pointer;'
    }, 'Classic CF');
    topRight.appendChild(classicBtn);
    top.appendChild(topLeft);
    top.appendChild(topRight);

    // Main split
    const main = el(doc, 'div', {
        style: 'flex:1 1 auto; display:flex; min-height:0;'
    });

    // Left: problem
    const left = el(doc, 'div', {
        id: 'leetforces-problem-pane',
        style: `
            flex: 1 1 48%; min-width: 280px; max-width: 55%;
            overflow: auto; padding: 18px 20px 28px;
            background: #111827; border-right: 1px solid #1e293b;
            color: #e5e7eb; font-size: 14px; line-height: 1.55;
        `
    });
    left.appendChild(el(doc, 'div', {
        style: 'font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; margin-bottom:12px;'
    }, 'Problem'));

    const statement = doc.querySelector && doc.querySelector('.problem-statement');
    if (statement && typeof statement.cloneNode === 'function') {
        const clone = statement.cloneNode(true);
        // neutralize CF absolute positioning quirks
        if (clone.style) clone.style.cssText = 'position:static; width:auto; max-width:100%;';
        left.appendChild(clone);
    } else {
        left.appendChild(el(doc, 'div', { style: 'color:#94a3b8;' },
            'Problem statement could not be cloned. Use Classic CF to read it on the original page.'));
    }

    // Right: IDE
    const right = el(doc, 'div', {
        style: 'flex:1 1 52%; min-width:320px; display:flex; flex-direction:column; min-height:0; background:#0b1120;'
    });

    const toolbar = el(doc, 'div', {
        style: `
            flex:0 0 auto; display:flex; flex-wrap:wrap; align-items:center; gap:8px;
            padding:10px 12px; border-bottom:1px solid #1e293b; background:#0f172a;
        `
    });

    const langSelect = el(doc, 'select', {
        id: 'leetforces-lang-select',
        style: `
            flex:1 1 220px; min-width:180px; background:#111827; border:1px solid #334155;
            color:#e2e8f0; border-radius:8px; padding:8px 10px; font-size:13px;
        `
    });

    const runBtn = el(doc, 'button', {
        id: 'leetforces-run-btn',
        type: 'button',
        style: `
            flex:0 0 auto; padding:8px 14px; border:none; border-radius:8px;
            background:#334155; color:#f8fafc; font-weight:700; font-size:13px; cursor:pointer;
        `
    }, 'Run');

    const submitBtn = el(doc, 'button', {
        id: 'leetforces-submit-btn',
        type: 'button',
        style: `
            flex:0 0 auto; padding:8px 16px; border:none; border-radius:8px;
            background:#22c55e; color:#052e16; font-weight:800; font-size:13px; cursor:pointer;
        `
    }, 'Submit');

    toolbar.appendChild(langSelect);
    toolbar.appendChild(runBtn);
    toolbar.appendChild(submitBtn);

    const codeEditor = el(doc, 'textarea', {
        id: 'leetforces-code-editor',
        spellcheck: 'false',
        style: `
            flex:1 1 auto; min-height:220px; width:100%; resize:none; border:none;
            padding:14px 16px; background:#020617; color:#e2e8f0;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size:13px; line-height:1.5; tab-size:4; white-space:pre; overflow:auto;
        `
    });

    const consolePane = el(doc, 'div', {
        id: 'leetforces-console',
        style: `
            flex:0 0 34%; min-height:140px; max-height:42%; overflow:auto;
            border-top:1px solid #1e293b; background:#0f172a; padding:12px 14px;
        `
    });
    consolePane.appendChild(el(doc, 'div', {
        style: 'font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; margin-bottom:6px;'
    }, 'Console'));
    const runResultsEl = el(doc, 'div', { id: 'leetforces-run-results' });
    const verdictEl = el(doc, 'div', { id: 'leetforces-verdict-panel' });
    consolePane.appendChild(runResultsEl);
    consolePane.appendChild(verdictEl);

    right.appendChild(toolbar);
    right.appendChild(codeEditor);
    right.appendChild(consolePane);

    main.appendChild(left);
    main.appendChild(right);

    shell.appendChild(top);
    shell.appendChild(main);
    workspace.appendChild(shell);
    body.appendChild(workspace);

    // Language default: saved → G++20 (ignore CF page selection)
    let preferredLang = DEFAULT_LANG;
    try {
        const savedLang = await getPreferredLanguage();
        if (savedLang) preferredLang = savedLang;
    } catch (_) { /* ignore */ }

    populateLanguageSelector(
        langSelect,
        (formDetails && formDetails.availableLanguages) || [],
        preferredLang
    );

    langSelect.addEventListener('change', () => {
        try {
            const opt = langSelect.options && langSelect.options[langSelect.selectedIndex];
            if (opt && opt.text) savePreferredLanguage(opt.text);
        } catch (_) { /* ignore */ }
    });

    // Code
    const problemKey = context.problemKey || '';
    let initialCode = DEFAULT_CPP_TEMPLATE;
    try {
        if (problemKey) {
            const saved = await getSavedCode(problemKey);
            if (typeof saved === 'string' && saved.trim()) initialCode = saved;
            else safeSaveCode(problemKey, initialCode);
        }
    } catch (_) { /* ignore */ }
    codeEditor.value = initialCode;
    if (!String(codeEditor.value || '').trim()) codeEditor.value = DEFAULT_CPP_TEMPLATE;
    if (String(codeEditor.value) === DEFAULT_CPP_TEMPLATE) {
        setTimeout(() => placeCursorInTextarea(codeEditor, DEFAULT_CURSOR_LINE, DEFAULT_CURSOR_COLUMN), 40);
    }

    let saveTimer = null;
    const persistCode = () => safeSaveCode(problemKey, String(codeEditor.value || ''));
    codeEditor.addEventListener('input', () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(persistCode, 300);
    });
    codeEditor.addEventListener('keydown', (e) => {
        if (!e || e.key !== 'Tab') return;
        e.preventDefault();
        try {
            const start = codeEditor.selectionStart != null ? codeEditor.selectionStart : String(codeEditor.value || '').length;
            const end = codeEditor.selectionEnd != null ? codeEditor.selectionEnd : start;
            const value = String(codeEditor.value || '');
            codeEditor.value = `${value.slice(0, start)}    ${value.slice(end)}`;
            codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
            persistCode();
        } catch (_) { /* ignore */ }
    });

    classicBtn.addEventListener('click', () => {
        try {
            if (body.classList && body.classList.remove) body.classList.remove('leetforces-active');
            if (workspace.parentNode) workspace.parentNode.removeChild(workspace);
        } catch (_) { /* ignore */ }
    });

    const getSelectedLangTitle = () => {
        try {
            const opt = langSelect.options && langSelect.options[langSelect.selectedIndex];
            return (opt && opt.text) || DEFAULT_LANG;
        } catch (_) {
            return DEFAULT_LANG;
        }
    };

    const getSourceCode = () => {
        let code = '';
        try { code = String(codeEditor.value != null ? codeEditor.value : ''); } catch (_) { code = ''; }
        if (!code.trim()) {
            code = DEFAULT_CPP_TEMPLATE;
            try { codeEditor.value = code; } catch (_) { /* ignore */ }
        }
        return code.replace(/\s+$/, '');
    };

    const showVerdict = (data) => {
        if (typeof renderVerdict === 'function') {
            try { renderVerdict(verdictEl, data); return; } catch (_) { /* fall through */ }
        }
        renderLocalVerdict(verdictEl, data);
    };

    runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        runBtn.textContent = 'Running…';
        runResultsEl.innerHTML = '';
        verdictEl.innerHTML = '';
        try {
            const sourceCode = getSourceCode();
            const { overallPassed, results, error } = await runSampleTests({
                languageTitle: getSelectedLangTitle(),
                sourceCode,
                sampleTests: (context && context.sampleTests) || []
            });
            if (error) {
                runResultsEl.innerHTML = `<div style="color:#ef4444; font-size:13px;">${escapeHtml(error)}</div>`;
            } else {
                runResultsEl.innerHTML = `
                    <div style="color:${overallPassed ? '#22c55e' : '#ef4444'}; font-weight:700; font-size:13px;">
                        ${overallPassed ? `Accepted on all ${results.length} sample(s)` : 'Sample tests failed'}
                    </div>
                    ${buildTestResultsHtml(results)}
                `;
            }
        } catch (err) {
            runResultsEl.innerHTML = `<div style="color:#ef4444; font-size:13px;">${escapeHtml((err && err.message) || 'Run failed')}</div>`;
        } finally {
            runBtn.disabled = false;
            runBtn.textContent = 'Run';
        }
    });

    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
        runResultsEl.innerHTML = '';
        verdictEl.innerHTML = '';
        try {
            const sourceCode = getSourceCode();
            persistCode();

            if (typeof submitSolution !== 'function') {
                throw new Error('Submit handler missing. Reload the extension and refresh this page.');
            }

            showVerdict({ statusKey: 'TESTING', formattedText: 'Submitting to Codeforces…' });

            const result = await submitSolution(sourceCode, getSelectedLangTitle());
            if (!result || !result.success) {
                showVerdict({
                    statusKey: 'WRONG_ANSWER',
                    formattedText: `Submission failed: ${(result && result.error) || 'unknown error'}`
                });
                // Override badge-ish styling for submit errors
                verdictEl.innerHTML = `<div style="color:#ef4444; font-size:13px; padding:4px 0;">Submission failed: ${escapeHtml((result && result.error) || 'unknown error')}</div>`;
                return;
            }

            showVerdict({
                statusKey: 'TESTING',
                formattedText: 'In queue… waiting for verdict',
                submissionId: result.submissionId
            });

            if (typeof pollVerdict === 'function') {
                await pollVerdict({
                    submissionId: result.submissionId,
                    onUpdate: (verdictData) => showVerdict(verdictData)
                });
            }
        } catch (err) {
            verdictEl.innerHTML = `<div style="color:#ef4444; font-size:13px; padding:4px 0;">${escapeHtml((err && err.message) || 'Submit failed')}</div>`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });

    return shell;
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
            await injectControlPanel({
                doc,
                context,
                formDetails,
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

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
        return localStorage.getItem(storageKey);
    } catch (e) {
        console.warn('LeetForces: LocalStorage read failed', e);
        return null;
    }
}

async function saveCode(problemKey, code) {
    if (!problemKey) return;
    const storageKey = STORAGE_KEYS.CODE_PREFIX + problemKey;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.set({ [storageKey]: code }, resolve);
        });
    }

    try {
        localStorage.setItem(storageKey, code);
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
        return localStorage.getItem(storageKey);
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
        localStorage.setItem(storageKey, problemKey);
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}


/* --- src/editorManager.js --- */
/**
 * Editor Manager for LeetForces
 * Manages editor detection, template injection, cursor positioning, and state persistence.
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
 * Detects code editor on the page (Ace, Monaco, CodeMirror, Textarea).
 * @param {Document} doc 
 * @returns {{ type: string, element: Element|null, instance: any|null }}
 */
function detectEditor(doc = document) {
    // 1. Check for Ace Editor
    const aceEl = doc.querySelector('.ace_editor');
    if (aceEl && window.ace) {
        try {
            const aceInstance = window.ace.edit(aceEl);
            if (aceInstance) {
                return { type: 'ace', element: aceEl, instance: aceInstance };
            }
        } catch (e) {
            // Ace instance might be attached on element directly
            if (aceEl.env && aceEl.env.editor) {
                return { type: 'ace', element: aceEl, instance: aceEl.env.editor };
            }
        }
    }

    // 2. Check for Monaco Editor
    const monacoEl = doc.querySelector('.monaco-editor');
    if (monacoEl && window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        if (editors && editors.length > 0) {
            return { type: 'monaco', element: monacoEl, instance: editors[0] };
        }
    }

    // 3. Check for CodeMirror 5
    const cmEl = doc.querySelector('.CodeMirror');
    if (cmEl && cmEl.CodeMirror) {
        return { type: 'codemirror', element: cmEl, instance: cmEl.CodeMirror };
    }

    // 4. Check for standard Textarea (Codeforces default submit textarea or custom)
    const textareaSelectors = [
        'textarea#sourceCodeTextarea',
        'textarea[name="source"]',
        'textarea.source-code',
        '#editor textarea',
        'textarea'
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
 * Gets current value from editor instance.
 * @param {{ type: string, instance: any }} editor 
 * @returns {string}
 */
function getEditorValue(editor) {
    if (!editor || !editor.instance) return '';
    switch (editor.type) {
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
            // Dispatch input/change events for framework listeners
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
 * Initializes problem code:
 * - Checks if saved code exists for this problemKey
 * - Checks if switching to a new problem
 * - Restores saved code if present
 * - Pre-fills with DEFAULT_CPP_TEMPLATE if new problem or empty
 * - Places cursor at line 11, col 9 (inside while loop)
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
        // Saved code exists for this problem (e.g. page refresh) -> restore it!
        codeToApply = savedCode;
    } else {
        // New problem or no saved code -> initialize with default template
        codeToApply = DEFAULT_CPP_TEMPLATE;
        await saveCode(problemKey, codeToApply);
    }

    // Update last visited problem key
    await setLastProblemKey(problemKey);

    // Apply code to editor
    setEditorValue(editor, codeToApply);

    // Position cursor at line 11, col 9 (inside while loop)
    // Only set cursor to default template position if code is default template or new problem
    if (codeToApply === DEFAULT_CPP_TEMPLATE || !savedCode) {
        setTimeout(() => {
            setEditorCursor(editor, DEFAULT_CURSOR_LINE, DEFAULT_CURSOR_COLUMN);
        }, 50);
    }

    // Attach auto-save listener
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

    selectElement.innerHTML = '';
    const resolvedId = resolveLanguageId(preferredLang, availableLanguages);

    if (availableLanguages.length === 0) {
        // Render from KNOWN_COMPILER_MAP if form options not available
        for (const [name, id] of Object.entries(KNOWN_COMPILER_MAP)) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = name;
            if (id === resolvedId) opt.selected = true;
            selectElement.appendChild(opt);
        }
        return;
    }

    availableLanguages.forEach(lang => {
        const opt = document.createElement('option');
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

    // Determine target URL
    let targetUrl = formAction || window.location.href;
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


/* --- src/verdictPoller.js --- */
/**
 * Codeforces Verdict Poller Engine
 * Repeatedly queries Codeforces API for submission status until testing completes.
 */

/**
 * Formats raw Codeforces API verdict into clean user-facing status details.
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
 * Fetches recent submissions for a handle from Codeforces public API.
 * @param {string} handle 
 * @param {function} [fetchImpl] 
 * @returns {Promise<Array<object>>}
 */
async function fetchUserSubmissions(handle, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    if (!handle || !fetchImpl) return [];
    const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10`;

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
 * Polls Codeforces API for verdict of a specific submission.
 * @param {object} options 
 * @param {string} options.handle - User handle
 * @param {string|number} [options.submissionId] - Submission ID to match
 * @param {string|number} [options.contestId] - Contest ID fallback
 * @param {string} [options.problemIndex] - Problem Index fallback
 * @param {number} [options.intervalMs] - Polling interval in ms (default 2000)
 * @param {number} [options.maxAttempts] - Maximum polling attempts (default 30)
 * @param {function} [options.onUpdate] - Callback function invoked on each status check
 * @param {function} [options.fetchImpl] - Optional custom fetch
 * @returns {Promise<object>} - Resolved final verdict details
 */
async function pollVerdictForSubmission(options = {}) {
    const {
        handle,
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
            const submissions = await fetchUserSubmissions(handle, fetchImpl);

            let matchedSub = null;

            if (submissionId) {
                matchedSub = submissions.find(s => String(s.id) === String(submissionId));
            }

            if (!matchedSub && contestId && problemIndex) {
                matchedSub = submissions.find(s => 
                    String(s.contestId) === String(contestId) && 
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


/* --- src/content.js --- */
/**
 * Main Content Script for LeetForces
 * Orchestrates Problem Context Extraction, CSRF & Submit Form Extraction, Editor Initialization, Solution Submission, and Real-Time Verdict Polling.
 */









async function initLeetForcesPage(doc = document) {
    console.log('[LeetForces] Initializing problem page script...');

    // 1. Extract Problem Context
    const context = extractProblemContext(doc);
    console.log('[LeetForces] Extracted Problem Context:', context);

    // 2. Extract CSRF Token & Submission Form Fields (passing context for fallback canonical URLs)
    const formDetails = extractSubmissionFormDetails(doc, context);
    console.log('[LeetForces] Extracted Form & CSRF Details:', formDetails);

    // 3. Submission Handler
    const submitHandler = async (sourceCode, preferredLang = 'GNU G++20 (64 bit)') => {
        const programTypeId = resolveLanguageId(preferredLang, formDetails.availableLanguages);
        return submitSolutionToCodeforces({
            formAction: formDetails.formAction,
            csrfToken: formDetails.csrfToken,
            fields: formDetails.fields,
            programTypeId,
            problemCode: context.problemIndex || 'A',
            sourceCode
        });
    };

    // Store extracted data and helper functions in window object
    if (typeof window !== 'undefined') {
        window.__LEETFORCES_DATA__ = {
            context,
            formDetails,
            compilerMap: KNOWN_COMPILER_MAP,
            resolveLanguageId: (lang) => resolveLanguageId(lang, formDetails.availableLanguages),
            populateLanguageSelector: (selectEl, pref) => populateLanguageSelector(selectEl, formDetails.availableLanguages, pref),
            submitSolution: submitHandler,
            pollVerdict: (opts) => pollVerdictForSubmission({ ...opts, contestId: context.contestId, problemIndex: context.problemIndex }),
            renderVerdict: renderVerdictPanel,
            getVerdictTheme,
            formatVerdict,
            timestamp: Date.now()
        };
    }

    // 4. Detect Editor & Initialize Code Template / Cursor Position
    if (context.problemKey) {
        let attempts = 0;
        const maxAttempts = 10;

        const attemptEditorInit = async () => {
            const editor = detectEditor(doc);
            if (editor.type !== 'unknown' && editor.instance) {
                console.log(`[LeetForces] Detected editor type: ${editor.type}`);
                const result = await initializeProblemEditor(context.problemKey, editor);
                console.log(`[LeetForces] Editor initialized for problem '${context.problemKey}'. New problem: ${result.isNewProblem}`);
                return true;
            }
            return false;
        };

        const success = await attemptEditorInit();
        if (!success) {
            const interval = setInterval(async () => {
                attempts++;
                const ok = await attemptEditorInit();
                if (ok || attempts >= maxAttempts) {
                    clearInterval(interval);
                }
            }, 300);
        }
    }

    return { context, formDetails, submitHandler };
}

// Auto-run on content script load if in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initLeetForcesPage(document));
    } else {
        initLeetForcesPage(document);
    }
}


})();

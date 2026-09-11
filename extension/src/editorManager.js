/**
 * Editor Manager for LeetForces
 * Manages editor detection, template injection, cursor positioning, and state persistence.
 *
 * Chrome content scripts run in an isolated world, so window.ace is invisible.
 * When direct detection fails, we talk to src/pageBridge.js (MAIN world) via CustomEvents.
 */

import { DEFAULT_CPP_TEMPLATE, DEFAULT_CURSOR_LINE, DEFAULT_CURSOR_COLUMN } from './constants.js';
import { getSavedCode, saveCode, getLastProblemKey, setLastProblemKey } from './storage.js';

/**
 * Computes character offset in raw string for target line and column (1-indexed).
 * @param {string} text
 * @param {number} targetLine
 * @param {number} targetCol
 * @returns {number}
 */
export function computeCursorOffset(text, targetLine, targetCol) {
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
        'textarea.source-code',
        'textarea.program-source-text',
        'div.source textarea',
        'div.input textarea',
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
 * Detects code editor on the page (Ace, Monaco, CodeMirror, Textarea, or page bridge).
 * @param {Document} doc
 * @returns {{ type: string, element: Element|null, instance: any|null, bridgeType?: string }}
 */
export function detectEditor(doc = document) {
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
export function getEditorValue(editor) {
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
export function setEditorValue(editor, code) {
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
export function setEditorCursor(editor, line = DEFAULT_CURSOR_LINE, col = DEFAULT_CURSOR_COLUMN) {
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
export async function initializeProblemEditor(problemKey, editor) {
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
export function attachAutoSaveListener(problemKey, editor) {
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

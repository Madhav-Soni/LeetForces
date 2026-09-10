/**
 * LeetForces Control Panel
 * Floating LeetCode-style panel with its own code editor, language select, Run, and Submit.
 * Does not depend on Codeforces Ace (isolated-world safe).
 */

import { runSampleTests } from './testRunner.js';
import { populateLanguageSelector } from './languageMap.js';
import {
    getPreferredLanguage,
    savePreferredLanguage,
    getSavedCode,
    saveCode
} from './storage.js';
import { DEFAULT_CPP_TEMPLATE, DEFAULT_CURSOR_LINE, DEFAULT_CURSOR_COLUMN } from './constants.js';
import { computeCursorOffset, setEditorValue } from './editorManager.js';

const PANEL_ID = 'leetforces-control-panel';
const DEFAULT_LANG = 'GNU G++20 (64 bit)';

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function buildTestResultsHtml(results) {
    if (!results || results.length === 0) return '';
    return results.map(r => {
        const color = r.passed ? '#22c55e' : (r.status === 'SKIPPED' ? '#64748b' : '#ef4444');
        const label = r.passed ? 'PASS' : r.status.replace(/_/g, ' ');
        const showDiff = !r.passed && r.status !== 'SKIPPED';
        return `
            <div style="border-left: 3px solid ${color}; padding: 6px 10px; margin-top: 6px; font-size: 0.78rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
                <div style="color:${color}; font-weight:700;">Test ${r.index}: ${label}</div>
                ${showDiff ? `
                    <div style="opacity:0.85; white-space: pre-wrap; margin-top:4px;">Expected:\n${escapeHtml(r.expected)}</div>
                    <div style="opacity:0.85; white-space: pre-wrap; margin-top:4px;">Got:\n${escapeHtml(r.actual || r.stderr || '(empty)')}</div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function placeCursorInTextarea(textarea, line, col) {
    if (!textarea || typeof textarea.setSelectionRange !== 'function') return;
    const offset = computeCursorOffset(textarea.value || '', line, col);
    if (typeof textarea.focus === 'function') textarea.focus();
    textarea.setSelectionRange(offset, offset);
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

/**
 * Injects the Run/Submit control panel into the page. Safe to call once;
 * subsequent calls return the existing panel instead of duplicating it.
 * @param {object} deps
 * @returns {Promise<HTMLElement>}
 */
export async function injectControlPanel({
    doc = document,
    editor,
    getEditor,
    context,
    formDetails,
    submitSolution,
    pollVerdict,
    renderVerdict
}) {
    const existing = doc.getElementById(PANEL_ID);
    if (existing) return existing;

    const resolvePageEditor = () => {
        if (typeof getEditor === 'function') return getEditor();
        return editor;
    };

    const panel = el(doc, 'div', {
        id: PANEL_ID,
        style: `
            position: fixed; bottom: 16px; right: 16px; z-index: 999999;
            background: #0b1220; border: 1px solid #1e293b; border-radius: 14px;
            padding: 12px; width: min(480px, calc(100vw - 24px)); max-height: min(78vh, 720px);
            display: flex; flex-direction: column; gap: 8px;
            font-family: system-ui, -apple-system, Segoe UI, sans-serif;
            box-shadow: 0 12px 40px rgba(0,0,0,0.55);
            color: #e2e8f0;
        `
    });

    const header = el(doc, 'div', {
        style: 'display:flex; justify-content: space-between; align-items:center; gap:8px;'
    });
    const titleWrap = el(doc, 'div', {
        style: 'display:flex; align-items:baseline; gap:8px; min-width:0;'
    });
    titleWrap.appendChild(el(doc, 'span', {
        style: 'color:#f8fafc; font-weight:750; font-size:0.95rem;'
    }, 'LeetForces'));
    titleWrap.appendChild(el(doc, 'span', {
        style: 'color:#64748b; font-size:0.72rem;'
    }, context.problemKey || ''));
    const minimizeBtn = el(doc, 'button', {
        id: 'leetforces-minimize-btn',
        type: 'button',
        style: 'background:#1e293b; border:1px solid #334155; color:#94a3b8; border-radius:8px; width:28px; height:28px; cursor:pointer; font-size:14px; line-height:1;'
    }, '−');
    header.appendChild(titleWrap);
    header.appendChild(minimizeBtn);

    const langSelect = el(doc, 'select', {
        id: 'leetforces-lang-select',
        style: 'background:#111827; border:1px solid #334155; color:#e2e8f0; border-radius:8px; padding:8px 10px; font-size:0.8rem; width:100%; font-family:inherit;'
    });

    const codeEditor = el(doc, 'textarea', {
        id: 'leetforces-code-editor',
        spellcheck: 'false',
        style: `
            background:#020617; border:1px solid #1e293b; color:#e2e8f0; border-radius:10px;
            padding:10px 12px; font-size:12.5px; line-height:1.45; width:100%; min-height:220px; height:260px;
            resize:vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            tab-size:4; white-space:pre; overflow:auto; box-sizing:border-box;
        `
    });

    const btnRow = el(doc, 'div', { style: 'display:flex; gap:8px;' });
    const runBtn = el(doc, 'button', {
        id: 'leetforces-run-btn',
        type: 'button',
        style: 'flex:1; padding:10px; border:none; border-radius:8px; background:#334155; color:#f8fafc; font-weight:700; cursor:pointer;'
    }, 'Run');
    const submitBtn = el(doc, 'button', {
        id: 'leetforces-submit-btn',
        type: 'button',
        style: 'flex:1; padding:10px; border:none; border-radius:8px; background:#22c55e; color:#052e16; font-weight:700; cursor:pointer;'
    }, 'Submit');
    btnRow.appendChild(runBtn);
    btnRow.appendChild(submitBtn);

    const runResultsEl = el(doc, 'div', {
        id: 'leetforces-run-results',
        style: 'overflow:auto; max-height:160px;'
    });
    const verdictEl = el(doc, 'div', { id: 'leetforces-verdict-panel' });

    panel.appendChild(header);
    panel.appendChild(langSelect);
    panel.appendChild(codeEditor);
    panel.appendChild(btnRow);
    panel.appendChild(runResultsEl);
    panel.appendChild(verdictEl);
    doc.body.appendChild(panel);

    // Language: prefer saved choice, else G++20 — ignore CF form's random selected option
    const savedLang = await getPreferredLanguage();
    const preferredLang = savedLang || DEFAULT_LANG;
    populateLanguageSelector(langSelect, formDetails.availableLanguages, preferredLang);

    langSelect.addEventListener('change', () => {
        const selectedText = langSelect.options[langSelect.selectedIndex]?.text;
        if (selectedText) savePreferredLanguage(selectedText);
    });

    // Load saved code or C++ template into the panel editor
    const problemKey = context.problemKey || '';
    let initialCode = DEFAULT_CPP_TEMPLATE;
    if (problemKey) {
        const saved = await getSavedCode(problemKey);
        if (saved && saved.trim().length > 0) initialCode = saved;
        else await saveCode(problemKey, initialCode);
    }
    codeEditor.value = initialCode;

    if (initialCode === DEFAULT_CPP_TEMPLATE) {
        setTimeout(() => placeCursorInTextarea(codeEditor, DEFAULT_CURSOR_LINE, DEFAULT_CURSOR_COLUMN), 30);
    }

    let saveTimer = null;
    const persistCode = () => {
        if (!problemKey) return;
        const code = codeEditor.value;
        saveCode(problemKey, code);
        const pageEditor = resolvePageEditor();
        if (pageEditor && pageEditor.instance) {
            try { setEditorValue(pageEditor, code); } catch (_) { /* ignore */ }
        }
    };
    codeEditor.addEventListener('input', () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(persistCode, 350);
    });

    codeEditor.addEventListener('keydown', (e) => {
        if (!e || e.key !== 'Tab') return;
        e.preventDefault();
        const start = codeEditor.selectionStart ?? codeEditor.value.length;
        const end = codeEditor.selectionEnd ?? start;
        const value = codeEditor.value || '';
        codeEditor.value = value.slice(0, start) + '    ' + value.slice(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        codeEditor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    let minimized = false;
    minimizeBtn.addEventListener('click', () => {
        minimized = !minimized;
        [langSelect, codeEditor, btnRow, runResultsEl, verdictEl].forEach(node => {
            if (node) node.style.display = minimized ? 'none' : (node === btnRow ? 'flex' : '');
        });
        minimizeBtn.textContent = minimized ? '+' : '−';
    });

    const getSelectedLangTitle = () => {
        return langSelect.options[langSelect.selectedIndex]?.text || DEFAULT_LANG;
    };

    const getSourceCode = () => (codeEditor.value || '').trimEnd();

    runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        runBtn.textContent = 'Running...';
        runResultsEl.innerHTML = '';
        verdictEl.innerHTML = '';

        try {
            const sourceCode = getSourceCode();
            if (!sourceCode.trim()) {
                runResultsEl.innerHTML = `<div style="color:#ef4444; font-size:0.8rem;">Source code is empty</div>`;
                return;
            }

            const { overallPassed, results, error } = await runSampleTests({
                languageTitle: getSelectedLangTitle(),
                sourceCode,
                sampleTests: context.sampleTests
            });

            if (error) {
                runResultsEl.innerHTML = `<div style="color:#ef4444; font-size:0.8rem; margin-top:4px;">${escapeHtml(error)}</div>`;
            } else {
                runResultsEl.innerHTML = `
                    <div style="color:${overallPassed ? '#22c55e' : '#ef4444'}; font-weight:700; font-size:0.85rem; margin-top:4px;">
                        ${overallPassed ? `All ${results.length} sample test(s) passed` : 'Some sample tests failed'}
                    </div>
                    ${buildTestResultsHtml(results)}
                `;
            }
        } catch (err) {
            runResultsEl.innerHTML = `<div style="color:#ef4444; font-size:0.8rem;">${escapeHtml(err.message || 'Run failed')}</div>`;
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
            const sourceCode = getSourceCode();
            if (!sourceCode.trim()) {
                verdictEl.innerHTML = `<div style="color:#ef4444; font-size:0.85rem; padding:8px 0;">Submission failed: Source code is empty</div>`;
                return;
            }

            persistCode();

            const result = await submitSolution(sourceCode, getSelectedLangTitle());

            if (!result.success) {
                verdictEl.innerHTML = `<div style="color:#ef4444; font-size:0.85rem; padding:8px 0;">Submission failed: ${escapeHtml(result.error || 'unknown error')}</div>`;
                return;
            }

            renderVerdict(verdictEl, { statusKey: 'TESTING', formattedText: 'Submitted, waiting for verdict...' });

            await pollVerdict({
                submissionId: result.submissionId,
                onUpdate: (verdictData) => renderVerdict(verdictEl, verdictData)
            });
        } catch (err) {
            verdictEl.innerHTML = `<div style="color:#ef4444; font-size:0.85rem; padding:8px 0;">${escapeHtml(err.message || 'Submit failed')}</div>`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });

    return panel;
}

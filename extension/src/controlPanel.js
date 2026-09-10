/**
 * LeetForces Workspace
 * LeetCode-style split view on Codeforces problem pages:
 * left = problem statement, right = language + editor + Run/Submit + live verdicts.
 * Submits through the logged-in Codeforces session — no file download/upload.
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
import { computeCursorOffset } from './editorManager.js';
import { getVerdictTheme } from './verdictUI.js';

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
export async function injectControlPanel({
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

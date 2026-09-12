/**
 * LeetForces Workspace
 * LeetCode-style split view on Codeforces problem pages:
 * left = problem statement, right = language + editor + Submit + live verdicts.
 * Submits through the logged-in Codeforces session — no file download/upload.
 *
 * All visual styling (colors, spacing, buttons, alerts) comes from
 * theme.css's design tokens and component classes — this file should not
 * define its own competing token/color system. theme.css is loaded once
 * globally via manifest.json's content_scripts, so its custom properties
 * and .lf-* classes are available here without any injection.
 */

import { populateLanguageSelector, getLanguageFamily } from './languageMap.js';
import {
    getPreferredLanguage,
    savePreferredLanguage,
    getSavedCode,
    saveCode
} from './storage.js';
import { getBoilerplate } from './boilerplates.js';
import { computeCursorOffset, offsetToLineCol } from './editorManager.js';
import { getVerdictTheme, renderVerdictPanel } from './verdictUI.js';

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
        } else if (typeof node.setAttribute === 'function') {
            node.setAttribute(key, value);
            if (key === 'id') node.id = value;
        } else {
            node[key] = value;
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

function safeSaveCode(problemKey, languageFamily, code) {
    if (!problemKey || typeof code !== 'string' || !code.trim()) return;
    try {
        const p = saveCode(problemKey, languageFamily, code);
        if (p && typeof p.catch === 'function') p.catch(() => { });
    } catch (_) { /* ignore */ }
}

/** Wraps a one-line message in the same alert style as everything else. */
function buildInlineAlert(variant, message) {
    return `<div class="lf-alert lf-alert-${variant}"><div class="lf-alert-title">${escapeHtml(message)}</div></div>`;
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

    const body = doc.body;
    if (!body) throw new Error('document.body is not available');

    if (!doc.getElementById('leetforces-hide-native')) {
        const style = el(doc, 'style', { id: 'leetforces-hide-native' });
        style.textContent = `
            body.leetforces-active > *:not(#leetforces-workspace):not(script):not(style) { display: none !important; }
            #leetforces-workspace, #leetforces-workspace * { box-sizing: border-box; }
            #leetforces-workspace pre, #leetforces-workspace .problem-statement { white-space: pre-wrap; word-break: break-word; }
            #leetforces-code-editor:focus { outline: 1px solid var(--lf-accent); outline-offset: -1px; }
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
            background: var(--lf-background); color: var(--lf-foreground);
            font-family: var(--lf-font-sans);
        `
    });

    const shell = el(doc, 'div', {
        id: PANEL_ID,
        style: 'display:flex; flex-direction:column; height:100%; min-height:0; border:none; border-radius:0; background:transparent;'
    });

    const top = el(doc, 'div', {
        class: 'lf-header',
        style: `
            flex:0 0 auto; justify-content:space-between;
            padding:10px 14px; background:var(--lf-surface);
            margin-bottom:0; border-radius:0;
        `
    });
    const topLeft = el(doc, 'div', { class: 'lf-header-title', style: 'min-width:0;' });
    topLeft.appendChild(el(doc, 'span', { style: 'font-weight:800; font-size:15px; color:var(--lf-foreground); letter-spacing:0.02em;' }, 'LeetForces'));
    topLeft.appendChild(el(doc, 'span', {
        class: 'lf-problem-key',
        style: 'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;'
    }, context.problemName
        ? `${context.problemIndex || ''}. ${context.problemName}`
        : (context.problemKey || 'Problem')));
    const topRight = el(doc, 'div', { style: 'display:flex; align-items:center; gap:8px;' });
    const classicBtn = el(doc, 'button', {
        id: 'leetforces-classic-btn',
        type: 'button',
        class: 'lf-btn'
    }, 'Classic CF');
    topRight.appendChild(classicBtn);
    top.appendChild(topLeft);
    top.appendChild(topRight);

    const main = el(doc, 'div', { style: 'flex:1 1 auto; display:flex; min-height:0;' });

    const left = el(doc, 'div', {
        id: 'leetforces-problem-pane',
        style: `
            flex: 1 1 48%; min-width: 280px; max-width: 55%;
            overflow: auto; padding: 18px 20px 28px;
            background: var(--lf-surface); border-right: 1px solid var(--lf-border);
            color: var(--lf-foreground); font-size: var(--lf-text-base); line-height: 1.55;
        `
    });
    left.appendChild(el(doc, 'div', { style: 'font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--lf-muted-foreground); margin-bottom:12px;' }, 'Problem'));
    if (!doc.getElementById('leetforces-sample-fix')) {
        const sampleFixStyle = el(doc, 'style', { id: 'leetforces-sample-fix' });
        sampleFixStyle.textContent = `
            #leetforces-problem-pane .sample-test { background: var(--lf-background) !important; border: 1px solid var(--lf-border) !important; border-radius: var(--lf-radius-md) !important; margin-bottom: 14px !important; overflow: hidden !important; }
            #leetforces-problem-pane .sample-test .title,
            #leetforces-problem-pane .input .title,
            #leetforces-problem-pane .output .title { background: var(--lf-surface-hover) !important; color: var(--lf-muted-foreground) !important; font-weight: 700 !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; padding: 6px 10px !important; }
            #leetforces-problem-pane .input, #leetforces-problem-pane .output { background: var(--lf-background) !important; }
            #leetforces-problem-pane .input pre,
            #leetforces-problem-pane .output pre,
            #leetforces-problem-pane .sample-test pre,
            #leetforces-problem-pane .input .test-example-line,
            #leetforces-problem-pane .input div { background: var(--lf-background) !important; color: var(--lf-foreground) !important; font-family: var(--lf-font-mono) !important; font-size: 13px !important; padding: 2px 12px !important; margin: 0 !important; white-space: pre-wrap !important; word-break: break-word !important; }
            #leetforces-problem-pane .input pre { padding: 10px 12px !important; }
            #leetforces-problem-pane .problem-statement > .header { margin-bottom: 18px; }
            #leetforces-problem-pane .problem-statement .title { font-size: 19px; font-weight: 800; color: var(--lf-foreground); margin-bottom: 10px; }
            #leetforces-problem-pane .problem-statement .time-limit,
            #leetforces-problem-pane .problem-statement .memory-limit { font-size: 12.5px; color: var(--lf-muted-foreground); margin: 2px 0; }
            #leetforces-problem-pane .problem-statement .section-title { font-size: 14px; font-weight: 700; color: var(--lf-foreground); margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--lf-border); }
            #leetforces-problem-pane .problem-statement p { margin: 10px 0; }
            #leetforces-problem-pane .problem-statement strong { color: var(--lf-foreground); }
            #leetforces-problem-pane .problem-statement a { color: var(--lf-info, #60a5fa); }
            #leetforces-workspace ::-webkit-scrollbar { width: 10px; height: 10px; }
            #leetforces-workspace ::-webkit-scrollbar-track { background: transparent; }
            #leetforces-workspace ::-webkit-scrollbar-thumb { background: var(--lf-border-strong); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
            #leetforces-workspace ::-webkit-scrollbar-thumb:hover { background: var(--lf-muted-foreground); }
        `;
        const styleTarget = doc.head || doc.body || doc.documentElement;
        if (styleTarget && typeof styleTarget.appendChild === 'function') styleTarget.appendChild(sampleFixStyle);
    }
    const statement = doc.querySelector && doc.querySelector('.problem-statement');
    if (statement && typeof statement.cloneNode === 'function') {
        const clone = statement.cloneNode(true);
        if (clone.style) clone.style.cssText = 'position:static; width:auto; max-width:100%;';
        left.appendChild(clone);
    } else {
        left.appendChild(el(doc, 'div', { style: 'color:var(--lf-muted-foreground);' }, 'Problem statement could not be cloned. Use Classic CF to read it on the original page.'));
    }

    const right = el(doc, 'div', { style: 'flex:1 1 52%; min-width:320px; display:flex; flex-direction:column; min-height:0; background:var(--lf-background);' });
    const toolbar = el(doc, 'div', { class: 'lf-toolbar', style: `
            flex:0 0 auto; flex-wrap:wrap;
            padding:10px 12px; border-bottom:1px solid var(--lf-border); background:var(--lf-surface);
            margin-bottom:0;
        ` });
    const langSelect = el(doc, 'select', { id: 'leetforces-lang-select', class: 'lf-select', style: 'min-width:180px;' });
    const submitBtn = el(doc, 'button', { id: 'leetforces-submit-btn', type: 'button', class: 'lf-btn lf-btn-primary' }, 'Submit');
    toolbar.appendChild(langSelect);
    toolbar.appendChild(submitBtn);
    const codeEditor = el(doc, 'textarea', { id: 'leetforces-code-editor', spellcheck: 'false', style: `
            flex:1 1 auto; min-height:220px; width:100%; resize:none; border:none;
            padding:14px 16px; background:var(--lf-background); color:var(--lf-foreground);
            font-family: var(--lf-font-mono);
            font-size:13px; line-height:1.5; tab-size:4; white-space:pre; overflow:auto;
        ` });
    const consolePane = el(doc, 'div', { id: 'leetforces-console', style: `
            flex:0 0 34%; min-height:140px; max-height:42%; overflow:auto;
            border-top:1px solid var(--lf-border); background:var(--lf-surface); padding:12px 14px;
        ` });
    consolePane.appendChild(el(doc, 'div', { style: 'font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--lf-muted-foreground); margin-bottom:6px;' }, 'Console'));
    const verdictEl = el(doc, 'div', { id: 'leetforces-verdict-panel' });
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

    let preferredLang = DEFAULT_LANG;
    try { const savedLang = await getPreferredLanguage(); if (savedLang) preferredLang = savedLang; } catch (_) {}
    populateLanguageSelector(langSelect, (formDetails && formDetails.availableLanguages) || [], preferredLang);
    const problemKey = context.problemKey || '';
    const loadCodeForCurrentLanguage = async () => {
        const opt = langSelect.options && langSelect.options[langSelect.selectedIndex];
        const langTitle = (opt && opt.text) || DEFAULT_LANG;
        const languageFamily = getLanguageFamily(langTitle) || 'C++';
        let codeToApply = '';
        try { if (problemKey) { const saved = await getSavedCode(problemKey, languageFamily); if (typeof saved === 'string' && saved.trim()) codeToApply = saved; } } catch (_) {}
        let usedBoilerplate = false;
        if (!codeToApply) { const boilerplate = getBoilerplate(languageFamily); codeToApply = boilerplate ? boilerplate.code : ''; usedBoilerplate = true; if (problemKey) safeSaveCode(problemKey, languageFamily, codeToApply); }
        codeEditor.value = codeToApply;
        if (usedBoilerplate) { const boilerplate = getBoilerplate(languageFamily); if (boilerplate) { const { line, col } = offsetToLineCol(boilerplate.code, boilerplate.cursorOffset); setTimeout(() => placeCursorInTextarea(codeEditor, line, col), 40); } }
        return languageFamily;
    };
    let currentLanguageFamily = await loadCodeForCurrentLanguage();
    langSelect.addEventListener('change', async () => { try { const opt = langSelect.options && langSelect.options[langSelect.selectedIndex]; if (opt && opt.text) savePreferredLanguage(opt.text); } catch (_) {} currentLanguageFamily = await loadCodeForCurrentLanguage(); });
    let saveTimer = null;
    const persistCode = () => safeSaveCode(problemKey, currentLanguageFamily, String(codeEditor.value || ''));
    codeEditor.addEventListener('input', () => { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(persistCode, 300); });
    codeEditor.addEventListener('keydown', (e) => { if (!e || e.key !== 'Tab') return; e.preventDefault(); try { const start = codeEditor.selectionStart != null ? codeEditor.selectionStart : String(codeEditor.value || '').length; const end = codeEditor.selectionEnd != null ? codeEditor.selectionEnd : start; const value = String(codeEditor.value || ''); codeEditor.value = `${value.slice(0, start)}    ${value.slice(end)}`; codeEditor.selectionStart = codeEditor.selectionEnd = start + 4; persistCode(); } catch (_) {} });
    classicBtn.addEventListener('click', () => { try { if (body.classList && body.classList.remove) body.classList.remove('leetforces-active'); if (workspace.parentNode) workspace.parentNode.removeChild(workspace); } catch (_) {} });
    const getSelectedLangTitle = () => { try { const opt = langSelect.options && langSelect.options[langSelect.selectedIndex]; return (opt && opt.text) || DEFAULT_LANG; } catch (_) { return DEFAULT_LANG; } };
    const getSourceCode = () => { let code = ''; try { code = String(codeEditor.value != null ? codeEditor.value : ''); } catch (_) { code = ''; } if (!code.trim()) { const fallback = getBoilerplate(currentLanguageFamily || 'C++'); code = fallback ? fallback.code : ''; try { codeEditor.value = code; } catch (_) {} } return code.replace(/\s+$/g, ''); };
    const showVerdict = (data) => { const renderer = typeof renderVerdict === 'function' ? renderVerdict : renderVerdictPanel; try { renderer(verdictEl, data); } catch (_) {} };
    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
        verdictEl.innerHTML = '';
        try {
            const sourceCode = getSourceCode();
            persistCode();
            if (typeof submitSolution !== 'function') throw new Error('Submit handler missing. Reload the extension and refresh this page.');
            showVerdict({ statusKey: 'TESTING', formattedText: 'Submitting to Codeforces…' });
            const result = await submitSolution(sourceCode, getSelectedLangTitle());
            if (!result || !result.success) { verdictEl.innerHTML = buildInlineAlert('error', `Submission failed: ${(result && result.error) || 'unknown error'}`); return; }
            showVerdict({ statusKey: 'TESTING', formattedText: 'In queue… waiting for verdict', submissionId: result.submissionId });
            if (typeof pollVerdict === 'function') {
                await pollVerdict({ submissionId: result.submissionId, onUpdate: (verdictData) => showVerdict(verdictData) });
            }
        } catch (err) {
            verdictEl.innerHTML = buildInlineAlert('error', (err && err.message) || 'Submit failed');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });
    return shell;
}
/**
 * LeetForces Workspace
 * LeetCode-style split view on Codeforces problem pages:
 * left = problem statement, right = language + editor + Run/Submit + live verdicts.
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
import { getVerdictTheme, renderVerdictPanel } from './verdictUI.js';
import { getRatingColor } from './contextExtractor.js';
import { createCodeMirrorEditor } from './codeMirrorEditor.js';

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
            // Fallback for non-DOM mock nodes (e.g. in tests) that have no setAttribute.
            node[key] = value;
        }
    }
    if (text !== undefined) node.textContent = text;
    return node;
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

    // Hide native CF chrome while workspace is active
    const body = doc.body;
    if (!body) throw new Error('document.body is not available');

    // Structural rules only — no color/token definitions here.
    // All colors, spacing, and component styling come from theme.css.
    if (!doc.getElementById('leetforces-hide-native')) {
        const style = el(doc, 'style', { id: 'leetforces-hide-native' });
        style.textContent = `
            body.leetforces-active > *:not(#leetforces-workspace):not(script):not(style) { display: none !important; }
            #leetforces-workspace, #leetforces-workspace * { box-sizing: border-box; }
            #leetforces-workspace pre, #leetforces-workspace .problem-statement {
                white-space: pre-wrap; word-break: break-word;
            }
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

    // Also expose legacy panel id on inner shell for tests. theme.css has a
    // #leetforces-control-panel rule (border + border-radius) meant for an
    // embedded panel, not this fullscreen overlay — explicitly override it.
    const shell = el(doc, 'div', {
        id: PANEL_ID,
        style: 'display:flex; flex-direction:column; height:100%; min-height:0; border:none; border-radius:0; background:transparent;'
    });

    // Top bar
    const top = el(doc, 'div', {
        class: 'lf-header',
        style: `
            flex:0 0 auto; justify-content:space-between;
            padding:10px 14px; background:var(--lf-surface);
            margin-bottom:0; border-radius:0;
        `
    });
    const topLeft = el(doc, 'div', { class: 'lf-header-title', style: 'min-width:0; display:flex; align-items:center; gap:8px;' });
    const logoMark = el(doc, 'span', {
        style: `
            display:inline-flex; align-items:center; justify-content:center;
            width:22px; height:22px; border-radius:6px; flex:0 0 auto;
            background:var(--lf-foreground); color:var(--lf-background);
            font-weight:800; font-size:13px; font-family:var(--lf-font-mono);
        `
    }, 'C');
    topLeft.appendChild(logoMark);
    topLeft.appendChild(el(doc, 'span', {
        style: 'font-weight:800; font-size:15px; color:var(--lf-foreground); letter-spacing:0.02em;'
    }, 'Codeforces'));
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
    }, 'Exit');
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
            background: var(--lf-surface); border-right: 1px solid var(--lf-border);
            color: var(--lf-foreground); font-size: var(--lf-text-base); line-height: 1.55;
        `
    });
    // Breadcrumb back-link: target depends on whether this is a problemset
    // page or a live contest page.
    const isProblemsetPage = /\/problemset\/problem\//.test(doc.location ? doc.location.href : (typeof window !== 'undefined' ? window.location.href : ''));
    const backHref = isProblemsetPage
        ? '/problemset'
        : (context.contestId ? `/contest/${context.contestId}` : '/problemset');
    const backLink = el(doc, 'a', {
        href: backHref,
        style: `
            display:inline-flex; align-items:center; gap:6px; font-size:13px;
            color:var(--lf-muted-foreground); text-decoration:none; margin-bottom:14px;
        `
    }, `\u2190 Back to ${isProblemsetPage ? 'problemset' : 'contest'}`);
    left.appendChild(backLink);

    const statement = doc.querySelector && doc.querySelector('.problem-statement');

    left.appendChild(el(doc, 'h1', {
        style: 'font-size:22px; font-weight:800; color:var(--lf-foreground); margin:0 0 12px;'
    }, context.problemName
        ? `${context.problemIndex || ''}. ${context.problemName}`
        : (context.problemKey || 'Problem')));

    const metaRow = el(doc, 'div', { style: 'display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:16px;' });
    let metaRowHasContent = false;
    if (context.rating != null) {
        const ratingColor = getRatingColor(context.rating);
        metaRow.appendChild(el(doc, 'span', {
            style: `
                font-size:12px; font-weight:700; padding:5px 12px; border-radius:999px;
                background:${ratingColor}; color:#0b0b0d;
            `
        }, `\u2605 ${context.rating}`));
        metaRowHasContent = true;
    }
    // Real time/memory limits, pulled from CF's own statement markup.
    const timeLimitText = statement ? (statement.querySelector('.time-limit') || {}).textContent : null;
    const memoryLimitText = statement ? (statement.querySelector('.memory-limit') || {}).textContent : null;
    if (timeLimitText || memoryLimitText) {
        const limitParts = [timeLimitText, memoryLimitText]
            .filter(Boolean)
            .map(t => t.replace(/^(time limit per test:|memory limit per test:)\s*/i, '').trim());
        metaRow.appendChild(el(doc, 'span', {
            style: `
                font-size:11.5px; font-weight:600; padding:5px 12px; border-radius:999px;
                background:var(--lf-surface-hover); color:var(--lf-muted-foreground);
            `
        }, `\u23f1 ${limitParts.join(' \u00b7 ')}`));
        metaRowHasContent = true;
    }
    (context.tags || []).forEach(tag => {
        metaRow.appendChild(el(doc, 'span', {
            style: `
                font-size:11px; font-weight:600; padding:5px 10px; border-radius:999px;
                background:var(--lf-surface-hover); color:var(--lf-muted-foreground);
            `
        }, tag));
        metaRowHasContent = true;
    });
    if (metaRowHasContent) left.appendChild(metaRow);

    // Fixes low-contrast sample test blocks: CF's own stylesheet gives these
    // a light background + dark text, which is nearly invisible once the
    // panel's dark theme is applied. Scoped to #leetforces-problem-pane so
    // it can't leak out and affect the rest of the Codeforces page.
    if (!doc.getElementById('leetforces-sample-fix')) {
        const sampleFixStyle = el(doc, 'style', { id: 'leetforces-sample-fix' });
        sampleFixStyle.textContent = `
            #leetforces-problem-pane .sample-test {
                background: var(--lf-background) !important;
                border: 1px solid var(--lf-border) !important;
                border-radius: var(--lf-radius-md) !important;
                margin-bottom: 14px !important;
                overflow: hidden !important;
            }
            #leetforces-problem-pane .sample-test .title,
            #leetforces-problem-pane .input .title,
            #leetforces-problem-pane .output .title {
                background: var(--lf-surface-hover) !important;
                color: var(--lf-muted-foreground) !important;
                font-weight: 700 !important;
                font-size: 12px !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
                padding: 6px 10px !important;
            }
            #leetforces-problem-pane .input,
            #leetforces-problem-pane .output {
                background: var(--lf-background) !important;
            }
            #leetforces-problem-pane .input pre,
            #leetforces-problem-pane .output pre,
            #leetforces-problem-pane .sample-test pre,
            #leetforces-problem-pane .input .test-example-line,
            #leetforces-problem-pane .input div {
                background: var(--lf-background) !important;
                color: var(--lf-foreground) !important;
                font-family: var(--lf-font-mono) !important;
                font-size: 13px !important;
                padding: 2px 12px !important;
                margin: 0 !important;
                white-space: pre-wrap !important;
                word-break: break-word !important;
            }
            #leetforces-problem-pane .input pre {
                padding: 10px 12px !important;
            }

            /* Problem statement typography: CF's cloned markup has no
               consistent hierarchy on its own, so we impose one. */
            #leetforces-problem-pane .problem-statement > .header { margin-bottom: 18px; }
            #leetforces-problem-pane .problem-statement .title {
                font-size: 19px; font-weight: 800; color: var(--lf-foreground);
                margin-bottom: 10px;
            }
            #leetforces-problem-pane .problem-statement .time-limit,
            #leetforces-problem-pane .problem-statement .memory-limit {
                font-size: 12.5px; color: var(--lf-muted-foreground); margin: 2px 0;
            }
            #leetforces-problem-pane .problem-statement .section-title {
                font-size: 14px; font-weight: 700; color: var(--lf-foreground);
                margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--lf-border);
            }
            #leetforces-problem-pane .problem-statement p { margin: 10px 0; }
            #leetforces-problem-pane .problem-statement strong { color: var(--lf-foreground); }
            #leetforces-problem-pane .problem-statement a { color: var(--lf-info, #60a5fa); }

            /* Slim, dark scrollbars instead of the OS-default light ones. */
            #leetforces-workspace ::-webkit-scrollbar { width: 10px; height: 10px; }
            #leetforces-workspace ::-webkit-scrollbar-track { background: transparent; }
            #leetforces-workspace ::-webkit-scrollbar-thumb {
                background: var(--lf-border-strong); border-radius: 999px;
                border: 2px solid transparent; background-clip: padding-box;
            }
            #leetforces-workspace ::-webkit-scrollbar-thumb:hover { background: var(--lf-muted-foreground); }
        `;
        const styleTarget = doc.head || doc.body || doc.documentElement;
        if (styleTarget && typeof styleTarget.appendChild === 'function') {
            styleTarget.appendChild(sampleFixStyle);
        }
    }

    if (statement && typeof statement.cloneNode === 'function') {
        const clone = statement.cloneNode(true);
        // neutralize CF absolute positioning quirks
        if (clone.style) clone.style.cssText = 'position:static; width:auto; max-width:100%;';
        // Remove CF's native title + time/memory limit lines — we render
        // our own equivalents above (heading + pills), so keeping these
        // would just duplicate the same information.
        clone.querySelectorAll('.header .title, .time-limit, .memory-limit').forEach(node => node.remove());
        // Remove CF's raw sample blocks — replaced below with custom
        // "Example N" cards (with copy buttons) built from already-
        // extracted sample data, rather than restyling CF's markup in place.
        clone.querySelectorAll('.sample-tests, .sample-test').forEach(node => node.remove());
        left.appendChild(clone);
    } else {
        left.appendChild(el(doc, 'div', { style: 'color:var(--lf-muted-foreground);' },
            'Problem statement could not be cloned. Use Classic CF to read it on the original page.'));
    }

    const sampleTests = (context && context.sampleTests) || [];
    if (sampleTests.length > 0) {
        const examplesWrap = el(doc, 'div', { style: 'margin-top:8px;' });
        examplesWrap.appendChild(el(doc, 'div', {
            style: 'font-size:14px; font-weight:700; color:var(--lf-foreground); margin-bottom:10px;'
        }, 'Examples'));

        sampleTests.forEach((test, i) => {
            const card = el(doc, 'div', {
                style: `
                    border:1px solid var(--lf-border); border-radius:var(--lf-radius-md);
                    margin-bottom:12px; overflow:hidden; background:var(--lf-background);
                `
            });
            const cardHeader = el(doc, 'div', {
                style: `
                    display:flex; align-items:center; justify-content:space-between;
                    padding:8px 12px; background:var(--lf-surface-hover);
                    font-size:12px; font-weight:700; color:var(--lf-foreground);
                `
            });
            cardHeader.appendChild(el(doc, 'span', {}, `Example ${i + 1}`));
            const copyBtn = el(doc, 'button', {
                type: 'button',
                style: `
                    font-size:11px; font-weight:600; padding:3px 9px; border-radius:6px;
                    border:1px solid var(--lf-border); background:var(--lf-surface);
                    color:var(--lf-muted-foreground); cursor:pointer;
                `
            }, 'Copy');
            copyBtn.addEventListener('click', () => {
                const text = `Input:\n${test.input}\n\nOutput:\n${test.output}`;
                try {
                    if (doc.defaultView && doc.defaultView.navigator && doc.defaultView.navigator.clipboard) {
                        doc.defaultView.navigator.clipboard.writeText(text);
                    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(text);
                    }
                    const original = copyBtn.textContent;
                    copyBtn.textContent = 'Copied';
                    setTimeout(() => { copyBtn.textContent = original; }, 1200);
                } catch (_) { /* ignore */ }
            });
            cardHeader.appendChild(copyBtn);
            card.appendChild(cardHeader);

            const body = el(doc, 'div', { style: 'display:flex; flex-wrap:wrap;' });
            [['Input', test.input], ['Output', test.output]].forEach(([label, value]) => {
                const col = el(doc, 'div', { style: 'flex:1 1 50%; min-width:140px; padding:10px 12px;' });
                col.appendChild(el(doc, 'div', {
                    style: 'font-size:10.5px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--lf-muted-foreground); margin-bottom:4px;'
                }, label));
                col.appendChild(el(doc, 'pre', {
                    style: 'margin:0; font-family:var(--lf-font-mono); font-size:12.5px; color:var(--lf-foreground); white-space:pre-wrap; word-break:break-word;'
                }, value));
                body.appendChild(col);
            });
            card.appendChild(body);
            examplesWrap.appendChild(card);
        });

        left.appendChild(examplesWrap);
    }

    // Right: IDE
    const right = el(doc, 'div', {
        style: 'flex:1 1 52%; min-width:320px; display:flex; flex-direction:column; min-height:0; background:var(--lf-background);'
    });

    const toolbar = el(doc, 'div', {
        class: 'lf-toolbar',
        style: `
            flex:0 0 auto; flex-wrap:wrap;
            padding:10px 12px; border-bottom:1px solid var(--lf-border); background:var(--lf-surface);
            margin-bottom:0;
        `
    });

    const langSelect = el(doc, 'select', {
        id: 'leetforces-lang-select',
        class: 'lf-select',
        style: 'flex:0 1 220px; min-width:160px;'
    });

    const submitBtn = el(doc, 'button', {
        id: 'leetforces-submit-btn',
        type: 'button',
        class: 'lf-btn lf-btn-primary',
        style: 'flex:0 0 auto; padding-left:24px; padding-right:24px;'
    }, 'Submit');

    toolbar.appendChild(langSelect);
    toolbar.appendChild(submitBtn);

    const codeEditorMount = el(doc, 'div', {
        id: 'leetforces-code-editor',
        style: 'flex:1 1 auto; min-height:220px; width:100%; overflow:hidden; display:flex;'
    });
    // Actual CodeMirror instance is created just below, after boilerplate
    // resolution, since it needs initial content + a language up front.

    const consolePane = el(doc, 'div', {
        id: 'leetforces-console',
        style: `
            flex:0 0 0px; max-height:0; overflow:hidden;
            border-top:0 solid var(--lf-border); background:var(--lf-surface); padding:0 14px;
            transition:flex-basis 150ms ease, max-height 150ms ease, padding 150ms ease;
        `
    });
    consolePane.appendChild(el(doc, 'div', {
        style: 'font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--lf-muted-foreground); margin-bottom:6px; padding-top:12px;'
    }, 'Console'));
    const verdictEl = el(doc, 'div', { id: 'leetforces-verdict-panel' });
    consolePane.appendChild(verdictEl);

    /** Reveals the console pane the first time it's actually needed (on Submit). */
    const revealConsole = () => {
        consolePane.style.cssText = `
            flex:0 0 34%; min-height:140px; max-height:42%; overflow:auto;
            border-top:1px solid var(--lf-border); background:var(--lf-surface); padding:12px 14px;
        `;
    };

    right.appendChild(toolbar);
    right.appendChild(codeEditorMount);
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

    const problemKey = context.problemKey || '';

    /** Resolves the code + language family that should be loaded right now. */
    const resolveCodeForCurrentLanguage = async () => {
        const opt = langSelect.options && langSelect.options[langSelect.selectedIndex];
        const langTitle = (opt && (opt.getAttribute('data-full-title') || opt.text)) || DEFAULT_LANG;
        const languageFamily = getLanguageFamily(langTitle) || 'C++';

        let code = '';
        try {
            if (problemKey) {
                const saved = await getSavedCode(problemKey, languageFamily);
                if (typeof saved === 'string' && saved.trim()) code = saved;
            }
        } catch (_) { /* ignore */ }

        let usedBoilerplate = false;
        if (!code) {
            const boilerplate = getBoilerplate(languageFamily);
            code = boilerplate ? boilerplate.code : '';
            usedBoilerplate = true;
            if (problemKey) safeSaveCode(problemKey, languageFamily, code);
        }

        return { languageFamily, code, usedBoilerplate };
    };

    // Resolve the initial language + code BEFORE creating the editor,
    // since CodeMirror needs both up front.
    const initial = await resolveCodeForCurrentLanguage();
    let currentLanguageFamily = initial.languageFamily;

    const cmEditor = createCodeMirrorEditor(doc, codeEditorMount, initial.code, initial.languageFamily);
    if (initial.usedBoilerplate) {
        const boilerplate = getBoilerplate(initial.languageFamily);
        if (boilerplate) setTimeout(() => cmEditor.setCursorOffset(boilerplate.cursorOffset), 40);
    }

    langSelect.addEventListener('change', async () => {
        try {
            const opt = langSelect.options && langSelect.options[langSelect.selectedIndex];
            const fullTitle = opt && (opt.getAttribute('data-full-title') || opt.text);
            if (fullTitle) savePreferredLanguage(fullTitle);
        } catch (_) { /* ignore */ }

        const resolved = await resolveCodeForCurrentLanguage();
        currentLanguageFamily = resolved.languageFamily;
        cmEditor.setLanguage(resolved.languageFamily);
        cmEditor.setValue(resolved.code);
        if (resolved.usedBoilerplate) {
            const boilerplate = getBoilerplate(resolved.languageFamily);
            if (boilerplate) setTimeout(() => cmEditor.setCursorOffset(boilerplate.cursorOffset), 40);
        }
    });

    let saveTimer = null;
    const persistCode = () => safeSaveCode(problemKey, currentLanguageFamily, String(cmEditor.getValue() || ''));
    cmEditor.onChange(() => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(persistCode, 300);
    });
    // Tab-key indentation is handled natively by CodeMirror's own keymap
    // (see codeMirrorEditor.js) — no manual textarea-style handler needed.

    classicBtn.addEventListener('click', () => {
        try {
            if (body.classList && body.classList.remove) body.classList.remove('leetforces-active');
            if (workspace.parentNode) workspace.parentNode.removeChild(workspace);
        } catch (_) { /* ignore */ }
    });

    const getSelectedLangTitle = () => {
        try {
            const opt = langSelect.options && langSelect.options[langSelect.selectedIndex];
            return (opt && (opt.getAttribute('data-full-title') || opt.text)) || DEFAULT_LANG;
        } catch (_) {
            return DEFAULT_LANG;
        }
    };

    const getSourceCode = () => {
        let code = '';
        try { code = String(cmEditor.getValue() || ''); } catch (_) { code = ''; }
        if (!code.trim()) {
            const fallback = getBoilerplate(currentLanguageFamily || 'C++');
            code = fallback ? fallback.code : '';
            try { cmEditor.setValue(code); } catch (_) { /* ignore */ }
        }
        return code.replace(/\s+$/g, '');
    };

    // Falls back to the real renderVerdictPanel (same function used by
    // content.js in normal operation) rather than maintaining a second,
    // separately-drifting copy of the same rendering logic.
    const showVerdict = (data) => {
        const renderer = typeof renderVerdict === 'function' ? renderVerdict : renderVerdictPanel;
        try { renderer(verdictEl, data); } catch (_) { /* ignore */ }
    };

    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
        verdictEl.innerHTML = '';
        try {
            const sourceCode = getSourceCode();
            persistCode();

            if (typeof submitSolution !== 'function') {
                throw new Error('Submit handler missing. Reload the extension and refresh this page.');
            }

            showVerdict({ statusKey: 'TESTING', formattedText: 'Submitting to Codeforces…' });

            // Captured BEFORE the POST so the poller can reject any
            // submission older than this moment — the safety net that
            // stops an old verdict for this problem from ever being
            // reported as if it belonged to this new attempt.
            const submitStartedAtSeconds = Math.floor(Date.now() / 1000);

            const result = await submitSolution(sourceCode, getSelectedLangTitle());
            if (!result || !result.success) {
                verdictEl.innerHTML = buildInlineAlert('error', `Submission failed: ${(result && result.error) || 'unknown error'}`);
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
                    minCreationTimeSeconds: submitStartedAtSeconds,
                    onUpdate: (verdictData) => showVerdict(verdictData)
                });
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
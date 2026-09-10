/**
 * LeetForces Control Panel
 * Injects a floating Run/Submit control bar into Codeforces problem pages.
 * Displays ZERO personal user data.
 */

import { getEditorValue } from './editorManager.js';
import { runSampleTests } from './testRunner.js';
import { populateLanguageSelector } from './languageMap.js';
import { getPreferredLanguage, savePreferredLanguage } from './storage.js';

const PANEL_ID = 'leetforces-control-panel';

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
            <div style="border-left: 3px solid ${color}; padding: 6px 10px; margin-top: 6px; font-size: 0.78rem; font-family: monospace;">
                <div style="color:${color}; font-weight:700;">Test ${r.index}: ${label}</div>
                ${showDiff ? `
                    <div style="opacity:0.85; white-space: pre-wrap; margin-top:4px;">Expected:\n${escapeHtml(r.expected)}</div>
                    <div style="opacity:0.85; white-space: pre-wrap; margin-top:4px;">Got:\n${escapeHtml(r.actual || r.stderr || '(empty)')}</div>
                ` : ''}
            </div>
        `;
    }).join('');
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

    const resolveEditor = () => {
        if (typeof getEditor === 'function') return getEditor();
        return editor;
    };

    const panel = doc.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 999999;
        background: #0f172a; border: 1px solid #1e293b; border-radius: 12px;
        padding: 14px; width: 360px; max-height: 70vh; overflow-y: auto;
        font-family: system-ui, sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,0.45);
    `;

    panel.innerHTML = `
        <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:10px;">
            <span style="color:#e2e8f0; font-weight:700; font-size:0.9rem;">LeetForces</span>
            <span style="color:#64748b; font-size:0.75rem;">${escapeHtml(context.problemKey || '')}</span>
        </div>
        <select id="leetforces-lang-select" style="background:#1e293b; border:1px solid #334155; color:#e2e8f0; border-radius:6px; padding:6px 10px; font-size:0.8rem; width:100%; margin-bottom:10px; font-family:inherit;"></select>
        <div style="display:flex; gap:8px; margin-bottom:10px;">
            <button id="leetforces-run-btn" style="flex:1; padding:10px; border:none; border-radius:8px; background:#334155; color:#e2e8f0; font-weight:700; cursor:pointer;">Run</button>
            <button id="leetforces-submit-btn" style="flex:1; padding:10px; border:none; border-radius:8px; background:#22c55e; color:#052e16; font-weight:700; cursor:pointer;">Submit</button>
        </div>
        <div id="leetforces-run-results"></div>
        <div id="leetforces-verdict-panel"></div>
    `;
    doc.body.appendChild(panel);

    const langSelect = panel.querySelector('#leetforces-lang-select');
    const runBtn = panel.querySelector('#leetforces-run-btn');
    const submitBtn = panel.querySelector('#leetforces-submit-btn');
    const runResultsEl = panel.querySelector('#leetforces-run-results');
    const verdictEl = panel.querySelector('#leetforces-verdict-panel');

    // Populate language selector with saved preference
    const savedLang = await getPreferredLanguage();
    const defaultSelected = (formDetails.availableLanguages || []).find(l => l.isSelected);
    const preferredLang = savedLang || (defaultSelected ? defaultSelected.title : 'GNU G++20 (64 bit)');

    populateLanguageSelector(langSelect, formDetails.availableLanguages, preferredLang);

    // Save language choice on change
    langSelect.addEventListener('change', () => {
        const selectedText = langSelect.options[langSelect.selectedIndex]?.text;
        if (selectedText) {
            savePreferredLanguage(selectedText);
        }
    });

    const getSelectedLangTitle = () => {
        return langSelect.options[langSelect.selectedIndex]?.text || 'GNU G++20 (64 bit)';
    };

    runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        runBtn.textContent = 'Running...';
        runResultsEl.innerHTML = '';

        try {
            const sourceCode = getEditorValue(resolveEditor());
            const languageTitle = getSelectedLangTitle();

            const { overallPassed, results, error } = await runSampleTests({
                languageTitle,
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
            const sourceCode = getEditorValue(resolveEditor());
            const languageTitle = getSelectedLangTitle();

            const result = await submitSolution(sourceCode, languageTitle);

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

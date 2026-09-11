/**
 * LeetForces Control Panel
 * Injects a floating Run/Submit control bar into Codeforces problem pages.
 * All visual styling comes from the token + component classes defined in
 * theme.css (loaded once via manifest content_scripts.css) — no hardcoded
 * hex colors or magic-number spacing live here.
 */

import { getEditorValue } from './editorManager.js';
import { runSampleTests } from './testRunner.js';
import { populateLanguageSelector } from './languageMap.js';

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
export function injectControlPanel({
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

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

    return `
        <div class="lf-alert lf-alert-${alertVariantClass(variant)}">
            <div class="lf-alert-title">
                <span>Test ${r.index}</span>
                <span class="lf-badge lf-badge-${variant}">${escapeHtml(label)}</span>
            </div>
            ${showDiff ? `
                <div class="lf-alert-diff">Expected\n${escapeHtml(r.expected)}</div>
                <div class="lf-alert-diff">Got\n${escapeHtml(r.actual || r.stderr || '(empty)')}</div>
            ` : ''}
        </div>
    `;
}

function buildTestResultsHtml(results) {
    if (!results || results.length === 0) return '';
    return `<div class="lf-results-stack">${results.map(buildTestResultHtml).join('')}</div>`;
}

function buildRunSummaryHtml(overallPassed, count) {
    const variant = overallPassed ? 'success' : 'error';
    return `
        <div class="lf-alert lf-alert-${variant}">
            <div class="lf-alert-title">
                <span>${overallPassed ? 'All sample tests passed' : 'Some sample tests failed'}</span>
                <span class="lf-badge lf-badge-${variant}">${count} test${count === 1 ? '' : 's'}</span>
            </div>
        </div>
    `;
}

function buildMessageHtml(text, variant = 'neutral') {
    return `<div class="lf-alert lf-alert-${alertVariantClass(variant)}"><div class="lf-alert-title"><span>${escapeHtml(text)}</span></div></div>`;
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
    // Only positioning/sizing stays inline — all visual chrome (background,
    // border, radius, color) is defined on #leetforces-control-panel in theme.css.
    panel.style.cssText = `
        position: fixed;
        bottom: var(--lf-space-6);
        right: var(--lf-space-6);
        z-index: 999999;
        width: 360px;
        max-height: 70vh;
        overflow-y: auto;
        padding: var(--lf-space-4);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    `;

    panel.innerHTML = `
        <div class="lf-header">
            <div class="lf-header-title">
                <span class="lf-header-mark">${BRAND_MARK_SVG}</span>
                <span>LeetForces</span>
            </div>
            <span class="lf-problem-key">${escapeHtml(context.problemKey || '')}</span>
        </div>
        <div class="lf-toolbar">
            <select id="leetforces-lang-select" class="lf-select" aria-label="Language"></select>
        </div>
        <div class="lf-toolbar">
            <button id="leetforces-run-btn" class="lf-btn lf-btn-secondary" type="button">Run</button>
            <button id="leetforces-submit-btn" class="lf-btn lf-btn-primary" type="button">Submit</button>
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

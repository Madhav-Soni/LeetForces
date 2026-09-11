/**
 * Codeforces Verdict UI Renderer
 * Renders submission verdicts as a shadcn-style "alert": a soft tinted
 * background with a colored left border, plus a small low-contrast badge
 * for the status label. All colors come from theme.css's semantic tokens
 * via CSS classes — this module has no hardcoded hex values in its markup.
 */

// Mirrors the semantic tokens in theme.css. Kept here (not read from the
// DOM) so getVerdictTheme stays a pure, easily-testable function; keep
// these in sync with --lf-success / --lf-error / --lf-warning / --lf-neutral / --lf-info.
const VERDICT_THEMES = {
    ACCEPTED: { variant: 'success', color: '#4ade80', badgeLabel: 'Accepted', icon: '✓', isPending: false },
    OK: { variant: 'success', color: '#4ade80', badgeLabel: 'Accepted', icon: '✓', isPending: false },
    WRONG_ANSWER: { variant: 'error', color: '#f87171', badgeLabel: 'Wrong answer', icon: '✕', isPending: false },
    TIME_LIMIT_EXCEEDED: { variant: 'warning', color: '#fbbf24', badgeLabel: 'Time limit exceeded', icon: '⏱', isPending: false },
    MEMORY_LIMIT_EXCEEDED: { variant: 'warning', color: '#fbbf24', badgeLabel: 'Memory limit exceeded', icon: '💾', isPending: false },
    RUNTIME_ERROR: { variant: 'error', color: '#f87171', badgeLabel: 'Runtime error', icon: '💥', isPending: false },
    COMPILATION_ERROR: { variant: 'neutral', color: '#a1a1aa', badgeLabel: 'Compilation error', icon: '⚡', isPending: false },
    CHALLENGED: { variant: 'error', color: '#f87171', badgeLabel: 'Hacked', icon: '🎯', isPending: false },
    TESTING: { variant: 'info', color: '#60a5fa', badgeLabel: 'Testing', icon: '⏳', isPending: true }
};

/**
 * Returns theme tokens for a given verdict statusKey.
 * @param {string} statusKey
 * @returns {{ variant: string, color: string, badgeLabel: string, icon: string, isPending: boolean }}
 */
export function getVerdictTheme(statusKey = 'TESTING') {
    return VERDICT_THEMES[statusKey] || VERDICT_THEMES.TESTING;
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Renders or updates the verdict result panel element in the UI.
 * @param {HTMLElement} containerEl - Target DOM container
 * @param {object} verdictData - Object returned by formatVerdict / pollVerdictForSubmission
 */
export function renderVerdictPanel(containerEl, verdictData = {}) {
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
    const color = colors[theme.variant] || colors.neutral;
    const bgColor = bgColors[theme.variant] || bgColors.neutral;
    
    const iconStyle = theme.isPending ? 'animation: lfPulse 1.2s infinite ease-in-out;' : '';

    const metaParts = [];
    if (submissionId) metaParts.push(`ID <strong>${escapeHtml(String(submissionId))}</strong>`);
    if (timeMs > 0) metaParts.push(`<strong>${timeMs} ms</strong>`);
    if (memoryBytes > 0) metaParts.push(`<strong>${memoryMb} MB</strong>`);
    if (theme.isPending) metaParts.push('Updating in real time…');

    containerEl.innerHTML = `
        <style>
            @keyframes lfPulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.15); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
            }
        </style>
        <div style="display:flex; flex-direction:column; gap:4px; padding:12px; border-radius:8px; border-left:3px solid ${color}; background:${bgColor}; font-size:13px; margin-top:8px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:600;">
                <span><span style="${iconStyle}">${theme.icon}</span> ${escapeHtml(formattedText)}</span>
                <span style="display:inline-flex; align-items:center; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:600; background:${bgColor}; color:${color};">${escapeHtml(theme.badgeLabel)}</span>
            </div>
            ${metaParts.length > 0 ? `<div style="display:flex; gap:16px; font-size:12px; color:#a1a1aa; margin-top:4px;">${metaParts.map(p => `<span>${p}</span>`).join('')}</div>` : ''}
        </div>
    `;
}

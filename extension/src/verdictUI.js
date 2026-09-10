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
export function getVerdictTheme(statusKey = 'TESTING') {
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

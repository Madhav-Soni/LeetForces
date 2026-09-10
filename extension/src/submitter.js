/**
 * Codeforces Submitter Engine
 * Submits solution using extracted CSRF token, field names, and logged-in user session cookies.
 */

/**
 * Extracts submission ID from Codeforces response URL or response HTML body.
 * @param {string} responseText 
 * @param {string} responseUrl 
 * @returns {string|null}
 */
export function extractSubmissionIdFromResponse(responseText = '', responseUrl = '') {
    // 1. Extract from redirect URL if available
    // e.g. https://codeforces.com/contest/1234/submission/987654321
    // e.g. https://codeforces.com/problemset/submission/1234/987654321
    if (responseUrl) {
        const urlMatch = responseUrl.match(/\/submission\/(\d+)/i) || responseUrl.match(/submissionId=(\d+)/i);
        if (urlMatch) {
            return urlMatch[1];
        }
    }

    if (!responseText) return null;

    // 2. Extract from HTML data attributes e.g. <tr data-submission-id="987654321">
    const dataAttrMatch = responseText.match(/data-submission-id=["']?(\d+)["']?/i);
    if (dataAttrMatch) {
        return dataAttrMatch[1];
    }

    // 3. Extract from submission links e.g. href="/contest/1234/submission/987654321"
    const linkMatch = responseText.match(/\/submission\/(\d+)/i);
    if (linkMatch) {
        return linkMatch[1];
    }

    // 4. Extract from JS variable or inline script e.g. submissionId = 987654321
    const jsVarMatch = responseText.match(/submissionId\s*[:=]\s*["']?(\d+)["']?/i);
    if (jsVarMatch) {
        return jsVarMatch[1];
    }

    return null;
}

/**
 * Builds FormData payload for Codeforces submission form.
 * @param {object} options 
 * @returns {FormData}
 */
export function buildSubmissionFormData(options) {
    const {
        csrfToken,
        fields = {},
        programTypeId,
        problemCode,
        sourceCode
    } = options;

    const csrfFieldName = fields.csrfTokenField || 'csrf_token';
    const programTypeIdField = fields.programTypeIdField || 'programTypeId';
    const problemCodeField = fields.problemCodeField || 'submittedProblemCode';
    const sourceField = fields.sourceField || 'source';

    const formData = new FormData();
    formData.append(csrfFieldName, csrfToken || '');
    formData.append('ftaa', (typeof window !== 'undefined' && window.ftaa) || '');
    formData.append('bfaa', (typeof window !== 'undefined' && window.bfaa) || '');
    formData.append('action', 'submitSolutionFormProcessor');
    formData.append(problemCodeField, problemCode || '');
    formData.append(programTypeIdField, programTypeId || '89');
    formData.append(sourceField, sourceCode || '');
    formData.append('tabSize', '4');
    formData.append('sourceFile', '');

    return formData;
}

/**
 * Submits solution code to Codeforces using existing user session.
 * @param {object} options - Submission options
 * @param {string} options.formAction - Submission endpoint URL
 * @param {string} options.csrfToken - CSRF token
 * @param {object} options.fields - Field names mapping
 * @param {string} options.programTypeId - Selected compiler ID
 * @param {string} options.problemCode - Problem code (e.g. "G")
 * @param {string} options.sourceCode - Solution code
 * @param {function} [fetchImpl] - Fetch function implementation
 * @returns {Promise<{
 *   success: boolean,
 *   submissionId: string|null,
 *   redirectUrl: string|null,
 *   error: string|null,
 *   responseText: string
 * }>}
 */
export async function submitSolutionToCodeforces(options, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    const {
        formAction,
        csrfToken,
        fields,
        programTypeId,
        problemCode,
        sourceCode
    } = options;

    if (!csrfToken) {
        return { success: false, submissionId: null, redirectUrl: null, error: 'CSRF token is missing', responseText: '' };
    }
    if (!sourceCode || sourceCode.trim().length === 0) {
        return { success: false, submissionId: null, redirectUrl: null, error: 'Source code is empty', responseText: '' };
    }

    if (!fetchImpl) {
        return { success: false, submissionId: null, redirectUrl: null, error: 'Fetch API is not available', responseText: '' };
    }

    // Determine target URL (always absolute against codeforces.com)
    let targetUrl = formAction || (typeof window !== 'undefined' ? window.location.href : '');
    if (targetUrl.startsWith('/')) {
        targetUrl = `https://codeforces.com${targetUrl}`;
    }
    if (!targetUrl.includes('action=submitSolutionFormProcessor')) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl += `${separator}action=submitSolutionFormProcessor`;
    }

    const formData = buildSubmissionFormData({ csrfToken, fields, programTypeId, problemCode, sourceCode });

    try {
        const response = await fetchImpl(targetUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include', // Includes user's logged-in Codeforces session cookies
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const responseText = await response.text();
        const finalUrl = response.url || targetUrl;
        const submissionId = extractSubmissionIdFromResponse(responseText, finalUrl);

        if (response.ok || submissionId) {
            return {
                success: true,
                submissionId,
                redirectUrl: finalUrl,
                error: null,
                responseText
            };
        } else {
            return {
                success: false,
                submissionId: null,
                redirectUrl: finalUrl,
                error: `HTTP Error ${response.status}: ${response.statusText}`,
                responseText
            };
        }
    } catch (err) {
        return {
            success: false,
            submissionId: null,
            redirectUrl: null,
            error: err.message || 'Network submission error',
            responseText: ''
        };
    }
}

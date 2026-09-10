/**
 * Codeforces Submission Form & CSRF Token Extractor
 * Locates the real Codeforces submission form and extracts token & exact field names.
 */

/**
 * Checks if a form element is a valid Codeforces solution submit form.
 * @param {Element} form 
 * @returns {boolean}
 */
function isValidSubmitForm(form) {
    if (!form) return false;
    const action = (form.getAttribute('action') || form.action || '').toLowerCase();

    // Ignore known non-submission endpoints
    const blacklistedActions = ['/data/problemtags', 'search', 'comment', 'vote', 'rating', 'login', 'logout'];
    for (const item of blacklistedActions) {
        if (action.includes(item)) return false;
    }

    // Must contain submit indicators
    if (action.includes('submit') || action.includes('problem')) return true;
    if (form.querySelector('select[name="programTypeId"], select[name="tab"], textarea[name="source"], input[name="sourceFile"]')) return true;
    if (form.classList && (form.classList.contains('submit-form') || form.id === 'singlePageSubmitForm')) return true;

    return false;
}

/**
 * Extracts submission form action, CSRF token, field names, and language options.
 * @param {Document} doc - Document object (defaults to window.document)
 * @param {object} [context] - Extracted problem context ({ contestId, problemIndex })
 * @returns {{
 *   formFound: boolean,
 *   formAction: string|null,
 *   csrfToken: string|null,
 *   fields: {
 *     csrfTokenField: string,
 *     programTypeIdField: string,
 *     problemCodeField: string,
 *     sourceField: string
 *   },
 *   availableLanguages: Array<{ value: string, title: string, isSelected: boolean }>
 * }}
 */
export function extractSubmissionFormDetails(doc = document, context = {}) {
    // 1. Locate all forms and find the real submit form
    const allForms = Array.from(doc.querySelectorAll('form'));
    let submitForm = allForms.find(isValidSubmitForm) || null;

    // Fallback: Check standard selectors if direct search didn't match
    if (!submitForm) {
        const fallbackSelectors = [
            'form.submit-form',
            'form[action*="submit"]',
            'form#singlePageSubmitForm'
        ];
        for (const selector of fallbackSelectors) {
            const el = doc.querySelector(selector);
            if (el && isValidSubmitForm(el)) {
                submitForm = el;
                break;
            }
        }
    }

    // 2. Extract CSRF Token
    let csrfToken = null;
    let csrfFieldName = 'csrf_token';

    // Search inside submitForm or document for csrf input
    const csrfInput = (submitForm || doc).querySelector('input[name="csrf_token"], input[name="_csrf"]');
    if (csrfInput) {
        csrfToken = csrfInput.value;
        if (csrfInput.name) csrfFieldName = csrfInput.name;
    }

    if (!csrfToken) {
        const csrfSpan = doc.querySelector('.csrf-token, span[data-csrf]');
        if (csrfSpan) {
            csrfToken = csrfSpan.getAttribute('data-csrf') || csrfSpan.textContent.trim();
        }
    }

    if (!csrfToken) {
        const csrfMeta = doc.querySelector('meta[name="X-Csrf-Token"], meta[name="csrf-token"]');
        if (csrfMeta) {
            csrfToken = csrfMeta.getAttribute('content');
        }
    }

    // Search scripts for inline _csrf or csrf_token assignment
    if (!csrfToken) {
        const scripts = doc.querySelectorAll('script');
        for (const script of scripts) {
            const text = script.textContent || '';
            const match = text.match(/(?:csrf_token|_csrf)\s*[:=]\s*["']([a-f0-9]{32})["']/i);
            if (match) {
                csrfToken = match[1];
                break;
            }
        }
    }

    if (!csrfToken && typeof window !== 'undefined' && window._csrf) {
        csrfToken = window._csrf;
    }

    // 3. Extract Field Names & Available Languages (check document-wide)
    let programTypeIdField = 'programTypeId';
    let problemCodeField = 'submittedProblemCode';
    let sourceField = 'source';
    const availableLanguages = [];

    const root = doc; // Search document-wide for compiler select & fields

    // Language Select Field
    const langSelect = root.querySelector('select[name="programTypeId"], select[name="tab"]');
    if (langSelect) {
        if (langSelect.name) programTypeIdField = langSelect.name;

        const options = langSelect.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value) {
                availableLanguages.push({
                    value: opt.value,
                    title: opt.textContent.trim(),
                    isSelected: opt.selected
                });
            }
        });
    }

    // Problem Code Field
    const problemInput = root.querySelector('select[name="submittedProblemCode"], input[name="submittedProblemCode"]');
    if (problemInput && problemInput.name) {
        problemCodeField = problemInput.name;
    }

    // Source Code Field
    const sourceTextarea = root.querySelector('textarea[name="source"], textarea#sourceCodeTextarea, input[name="sourceFile"]');
    if (sourceTextarea && sourceTextarea.name) {
        sourceField = sourceTextarea.name;
    }

    // 4. Determine canonical form action
    let formAction = submitForm ? (submitForm.getAttribute('action') || submitForm.action) : null;
    
    // If formAction is missing, invalid, or points to unrelated path, construct canonical URL
    if (!formAction || formAction.includes('problemTags') || !formAction.includes('submit')) {
        if (context.contestId && context.problemIndex) {
            formAction = `/contest/${context.contestId}/problem/${context.problemIndex}?action=submitSolutionFormProcessor`;
        } else {
            formAction = '/problemset/submit?action=submitSolutionFormProcessor';
        }
    }

    return {
        formFound: !!submitForm || availableLanguages.length > 0,
        formAction,
        csrfToken: csrfToken || null,
        fields: {
            csrfTokenField: csrfFieldName,
            programTypeIdField,
            problemCodeField,
            sourceField
        },
        availableLanguages
    };
}

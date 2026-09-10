/**
 * Codeforces Submission Form & CSRF Token Extractor
 * Locates the real Codeforces submission form and extracts token & exact field names.
 */

/**
 * Extracts submission form action, CSRF token, field names, and language options.
 * @param {Document} doc - Document object (defaults to window.document)
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
export function extractSubmissionFormDetails(doc = document) {
    // 1. Locate the submit form
    const formSelectors = [
        'form.submit-form',
        'form[action*="/submit"]',
        'form#singlePageSubmitForm',
        'form[action*="problem"]',
        'form[method="post"]'
    ];

    let submitForm = null;
    for (const selector of formSelectors) {
        submitForm = doc.querySelector(selector);
        if (submitForm) break;
    }

    // 2. Extract CSRF Token
    let csrfToken = null;
    let csrfFieldName = 'csrf_token';

    // Check hidden input inside form or document
    const csrfInput = (submitForm || doc).querySelector('input[name="csrf_token"], input[name="_csrf"]');
    if (csrfInput) {
        csrfToken = csrfInput.value;
        if (csrfInput.name) csrfFieldName = csrfInput.name;
    }

    // Fallback: Check span/meta tags if hidden input not found
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

    // Fallback: window variable if available in DOM context
    if (!csrfToken && typeof window !== 'undefined' && window._csrf) {
        csrfToken = window._csrf;
    }

    // 3. Extract Field Names & Available Languages
    let programTypeIdField = 'programTypeId';
    let problemCodeField = 'submittedProblemCode';
    let sourceField = 'source';
    const availableLanguages = [];

    if (submitForm || doc) {
        const root = submitForm || doc;

        // Language Select Field
        const langSelect = root.querySelector('select[name="programTypeId"], select[name="tab"]');
        if (langSelect) {
            if (langSelect.name) programTypeIdField = langSelect.name;

            const options = langSelect.querySelectorAll('option');
            options.forEach(opt => {
                availableLanguages.push({
                    value: opt.value,
                    title: opt.textContent.trim(),
                    isSelected: opt.selected
                });
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
    }

    const formAction = submitForm ? (submitForm.getAttribute('action') || submitForm.action) : null;

    return {
        formFound: !!submitForm,
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

/**
 * Main Content Script for LeetForces
 * Orchestrates Problem Context Extraction, CSRF & Submit Form Extraction, Editor Initialization, Solution Submission, and Real-Time Verdict Polling.
 */

import { extractProblemContext } from './contextExtractor.js';
import { extractSubmissionFormDetails } from './formExtractor.js';
import { extractLoggedInHandle } from './handleExtractor.js';
import { detectEditor, initializeProblemEditor } from './editorManager.js';
import { resolveLanguageId, populateLanguageSelector, KNOWN_COMPILER_MAP } from './languageMap.js';
import { submitSolutionToCodeforces } from './submitter.js';
import { pollVerdictForSubmission, formatVerdict } from './verdictPoller.js';
import { renderVerdictPanel, getVerdictTheme } from './verdictUI.js';
import { injectControlPanel } from './controlPanel.js';

export async function initLeetForcesPage(doc = document) {
    console.log('[LeetForces] Initializing problem page script...');

    // 1. Extract Problem Context
    const context = extractProblemContext(doc);
    console.log('[LeetForces] Extracted Problem Context:', context);

    // 2. Extract CSRF Token & Submission Form Fields (passing context for fallback canonical URLs)
    const formDetails = extractSubmissionFormDetails(doc, context);
    console.log('[LeetForces] Extracted Form & CSRF Details:', formDetails);

    // 2b. Extract logged-in user's handle (needed to poll their own verdicts)
    const handle = extractLoggedInHandle(doc);
    console.log('[LeetForces] Detected logged-in handle:', handle);

    // 3. Submission Handler
    const submitHandler = async (sourceCode, preferredLang = 'GNU G++20 (64 bit)') => {
        const programTypeId = resolveLanguageId(preferredLang, formDetails.availableLanguages);
        return submitSolutionToCodeforces({
            formAction: formDetails.formAction,
            csrfToken: formDetails.csrfToken,
            fields: formDetails.fields,
            programTypeId,
            problemCode: context.problemIndex || 'A',
            sourceCode
        });
    };

    // Store extracted data and helper functions in window object
    if (typeof window !== 'undefined') {
        window.__LEETFORCES_DATA__ = {
            context,
            formDetails,
            handle,
            compilerMap: KNOWN_COMPILER_MAP,
            resolveLanguageId: (lang) => resolveLanguageId(lang, formDetails.availableLanguages),
            populateLanguageSelector: (selectEl, pref) => populateLanguageSelector(selectEl, formDetails.availableLanguages, pref),
            submitSolution: submitHandler,
            pollVerdict: (opts) => pollVerdictForSubmission({ ...opts, contestId: context.contestId, problemIndex: context.problemIndex }),
            renderVerdict: renderVerdictPanel,
            getVerdictTheme,
            formatVerdict,
            timestamp: Date.now()
        };
    }

    // 4. Detect Editor & Initialize Code Template / Cursor Position
    if (context.problemKey) {
        let attempts = 0;
        const maxAttempts = 10;

        const attemptEditorInit = async () => {
            const editor = detectEditor(doc);
            if (editor.type !== 'unknown' && editor.instance) {
                console.log(`[LeetForces] Detected editor type: ${editor.type}`);
                const result = await initializeProblemEditor(context.problemKey, editor);
                console.log(`[LeetForces] Editor initialized for problem '${context.problemKey}'. New problem: ${result.isNewProblem}`);

                injectControlPanel({
                    doc,
                    editor,
                    context,
                    formDetails,
                    handle,
                    submitSolution: submitHandler,
                    pollVerdict: (opts) => pollVerdictForSubmission({ ...opts, contestId: context.contestId, problemIndex: context.problemIndex }),
                    renderVerdict: renderVerdictPanel
                });

                return true;
            }
            return false;
        };

        const success = await attemptEditorInit();
        if (!success) {
            const interval = setInterval(async () => {
                attempts++;
                const ok = await attemptEditorInit();
                if (ok || attempts >= maxAttempts) {
                    clearInterval(interval);
                }
            }, 300);
        }
    }

    return { context, formDetails, handle, submitHandler };
}

// Auto-run on content script load if in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initLeetForcesPage(document));
    } else {
        initLeetForcesPage(document);
    }
}

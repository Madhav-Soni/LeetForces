/**
 * Main Content Script for LeetForces
 * Orchestrates context extraction, form extraction, floating panel, submit, and verdict polling.
 */

import { extractProblemContext } from './contextExtractor.js';
import { extractSubmissionFormDetails } from './formExtractor.js';
import { resolveLanguageId, populateLanguageSelector, KNOWN_COMPILER_MAP } from './languageMap.js';
import { submitSolutionToCodeforces } from './submitter.js';
import { pollVerdictForSubmission, formatVerdict } from './verdictPoller.js';
import { renderVerdictPanel, getVerdictTheme } from './verdictUI.js';
import { injectControlPanel } from './controlPanel.js';

export async function initLeetForcesPage(doc = document) {
    try {
        console.log('[LeetForces] Initializing problem page script...');

        const context = extractProblemContext(doc);
        console.log('[LeetForces] Extracted Problem Context:', context);

        const formDetails = extractSubmissionFormDetails(doc, context);
        console.log('[LeetForces] Extracted Form & CSRF Details:', formDetails);

        const submitHandler = async (sourceCode, preferredLang = 'GNU G++20 (64 bit)') => {
            const programTypeId = resolveLanguageId(
                preferredLang,
                (formDetails && formDetails.availableLanguages) || []
            );
            return submitSolutionToCodeforces({
                formAction: formDetails.formAction,
                csrfToken: formDetails.csrfToken,
                fields: formDetails.fields || {},
                programTypeId,
                problemCode: (context && context.problemIndex) || 'A',
                sourceCode
            });
        };

        if (typeof window !== 'undefined') {
            window.__LEETFORCES_DATA__ = {
                context,
                formDetails,
                compilerMap: KNOWN_COMPILER_MAP,
                resolveLanguageId: (lang) => resolveLanguageId(lang, (formDetails && formDetails.availableLanguages) || []),
                populateLanguageSelector: (selectEl, pref) => populateLanguageSelector(selectEl, (formDetails && formDetails.availableLanguages) || [], pref),
                submitSolution: submitHandler,
                pollVerdict: (opts) => pollVerdictForSubmission({
                    ...opts,
                    contestId: context.contestId,
                    problemIndex: context.problemIndex
                }),
                renderVerdict: renderVerdictPanel,
                getVerdictTheme,
                formatVerdict,
                timestamp: Date.now()
            };
        }

        if (context && context.problemKey) {
            await injectControlPanel({
                doc,
                context,
                formDetails,
                submitSolution: submitHandler,
                pollVerdict: (opts) => pollVerdictForSubmission({
                    ...opts,
                    contestId: context.contestId,
                    problemIndex: context.problemIndex
                }),
                renderVerdict: renderVerdictPanel
            });
            console.log('[LeetForces] Control panel injected.');
        } else {
            console.warn('[LeetForces] No problemKey extracted; panel not injected.');
        }

        return { context, formDetails, submitHandler };
    } catch (err) {
        console.error('[LeetForces] Failed to initialize:', err);
        return { context: null, formDetails: null, submitHandler: null, error: err };
    }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const boot = () => {
        initLeetForcesPage(document).catch((err) => {
            console.error('[LeetForces] Boot error:', err);
        });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}

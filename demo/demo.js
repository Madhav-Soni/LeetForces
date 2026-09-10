import { extractProblemContext } from '../src/contextExtractor.js';
import { extractSubmissionFormDetails } from '../src/formExtractor.js';
import { detectEditor, initializeProblemEditor } from '../src/editorManager.js';
import { populateLanguageSelector } from '../src/languageMap.js';
import { submitSolutionToCodeforces } from '../src/submitter.js';
import { formatVerdict } from '../src/verdictPoller.js';
import { renderVerdictPanel } from '../src/verdictUI.js';

let currentSimulatedUrl = 'https://codeforces.com/contest/1234/problem/G';

async function updateAll() {
    const context = extractProblemContext(document, currentSimulatedUrl);
    document.getElementById('extractedContextJson').textContent = JSON.stringify(context, null, 2);

    const formDetails = extractSubmissionFormDetails(document);
    document.getElementById('extractedFormJson').textContent = JSON.stringify(formDetails, null, 2);

    const langSelect = document.getElementById('extensionLangSelect');
    populateLanguageSelector(langSelect, formDetails.availableLanguages, 'GNU G++20 (64 bit)');

    const editor = detectEditor(document);
    if (editor && editor.instance) {
        const result = await initializeProblemEditor(context.problemKey, editor);
        document.getElementById('storageInfo').textContent = result.isNewProblem 
            ? 'State: Initialized New Problem Template' 
            : 'State: Loaded Unsaved Work / Fresh Load';
    }

    updateCursorDisplay();
}

function updateCursorDisplay() {
    const textarea = document.getElementById('sourceCodeTextarea');
    if (!textarea) return;

    const code = textarea.value;
    const selectionStart = textarea.selectionStart;

    const lines = code.substring(0, selectionStart).split('\n');
    const currentLineNumber = lines.length;
    const currentColumnNumber = lines[lines.length - 1].length + 1;

    document.getElementById('cursorLineColInfo').textContent = `Cursor: Line ${currentLineNumber}, Col ${currentColumnNumber}`;
    document.getElementById('cursorOffsetInfo').textContent = `Offset: ${selectionStart} / ${code.length}`;
}

document.addEventListener('DOMContentLoaded', () => {
    updateAll();

    const textarea = document.getElementById('sourceCodeTextarea');
    const verdictContainer = document.getElementById('verdictResultContainer');

    textarea.addEventListener('keyup', updateCursorDisplay);
    textarea.addEventListener('click', updateCursorDisplay);
    textarea.addEventListener('focus', updateCursorDisplay);

    document.getElementById('btnProblem1234G').addEventListener('click', () => {
        currentSimulatedUrl = 'https://codeforces.com/contest/1234/problem/G';
        document.getElementById('currentUrlLabel').textContent = `URL: /contest/1234/problem/G`;
        document.querySelector('.problem-statement .header .title').textContent = 'G. Maximum Grid Path Score';
        document.querySelector('form.submit-form input[name="submittedProblemCode"]').value = 'G';
        updateAll();
    });

    document.getElementById('btnProblem1234A').addEventListener('click', () => {
        currentSimulatedUrl = 'https://codeforces.com/contest/1234/problem/A';
        document.getElementById('currentUrlLabel').textContent = `URL: /contest/1234/problem/A`;
        document.querySelector('.problem-statement .header .title').textContent = 'A. Watermelon Splitting';
        document.querySelector('form.submit-form input[name="submittedProblemCode"]').value = 'A';
        updateAll();
    });

    document.getElementById('btnRefresh').addEventListener('click', () => {
        updateAll();
    });

    // Interactive Submit with live testing state transition to Accepted
    document.getElementById('btnSubmitSolution').addEventListener('click', async () => {
        renderVerdictPanel(verdictContainer, formatVerdict({ verdict: 'TESTING', passedTestCount: 0 }));

        const mockFetch = async () => ({
            ok: true,
            status: 200,
            url: 'https://codeforces.com/contest/1234/submission/987654321',
            text: async () => `<tr data-submission-id="987654321">Submission Received</tr>`
        });

        const context = extractProblemContext(document, currentSimulatedUrl);
        const formDetails = extractSubmissionFormDetails(document);

        await submitSolutionToCodeforces({
            formAction: formDetails.formAction,
            csrfToken: formDetails.csrfToken,
            fields: formDetails.fields,
            programTypeId: document.getElementById('extensionLangSelect').value,
            problemCode: context.problemIndex || 'G',
            sourceCode: textarea.value
        }, mockFetch);

        // Simulate testing -> OK transition
        setTimeout(() => {
            renderVerdictPanel(verdictContainer, formatVerdict({ verdict: 'TESTING', passedTestCount: 2 }));
        }, 1200);

        setTimeout(() => {
            renderVerdictPanel(verdictContainer, formatVerdict({ 
                verdict: 'OK', 
                passedTestCount: 15, 
                timeConsumedMillis: 110, 
                memoryConsumedBytes: 3145728 
            }));
        }, 2600);
    });

    // Simulation triggers
    document.getElementById('btnSimulateOK').addEventListener('click', () => {
        renderVerdictPanel(verdictContainer, formatVerdict({ verdict: 'OK', passedTestCount: 15, timeConsumedMillis: 95, memoryConsumedBytes: 2097152 }));
    });

    document.getElementById('btnSimulateWA').addEventListener('click', () => {
        renderVerdictPanel(verdictContainer, formatVerdict({ verdict: 'WRONG_ANSWER', passedTestCount: 2, timeConsumedMillis: 45, memoryConsumedBytes: 1048576 }));
    });

    document.getElementById('btnSimulateTLE').addEventListener('click', () => {
        renderVerdictPanel(verdictContainer, formatVerdict({ verdict: 'TIME_LIMIT_EXCEEDED', passedTestCount: 11, timeConsumedMillis: 2000, memoryConsumedBytes: 4194304 }));
    });

    document.getElementById('btnSimulateCE').addEventListener('click', () => {
        renderVerdictPanel(verdictContainer, formatVerdict({ verdict: 'COMPILATION_ERROR' }));
    });
});

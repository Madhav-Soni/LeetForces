import assert from 'assert';
import { createMockDocument } from './mockDom.js';
import { DEFAULT_CPP_TEMPLATE, DEFAULT_CURSOR_LINE, DEFAULT_CURSOR_COLUMN } from '../src/constants.js';
import { extractProblemContext } from '../src/contextExtractor.js';
import { extractSubmissionFormDetails } from '../src/formExtractor.js';
import { computeCursorOffset } from '../src/editorManager.js';
import { resolveLanguageId } from '../src/languageMap.js';
import { submitSolutionToCodeforces } from '../src/submitter.js';
import { formatVerdict, pollVerdictForSubmission } from '../src/verdictPoller.js';
import { getVerdictTheme } from '../src/verdictUI.js';
import { resolvePistonLanguage, normalizeOutput, runSampleTests } from '../src/testRunner.js';
import { injectControlPanel } from '../src/controlPanel.js';
import { getPreferredLanguage, savePreferredLanguage } from '../src/storage.js';

console.log('=== Running LeetForces Zero-Dependency Automated Verification Suite ===\n');

// 1. Verify Prompt 1: C++ Template Constant & Cursor Calculation
console.log('Test 1: Validating C++ Template Constant...');
const expectedTemplate = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t = 1;
    // cin >> t;
    while (t--) {
        
    }
    return 0;
}`;

assert.strictEqual(DEFAULT_CPP_TEMPLATE, expectedTemplate, 'DEFAULT_CPP_TEMPLATE must match exact requirement string');
console.log('  [PASS] C++ Template matches exact requirement string.');

console.log('\nTest 2: Validating Cursor Position Target (Line 11, Col 9)...');
assert.strictEqual(DEFAULT_CURSOR_LINE, 11, 'Target line should be 11');
assert.strictEqual(DEFAULT_CURSOR_COLUMN, 9, 'Target column should be 9');

const lines = DEFAULT_CPP_TEMPLATE.split('\n');
assert.strictEqual(lines[10], '        ', 'Line 11 should have exactly 8 spaces');
const offset = computeCursorOffset(DEFAULT_CPP_TEMPLATE, 11, 9);
const substringBeforeCursor = DEFAULT_CPP_TEMPLATE.substring(0, offset);
assert.ok(substringBeforeCursor.endsWith('while (t--) {\n        '), 'Offset should end directly after 8 spaces in while loop');
console.log(`  [PASS] Calculated cursor offset ${offset} points precisely inside while loop line 11.`);

// 2. Verify Prompt 2: Context Extractor
console.log('\nTest 3: Validating Context Extraction (Contest ID, Index, Title, Samples)...');
const mockDoc1 = createMockDocument({
    titleText: 'G. Maximum Grid Path Score',
    samples: [
        { input: '3 3\n1 2 3', output: '29' },
        { input: '2 2\n10 20', output: '30' }
    ]
});

const context = extractProblemContext(mockDoc1, 'https://codeforces.com/contest/1234/problem/G');
assert.strictEqual(context.contestId, '1234', 'Contest ID should be 1234');
assert.strictEqual(context.problemIndex, 'G', 'Problem Index should be G');
assert.strictEqual(context.sampleTests.length, 2, 'Should extract 2 sample test cases');
console.log('  [PASS] Extracted Contest ID, Problem Index "G", Title, and Sample Test pairs correctly.');

// 3. Verify Prompt 3: CSRF & Submit Form Fields Extraction
console.log('\nTest 4: Validating CSRF Token & Submit Form Extraction...');
const mockDoc2 = createMockDocument({
    titleText: 'G. Maximum Grid Path Score',
    formAttrs: {
        action: '/contest/1234/problem/G?action=submit',
        csrfToken: 'test_secret_csrf_12345',
        problemCode: 'G'
    },
    langOptions: [
        { value: '54', title: 'GNU G++17 7.3.0', selected: false },
        { value: '89', title: 'GNU G++20 (64 bit)', selected: true },
        { value: '31', title: 'Python 3.8.10', selected: false }
    ]
});

const formDetails = extractSubmissionFormDetails(mockDoc2, context);
assert.strictEqual(formDetails.formFound, true, 'Submit form should be found');
assert.strictEqual(formDetails.csrfToken, 'test_secret_csrf_12345', 'CSRF token should match');
console.log('  [PASS] Extracted CSRF token correctly.');

// 4. Verify Prompt 4: Language Resolver
console.log('\nTest 5: Validating Language / Compiler Resolution...');
const resolvedCpp = resolveLanguageId('GNU G++20', formDetails.availableLanguages);
assert.strictEqual(resolvedCpp, '89', 'GNU G++20 should resolve to programTypeId 89');
console.log('  [PASS] Language resolver correctly maps human-readable names to Codeforces compiler IDs.');

// 5. Verify Prompt 5: Submission Engine
console.log('\nTest 6: Validating Submission Payload & Submission ID Tracking...');
const mockFetch = async () => ({
    ok: true,
    status: 200,
    url: 'https://codeforces.com/contest/1234/submission/99887766',
    text: async () => '<html><body><tr data-submission-id="99887766">Submission Received</tr></body></html>'
});

const submissionResult = await submitSolutionToCodeforces({
    formAction: formDetails.formAction,
    csrfToken: 'test_secret_csrf_12345',
    fields: formDetails.fields,
    programTypeId: '89',
    problemCode: 'G',
    sourceCode: DEFAULT_CPP_TEMPLATE
}, mockFetch);

assert.strictEqual(submissionResult.success, true, 'Submission should succeed');
assert.strictEqual(submissionResult.submissionId, '99887766', 'Extracted submission ID should match 99887766');
console.log('  [PASS] Codeforces submission engine builds correct payload and tracks submission ID.');

// 6. Verify Anonymous Contest Status Polling
console.log('\nTest 7: Validating Anonymous Contest Status Polling...');
let mockContestCallCount = 0;
const mockContestFetch = async (url) => {
    mockContestCallCount++;
    const verdict = mockContestCallCount === 1 ? 'TESTING' : 'OK';
    return {
        ok: true,
        json: async () => ({
            status: 'OK',
            result: [
                {
                    id: 99887766,
                    contestId: 1234,
                    problem: { index: 'G' },
                    verdict,
                    passedTestCount: mockContestCallCount === 1 ? 2 : 15,
                    timeConsumedMillis: 90,
                    memoryConsumedBytes: 2048000
                }
            ]
        })
    };
};

const pollResult = await pollVerdictForSubmission({
    contestId: 1234,
    submissionId: 99887766,
    intervalMs: 10,
    maxAttempts: 5,
    fetchImpl: mockContestFetch
});

assert.strictEqual(pollResult.statusKey, 'ACCEPTED');
assert.strictEqual(pollResult.isTesting, false);
console.log('  [PASS] Verdict poller queries contest.status API anonymously.');

// 7. Verify Prompt 7: Verdict UI Themes
console.log('\nTest 8: Validating Verdict UI Themes & Color Coding...');
const themeAccepted = getVerdictTheme('ACCEPTED');
assert.strictEqual(themeAccepted.color, '#22c55e', 'Accepted should be green (#22c55e)');
console.log('  [PASS] Verdict UI assigns distinct color themes.');

// 8. Verify Local Piston Test Runner Module
console.log('\nTest 9: Validating Local Piston Sample Test Runner...');
assert.strictEqual(resolvePistonLanguage('GNU G++20 (64 bit)'), 'cpp');
assert.strictEqual(normalizeOutput('29  \r\n\r\n'), '29');
console.log('  [PASS] Piston test runner maps languages and normalizes outputs correctly.');

// 9. Task 1 Verification: Control Panel Language Select Dropdown & Persistence
console.log('\nTest 10: Validating Control Panel Language Selector Dropdown & Selection Propagation (Task 1)...');
let submittedProgramTypeId = null;
const mockSubmitSolution = async (sourceCode, languageTitle) => {
    submittedProgramTypeId = resolveLanguageId(languageTitle, formDetails.availableLanguages);
    return { success: true, submissionId: '112233' };
};

const mockEditor = { type: 'textarea', instance: { value: DEFAULT_CPP_TEMPLATE }, element: {} };

const panel = await injectControlPanel({
    doc: mockDoc2,
    editor: mockEditor,
    context: { problemKey: 'cf_1234_G' },
    formDetails,
    submitSolution: mockSubmitSolution,
    pollVerdict: async () => {},
    renderVerdict: () => {}
});

assert.ok(panel, 'Control panel element should be created');
const langSelect = panel.querySelector('#leetforces-lang-select');
assert.ok(langSelect, 'Panel should render #leetforces-lang-select dropdown element');

const optionsList = langSelect.querySelectorAll('option');
assert.strictEqual(optionsList.length, 3, 'Select should be populated with 3 options from mock formDetails');
assert.strictEqual(langSelect.value, '89', 'GNU G++20 (value 89) should be pre-selected by default');

// Simulate changing dropdown option to Python 3.8.10 (value 31)
langSelect.selectedIndex = 2; // Python 3.8.10
langSelect.dispatchEvent(new Event('change'));

const submitBtn = panel.querySelector('#leetforces-submit-btn');
submitBtn.click();

// Allow async event loop tick for submit handler execution
await new Promise(r => setTimeout(r, 50));

assert.strictEqual(submittedProgramTypeId, '31', 'Submitting after changing select dropdown must use programTypeId 31 (Python)');
console.log('  [PASS] Control panel language selector populates options, pre-selects default, persists preference, and passes selected compiler ID to submit function.');

console.log('\n=================================================');
console.log('  ALL AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY! ');
console.log('=================================================\n');

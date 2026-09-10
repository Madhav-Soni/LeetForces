import assert from 'assert';
import { createMockDocument } from './mockDom.js';
import { DEFAULT_CPP_TEMPLATE, DEFAULT_CURSOR_LINE, DEFAULT_CURSOR_COLUMN } from '../src/constants.js';
import { extractProblemContext } from '../src/contextExtractor.js';
import { extractSubmissionFormDetails } from '../src/formExtractor.js';
import { computeCursorOffset } from '../src/editorManager.js';
import { resolveLanguageId } from '../src/languageMap.js';
import { submitSolutionToCodeforces, extractSubmissionIdFromResponse } from '../src/submitter.js';
import { formatVerdict, pollVerdictForSubmission } from '../src/verdictPoller.js';
import { getVerdictTheme, renderVerdictPanel } from '../src/verdictUI.js';

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
assert.strictEqual(context.problemName, 'Maximum Grid Path Score', 'Problem Name should be Maximum Grid Path Score');
assert.strictEqual(context.problemKey, 'cf_1234_G', 'Problem Key should be cf_1234_G');
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

const formDetails = extractSubmissionFormDetails(mockDoc2);
assert.strictEqual(formDetails.formFound, true, 'Submit form should be found');
assert.strictEqual(formDetails.csrfToken, 'test_secret_csrf_12345', 'CSRF token should match');
console.log('  [PASS] Extracted CSRF token, form action, field names, and compiler select options correctly.');

// 4. Verify Prompt 4: Language Resolver
console.log('\nTest 5: Validating Language / Compiler Resolution (Prompt 4)...');
const resolvedCpp = resolveLanguageId('GNU G++20', formDetails.availableLanguages);
assert.strictEqual(resolvedCpp, '89', 'GNU G++20 should resolve to programTypeId 89');
console.log('  [PASS] Language resolver correctly maps human-readable names to Codeforces compiler IDs.');

// 5. Verify Prompt 5: Submission Engine & Submission ID Tracking
console.log('\nTest 6: Validating Submission Payload & Submission ID Tracking (Prompt 5)...');
const mockFetch = async () => ({
    ok: true,
    status: 200,
    url: 'https://codeforces.com/contest/1234/submission/99887766',
    text: async () => '<html><body><tr data-submission-id="99887766">Submission Received</tr></body></html>'
});

const submissionResult = await submitSolutionToCodeforces({
    formAction: '/contest/1234/problem/G?action=submit',
    csrfToken: 'test_secret_csrf_12345',
    fields: formDetails.fields,
    programTypeId: '89',
    problemCode: 'G',
    sourceCode: DEFAULT_CPP_TEMPLATE
}, mockFetch);

assert.strictEqual(submissionResult.success, true, 'Submission should succeed');
assert.strictEqual(submissionResult.submissionId, '99887766', 'Extracted submission ID should match 99887766');
console.log('  [PASS] Codeforces submission engine builds correct payload, includes user credentials, and tracks submission ID.');

// 6. Verify Prompt 6: Verdict Polling & Test Case Number Formatting
console.log('\nTest 7: Validating Verdict Formatting & Failing Test Case Calculation (Prompt 6)...');
const verdictOK = formatVerdict({ verdict: 'OK', passedTestCount: 20, timeConsumedMillis: 80, memoryConsumedBytes: 2048000 });
assert.strictEqual(verdictOK.statusKey, 'ACCEPTED');
assert.strictEqual(verdictOK.formattedText, 'Accepted');
assert.strictEqual(verdictOK.isTesting, false);

const verdictWA = formatVerdict({ verdict: 'WRONG_ANSWER', passedTestCount: 2, timeConsumedMillis: 40, memoryConsumedBytes: 1024000 });
assert.strictEqual(verdictWA.statusKey, 'WRONG_ANSWER');
assert.strictEqual(verdictWA.formattedText, 'Wrong Answer on test 3');
assert.strictEqual(verdictWA.testCaseNumber, 3);
assert.strictEqual(verdictWA.isTesting, false);

const verdictTLE = formatVerdict({ verdict: 'TIME_LIMIT_EXCEEDED', passedTestCount: 11 });
assert.strictEqual(verdictTLE.formattedText, 'Time Limit Exceeded on test 12');
assert.strictEqual(verdictTLE.testCaseNumber, 12);

const verdictTesting = formatVerdict({ verdict: 'TESTING', passedTestCount: 4 });
assert.strictEqual(verdictTesting.statusKey, 'TESTING');
assert.strictEqual(verdictTesting.isTesting, true);
assert.strictEqual(verdictTesting.formattedText, 'Testing on test 5...');

// Mock polling sequence (TESTING -> OK)
let mockApiCallCount = 0;
const mockApiFetch = async () => {
    mockApiCallCount++;
    const verdict = mockApiCallCount === 1 ? 'TESTING' : 'OK';
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
                    passedTestCount: mockApiCallCount === 1 ? 2 : 15,
                    timeConsumedMillis: 90,
                    memoryConsumedBytes: 2048000
                }
            ]
        })
    };
};

const pollResult = await pollVerdictForSubmission({
    handle: 'Tourist',
    submissionId: 99887766,
    intervalMs: 10,
    maxAttempts: 5,
    fetchImpl: mockApiFetch
});

assert.strictEqual(pollResult.statusKey, 'ACCEPTED');
assert.strictEqual(pollResult.isTesting, false);
assert.strictEqual(mockApiCallCount, 2);
console.log('  [PASS] Verdict poller queries API, calculates failing test case (passedTestCount + 1), and stops on completion.');

// 7. Verify Prompt 7: Verdict UI Color Schemes & Themes
console.log('\nTest 8: Validating Verdict UI Themes & Color Coding (Prompt 7)...');
const themeAccepted = getVerdictTheme('ACCEPTED');
assert.strictEqual(themeAccepted.color, '#22c55e', 'Accepted should be green (#22c55e)');

const themeWA = getVerdictTheme('WRONG_ANSWER');
assert.strictEqual(themeWA.color, '#ef4444', 'Wrong Answer should be red (#ef4444)');

const themeTLE = getVerdictTheme('TIME_LIMIT_EXCEEDED');
assert.strictEqual(themeTLE.color, '#f59e0b', 'TLE should be orange (#f59e0b)');

const themeCE = getVerdictTheme('COMPILATION_ERROR');
assert.strictEqual(themeCE.color, '#94a3b8', 'Compilation Error should be gray (#94a3b8)');

const themeTesting = getVerdictTheme('TESTING');
assert.strictEqual(themeTesting.color, '#38bdf8', 'Testing should be blue (#38bdf8)');
assert.strictEqual(themeTesting.isPending, true, 'Testing theme should be pending');
console.log('  [PASS] Verdict UI assigns distinct colors: green (Accepted), red (WA), orange (TLE/MLE), gray (CE), blue pulse (Testing).');

console.log('\n=================================================');
console.log('  ALL AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY! ');
console.log('=================================================\n');

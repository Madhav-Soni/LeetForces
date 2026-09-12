/**
 * Local Test Runner
 * Executes user code against extracted sample tests using Judge0 CE via
 * RapidAPI (https://judge0-ce.p.rapidapi.com). Piston's public API stopped
 * being freely available in Feb 2026, so this replaced it.
 *
 * IMPORTANT: JUDGE0_API_KEY must be set to your own RapidAPI key
 * (subscribe to the Judge0 CE "Basic" plan at rapidapi.com — pay-per-use,
 * roughly $0.0017/run). Never commit a real key to a public repo.
 */

const JUDGE0_API_KEY = 'YOUR_RAPIDAPI_KEY_HERE';
const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';
const JUDGE0_HOST = 'judge0-ce.p.rapidapi.com';

// Maps Codeforces compiler titles to Judge0 CE numeric language IDs.
// Order matters: more specific patterns should come first.
const CF_TO_JUDGE0_LANGUAGE = [
    { match: /g\+\+|gnu c\+\+|clang\+\+/i, languageId: 54 },  // C++ (GCC 9.2.0)
    { match: /gnu c\b|^c\b/i, languageId: 50 },                // C (GCC 9.2.0)
    { match: /pypy|python/i, languageId: 71 },                 // Python (3.8.1)
    { match: /java\b/i, languageId: 62 },                      // Java (OpenJDK 13.0.1)
    { match: /kotlin/i, languageId: 78 },                      // Kotlin (1.3.70)
    { match: /rust/i, languageId: 73 },                        // Rust (1.40.0)
    { match: /^go\b|golang/i, languageId: 60 },                // Go (1.13.5)
    { match: /c#|mono/i, languageId: 51 },                     // C# (Mono 6.6.0.161)
    { match: /javascript|node\.js/i, languageId: 63 }          // JavaScript (Node.js 12.14.0)
];

/**
 * Resolves a Judge0 language ID from a Codeforces compiler title.
 * @param {string} languageTitle - e.g. "GNU G++20 (64 bit)"
 * @returns {number|null}
 */
export function resolveJudge0LanguageId(languageTitle = '') {
    const entry = CF_TO_JUDGE0_LANGUAGE.find(e => e.match.test(languageTitle));
    return entry ? entry.languageId : null;
}

/**
 * Normalizes output for comparison: unifies line endings, strips trailing
 * whitespace per line, and drops trailing blank lines. Codeforces judges
 * ignore trailing whitespace, so local comparison should too.
 * @param {string} text
 * @returns {string}
 */
export function normalizeOutput(text = '') {
    return text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.replace(/[ \t]+$/g, ''))
        .join('\n')
        .replace(/\n+$/, '');
}

/**
 * Executes source code once against a single stdin input via Judge0.
 * @param {object} options
 * @param {number} options.languageId - Judge0 numeric language ID
 * @param {string} options.sourceCode
 * @param {string} options.input
 * @param {function} fetchImpl
 * @returns {Promise<object>} Raw Judge0 response
 */
export async function runSingleTest({ languageId, sourceCode, input }, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    if (!fetchImpl) throw new Error('Fetch API is not available');

    const response = await fetchImpl(JUDGE0_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': JUDGE0_API_KEY,
            'X-RapidAPI-Host': JUDGE0_HOST
        },
        body: JSON.stringify({
            language_id: languageId,
            source_code: sourceCode,
            stdin: input || ''
        })
    });

    if (!response.ok) {
        throw new Error(`Judge0 API error: HTTP ${response.status}`);
    }

    return response.json();
}

// Judge0 status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer,
// 5=Time Limit Exceeded, 6=Compilation Error, 7-12=various runtime errors.
const TLE_STATUS_ID = 5;
const COMPILE_ERROR_STATUS_ID = 6;
const RUNTIME_ERROR_STATUS_IDS = new Set([7, 8, 9, 10, 11, 12]);

/**
 * Runs source code against all extracted sample tests, sequentially.
 * @param {object} options
 * @param {string} options.languageTitle - Human readable CF language (e.g. "GNU G++20 (64 bit)")
 * @param {string} options.sourceCode
 * @param {Array<{input:string, output:string}>} options.sampleTests
 * @param {function} [fetchImpl]
 * @returns {Promise<{
 *   overallPassed: boolean,
 *   results: Array<{index:number, passed:boolean, status:string, expected:string, actual:string, stderr:string}>,
 *   error: string|null
 * }>} 
 */
export async function runSampleTests({ languageTitle, sourceCode, sampleTests = [] }, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    const languageId = resolveJudge0LanguageId(languageTitle);
    if (!languageId) {
        return { overallPassed: false, results: [], error: `Unsupported language for local run: "${languageTitle}"` };
    }
    if (!sourceCode || !sourceCode.trim()) {
        return { overallPassed: false, results: [], error: 'Source code is empty' };
    }
    if (!sampleTests || sampleTests.length === 0) {
        return { overallPassed: false, results: [], error: 'No sample tests were found on this page' };
    }
    if (!JUDGE0_API_KEY || JUDGE0_API_KEY === 'YOUR_RAPIDAPI_KEY_HERE') {
        return { overallPassed: false, results: [], error: 'No Judge0 API key configured. Set JUDGE0_API_KEY in testRunner.js.' };
    }

    const results = [];

    for (let i = 0; i < sampleTests.length; i++) {
        const test = sampleTests[i];

        try {
            const execResult = await runSingleTest({ languageId, sourceCode, input: test.input }, fetchImpl);
            const statusId = execResult.status && execResult.status.id;

            if (statusId === COMPILE_ERROR_STATUS_ID) {
                results.push({
                    index: i + 1,
                    passed: false,
                    status: 'COMPILATION_ERROR',
                    expected: test.output,
                    actual: '',
                    stderr: execResult.compile_output || ''
                });
                for (let j = i + 1; j < sampleTests.length; j++) {
                    results.push({ index: j + 1, passed: false, status: 'SKIPPED', expected: sampleTests[j].output, actual: '', stderr: '' });
                }
                break;
            }

            const actualOutput = execResult.stdout || '';
            const passed = normalizeOutput(actualOutput) === normalizeOutput(test.output);

            let status = 'WRONG_ANSWER';
            if (passed) {
                status = 'PASSED';
            } else if (statusId === TLE_STATUS_ID) {
                status = 'TIME_LIMIT_EXCEEDED';
            } else if (RUNTIME_ERROR_STATUS_IDS.has(statusId)) {
                status = 'RUNTIME_ERROR';
            }

            results.push({
                index: i + 1,
                passed,
                status,
                expected: test.output,
                actual: actualOutput,
                stderr: execResult.stderr || ''
            });
        } catch (err) {
            results.push({
                index: i + 1,
                passed: false,
                status: 'ERROR',
                expected: test.output,
                actual: '',
                stderr: err.message || String(err)
            });
        }
    }

    const overallPassed = results.length > 0 && results.every(r => r.passed);
    return { overallPassed, results, error: null };
}

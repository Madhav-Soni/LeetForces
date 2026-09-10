/**
 * Local Test Runner
 * Executes user code against extracted sample tests using the Piston public execution API
 * (https://github.com/engineer-man/piston). Free, no API key required.
 */

const PISTON_EXECUTE_URL = 'https://emkc.org/api/v2/piston/execute';

// Maps Codeforces compiler titles to Piston language identifiers.
// Order matters: more specific patterns should come first.
const CF_TO_PISTON_LANGUAGE = [
    { match: /g\+\+|gnu c\+\+|clang\+\+/i, language: 'cpp' },
    { match: /pypy|python/i, language: 'python' },
    { match: /java\b/i, language: 'java' },
    { match: /kotlin/i, language: 'kotlin' },
    { match: /rust/i, language: 'rust' },
    { match: /^go\b|golang/i, language: 'go' },
    { match: /c#|mono/i, language: 'csharp' },
    { match: /javascript|node\.js/i, language: 'javascript' }
];

/**
 * Resolves a Piston language identifier from a Codeforces compiler title.
 * @param {string} languageTitle - e.g. "GNU G++20 (64 bit)"
 * @returns {string|null}
 */
export function resolvePistonLanguage(languageTitle = '') {
    const entry = CF_TO_PISTON_LANGUAGE.find(e => e.match.test(languageTitle));
    return entry ? entry.language : null;
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
 * Executes source code once against a single stdin input via Piston.
 * @param {object} options
 * @param {string} options.language - Piston language identifier
 * @param {string} options.sourceCode
 * @param {string} options.input
 * @param {function} fetchImpl
 * @returns {Promise<object>} Raw Piston response
 */
export async function runSingleTest({ language, sourceCode, input }, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    if (!fetchImpl) throw new Error('Fetch API is not available');

    const response = await fetchImpl(PISTON_EXECUTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language,
            version: '*',
            files: [{ content: sourceCode }],
            stdin: input || ''
        })
    });

    if (!response.ok) {
        throw new Error(`Piston API error: HTTP ${response.status}`);
    }

    return response.json();
}

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
    const language = resolvePistonLanguage(languageTitle);
    if (!language) {
        return { overallPassed: false, results: [], error: `Unsupported language for local run: "${languageTitle}"` };
    }
    if (!sourceCode || !sourceCode.trim()) {
        return { overallPassed: false, results: [], error: 'Source code is empty' };
    }
    if (!sampleTests || sampleTests.length === 0) {
        return { overallPassed: false, results: [], error: 'No sample tests were found on this page' };
    }

    const results = [];

    for (let i = 0; i < sampleTests.length; i++) {
        const test = sampleTests[i];

        try {
            const execResult = await runSingleTest({ language, sourceCode, input: test.input }, fetchImpl);

            const compileFailed = execResult.compile && execResult.compile.code !== 0;
            if (compileFailed) {
                results.push({
                    index: i + 1,
                    passed: false,
                    status: 'COMPILATION_ERROR',
                    expected: test.output,
                    actual: '',
                    stderr: execResult.compile.stderr || execResult.compile.output || ''
                });
                for (let j = i + 1; j < sampleTests.length; j++) {
                    results.push({ index: j + 1, passed: false, status: 'SKIPPED', expected: sampleTests[j].output, actual: '', stderr: '' });
                }
                break;
            }

            const run = execResult.run || {};
            const actualOutput = run.stdout || '';
            const passed = normalizeOutput(actualOutput) === normalizeOutput(test.output);

            let status = 'WRONG_ANSWER';
            if (passed) {
                status = 'PASSED';
            } else if (run.signal || (run.code !== 0 && run.code !== null)) {
                status = 'RUNTIME_ERROR';
            }

            results.push({
                index: i + 1,
                passed,
                status,
                expected: test.output,
                actual: actualOutput,
                stderr: run.stderr || ''
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

/**
 * Codeforces Verdict Poller Engine
 * Repeatedly queries Codeforces contest status API anonymously for submission status until testing completes.
 * Uses ZERO personal user data or handles.
 */

/**
 * Formats raw Codeforces API submission object into clean user-facing status details.
 * @param {object} submission - Submission object from Codeforces API
 * @returns {{
 *   statusKey: string,
 *   formattedText: string,
 *   testCaseNumber: number|null,
 *   isTesting: boolean,
 *   timeMs: number,
 *   memoryBytes: number,
 *   rawVerdict: string|null
 * }}
 */
export function formatVerdict(submission) {
    if (!submission) {
        return {
            statusKey: 'TESTING',
            formattedText: 'In Queue...',
            testCaseNumber: null,
            isTesting: true,
            timeMs: 0,
            memoryBytes: 0,
            rawVerdict: null
        };
    }

    const rawVerdict = submission.verdict;
    const passedCount = submission.passedTestCount || 0;
    const testCaseNumber = rawVerdict && rawVerdict !== 'OK' && rawVerdict !== 'TESTING' && rawVerdict !== 'COMPILATION_ERROR' 
        ? passedCount + 1 
        : null;

    const timeMs = submission.timeConsumedMillis || 0;
    const memoryBytes = submission.memoryConsumedBytes || 0;

    if (!rawVerdict || rawVerdict === 'TESTING') {
        return {
            statusKey: 'TESTING',
            formattedText: passedCount > 0 ? `Testing on test ${passedCount + 1}...` : 'Testing...',
            testCaseNumber: passedCount + 1,
            isTesting: true,
            timeMs,
            memoryBytes,
            rawVerdict: 'TESTING'
        };
    }

    switch (rawVerdict) {
        case 'OK':
            return {
                statusKey: 'ACCEPTED',
                formattedText: 'Accepted',
                testCaseNumber: null,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'WRONG_ANSWER':
            return {
                statusKey: 'WRONG_ANSWER',
                formattedText: `Wrong Answer on test ${testCaseNumber}`,
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'TIME_LIMIT_EXCEEDED':
            return {
                statusKey: 'TIME_LIMIT_EXCEEDED',
                formattedText: `Time Limit Exceeded on test ${testCaseNumber}`,
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'MEMORY_LIMIT_EXCEEDED':
            return {
                statusKey: 'MEMORY_LIMIT_EXCEEDED',
                formattedText: `Memory Limit Exceeded on test ${testCaseNumber}`,
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'RUNTIME_ERROR':
            return {
                statusKey: 'RUNTIME_ERROR',
                formattedText: `Runtime Error on test ${testCaseNumber}`,
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        case 'COMPILATION_ERROR':
            return {
                statusKey: 'COMPILATION_ERROR',
                formattedText: 'Compilation Error',
                testCaseNumber: null,
                isTesting: false,
                timeMs: 0,
                memoryBytes: 0,
                rawVerdict
            };
        case 'CHALLENGED':
            return {
                statusKey: 'CHALLENGED',
                formattedText: 'Hacked',
                testCaseNumber: null,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
        default:
            return {
                statusKey: rawVerdict,
                formattedText: rawVerdict.replace(/_/g, ' '),
                testCaseNumber,
                isTesting: false,
                timeMs,
                memoryBytes,
                rawVerdict
            };
    }
}

/**
 * Fetches recent submissions for a contest anonymously from Codeforces public API.
 * @param {string|number} contestId 
 * @param {function} [fetchImpl] 
 * @returns {Promise<Array<object>>}
 */
export async function fetchContestSubmissions(contestId, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    if (!contestId || !fetchImpl) return [];
    const url = `https://codeforces.com/api/contest.status?contestId=${encodeURIComponent(contestId)}&from=1&count=20`;

    try {
        const response = await fetchImpl(url);
        if (!response.ok) return [];
        const json = await response.json();
        if (json && json.status === 'OK' && Array.isArray(json.result)) {
            return json.result;
        }
    } catch (e) {
        console.warn('[LeetForces] Codeforces API fetch failed:', e);
    }
    return [];
}

/**
 * Polls Codeforces API anonymously for verdict of a specific submission.
 * @param {object} options 
 * @param {string|number} [options.submissionId] - Submission ID to match
 * @param {string|number} [options.contestId] - Contest ID
 * @param {string} [options.problemIndex] - Problem Index fallback
 * @param {number} [options.intervalMs] - Polling interval in ms (default 2000)
 * @param {number} [options.maxAttempts] - Maximum polling attempts (default 30)
 * @param {function} [options.onUpdate] - Callback function invoked on each status check
 * @param {function} [options.fetchImpl] - Optional custom fetch
 * @returns {Promise<object>} - Resolved final verdict details
 */
export async function pollVerdictForSubmission(options = {}) {
    const {
        submissionId,
        contestId,
        problemIndex,
        intervalMs = 2000,
        maxAttempts = 30,
        onUpdate,
        fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)
    } = options;

    let attempts = 0;

    return new Promise(resolve => {
        const checkStatus = async () => {
            attempts++;
            const submissions = await fetchContestSubmissions(contestId, fetchImpl);

            let matchedSub = null;

            if (submissionId) {
                matchedSub = submissions.find(s => String(s.id) === String(submissionId));
            }

            if (!matchedSub && problemIndex) {
                matchedSub = submissions.find(s => 
                    s.problem && String(s.problem.index).toUpperCase() === String(problemIndex).toUpperCase()
                );
            }

            if (!matchedSub && submissions.length > 0) {
                matchedSub = submissions[0];
            }

            const formatted = formatVerdict(matchedSub);
            formatted.attempts = attempts;
            formatted.submissionId = matchedSub ? matchedSub.id : submissionId;

            if (typeof onUpdate === 'function') {
                onUpdate(formatted);
            }

            if (!formatted.isTesting || attempts >= maxAttempts) {
                resolve(formatted);
            } else {
                setTimeout(checkStatus, intervalMs);
            }
        };

        checkStatus();
    });
}

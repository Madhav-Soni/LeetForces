/**
 * Context Extractor for Codeforces Problem Pages
 * Extracts contest ID, problem index, problem name, and sample test cases directly from DOM.
 */

/**
 * Extracts raw text from Codeforces <pre> elements, handling test-example-line divs if present.
 * @param {Element} preElement 
 * @returns {string}
 */
export function extractPreText(preElement) {
    if (!preElement) return '';
    const lineDivs = preElement.querySelectorAll('.test-example-line');
    if (lineDivs && lineDivs.length > 0) {
        return Array.from(lineDivs)
            .map(div => div.textContent.trimEnd())
            .join('\n');
    }
    // Standard text fallback
    const text = preElement.innerText !== undefined ? preElement.innerText : preElement.textContent;
    return text ? text.trim() : '';
}

/**
 * Extracts problem tags and difficulty rating from CF's sidebar tag-box.
 * These live outside .problem-statement, in a separate sidebar element, so
 * they need their own extraction pass. Codeforces represents the numeric
 * difficulty as a tag matching "*1500" — that one is split out as `rating`
 * rather than left in the general tags list.
 * @param {Document} doc
 * @returns {{ tags: string[], rating: number|null }}
 */
export function extractTagsAndRating(doc = document) {
    const tags = [];
    let rating = null;

    const tagNodes = doc.querySelectorAll('.tag-box');
    tagNodes.forEach(node => {
        const text = (node.textContent || '').trim();
        if (!text) return;
        const ratingMatch = text.match(/^\*(\d+)$/);
        if (ratingMatch) {
            rating = parseInt(ratingMatch[1], 10);
        } else {
            tags.push(text);
        }
    });

    return { tags, rating };
}

/**
 * Maps a Codeforces difficulty rating to its real color band.
 * Matches CF's own handle/rating color conventions.
 * @param {number|null} rating
 * @returns {string} hex color
 */
export function getRatingColor(rating) {
    if (rating == null) return '#a1a1aa';       // unrated: neutral gray
    if (rating < 1200) return '#a1a1aa';         // gray
    if (rating < 1400) return '#4ade80';         // green
    if (rating < 1600) return '#22d3ee';         // cyan
    if (rating < 1900) return '#60a5fa';         // blue
    if (rating < 2100) return '#c084fc';         // purple
    if (rating < 2400) return '#fb923c';         // orange
    return '#f87171';                             // red
}

/**
 * Extracts problem context details from page URL and DOM.
 * @param {Document} doc - Document object (defaults to window.document)
 * @param {string} currentUrl - URL string (defaults to window.location.href)
 * @returns {{
 *   contestId: string|null,
 *   problemIndex: string|null,
 *   problemName: string|null,
 *   problemKey: string|null,
 *   sampleTests: Array<{ input: string, output: string }>,
 *   tags: string[],
 *   rating: number|null
 * }}
 */
export function extractProblemContext(doc = document, currentUrl = window.location.href) {
    let contestId = null;
    let problemIndex = null;
    let problemName = null;

    // 1. Try URL parsing first
    // Patterns:
    // /contest/{contestId}/problem/{problemIndex}
    // /problemset/problem/{contestId}/{problemIndex}
    // /gym/{contestId}/problem/{problemIndex}
    // /group/{groupId}/contest/{contestId}/problem/{problemIndex}
    const contestMatch = currentUrl.match(/\/(?:contest|gym|problemset\/problem)\/(\d+)(?:\/problem\/|\/)([A-Za-z0-9]+)/);
    if (contestMatch) {
        contestId = contestMatch[1];
        problemIndex = contestMatch[2].toUpperCase();
        console.log('[LeetForces] URL parsed: contestId=' + contestId + ', problemIndex=' + problemIndex);
    } else {
        console.warn('[LeetForces] URL pattern did not match:', currentUrl);
    }

    // 2. DOM Parsing for Title & Index
    const titleElement = doc.querySelector('.problem-statement .header .title');
    if (titleElement) {
        const fullTitle = titleElement.textContent.trim(); // e.g. "G. Problem Name" or "A. Watermelon"
        const dotIndex = fullTitle.indexOf('.');
        if (dotIndex !== -1) {
            const parsedIndex = fullTitle.substring(0, dotIndex).trim();
            const parsedName = fullTitle.substring(dotIndex + 1).trim();
            if (!problemIndex) {
                problemIndex = parsedIndex.toUpperCase();
            }
            problemName = parsedName;
        } else {
            problemName = fullTitle;
        }
    }

    // Fallback if title element wasn't found or had different format
    if (!problemName && titleElement) {
        problemName = titleElement.textContent.trim();
    }

    // 3. Extract Sample Tests from DOM
    const sampleTests = [];
    const sampleTestNodes = doc.querySelectorAll('.sample-test');
    
    if (sampleTestNodes.length > 0) {
        sampleTestNodes.forEach(testNode => {
            const inputPre = testNode.querySelector('.input pre');
            const outputPre = testNode.querySelector('.output pre');
            if (inputPre && outputPre) {
                sampleTests.push({
                    input: extractPreText(inputPre),
                    output: extractPreText(outputPre)
                });
            }
        });
    } else {
        // Fallback: Query all .input pre and .output pre on the page directly
        const inputs = doc.querySelectorAll('.input pre');
        const outputs = doc.querySelectorAll('.output pre');
        const count = Math.min(inputs.length, outputs.length);

        for (let i = 0; i < count; i++) {
            sampleTests.push({
                input: extractPreText(inputs[i]),
                output: extractPreText(outputs[i])
            });
        }
    }

    // 4. Construct unique problemKey
    let problemKey = null;
    if (contestId && problemIndex) {
        problemKey = `cf_${contestId}_${problemIndex}`;
    } else if (problemIndex) {
        problemKey = `cf_unknown_${problemIndex}`;
    } else if (problemName) {
        problemKey = `cf_name_${problemName.replace(/\s+/g, '_').toLowerCase()}`;
    }

    // 5. Tags and difficulty rating (sidebar, outside .problem-statement)
    const { tags, rating } = extractTagsAndRating(doc);

    return {
        contestId,
        problemIndex,
        problemName: problemName || 'Unknown Problem',
        problemKey,
        sampleTests,
        tags,
        rating
    };
}
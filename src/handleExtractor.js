/**
 * Codeforces Handle Extractor
 * Extracts the currently logged-in user's handle from the page header,
 * needed to poll their own submission list for verdicts.
 */

/**
 * @param {Document} doc
 * @returns {string|null}
 */
export function extractLoggedInHandle(doc = document) {
    // The header's profile link is the reliable place to look; other
    // /profile/ links on the page (comments, standings) are not the viewer.
    const header = doc.querySelector('#header') || doc;
    const link = header.querySelector('a[href^="/profile/"]');
    if (link) {
        const match = link.getAttribute('href').match(/\/profile\/([^/?#]+)/);
        if (match) return decodeURIComponent(match[1]);
        if (link.textContent) return link.textContent.trim();
    }
    return null;
}

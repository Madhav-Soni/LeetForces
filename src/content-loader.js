/**
 * Manifest V3 Content Script Loader
 * Chrome content scripts execute in classic script mode by default.
 * This loader uses chrome.runtime.getURL to dynamically load the main ES module content script.
 */
(async () => {
    try {
        const src = chrome.runtime.getURL('src/content.js');
        await import(src);
    } catch (err) {
        console.error('[LeetForces] Dynamic content script loader error:', err);
    }
})();

/**
 * Codeforces Language & Compiler Mapping Engine
 * Maps human-readable names to Codeforces internal compiler IDs (programTypeId).
 */

// Standard Codeforces Compiler Mapping
export const KNOWN_COMPILER_MAP = {
    'GNU G++20 (64 bit)': '89',
    'GNU G++17 7.3.0': '54',
    'GNU G++23 64 bit': '91',
    'GNU C++11 5.1.0': '43',
    'GNU C++14 6.4.0': '50',
    'Clang++20 Diagnostics': '92',
    'Python 3.8.10': '31',
    'PyPy 3.9 (7.3.11)': '70',
    'PyPy 3.10 (7.3.12)': '80',
    'Java 21 64bit': '87',
    'Java 11 64bit': '60',
    'Java 8 64bit': '36',
    'Kotlin 1.9.20': '88',
    'Rust 2021': '75',
    'Go 1.22.2': '83',
    'C# 10': '65',
    'C# Mono 6.8': '9',
    'JavaScript V8 4.8.0': '34',
    'Node.js 20.10.0': '55'
};

// Ordered keyword checks used to classify a raw CF compiler title into a
// boilerplate family. Order matters: more specific checks (C++, C#) must
// come before broader ones (C) to avoid false matches.
const FAMILY_KEYWORD_RULES = [
    ['C++', ['g++', 'gnu c++', 'clang++', 'c++']],
    ['C#', ['c#', 'mono']],
    ['Java', ['java']],
    ['Kotlin', ['kotlin']],
    ['Scala', ['scala']],
    ['Go', ['go ', 'golang']],
    ['Rust', ['rust']],
    ['Swift', ['swift']],
    ['PyPy', ['pypy']],
    ['Python3', ['python 3', 'python3']],
    ['Python', ['python']],
    ['TypeScript', ['typescript']],
    ['JavaScript', ['javascript', 'node.js', 'node']],
    ['Ruby', ['ruby']],
    ['PHP', ['php']],
    ['Dart', ['dart']],
    ['Elixir', ['elixir']],
    ['Erlang', ['erlang']],
    ['Racket', ['racket']],
    ['C', ['gnu c', ' c ', ' c11', ' c17']],
];

/**
 * Maps a raw compiler id (e.g. "54") or title (e.g. "GNU G++17 7.3.0")
 * to the boilerplate family key used in BOILERPLATE_MAP.
 * @param {string} compilerIdOrTitle
 * @returns {string|null} - e.g. "C++", "Python3", "Java" or null if unmatched
 */
export function getLanguageFamily(compilerIdOrTitle) {
    if (!compilerIdOrTitle) return null;

    let title = String(compilerIdOrTitle);

    // If given a raw compiler id, resolve it to its known title first.
    const byId = Object.entries(KNOWN_COMPILER_MAP).find(([, id]) => String(id) === title);
    if (byId) title = byId[0];

    const lower = title.toLowerCase();

    // PyPy is its own runtime but should use the Python3 boilerplate.
    for (const [family, keywords] of FAMILY_KEYWORD_RULES) {
        if (keywords.some(k => lower.includes(k))) {
            return family === 'PyPy' ? 'Python3' : family;
        }
    }

    return null;
}

/**
 * Extracts a comparable version number from a CF compiler title, used to
 * pick the "latest" variant within a language family (e.g. G++23 over
 * G++17, Java 21 over Java 8).
 * @param {string} title
 * @returns {number}
 */
function extractVersionScore(title = '') {
    const match = String(title).match(/\d+(\.\d+)*/);
    const score = match ? parseFloat(match[0]) : 0;
    // Slight tiebreaker: prefer explicit 64-bit builds when versions tie.
    return score + (/64\s*bit/i.test(title) ? 0.001 : 0);
}

/**
 * Collapses CF's full compiler list (often 30+ entries: every version of
 * every language) down to one "latest" entry per language family, so the
 * dropdown shows one modern C++, one modern Java, etc. instead of every
 * historical version. Languages that don't map to a known family (rare,
 * uncommon CF languages) are kept as-is rather than dropped.
 * @param {Array<{ value: string, title: string, isSelected: boolean }>} availableLanguages
 * @returns {Array<{ value: string, title: string, isSelected: boolean }>}
 */
export function filterToLatestPerLanguage(availableLanguages = []) {
    const bestByFamily = new Map();
    availableLanguages.forEach(lang => {
        const family = getLanguageFamily(lang.title) || `__unmapped__:${lang.title}`;
        const score = extractVersionScore(lang.title);
        const existing = bestByFamily.get(family);
        if (!existing || score > existing.score) {
            bestByFamily.set(family, { lang, score });
        }
    });
    return Array.from(bestByFamily.values()).map(entry => entry.lang);
}

/**
 * Resolves the best matching programTypeId from available form languages based on user preference.
 * @param {string} preferredLang - User's preferred language string (e.g. "GNU G++20", "Python 3", "Java 21", "89")
 * @param {Array<{ value: string, title: string, isSelected: boolean }>} availableLanguages - Extracted form languages
 * @returns {string|null} - Selected programTypeId value
 */
export function resolveLanguageId(preferredLang, availableLanguages = []) {
    if (!availableLanguages || availableLanguages.length === 0) {
        return KNOWN_COMPILER_MAP[preferredLang] || preferredLang || '89';
    }

    if (!preferredLang) {
        // Fallback to currently selected option or first option
        const selected = availableLanguages.find(l => l.isSelected);
        return selected ? selected.value : availableLanguages[0].value;
    }

    const preferredStr = String(preferredLang).toLowerCase().trim();

    // 1. Direct match on option value
    const matchByValue = availableLanguages.find(l => String(l.value) === preferredStr);
    if (matchByValue) return matchByValue.value;

    // 2. Direct match on title
    const matchByExactTitle = availableLanguages.find(l => l.title.toLowerCase() === preferredStr);
    if (matchByExactTitle) return matchByExactTitle.value;

    // 3. Match via KNOWN_COMPILER_MAP
    for (const [key, value] of Object.entries(KNOWN_COMPILER_MAP)) {
        if (key.toLowerCase().includes(preferredStr) || preferredStr.includes(key.toLowerCase())) {
            const matchInAvailable = availableLanguages.find(l => String(l.value) === String(value));
            if (matchInAvailable) return matchInAvailable.value;
        }
    }

    // 4. Fuzzy substring match on title (e.g. "g++20" or "python" or "java 21")
    const matchBySubstring = availableLanguages.find(l => l.title.toLowerCase().includes(preferredStr));
    if (matchBySubstring) return matchBySubstring.value;

    // 5. Default fallback to selected or first
    const selected = availableLanguages.find(l => l.isSelected);
    return selected ? selected.value : availableLanguages[0].value;
}

/**
 * Dynamically populates an HTML <select> element with available compiler options.
 * @param {HTMLSelectElement} selectElement 
 * @param {Array<{ value: string, title: string, isSelected: boolean }>} availableLanguages 
 * @param {string} preferredLang 
 */
export function populateLanguageSelector(selectElement, availableLanguages = [], preferredLang = '') {
    if (!selectElement) return;

    const doc = selectElement.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    selectElement.innerHTML = '';

    const filteredLanguages = availableLanguages.length > 0
        ? filterToLatestPerLanguage(availableLanguages)
        : availableLanguages;

    const resolvedId = resolveLanguageId(preferredLang, filteredLanguages);

    if (filteredLanguages.length === 0) {
        // Render from KNOWN_COMPILER_MAP if form options not available
        for (const [name, id] of Object.entries(KNOWN_COMPILER_MAP)) {
            const opt = doc.createElement('option');
            opt.value = id;
            opt.textContent = name;
            if (id === resolvedId) opt.selected = true;
            selectElement.appendChild(opt);
        }
        return;
    }

    filteredLanguages.forEach(lang => {
        const opt = doc.createElement('option');
        opt.value = lang.value;
        opt.textContent = lang.title;
        if (String(lang.value) === String(resolvedId)) {
            opt.selected = true;
        }
        selectElement.appendChild(opt);
    });
}
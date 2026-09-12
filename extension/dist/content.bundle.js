/**
 * LeetForces Extension Bundled Content Script
 * Generated automatically by scripts/build.js
 */
(function() {
    'use strict';

/* --- src/constants.js --- */
/**
 * LeetForces Constants
 */

const DEFAULT_CPP_TEMPLATE = `#include <bits/stdc++.h>
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

// Line 11 (1-indexed), Column 9 (1-indexed, i.e., after 8 spaces indentation inside while loop)
const DEFAULT_CURSOR_LINE = 11;
const DEFAULT_CURSOR_COLUMN = 9;

const STORAGE_KEYS = {
    CODE_PREFIX: 'leetforces_code_',
    LAST_PROBLEM_KEY: 'leetforces_last_problem_key',
    PREFERRED_LANG: 'leetforces_preferred_lang',
    SETTINGS: 'leetforces_settings'
};


/* --- src/boilerplates.js --- */
/**
 * Default boilerplate code per language family.
 * Each template contains a single "$CURSOR$" marker showing where the
 * cursor should land after the boilerplate loads. getBoilerplate() strips
 * the marker and returns the clean code plus its character offset.
 */

const BOILERPLATE_MAP = {
    'C++': `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t = 1;
    // cin >> t;
    while (t--) {
        $CURSOR$
    }
    return 0;
}
`,

    'C': `#include <stdio.h>

int main() {
    int t = 1;
    // scanf("%d", &t);
    while (t--) {
        $CURSOR$
    }
    return 0;
}
`,

    'Java': `import java.util.*;


public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();

        int t = 1;
        // t = Integer.parseInt(br.readLine().trim());
        while (t-- > 0) {
            $CURSOR$
        }

        System.out.print(sb);
    }
}
`,

    'C#': `using System;
using System.IO;

class Program {
    static void Main() {
        int t = 1;
        // t = int.Parse(Console.ReadLine());
        while (t-- > 0) {
            $CURSOR$
        }
    }
}
`,

    'Go': `package main

 t > 0; t-- {
        $CURSOR$
    }
    _ = reader
}
`,

    'Kotlin': `import java.io.BufferedReader


fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let stdout = io::stdout();
    let mut out = stdout.lock();

    let mut t = 1;
    // t = input.trim().parse().unwrap();
    while t > 0 {
        $CURSOR$
        t -= 1;
    }
}
`,

    'Scala': `import scala.io.StdIn._

object Main extends App {
    var t = 1
    // t = readInt()
    while (t > 0) {
        $CURSOR$
        t -= 1
    }
}
`,

    'Python3': `import sys
input = sys.stdin.readline

t = 1
# t = int(input())
for _ in range(t):
    $CURSOR$
`,

    'Python': `import sys
input = sys.stdin.readline

t = 1
# t = int(input())
for _ in range(t):
    $CURSOR$
`,

    'JavaScript': `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');
let idx = 0;
const readLine = () => lines[idx++];

let t = 1;
// t = parseInt(readLine());
while (t--) {
    $CURSOR$
}
`,

    'TypeScript': `const lines: string[] = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');
let idx = 0;
const readLine = (): string => lines[idx++];

let t = 1;
// t = parseInt(readLine());
while (t--) {
    $CURSOR$
}
`,

    'Ruby': `t = 1
# t = gets.to_i
t.times do
  $CURSOR$
end
`,

    'PHP': `<?php
$stdin = fopen('php://stdin', 'r');

$t = 1;
// $t = intval(fgets($stdin));
while ($t--) {
    $CURSOR$
}
`,

    'Dart': `import 'dart:io';

void main() {
    var t = 1;
    // t = int.parse(stdin.readLineSync()!);
    while (t-- > 0) {
        $CURSOR$
    }
}
`,

    'Elixir': `defmodule Main do
  def main do
    t = 1
    # t = IO.gets("") |> String.trim() |> String.to_integer()
    Enum.each(1..t, fn _ ->
      $CURSOR$
    end)
  end
end

Main.main()
`,

    'Erlang': `-module(main).
-export([main/0]).

main() ->
    T = 1,
    %% T = list_to_integer(io:get_line("")),
    loop(T).

loop(0) -> ok;
loop(T) ->
    $CURSOR$
    loop(T - 1).
`,

    'Racket': `#lang racket

(define t 1)
;; (define t (read))
(for ([i (in-range t)])
  $CURSOR$)
`
};

/**
 * Returns the boilerplate for a language family with the cursor marker
 * stripped out.
 * @param {string} languageFamily - key into BOILERPLATE_MAP
 * @returns {{ code: string, cursorOffset: number } | null}
 */
function getBoilerplate(languageFamily) {
    const template = BOILERPLATE_MAP[languageFamily];
    if (!template) return null;

    const marker = '$CURSOR$';
    const markerIndex = template.indexOf(marker);

    if (markerIndex === -1) {
        return { code: template, cursorOffset: template.length };
    }

    const code = template.slice(0, markerIndex) + template.slice(markerIndex + marker.length);
    return { code, cursorOffset: markerIndex };
}

/* --- src/contextExtractor.js --- */
/**
 * Context Extractor for Codeforces Problem Pages
 * Extracts contest ID, problem index, problem name, and sample test cases directly from DOM.
 */

/**
 * Extracts raw text from Codeforces <pre> elements, handling test-example-line divs if present.
 * @param {Element} preElement 
 * @returns {string}
 */
function extractPreText(preElement) {
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
function extractTagsAndRating(doc = document) {
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
function getRatingColor(rating) {
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
function extractProblemContext(doc = document, currentUrl = window.location.href) {
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

/* --- src/formExtractor.js --- */
/**
 * Codeforces Submission Form & CSRF Token Extractor
 * Locates the real Codeforces submission form and extracts token & exact field names.
 */

/**
 * Checks if a form element is a valid Codeforces solution submit form.
 * @param {Element} form 
 * @returns {boolean}
 */
function isValidSubmitForm(form) {
    if (!form) return false;
    const action = (form.getAttribute('action') || form.action || '').toLowerCase();

    // Ignore known non-submission endpoints
    const blacklistedActions = ['/data/problemtags', 'search', 'comment', 'vote', 'rating', 'login', 'logout'];
    for (const item of blacklistedActions) {
        if (action.includes(item)) return false;
    }

    // Must contain submit indicators
    if (action.includes('submit') || action.includes('problem')) return true;
    if (form.querySelector('select[name="programTypeId"], select[name="tab"], textarea[name="source"], input[name="sourceFile"]')) return true;
    if (form.classList && (form.classList.contains('submit-form') || form.id === 'singlePageSubmitForm')) return true;

    return false;
}

/**
 * Extracts submission form action, CSRF token, field names, and language options.
 * @param {Document} doc - Document object (defaults to window.document)
 * @param {object} [context] - Extracted problem context ({ contestId, problemIndex })
 * @returns {{
 *   formFound: boolean,
 *   formAction: string|null,
 *   csrfToken: string|null,
 *   fields: {
 *     csrfTokenField: string,
 *     programTypeIdField: string,
 *     problemCodeField: string,
 *     sourceField: string
 *   },
 *   availableLanguages: Array<{ value: string, title: string, isSelected: boolean }>
 * }}
 */
function extractSubmissionFormDetails(doc = document, context = {}) {
    // 1. Locate all forms and find the real submit form
    const allForms = Array.from(doc.querySelectorAll('form'));
    let submitForm = allForms.find(isValidSubmitForm) || null;

    // Fallback: Check standard selectors if direct search didn't match
    if (!submitForm) {
        const fallbackSelectors = [
            'form.submit-form',
            'form[action*="submit"]',
            'form#singlePageSubmitForm'
        ];
        for (const selector of fallbackSelectors) {
            const el = doc.querySelector(selector);
            if (el && isValidSubmitForm(el)) {
                submitForm = el;
                break;
            }
        }
    }

    // 2. Extract CSRF Token
    let csrfToken = null;
    let csrfFieldName = 'csrf_token';

    // Search inside submitForm or document for csrf input
    const csrfInput = (submitForm || doc).querySelector('input[name="csrf_token"], input[name="_csrf"]');
    if (csrfInput) {
        csrfToken = csrfInput.value;
        if (csrfInput.name) csrfFieldName = csrfInput.name;
    }

    if (!csrfToken) {
        const csrfSpan = doc.querySelector('.csrf-token, span[data-csrf]');
        if (csrfSpan) {
            csrfToken = csrfSpan.getAttribute('data-csrf') || csrfSpan.textContent.trim();
        }
    }

    if (!csrfToken) {
        const csrfMeta = doc.querySelector('meta[name="X-Csrf-Token"], meta[name="csrf-token"]');
        if (csrfMeta) {
            csrfToken = csrfMeta.getAttribute('content');
        }
    }

    // Search scripts for inline _csrf or csrf_token assignment
    if (!csrfToken) {
        const scripts = doc.querySelectorAll('script');
        for (const script of scripts) {
            const text = script.textContent || '';
            const match = text.match(/(?:csrf_token|_csrf)\s*[:=]\s*["']([a-f0-9]{32})["']/i);
            if (match) {
                csrfToken = match[1];
                break;
            }
        }
    }

    if (!csrfToken && typeof window !== 'undefined' && window._csrf) {
        csrfToken = window._csrf;
    }

    // 3. Extract Field Names & Available Languages (check document-wide)
    let programTypeIdField = 'programTypeId';
    let problemCodeField = 'submittedProblemCode';
    let sourceField = 'source';
    const availableLanguages = [];

    const root = doc; // Search document-wide for compiler select & fields

    // Language Select Field
    const langSelect = root.querySelector('select[name="programTypeId"], select[name="tab"]');
    if (langSelect) {
        if (langSelect.name) programTypeIdField = langSelect.name;

        const options = langSelect.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value) {
                availableLanguages.push({
                    value: opt.value,
                    title: opt.textContent.trim(),
                    isSelected: opt.selected
                });
            }
        });
    }

    // Problem Code Field
    const problemInput = root.querySelector('select[name="submittedProblemCode"], input[name="submittedProblemCode"]');
    if (problemInput && problemInput.name) {
        problemCodeField = problemInput.name;
    }

    // Source Code Field
    const sourceTextarea = root.querySelector('textarea[name="source"], textarea#sourceCodeTextarea, input[name="sourceFile"]');
    if (sourceTextarea && sourceTextarea.name) {
        sourceField = sourceTextarea.name;
    }

    // 4. Determine canonical form action
    let formAction = submitForm ? (submitForm.getAttribute('action') || submitForm.action) : null;
    
    // If formAction is missing, invalid, or points to unrelated path, construct canonical URL
    if (!formAction || formAction.includes('problemTags') || !formAction.includes('submit')) {
        if (context.contestId && context.problemIndex) {
            formAction = `/contest/${context.contestId}/problem/${context.problemIndex}?action=submitSolutionFormProcessor`;
        } else {
            formAction = '/problemset/submit?action=submitSolutionFormProcessor';
        }
    }

    return {
        formFound: !!submitForm || availableLanguages.length > 0,
        formAction,
        csrfToken: csrfToken || null,
        fields: {
            csrfTokenField: csrfFieldName,
            programTypeIdField,
            problemCodeField,
            sourceField
        },
        availableLanguages
    };
}


/* --- src/handleExtractor.js --- */
/**
 * Codeforces Handle Extractor
 * Extracts the currently logged-in user's handle from the page header,
 * needed to poll their own submission list for verdicts.
 */

/**
 * @param {Document} doc
 * @returns {string|null}
 */
function extractLoggedInHandle(doc = document) {
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


/* --- src/storage.js --- */
/**
 * Storage Abstraction for LeetForces
 * Uses chrome.storage.local when available, falling back to localStorage.
 */



/**
 * Builds the combined storage key for a problem + language pair.
 * Falls back to problemKey alone if languageFamily is omitted, so any
 * existing single-key saves from before this change still resolve.
 */
function buildCodeStorageKey(problemKey, languageFamily) {
    return languageFamily
        ? `${STORAGE_KEYS.CODE_PREFIX}${problemKey}::${languageFamily}`
        : `${STORAGE_KEYS.CODE_PREFIX}${problemKey}`;
}

async function getSavedCode(problemKey, languageFamily) {
    if (!problemKey) return null;
    const storageKey = buildCodeStorageKey(problemKey, languageFamily);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.get([storageKey], result => {
                resolve(result[storageKey] || null);
            });
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(storageKey);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage read failed', e);
    }
    return null;
}

async function saveCode(problemKey, languageFamily, code) {
    if (!problemKey) return;
    if (typeof code !== 'string' || !code.trim()) return;
    const storageKey = buildCodeStorageKey(problemKey, languageFamily);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            try {
                chrome.storage.local.set({ [storageKey]: code }, resolve);
            } catch (_) {
                resolve();
            }
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, code);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}

async function getLastProblemKey() {
    const storageKey = STORAGE_KEYS.LAST_PROBLEM_KEY;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.get([storageKey], result => {
                resolve(result[storageKey] || null);
            });
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(storageKey);
        }
    } catch (e) {
        return null;
    }
}

async function setLastProblemKey(problemKey) {
    const storageKey = STORAGE_KEYS.LAST_PROBLEM_KEY;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.set({ [storageKey]: problemKey }, resolve);
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, problemKey);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}

async function getPreferredLanguage() {
    const storageKey = STORAGE_KEYS.PREFERRED_LANG;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.get([storageKey], result => {
                resolve(result[storageKey] || null);
            });
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(storageKey);
        }
    } catch (e) {
        return null;
    }
}

async function savePreferredLanguage(title) {
    if (!title) return;
    const storageKey = STORAGE_KEYS.PREFERRED_LANG;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.set({ [storageKey]: title }, resolve);
        });
    }

    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, title);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}

/* --- src/editorManager.js --- */
/**
 * Editor Manager for LeetForces
 * Manages editor detection, template injection, cursor positioning, and state persistence.
 *
 * Chrome content scripts run in an isolated world, so window.ace is invisible.
 * When direct detection fails, we talk to src/pageBridge.js (MAIN world) via CustomEvents.
 */





/**
 * Converts a character offset back into 1-indexed line/column, the inverse
 * of computeCursorOffset. Used to place the cursor at a boilerplate's
 * $CURSOR$ marker position.
 * @param {string} text
 * @param {number} offset
 * @returns {{ line: number, col: number }}
 */
function offsetToLineCol(text, offset) {
    const before = text.slice(0, offset);
    const lines = before.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    return { line, col };
}

/**
 * Computes character offset in raw string for target line and column (1-indexed).
 * @param {string} text
 * @param {number} targetLine
 * @param {number} targetCol
 * @returns {number}
 */
function computeCursorOffset(text, targetLine, targetCol) {
    const lines = text.split('\n');
    let offset = 0;
    const maxLineIndex = Math.min(targetLine - 1, lines.length - 1);

    for (let i = 0; i < maxLineIndex; i++) {
        offset += lines[i].length + 1; // +1 for newline character
    }

    const currentLine = lines[maxLineIndex] || '';
    const colOffset = Math.min(targetCol - 1, currentLine.length);
    return offset + colOffset;
}

/**
 * Synchronous page-bridge RPC (CustomEvent handlers run in the same turn).
 * @param {string} method
 * @param {any[]} [args]
 * @returns {any}
 */
function callPageBridge(method, args = []) {
    if (typeof document === 'undefined') return null;
    const id = `lf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let payload = null;

    const onResponse = (event) => {
        if (event.detail && event.detail.id === id) {
            payload = event.detail;
        }
    };

    document.addEventListener('leetforces-bridge-response', onResponse);
    document.dispatchEvent(new CustomEvent('leetforces-bridge-request', {
        detail: { id, method, args }
    }));
    document.removeEventListener('leetforces-bridge-response', onResponse);

    if (!payload || payload.error) return null;
    return payload.result;
}

function createBridgeEditor(type) {
    return {
        type: 'bridge',
        bridgeType: type,
        element: null,
        instance: { __leetforcesBridge: true }
    };
}

function detectEditorDirect(doc = document) {
    // 1. Ace (only works if running in page / MAIN world)
    const aceEl = doc.querySelector('.ace_editor');
    if (aceEl && typeof window !== 'undefined' && window.ace) {
        try {
            const aceInstance = window.ace.edit(aceEl);
            if (aceInstance) {
                return { type: 'ace', element: aceEl, instance: aceInstance };
            }
        } catch (e) {
            if (aceEl.env && aceEl.env.editor) {
                return { type: 'ace', element: aceEl, instance: aceEl.env.editor };
            }
        }
    }

    // 2. Monaco
    const monacoEl = doc.querySelector('.monaco-editor');
    if (monacoEl && typeof window !== 'undefined' && window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        if (editors && editors.length > 0) {
            return { type: 'monaco', element: monacoEl, instance: editors[0] };
        }
    }

    // 3. CodeMirror 5
    const cmEl = doc.querySelector('.CodeMirror');
    if (cmEl && cmEl.CodeMirror) {
        return { type: 'codemirror', element: cmEl, instance: cmEl.CodeMirror };
    }

    // 4. Submit-form textarea (prefer CF selectors; avoid random page textareas)
    const textareaSelectors = [
        'form.submit-form textarea[name="source"]',
        'form#singlePageSubmitForm textarea[name="source"]',
        'form[action*="submit"] textarea[name="source"]',
        'textarea#sourceCodeTextarea',
        'textarea[name="source"]',
        'textarea.source-code'
    ];

    for (const selector of textareaSelectors) {
        const textarea = doc.querySelector(selector);
        if (textarea) {
            return { type: 'textarea', element: textarea, instance: textarea };
        }
    }

    return { type: 'unknown', element: null, instance: null };
}

/**
 * Detects code editor on the page (Ace, Monaco, CodeMirror, Textarea, or page bridge).
 * @param {Document} doc
 * @returns {{ type: string, element: Element|null, instance: any|null, bridgeType?: string }}
 */
function detectEditor(doc = document) {
    const direct = detectEditorDirect(doc);
    if (direct.type !== 'unknown' && direct.instance) {
        return direct;
    }

    // Isolated content script: talk to MAIN-world pageBridge
    const bridged = callPageBridge('detect');
    if (bridged && bridged.ready && bridged.type && bridged.type !== 'unknown') {
        return createBridgeEditor(bridged.type);
    }

    // Ace DOM present but not ready yet
    if (doc.querySelector('.ace_editor') || (bridged && bridged.type === 'ace')) {
        return { type: 'unknown', element: doc.querySelector('.ace_editor'), instance: null };
    }

    return { type: 'unknown', element: null, instance: null };
}

/**
 * Gets current value from editor instance.
 * @param {{ type: string, instance: any }} editor
 * @returns {string}
 */
function getEditorValue(editor) {
    if (!editor || !editor.instance) return '';
    switch (editor.type) {
        case 'bridge': {
            const value = callPageBridge('getValue');
            return typeof value === 'string' ? value : '';
        }
        case 'ace':
            return editor.instance.getValue();
        case 'monaco':
            return editor.instance.getValue();
        case 'codemirror':
            return editor.instance.getValue();
        case 'textarea':
            return editor.instance.value;
        default:
            return '';
    }
}

/**
 * Sets value into editor instance.
 * @param {{ type: string, instance: any }} editor
 * @param {string} code
 */
function setEditorValue(editor, code) {
    if (!editor || !editor.instance) return;
    switch (editor.type) {
        case 'bridge':
            callPageBridge('setValue', [code]);
            break;
        case 'ace':
            editor.instance.setValue(code, -1);
            break;
        case 'monaco':
            editor.instance.setValue(code);
            break;
        case 'codemirror':
            editor.instance.setValue(code);
            break;
        case 'textarea':
            editor.instance.value = code;
            editor.instance.dispatchEvent(new Event('input', { bubbles: true }));
            editor.instance.dispatchEvent(new Event('change', { bubbles: true }));
            break;
    }
}

/**
 * Positions editor cursor at target line and column (1-indexed), focusing the editor.
 * @param {{ type: string, instance: any, element: Element }} editor
 * @param {number} line - Target line number (1-indexed)
 * @param {number} col - Target column number (1-indexed)
 */
function setEditorCursor(editor, line = DEFAULT_CURSOR_LINE, col = DEFAULT_CURSOR_COLUMN) {
    if (!editor || !editor.instance) return;

    try {
        switch (editor.type) {
            case 'bridge':
                callPageBridge('setCursor', [line, col]);
                break;
            case 'ace':
                editor.instance.focus();
                editor.instance.gotoLine(line, col - 1, true);
                break;
            case 'monaco':
                editor.instance.focus();
                editor.instance.setPosition({ lineNumber: line, column: col });
                editor.instance.revealLineInCenter(line);
                break;
            case 'codemirror':
                editor.instance.focus();
                editor.instance.setCursor({ line: line - 1, ch: col - 1 });
                break;
            case 'textarea': {
                const textarea = editor.instance;
                textarea.focus();
                const code = textarea.value;
                const offset = computeCursorOffset(code, line, col);
                textarea.setSelectionRange(offset, offset);
                break;
            }
        }
    } catch (err) {
        console.warn('LeetForces: Failed to set cursor position', err);
    }
}

/**
 * Initializes problem code for the detected editor, for a given language.
 * @param {string} problemKey
 * @param {string} languageFamily - e.g. "C++", "Python3" (from getLanguageFamily)
 * @param {{ type: string, instance: any, element: Element }} editor
 * @returns {Promise<{ isNewProblem: boolean, codeUsed: string }>}
 */
async function initializeProblemEditor(problemKey, languageFamily, editor) {
    if (!problemKey || !editor || !editor.instance) {
        return { isNewProblem: false, codeUsed: '' };
    }

    const lastProblemKey = await getLastProblemKey();
    const isNewProblem = lastProblemKey !== problemKey;

    await setLastProblemKey(problemKey);
    await loadCodeForLanguage(problemKey, languageFamily, editor);

    return { isNewProblem, codeUsed: getEditorValue(editor) };
}

/**
 * Loads saved code for a problem+language pair, or falls back to that
 * language's boilerplate if nothing was saved yet. Called both on first
 * load and whenever the user switches languages in the dropdown.
 * @param {string} problemKey
 * @param {string} languageFamily
 * @param {{ type: string, instance: any, element: Element }} editor
 */
async function loadCodeForLanguage(problemKey, languageFamily, editor) {
    if (!problemKey || !editor || !editor.instance) return;

    const savedCode = await getSavedCode(problemKey, languageFamily);

    if (savedCode && savedCode.trim().length > 0) {
        setEditorValue(editor, savedCode);
        attachAutoSaveListener(problemKey, languageFamily, editor);
        return;
    }

    const boilerplate = getBoilerplate(languageFamily);
    const codeToApply = boilerplate ? boilerplate.code : '';

    setEditorValue(editor, codeToApply);
    await saveCode(problemKey, languageFamily, codeToApply);

    if (boilerplate) {
        setTimeout(() => {
            const { line, col } = offsetToLineCol(codeToApply, boilerplate.cursorOffset);
            setEditorCursor(editor, line, col);
        }, 50);
    }

    attachAutoSaveListener(problemKey, languageFamily, editor);
}

/**
 * Called when the user picks a different language in the dropdown.
 * Swaps the autosave listener to the new problem+language key and loads
 * whatever code belongs to that combination (saved code or boilerplate).
 * @param {string} problemKey
 * @param {string} languageFamily
 * @param {{ type: string, instance: any, element: Element }} editor
 */
async function switchLanguage(problemKey, languageFamily, editor) {
    await loadCodeForLanguage(problemKey, languageFamily, editor);
}

/**
 * Attaches event listener to auto-save code changes for the current
 * problemKey + languageFamily pair. Detaches any previous autosave
 * listener first so switching languages doesn't leave stale listeners
 * saving into the wrong slot.
 * @param {string} problemKey
 * @param {string} languageFamily
 * @param {{ type: string, instance: any, element: Element }} editor
 */
function attachAutoSaveListener(problemKey, languageFamily, editor) {
    if (!problemKey || !editor || !editor.instance) return;

    if (editor.__lfDetachAutoSave) {
        editor.__lfDetachAutoSave();
        editor.__lfDetachAutoSave = null;
    }

    let debounceTimer = null;
    const triggerSave = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const currentCode = getEditorValue(editor);
            if (currentCode) {
                saveCode(problemKey, languageFamily, currentCode);
            }
        }, 400);
    };

    switch (editor.type) {
        case 'bridge':
            callPageBridge('bindChange');
            document.addEventListener('leetforces-bridge-change', triggerSave);
            editor.__lfDetachAutoSave = () => {
                document.removeEventListener('leetforces-bridge-change', triggerSave);
            };
            break;
        case 'ace':
            editor.instance.on('change', triggerSave);
            editor.__lfDetachAutoSave = () => editor.instance.off('change', triggerSave);
            break;
        case 'monaco': {
            const disposable = editor.instance.onDidChangeModelContent(triggerSave);
            editor.__lfDetachAutoSave = () => disposable.dispose();
            break;
        }
        case 'codemirror':
            editor.instance.on('change', triggerSave);
            editor.__lfDetachAutoSave = () => editor.instance.off('change', triggerSave);
            break;
        case 'textarea':
            editor.instance.addEventListener('input', triggerSave);
            editor.instance.addEventListener('change', triggerSave);
            editor.__lfDetachAutoSave = () => {
                editor.instance.removeEventListener('input', triggerSave);
                editor.instance.removeEventListener('change', triggerSave);
            };
            break;
    }
}

/* --- src/languageMap.js --- */
/**
 * Codeforces Language & Compiler Mapping Engine
 * Maps human-readable names to Codeforces internal compiler IDs (programTypeId).
 */

// Standard Codeforces Compiler Mapping
const KNOWN_COMPILER_MAP = {
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
function getLanguageFamily(compilerIdOrTitle) {
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
 * Resolves the best matching programTypeId from available form languages based on user preference.
 * @param {string} preferredLang - User's preferred language string (e.g. "GNU G++20", "Python 3", "Java 21", "89")
 * @param {Array<{ value: string, title: string, isSelected: boolean }>} availableLanguages - Extracted form languages
 * @returns {string|null} - Selected programTypeId value
 */
function resolveLanguageId(preferredLang, availableLanguages = []) {
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
function populateLanguageSelector(selectElement, availableLanguages = [], preferredLang = '') {
    if (!selectElement) return;

    const doc = selectElement.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    selectElement.innerHTML = '';
    const resolvedId = resolveLanguageId(preferredLang, availableLanguages);

    if (availableLanguages.length === 0) {
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

    availableLanguages.forEach(lang => {
        const opt = doc.createElement('option');
        opt.value = lang.value;
        opt.textContent = lang.title;
        if (String(lang.value) === String(resolvedId)) {
            opt.selected = true;
        }
        selectElement.appendChild(opt);
    });
}

/* --- src/submitter.js --- */
/**
 * Codeforces Submitter Engine
 * Submits solution using extracted CSRF token, field names, and logged-in user session cookies.
 */

/**
 * Extracts submission ID from Codeforces response URL or response HTML body.
 * @param {string} responseText 
 * @param {string} responseUrl 
 * @returns {string|null}
 */
function extractSubmissionIdFromResponse(responseText = '', responseUrl = '') {
    // 1. Extract from redirect URL if available
    // e.g. https://codeforces.com/contest/1234/submission/987654321
    // e.g. https://codeforces.com/problemset/submission/1234/987654321
    if (responseUrl) {
        const urlMatch = responseUrl.match(/\/submission\/(\d+)/i) || responseUrl.match(/submissionId=(\d+)/i);
        if (urlMatch) {
            return urlMatch[1];
        }
    }

    if (!responseText) return null;

    // 2. Extract from HTML data attributes e.g. <tr data-submission-id="987654321">
    const dataAttrMatch = responseText.match(/data-submission-id=["']?(\d+)["']?/i);
    if (dataAttrMatch) {
        return dataAttrMatch[1];
    }

    // 3. Extract from submission links e.g. href="/contest/1234/submission/987654321"
    const linkMatch = responseText.match(/\/submission\/(\d+)/i);
    if (linkMatch) {
        return linkMatch[1];
    }

    // 4. Extract from JS variable or inline script e.g. submissionId = 987654321
    const jsVarMatch = responseText.match(/submissionId\s*[:=]\s*["']?(\d+)["']?/i);
    if (jsVarMatch) {
        return jsVarMatch[1];
    }

    return null;
}

/**
 * Builds FormData payload for Codeforces submission form.
 * @param {object} options 
 * @returns {FormData}
 */
function buildSubmissionFormData(options) {
    const {
        csrfToken,
        fields = {},
        programTypeId,
        problemCode,
        sourceCode
    } = options;

    const csrfFieldName = fields.csrfTokenField || 'csrf_token';
    const programTypeIdField = fields.programTypeIdField || 'programTypeId';
    const problemCodeField = fields.problemCodeField || 'submittedProblemCode';
    const sourceField = fields.sourceField || 'source';

    const formData = new FormData();
    formData.append(csrfFieldName, csrfToken || '');
    formData.append('ftaa', (typeof window !== 'undefined' && window.ftaa) || '');
    formData.append('bfaa', (typeof window !== 'undefined' && window.bfaa) || '');
    formData.append('action', 'submitSolutionFormProcessor');
    formData.append(problemCodeField, problemCode || '');
    formData.append(programTypeIdField, programTypeId || '89');
    formData.append(sourceField, sourceCode || '');
    formData.append('tabSize', '4');
    formData.append('sourceFile', '');

    return formData;
}

/**
 * Submits solution code to Codeforces using existing user session.
 * @param {object} options - Submission options
 * @param {string} options.formAction - Submission endpoint URL
 * @param {string} options.csrfToken - CSRF token
 * @param {object} options.fields - Field names mapping
 * @param {string} options.programTypeId - Selected compiler ID
 * @param {string} options.problemCode - Problem code (e.g. "G")
 * @param {string} options.sourceCode - Solution code
 * @param {function} [fetchImpl] - Fetch function implementation
 * @returns {Promise<{
 *   success: boolean,
 *   submissionId: string|null,
 *   redirectUrl: string|null,
 *   error: string|null,
 *   responseText: string
 * }>}
 */
async function submitSolutionToCodeforces(options, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
    const {
        formAction,
        csrfToken,
        fields,
        programTypeId,
        problemCode,
        sourceCode
    } = options;

    if (!csrfToken) {
        return { success: false, submissionId: null, redirectUrl: null, error: 'CSRF token is missing', responseText: '' };
    }
    if (!sourceCode || sourceCode.trim().length === 0) {
        return { success: false, submissionId: null, redirectUrl: null, error: 'Source code is empty', responseText: '' };
    }

    if (!fetchImpl) {
        return { success: false, submissionId: null, redirectUrl: null, error: 'Fetch API is not available', responseText: '' };
    }

    // Determine target URL (always absolute against codeforces.com)
    let targetUrl = formAction || (typeof window !== 'undefined' ? window.location.href : '');
    if (targetUrl.startsWith('/')) {
        targetUrl = `https://codeforces.com${targetUrl}`;
    }
    if (!targetUrl.includes('action=submitSolutionFormProcessor')) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl += `${separator}action=submitSolutionFormProcessor`;
    }

    const formData = buildSubmissionFormData({ csrfToken, fields, programTypeId, problemCode, sourceCode });

    try {
        const response = await fetchImpl(targetUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include', // Includes user's logged-in Codeforces session cookies
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const responseText = await response.text();
        const finalUrl = response.url || targetUrl;
        const submissionId = extractSubmissionIdFromResponse(responseText, finalUrl);

        if (response.ok || submissionId) {
            return {
                success: true,
                submissionId,
                redirectUrl: finalUrl,
                error: null,
                responseText
            };
        } else {
            return {
                success: false,
                submissionId: null,
                redirectUrl: finalUrl,
                error: `HTTP Error ${response.status}: ${response.statusText}`,
                responseText
            };
        }
    } catch (err) {
        return {
            success: false,
            submissionId: null,
            redirectUrl: null,
            error: err.message || 'Network submission error',
            responseText: ''
        };
    }
}


/* --- src/testRunner.js --- */
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
function resolveJudge0LanguageId(languageTitle = '') {
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
function normalizeOutput(text = '') {
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
async function runSingleTest({ languageId, sourceCode, input }, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
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
async function runSampleTests({ languageTitle, sourceCode, sampleTests = [] }, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
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


/* --- src/verdictPoller.js --- */
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
function formatVerdict(submission) {
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
async function fetchContestSubmissions(contestId, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
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
async function pollVerdictForSubmission(options = {}) {
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


/* --- src/verdictUI.js --- */
/**
 * Codeforces Verdict UI Renderer
 * Renders submission verdicts as a shadcn-style "alert": a soft tinted
 * background with a colored left border, plus a small low-contrast badge
 * for the status label. All colors come from theme.css's semantic tokens
 * via CSS classes — this module has no hardcoded hex values in its markup.
 */

// Mirrors the semantic tokens in theme.css. Kept here (not read from the
// DOM) so getVerdictTheme stays a pure, easily-testable function; keep
// these in sync with --lf-success / --lf-error / --lf-warning / --lf-neutral / --lf-info.
const VERDICT_THEMES = {
    ACCEPTED: { variant: 'success', color: '#4ade80', badgeLabel: 'Accepted', icon: '✓', isPending: false },
    OK: { variant: 'success', color: '#4ade80', badgeLabel: 'Accepted', icon: '✓', isPending: false },
    WRONG_ANSWER: { variant: 'error', color: '#f87171', badgeLabel: 'Wrong answer', icon: '✕', isPending: false },
    TIME_LIMIT_EXCEEDED: { variant: 'warning', color: '#fbbf24', badgeLabel: 'Time limit exceeded', icon: '⏱', isPending: false },
    MEMORY_LIMIT_EXCEEDED: { variant: 'warning', color: '#fbbf24', badgeLabel: 'Memory limit exceeded', icon: '💾', isPending: false },
    RUNTIME_ERROR: { variant: 'error', color: '#f87171', badgeLabel: 'Runtime error', icon: '💥', isPending: false },
    COMPILATION_ERROR: { variant: 'neutral', color: '#a1a1aa', badgeLabel: 'Compilation error', icon: '⚡', isPending: false },
    CHALLENGED: { variant: 'error', color: '#f87171', badgeLabel: 'Hacked', icon: '🎯', isPending: false },
    TESTING: { variant: 'info', color: '#60a5fa', badgeLabel: 'Testing', icon: '⏳', isPending: true }
};

/**
 * Returns theme tokens for a given verdict statusKey.
 * @param {string} statusKey
 * @returns {{ variant: string, color: string, badgeLabel: string, icon: string, isPending: boolean }}
 */
function getVerdictTheme(statusKey = 'TESTING') {
    return VERDICT_THEMES[statusKey] || VERDICT_THEMES.TESTING;
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Renders or updates the verdict result panel element in the UI.
 * @param {HTMLElement} containerEl - Target DOM container
 * @param {object} verdictData - Object returned by formatVerdict / pollVerdictForSubmission
 */
function renderVerdictPanel(containerEl, verdictData = {}) {
    if (!containerEl) return;

    const {
        statusKey = 'TESTING',
        formattedText = 'Testing...',
        submissionId = null,
        timeMs = 0,
        memoryBytes = 0
    } = verdictData;

    const theme = getVerdictTheme(statusKey);
    const memoryMb = (memoryBytes / (1024 * 1024)).toFixed(1);

    const metaParts = [];
    if (submissionId) metaParts.push(`ID <strong>${escapeHtml(String(submissionId))}</strong>`);
    if (timeMs > 0) metaParts.push(`<strong>${timeMs} ms</strong>`);
    if (memoryBytes > 0) metaParts.push(`<strong>${memoryMb} MB</strong>`);
    if (theme.isPending) metaParts.push('Updating in real time…');

    const iconClass = theme.isPending ? 'lf-icon-pulse' : '';

    containerEl.className = `lf-alert lf-alert-${theme.variant}`;
    containerEl.innerHTML = `
        <div class="lf-alert-title">
            <span><span class="${iconClass}">${theme.icon}</span> ${escapeHtml(formattedText)}</span>
            <span class="lf-badge lf-badge-${theme.variant}">${escapeHtml(theme.badgeLabel)}</span>
        </div>
        ${metaParts.length > 0 ? `<div class="lf-alert-meta">${metaParts.map(p => `<span>${p}</span>`).join('')}</div>` : ''}
    `;
}

/* --- src/controlPanel.js --- */
/**
 * LeetForces Workspace
 * LeetCode-style split view on Codeforces problem pages:
 * left = problem statement, right = language + editor + Submit + live verdicts.
 * Submits through the logged-in Codeforces session — no file download/upload.
 *
 * All visual styling (colors, spacing, buttons, alerts) comes from
 * theme.css's design tokens and component classes — this file should not
 * define its own competing token/color system. theme.css is loaded once
 * globally via manifest.json's content_scripts, so its custom properties
 * and .lf-* classes are available here without any injection.
 */







const WORKSPACE_ID = 'leetforces-workspace';
const PANEL_ID = 'leetforces-control-panel'; // kept for tests / legacy queries
const DEFAULT_LANG = 'GNU G++20 (64 bit)';

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function el(doc, tag, attrs = {}, text) {
    const node = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'style') {
            const css = typeof value === 'string'
                ? value
                : Object.entries(value).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${v}`).join(';');
            if (node.style) node.style.cssText = css;
            else node.style = { cssText: css };
        } else if (typeof node.setAttribute === 'function') {
            node.setAttribute(key, value);
            if (key === 'id') node.id = value;
        } else {
            node[key] = value;
        }
    }
    if (text !== undefined) node.textContent = text;
    return node;
}

function placeCursorInTextarea(textarea, line, col) {
    try {
        if (!textarea || typeof textarea.setSelectionRange !== 'function') return;
        const offset = computeCursorOffset(String(textarea.value || ''), line, col);
        if (typeof textarea.focus === 'function') textarea.focus();
        textarea.setSelectionRange(offset, offset);
    } catch (_) { /* ignore */ }
}

function safeSaveCode(problemKey, languageFamily, code) {
    if (!problemKey || typeof code !== 'string' || !code.trim()) return;
    try {
        const p = saveCode(problemKey, languageFamily, code);
        if (p && typeof p.catch === 'function') p.catch(() => { });
    } catch (_) { /* ignore */ }
}

/** Wraps a one-line message in the same alert style as everything else. */
function buildInlineAlert(variant, message) {
    return `<div class="lf-alert lf-alert-${variant}"><div class="lf-alert-title">${escapeHtml(message)}</div></div>`;
}

/**
 * Injects LeetCode-style workspace. Safe to call multiple times (rebuilds).
 * @returns {Promise<HTMLElement>}
 */
async function injectControlPanel({
    doc = document,
    context = {},
    formDetails = {},
    submitSolution,
    pollVerdict,
    renderVerdict
}) {
    const prev = doc.getElementById(WORKSPACE_ID) || doc.getElementById(PANEL_ID);
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);

    const body = doc.body;
    if (!body) throw new Error('document.body is not available');

    if (!doc.getElementById('leetforces-hide-native')) {
        const style = el(doc, 'style', { id: 'leetforces-hide-native' });
        style.textContent = `
            body.leetforces-active > *:not(#leetforces-workspace):not(script):not(style) { display: none !important; }
            #leetforces-workspace, #leetforces-workspace * { box-sizing: border-box; }
            #leetforces-workspace pre, #leetforces-workspace .problem-statement { white-space: pre-wrap; word-break: break-word; }
            #leetforces-code-editor:focus { outline: 1px solid var(--lf-accent); outline-offset: -1px; }
        `;
        (doc.head || body).appendChild(style);
    }
    if (body.classList && body.classList.add) body.classList.add('leetforces-active');
    else body.className = `${body.className || ''} leetforces-active`.trim();

    const workspace = el(doc, 'div', {
        id: WORKSPACE_ID,
        style: `
            position: fixed; inset: 0; z-index: 2147483000;
            display: flex; flex-direction: column;
            background: var(--lf-background); color: var(--lf-foreground);
            font-family: var(--lf-font-sans);
        `
    });

    const shell = el(doc, 'div', {
        id: PANEL_ID,
        style: 'display:flex; flex-direction:column; height:100%; min-height:0; border:none; border-radius:0; background:transparent;'
    });

    const top = el(doc, 'div', {
        class: 'lf-header',
        style: `
            flex:0 0 auto; justify-content:space-between;
            padding:10px 14px; background:var(--lf-surface);
            margin-bottom:0; border-radius:0;
        `
    });
    const topLeft = el(doc, 'div', { class: 'lf-header-title', style: 'min-width:0;' });
    topLeft.appendChild(el(doc, 'span', { style: 'font-weight:800; font-size:15px; color:var(--lf-foreground); letter-spacing:0.02em;' }, 'LeetForces'));
    topLeft.appendChild(el(doc, 'span', {
        class: 'lf-problem-key',
        style: 'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;'
    }, context.problemName
        ? `${context.problemIndex || ''}. ${context.problemName}`
        : (context.problemKey || 'Problem')));
    const topRight = el(doc, 'div', { style: 'display:flex; align-items:center; gap:8px;' });
    const classicBtn = el(doc, 'button', {
        id: 'leetforces-classic-btn',
        type: 'button',
        class: 'lf-btn'
    }, 'Classic CF');
    topRight.appendChild(classicBtn);
    top.appendChild(topLeft);
    top.appendChild(topRight);

    const main = el(doc, 'div', { style: 'flex:1 1 auto; display:flex; min-height:0;' });

    const left = el(doc, 'div', {
        id: 'leetforces-problem-pane',
        style: `
            flex: 1 1 48%; min-width: 280px; max-width: 55%;
            overflow: auto; padding: 18px 20px 28px;
            background: var(--lf-surface); border-right: 1px solid var(--lf-border);
            color: var(--lf-foreground); font-size: var(--lf-text-base); line-height: 1.55;
        `
    });
    left.appendChild(el(doc, 'div', { style: 'font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--lf-muted-foreground); margin-bottom:12px;' }, 'Problem'));
    if (!doc.getElementById('leetforces-sample-fix')) {
        const sampleFixStyle = el(doc, 'style', { id: 'leetforces-sample-fix' });
        sampleFixStyle.textContent = `
            #leetforces-problem-pane .sample-test { background: var(--lf-background) !important; border: 1px solid var(--lf-border) !important; border-radius: var(--lf-radius-md) !important; margin-bottom: 14px !important; overflow: hidden !important; }
            #leetforces-problem-pane .sample-test .title,
            #leetforces-problem-pane .input .title,
            #leetforces-problem-pane .output .title { background: var(--lf-surface-hover) !important; color: var(--lf-muted-foreground) !important; font-weight: 700 !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; padding: 6px 10px !important; }
            #leetforces-problem-pane .input, #leetforces-problem-pane .output { background: var(--lf-background) !important; }
            #leetforces-problem-pane .input pre,
            #leetforces-problem-pane .output pre,
            #leetforces-problem-pane .sample-test pre,
            #leetforces-problem-pane .input .test-example-line,
            #leetforces-problem-pane .input div { background: var(--lf-background) !important; color: var(--lf-foreground) !important; font-family: var(--lf-font-mono) !important; font-size: 13px !important; padding: 2px 12px !important; margin: 0 !important; white-space: pre-wrap !important; word-break: break-word !important; }
            #leetforces-problem-pane .input pre { padding: 10px 12px !important; }
            #leetforces-problem-pane .problem-statement > .header { margin-bottom: 18px; }
            #leetforces-problem-pane .problem-statement .title { font-size: 19px; font-weight: 800; color: var(--lf-foreground); margin-bottom: 10px; }
            #leetforces-problem-pane .problem-statement .time-limit,
            #leetforces-problem-pane .problem-statement .memory-limit { font-size: 12.5px; color: var(--lf-muted-foreground); margin: 2px 0; }
            #leetforces-problem-pane .problem-statement .section-title { font-size: 14px; font-weight: 700; color: var(--lf-foreground); margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--lf-border); }
            #leetforces-problem-pane .problem-statement p { margin: 10px 0; }
            #leetforces-problem-pane .problem-statement strong { color: var(--lf-foreground); }
            #leetforces-problem-pane .problem-statement a { color: var(--lf-info, #60a5fa); }
            #leetforces-workspace ::-webkit-scrollbar { width: 10px; height: 10px; }
            #leetforces-workspace ::-webkit-scrollbar-track { background: transparent; }
            #leetforces-workspace ::-webkit-scrollbar-thumb { background: var(--lf-border-strong); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
            #leetforces-workspace ::-webkit-scrollbar-thumb:hover { background: var(--lf-muted-foreground); }
        `;
        const styleTarget = doc.head || doc.body || doc.documentElement;
        if (styleTarget && typeof styleTarget.appendChild === 'function') styleTarget.appendChild(sampleFixStyle);
    }
    const statement = doc.querySelector && doc.querySelector('.problem-statement');
    if (statement && typeof statement.cloneNode === 'function') {
        const clone = statement.cloneNode(true);
        if (clone.style) clone.style.cssText = 'position:static; width:auto; max-width:100%;';
        left.appendChild(clone);
    } else {
        left.appendChild(el(doc, 'div', { style: 'color:var(--lf-muted-foreground);' }, 'Problem statement could not be cloned. Use Classic CF to read it on the original page.'));
    }

    const right = el(doc, 'div', { style: 'flex:1 1 52%; min-width:320px; display:flex; flex-direction:column; min-height:0; background:var(--lf-background);' });
    const toolbar = el(doc, 'div', { class: 'lf-toolbar', style: `
            flex:0 0 auto; flex-wrap:wrap;
            padding:10px 12px; border-bottom:1px solid var(--lf-border); background:var(--lf-surface);
            margin-bottom:0;
        ` });
    const langSelect = el(doc, 'select', { id: 'leetforces-lang-select', class: 'lf-select', style: 'min-width:180px;' });
    const submitBtn = el(doc, 'button', { id: 'leetforces-submit-btn', type: 'button', class: 'lf-btn lf-btn-primary' }, 'Submit');
    toolbar.appendChild(langSelect);
    toolbar.appendChild(submitBtn);
    const codeEditor = el(doc, 'textarea', { id: 'leetforces-code-editor', spellcheck: 'false', style: `
            flex:1 1 auto; min-height:220px; width:100%; resize:none; border:none;
            padding:14px 16px; background:var(--lf-background); color:var(--lf-foreground);
            font-family: var(--lf-font-mono);
            font-size:13px; line-height:1.5; tab-size:4; white-space:pre; overflow:auto;
        ` });
    const consolePane = el(doc, 'div', { id: 'leetforces-console', style: `
            flex:0 0 34%; min-height:140px; max-height:42%; overflow:auto;
            border-top:1px solid var(--lf-border); background:var(--lf-surface); padding:12px 14px;
        ` });
    consolePane.appendChild(el(doc, 'div', { style: 'font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--lf-muted-foreground); margin-bottom:6px;' }, 'Console'));
    const verdictEl = el(doc, 'div', { id: 'leetforces-verdict-panel' });
    consolePane.appendChild(verdictEl);
    right.appendChild(toolbar);
    right.appendChild(codeEditor);
    right.appendChild(consolePane);
    main.appendChild(left);
    main.appendChild(right);
    shell.appendChild(top);
    shell.appendChild(main);
    workspace.appendChild(shell);
    body.appendChild(workspace);

    let preferredLang = DEFAULT_LANG;
    try { const savedLang = await getPreferredLanguage(); if (savedLang) preferredLang = savedLang; } catch (_) {}
    populateLanguageSelector(langSelect, (formDetails && formDetails.availableLanguages) || [], preferredLang);
    const problemKey = context.problemKey || '';
    const loadCodeForCurrentLanguage = async () => {
        const opt = langSelect.options && langSelect.options[langSelect.selectedIndex];
        const langTitle = (opt && opt.text) || DEFAULT_LANG;
        const languageFamily = getLanguageFamily(langTitle) || 'C++';
        let codeToApply = '';
        try { if (problemKey) { const saved = await getSavedCode(problemKey, languageFamily); if (typeof saved === 'string' && saved.trim()) codeToApply = saved; } } catch (_) {}
        let usedBoilerplate = false;
        if (!codeToApply) { const boilerplate = getBoilerplate(languageFamily); codeToApply = boilerplate ? boilerplate.code : ''; usedBoilerplate = true; if (problemKey) safeSaveCode(problemKey, languageFamily, codeToApply); }
        codeEditor.value = codeToApply;
        if (usedBoilerplate) { const boilerplate = getBoilerplate(languageFamily); if (boilerplate) { const { line, col } = offsetToLineCol(boilerplate.code, boilerplate.cursorOffset); setTimeout(() => placeCursorInTextarea(codeEditor, line, col), 40); } }
        return languageFamily;
    };
    let currentLanguageFamily = await loadCodeForCurrentLanguage();
    langSelect.addEventListener('change', async () => { try { const opt = langSelect.options && langSelect.options[langSelect.selectedIndex]; if (opt && opt.text) savePreferredLanguage(opt.text); } catch (_) {} currentLanguageFamily = await loadCodeForCurrentLanguage(); });
    let saveTimer = null;
    const persistCode = () => safeSaveCode(problemKey, currentLanguageFamily, String(codeEditor.value || ''));
    codeEditor.addEventListener('input', () => { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(persistCode, 300); });
    codeEditor.addEventListener('keydown', (e) => { if (!e || e.key !== 'Tab') return; e.preventDefault(); try { const start = codeEditor.selectionStart != null ? codeEditor.selectionStart : String(codeEditor.value || '').length; const end = codeEditor.selectionEnd != null ? codeEditor.selectionEnd : start; const value = String(codeEditor.value || ''); codeEditor.value = `${value.slice(0, start)}    ${value.slice(end)}`; codeEditor.selectionStart = codeEditor.selectionEnd = start + 4; persistCode(); } catch (_) {} });
    classicBtn.addEventListener('click', () => { try { if (body.classList && body.classList.remove) body.classList.remove('leetforces-active'); if (workspace.parentNode) workspace.parentNode.removeChild(workspace); } catch (_) {} });
    const getSelectedLangTitle = () => { try { const opt = langSelect.options && langSelect.options[langSelect.selectedIndex]; return (opt && opt.text) || DEFAULT_LANG; } catch (_) { return DEFAULT_LANG; } };
    const getSourceCode = () => { let code = ''; try { code = String(codeEditor.value != null ? codeEditor.value : ''); } catch (_) { code = ''; } if (!code.trim()) { const fallback = getBoilerplate(currentLanguageFamily || 'C++'); code = fallback ? fallback.code : ''; try { codeEditor.value = code; } catch (_) {} } return code.replace(/\s+$/g, ''); };
    const showVerdict = (data) => { const renderer = typeof renderVerdict === 'function' ? renderVerdict : renderVerdictPanel; try { renderer(verdictEl, data); } catch (_) {} };
    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
        verdictEl.innerHTML = '';
        try {
            const sourceCode = getSourceCode();
            persistCode();
            if (typeof submitSolution !== 'function') throw new Error('Submit handler missing. Reload the extension and refresh this page.');
            showVerdict({ statusKey: 'TESTING', formattedText: 'Submitting to Codeforces…' });
            const result = await submitSolution(sourceCode, getSelectedLangTitle());
            if (!result || !result.success) { verdictEl.innerHTML = buildInlineAlert('error', `Submission failed: ${(result && result.error) || 'unknown error'}`); return; }
            showVerdict({ statusKey: 'TESTING', formattedText: 'In queue… waiting for verdict', submissionId: result.submissionId });
            if (typeof pollVerdict === 'function') {
                await pollVerdict({ submissionId: result.submissionId, onUpdate: (verdictData) => showVerdict(verdictData) });
            }
        } catch (err) {
            verdictEl.innerHTML = buildInlineAlert('error', (err && err.message) || 'Submit failed');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });
    return shell;
}

/* --- src/content.js --- */
/**
 * Main Content Script for LeetForces
 * Orchestrates context extraction, form extraction, floating panel, submit, and verdict polling.
 */











async function initLeetForcesPage(doc = document) {
    try {
        console.log('[LeetForces] Initializing problem page script...');

        const context = extractProblemContext(doc);
        console.log('[LeetForces] Extracted Problem Context:', context);

        const formDetails = extractSubmissionFormDetails(doc, context);
        console.log('[LeetForces] Extracted Form & CSRF Details:', formDetails);

        const submitHandler = async (sourceCode, preferredLang = 'GNU G++20 (64 bit)') => {
            const programTypeId = resolveLanguageId(
                preferredLang,
                (formDetails && formDetails.availableLanguages) || []
            );
            return submitSolutionToCodeforces({
                formAction: formDetails.formAction,
                csrfToken: formDetails.csrfToken,
                fields: formDetails.fields || {},
                programTypeId,
                problemCode: (context && context.problemIndex) || 'A',
                sourceCode
            });
        };

        if (typeof window !== 'undefined') {
            window.__LEETFORCES_DATA__ = {
                context,
                formDetails,
                compilerMap: KNOWN_COMPILER_MAP,
                resolveLanguageId: (lang) => resolveLanguageId(lang, (formDetails && formDetails.availableLanguages) || []),
                populateLanguageSelector: (selectEl, pref) => populateLanguageSelector(selectEl, (formDetails && formDetails.availableLanguages) || [], pref),
                submitSolution: submitHandler,
                pollVerdict: (opts) => pollVerdictForSubmission({
                    ...opts,
                    contestId: context.contestId,
                    problemIndex: context.problemIndex
                }),
                renderVerdict: renderVerdictPanel,
                getVerdictTheme,
                formatVerdict,
                timestamp: Date.now()
            };
        }

        if (context && context.problemKey) {
            const handle = extractLoggedInHandle(doc);
            console.log('[LeetForces] Extracted handle:', handle);

            // Detect native editor (no retries)
            const detected = detectEditor(doc);
            console.log(`[LeetForces] Native editor detected: ${detected.type}`);

            const { editor } = injectControlPanel({
                doc,
                editor: detected,
                context,
                formDetails,
                handle,
                submitSolution: submitHandler,
                pollVerdict: (opts) => pollVerdictForSubmission({ ...opts, contestId: context.contestId, problemIndex: context.problemIndex }),
                renderVerdict: renderVerdictPanel
            });

            console.log(`[LeetForces] Using ${detected.type !== 'unknown' ? detected.type : 'built-in'} editor.`);
            const result = await initializeProblemEditor(context.problemKey, editor);
            console.log(`[LeetForces] Editor initialized for problem '${context.problemKey}'. New problem: ${result.isNewProblem}`);
        } else {
            console.warn('[LeetForces] No problemKey extracted; panel not injected.');
        }

        return { context, formDetails, submitHandler };
    } catch (err) {
        console.error('[LeetForces] Failed to initialize:', err);
        return { context: null, formDetails: null, submitHandler: null, error: err };
    }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const boot = () => {
        initLeetForcesPage(document).catch((err) => {
            console.error('[LeetForces] Boot error:', err);
        });
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}


})();

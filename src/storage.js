/**
 * Storage Abstraction for LeetForces
 * Uses chrome.storage.local when available, falling back to localStorage.
 */

import { STORAGE_KEYS } from './constants.js';

export async function getSavedCode(problemKey) {
    if (!problemKey) return null;
    const storageKey = STORAGE_KEYS.CODE_PREFIX + problemKey;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.get([storageKey], result => {
                resolve(result[storageKey] || null);
            });
        });
    }

    try {
        return localStorage.getItem(storageKey);
    } catch (e) {
        console.warn('LeetForces: LocalStorage read failed', e);
        return null;
    }
}

export async function saveCode(problemKey, code) {
    if (!problemKey) return;
    const storageKey = STORAGE_KEYS.CODE_PREFIX + problemKey;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.set({ [storageKey]: code }, resolve);
        });
    }

    try {
        localStorage.setItem(storageKey, code);
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}

export async function getLastProblemKey() {
    const storageKey = STORAGE_KEYS.LAST_PROBLEM_KEY;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.get([storageKey], result => {
                resolve(result[storageKey] || null);
            });
        });
    }

    try {
        return localStorage.getItem(storageKey);
    } catch (e) {
        return null;
    }
}

export async function setLastProblemKey(problemKey) {
    const storageKey = STORAGE_KEYS.LAST_PROBLEM_KEY;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise(resolve => {
            chrome.storage.local.set({ [storageKey]: problemKey }, resolve);
        });
    }

    try {
        localStorage.setItem(storageKey, problemKey);
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}

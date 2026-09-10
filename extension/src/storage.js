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
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(storageKey);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage read failed', e);
    }
    return null;
}

export async function saveCode(problemKey, code) {
    if (!problemKey) return;
    if (typeof code !== 'string' || !code.trim()) return;
    const storageKey = STORAGE_KEYS.CODE_PREFIX + problemKey;

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
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(storageKey);
        }
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
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(storageKey, problemKey);
        }
    } catch (e) {
        console.warn('LeetForces: LocalStorage write failed', e);
    }
}

export async function getPreferredLanguage() {
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

export async function savePreferredLanguage(title) {
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

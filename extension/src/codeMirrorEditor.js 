/**
 * CodeMirror 6 editor wrapper.
 * Replaces the plain <textarea> with a real editor that has actual
 * syntax highlighting — a textarea can only ever be one flat color,
 * which is a hard limit CSS can't work around.
 *
 * Exposes a small API (getValue/setValue/setLanguage/focus/setCursor)
 * so the rest of the codebase doesn't need to know CodeMirror's own API.
 */

import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { StreamLanguage } from '@codemirror/language';

import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { javascript } from '@codemirror/lang-javascript';
import { php } from '@codemirror/lang-php';

import { clike } from '@codemirror/legacy-modes/mode/clike';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { erlang } from '@codemirror/legacy-modes/mode/erlang';
import { scheme } from '@codemirror/legacy-modes/mode/scheme';

/**
 * Maps a boilerplate language family (see boilerplates.js) to a CodeMirror
 * language extension. Families without a real highlighter fall back to
 * plain text (still a real editor, just monochrome for that language)
 * rather than crashing.
 * @param {string} languageFamily
 * @returns {import('@codemirror/state').Extension[]}
 */
function getLanguageExtension(languageFamily) {
    switch (languageFamily) {
        case 'C++': return [cpp()];
        case 'C': return [cpp()]; // close enough; CM has no separate plain-C mode
        case 'Java': return [java()];
        case 'Python3':
        case 'Python': return [python()];
        case 'Rust': return [rust()];
        case 'Go': return [go()];
        case 'JavaScript': return [javascript()];
        case 'TypeScript': return [javascript({ typescript: true })];
        case 'PHP': return [php()];
        case 'Kotlin': return [StreamLanguage.define(clike.kotlin)];
        case 'Scala': return [StreamLanguage.define(clike.scala)];
        case 'C#': return [StreamLanguage.define(clike.csharp)];
        case 'Dart': return [StreamLanguage.define(clike.dart)];
        case 'Ruby': return [StreamLanguage.define(ruby)];
        case 'Swift': return [StreamLanguage.define(swift)];
        case 'Erlang': return [StreamLanguage.define(erlang)];
        case 'Racket': return [StreamLanguage.define(scheme)]; // closest available (Lisp-family)
        default: return []; // Elixir and any unmapped language: plain text, no crash
    }
}

/**
 * A dark theme matching theme.css's design tokens, so the editor looks
 * like part of the same system rather than a bolted-on widget.
 */
const lfEditorTheme = EditorView.theme({
    '&': {
        backgroundColor: 'var(--lf-background)',
        color: 'var(--lf-foreground)',
        height: '100%',
        fontSize: '13px'
    },
    '.cm-content': {
        fontFamily: 'var(--lf-font-mono)',
        caretColor: 'var(--lf-accent)',
        padding: '14px 16px'
    },
    '.cm-gutters': {
        backgroundColor: 'var(--lf-surface)',
        color: 'var(--lf-muted-foreground)',
        border: 'none',
        borderRight: '1px solid var(--lf-border)'
    },
    '.cm-activeLine': { backgroundColor: 'var(--lf-surface-hover)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--lf-surface-hover)' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--lf-accent)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'color-mix(in srgb, var(--lf-accent) 25%, transparent) !important'
    }
}, { dark: true });

const languageCompartment = new Compartment();

/**
 * Creates a CodeMirror editor inside the given parent element.
 *
 * CodeMirror's EditorView touches the global `document`/`window` directly
 * in several internal code paths, so it cannot run in this project's
 * lightweight Node-based test environment (which has no real DOM at all).
 * When that environment is detected, this returns a simple, API-compatible
 * stub backed by an in-memory string instead — so everything *around* the
 * editor (language switching, save/load, submit flow) stays fully testable
 * without needing a real browser. In the actual extension, running inside
 * real Chrome, the real CodeMirror editor is always used.
 *
 * @param {Document} doc
 * @param {HTMLElement} parent - element to mount the editor into
 * @param {string} initialCode
 * @param {string} languageFamily
 * @returns {{
 *   dom: HTMLElement,
 *   getValue: () => string,
 *   setValue: (code: string) => void,
 *   setLanguage: (languageFamily: string) => void,
 *   setCursorOffset: (offset: number) => void,
 *   focus: () => void,
 *   onChange: (cb: () => void) => void
 * }}
 */
export function createCodeMirrorEditor(doc, parent, initialCode, languageFamily) {
    const hasRealDom = typeof document !== 'undefined' && typeof window !== 'undefined';

    if (!hasRealDom) {
        return createFallbackEditor(doc, parent, initialCode);
    }

    let changeCallback = null;

    const updateListener = EditorView.updateListener.of(update => {
        if (update.docChanged && typeof changeCallback === 'function') {
            changeCallback();
        }
    });

    const state = EditorState.create({
        doc: initialCode || '',
        extensions: [
            basicSetup,
            keymap.of([indentWithTab]),
            languageCompartment.of(getLanguageExtension(languageFamily)),
            lfEditorTheme,
            updateListener,
            EditorView.lineWrapping
        ]
    });

    const view = new EditorView({ state, parent });

    return {
        dom: view.dom,
        getValue: () => view.state.doc.toString(),
        setValue: (code) => {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: code || '' }
            });
        },
        setLanguage: (family) => {
            view.dispatch({
                effects: languageCompartment.reconfigure(getLanguageExtension(family))
            });
        },
        setCursorOffset: (offset) => {
            const safeOffset = Math.max(0, Math.min(offset, view.state.doc.length));
            view.dispatch({ selection: { anchor: safeOffset, head: safeOffset } });
            view.focus();
        },
        focus: () => view.focus(),
        onChange: (cb) => { changeCallback = cb; }
    };
}

/**
 * Minimal stand-in used only when no real browser DOM is available (the
 * test suite). Backed by a plain textarea-like mock node plus an in-memory
 * string, exposing the exact same API shape as the real editor.
 */
function createFallbackEditor(doc, parent, initialCode) {
    let currentValue = initialCode || '';
    let changeCallback = null;

    const node = doc.createElement('textarea');
    node.value = currentValue;
    if (parent && typeof parent.appendChild === 'function') parent.appendChild(node);

    return {
        dom: node,
        getValue: () => currentValue,
        setValue: (code) => {
            currentValue = code || '';
            node.value = currentValue;
        },
        setLanguage: () => { /* no-op: no real syntax tree in the stub */ },
        setCursorOffset: () => { /* no-op: no real selection model in the stub */ },
        focus: () => { try { node.focus(); } catch (_) { /* ignore */ } },
        onChange: (cb) => { changeCallback = cb; }
    };
}
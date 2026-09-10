/**
 * Runs in the page MAIN world so it can access window.ace / Monaco / CodeMirror.
 * Talks to the isolated content script via CustomEvents on document.
 */
(function () {
    if (window.__LEETFORCES_BRIDGE__) return;
    window.__LEETFORCES_BRIDGE__ = true;

    function resolveAce() {
        const aceEl = document.querySelector('.ace_editor');
        if (!aceEl) return null;
        try {
            if (window.ace) {
                const ed = window.ace.edit(aceEl);
                if (ed) return ed;
            }
        } catch (_) { /* fall through */ }
        if (aceEl.env && aceEl.env.editor) return aceEl.env.editor;
        return null;
    }

    function resolveMonaco() {
        if (!window.monaco || !window.monaco.editor) return null;
        const editors = window.monaco.editor.getEditors?.() || [];
        return editors[0] || null;
    }

    function resolveCodeMirror() {
        const cmEl = document.querySelector('.CodeMirror');
        return (cmEl && cmEl.CodeMirror) ? cmEl.CodeMirror : null;
    }

    function resolveTextarea() {
        const selectors = [
            'form.submit-form textarea[name="source"]',
            'form#singlePageSubmitForm textarea[name="source"]',
            'form[action*="submit"] textarea[name="source"]',
            'textarea#sourceCodeTextarea',
            'textarea[name="source"]'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    function detect() {
        if (resolveAce()) return { type: 'ace', ready: true };
        if (resolveMonaco()) return { type: 'monaco', ready: true };
        if (resolveCodeMirror()) return { type: 'codemirror', ready: true };
        if (resolveTextarea()) return { type: 'textarea', ready: true };
        if (document.querySelector('.ace_editor')) return { type: 'ace', ready: false };
        return { type: 'unknown', ready: false };
    }

    function getValue() {
        const ace = resolveAce();
        if (ace) return ace.getValue();
        const monaco = resolveMonaco();
        if (monaco) return monaco.getValue();
        const cm = resolveCodeMirror();
        if (cm) return cm.getValue();
        const ta = resolveTextarea();
        return ta ? ta.value : '';
    }

    function setValue(code) {
        const ace = resolveAce();
        if (ace) {
            ace.setValue(String(code ?? ''), -1);
            return true;
        }
        const monaco = resolveMonaco();
        if (monaco) {
            monaco.setValue(String(code ?? ''));
            return true;
        }
        const cm = resolveCodeMirror();
        if (cm) {
            cm.setValue(String(code ?? ''));
            return true;
        }
        const ta = resolveTextarea();
        if (ta) {
            ta.value = String(code ?? '');
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
        return false;
    }

    function setCursor(line, col) {
        const ace = resolveAce();
        if (ace) {
            ace.focus();
            ace.gotoLine(line, col - 1, true);
            return true;
        }
        const monaco = resolveMonaco();
        if (monaco) {
            monaco.focus();
            monaco.setPosition({ lineNumber: line, column: col });
            monaco.revealLineInCenter(line);
            return true;
        }
        const cm = resolveCodeMirror();
        if (cm) {
            cm.focus();
            cm.setCursor({ line: line - 1, ch: col - 1 });
            return true;
        }
        return false;
    }

    let changeBound = false;
    function ensureChangeRelay() {
        if (changeBound) return;
        const fire = () => {
            document.dispatchEvent(new CustomEvent('leetforces-bridge-change'));
        };
        const ace = resolveAce();
        if (ace) {
            ace.on('change', fire);
            changeBound = true;
            return;
        }
        const monaco = resolveMonaco();
        if (monaco) {
            monaco.onDidChangeModelContent(fire);
            changeBound = true;
            return;
        }
        const cm = resolveCodeMirror();
        if (cm) {
            cm.on('change', fire);
            changeBound = true;
            return;
        }
        const ta = resolveTextarea();
        if (ta) {
            ta.addEventListener('input', fire);
            ta.addEventListener('change', fire);
            changeBound = true;
        }
    }

    document.addEventListener('leetforces-bridge-request', (event) => {
        const detail = event.detail || {};
        const { id, method, args = [] } = detail;
        let result = null;
        let error = null;
        try {
            switch (method) {
                case 'detect':
                    result = detect();
                    break;
                case 'getValue':
                    result = getValue();
                    break;
                case 'setValue':
                    result = setValue(args[0]);
                    break;
                case 'setCursor':
                    result = setCursor(args[0], args[1]);
                    break;
                case 'bindChange':
                    ensureChangeRelay();
                    result = true;
                    break;
                default:
                    error = 'unknown_method';
            }
        } catch (err) {
            error = err && err.message ? err.message : String(err);
        }
        document.dispatchEvent(new CustomEvent('leetforces-bridge-response', {
            detail: { id, result, error }
        }));
    });
})();

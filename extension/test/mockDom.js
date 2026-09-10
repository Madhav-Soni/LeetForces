/**
 * Minimalistic zero-dependency HTML parser & DOM mock for Node tests
 */

class MockElement {
    constructor(tagName = 'div', attrs = {}, textContent = '') {
        this.tagName = tagName.toUpperCase();
        this.attributes = { ...attrs };
        this.children = [];
        this.parent = null;
        this.ownerDocument = null;
        this.textContent = textContent;
        this.innerText = textContent;
        this.value = attrs.value || textContent;
        this.name = attrs.name || '';
        this.id = attrs.id || '';
        this.selected = attrs.selected !== undefined ? attrs.selected : false;
        this.action = attrs.action || '';
        this.options = [];
        this.selectedIndex = 0;
        this.listeners = {};
        this.style = { cssText: '' };
    }

    get text() {
        return this.textContent;
    }

    addEventListener(event, handler) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(handler);
    }

    dispatchEvent(evt) {
        const type = typeof evt === 'string' ? evt : (evt.type || 'click');
        const handlers = this.listeners[type] || [];
        handlers.forEach(h => h(evt));
    }

    click() {
        this.dispatchEvent('click');
    }

    getAttribute(name) {
        return this.attributes[name] || null;
    }

    getElementById(id) {
        return this.querySelector(`#${id}`);
    }

    createElement(tagName) {
        const el = new MockElement(tagName);
        el.ownerDocument = this.ownerDocument || this;
        return el;
    }

    appendChild(child) {
        child.parent = this;
        child.ownerDocument = this.ownerDocument || this;
        this.children.push(child);
        if (child.tagName === 'OPTION' && this.tagName === 'SELECT') {
            this.options.push(child);
            if (child.selected) {
                this.selectedIndex = this.options.length - 1;
                this.value = child.value;
            }
        }
        return child;
    }

    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
        if (child) child.parent = null;
        return child;
    }

    querySelector(selector) {
        const results = this.querySelectorAll(selector);
        return results.length > 0 ? results[0] : null;
    }

    querySelectorAll(selector) {
        const matches = [];
        const matchSingle = (node) => {
            if (matchesSelector(node, selector)) {
                if (!matches.includes(node)) {
                    matches.push(node);
                }
            }
            for (const child of node.children) {
                matchSingle(child);
            }
        };
        for (const child of this.children) {
            matchSingle(child);
        }
        return matches;
    }

    set innerHTML(htmlStr) {
        this.children = [];
        this.options = [];
        if (typeof htmlStr === 'string' && htmlStr === '') {
            return;
        }
        const doc = this.ownerDocument || this;
        if (typeof htmlStr === 'string' && htmlStr.includes('<option')) {
            const matches = htmlStr.match(/<option[^>]*>[\s\S]*?<\/option>/gi);
            if (matches) {
                matches.forEach((optHtml) => {
                    const valMatch = optHtml.match(/value=["']([^"']+)["']/i);
                    const selMatch = optHtml.includes('selected');
                    const textMatch = optHtml.replace(/<[^>]+>/g, '').trim();
                    const optEl = doc.createElement('option');
                    optEl.value = valMatch ? valMatch[1] : '';
                    optEl.selected = selMatch;
                    optEl.textContent = textMatch;
                    optEl.innerText = textMatch;
                    this.appendChild(optEl);
                });
            }
        } else if (typeof htmlStr === 'string' && htmlStr.includes('leetforces-lang-select')) {
            const selectEl = doc.createElement('select');
            selectEl.id = 'leetforces-lang-select';
            const runBtn = doc.createElement('button');
            runBtn.id = 'leetforces-run-btn';
            const submitBtn = doc.createElement('button');
            submitBtn.id = 'leetforces-submit-btn';
            const runResults = doc.createElement('div');
            runResults.id = 'leetforces-run-results';
            const verdictPanel = doc.createElement('div');
            verdictPanel.id = 'leetforces-verdict-panel';
            this.appendChild(selectEl);
            this.appendChild(runBtn);
            this.appendChild(submitBtn);
            this.appendChild(runResults);
            this.appendChild(verdictPanel);
        }
    }
}

function matchSingleAtom(el, atom) {
    if (!el || !atom) return false;

    if (atom.startsWith('#')) {
        return el.id === atom.slice(1);
    }

    let rawTag = atom.split(/[\.\[#]/)[0];
    if (rawTag && rawTag.toUpperCase() !== el.tagName) {
        return false;
    }

    if (atom.includes('.')) {
        const classPart = atom.split('.')[1].split(/\[|#/)[0];
        const classes = (el.attributes.class || '').split(/\s+/);
        if (!classes.includes(classPart)) return false;
    }

    if (atom.includes('[name=')) {
        const match = atom.match(/\[name=["']?([^"']+)["']?\]/);
        if (match && el.name !== match[1]) return false;
    }

    if (atom.includes('[id=')) {
        const match = atom.match(/\[id=["']?([^"']+)["']?\]/);
        if (match && el.id !== match[1]) return false;
    }

    if (atom.includes('[action*=')) {
        const match = atom.match(/\[action\*=["']?([^"']+)["']?\]/);
        if (match && (!el.action || !el.action.includes(match[1]))) return false;
    }

    return true;
}

function matchesSelector(el, selector) {
    if (!el || !selector) return false;

    const commaParts = selector.split(',').map(s => s.trim());
    for (const compound of commaParts) {
        const atoms = compound.split(/\s+/);
        const lastAtom = atoms[atoms.length - 1];
        if (!matchSingleAtom(el, lastAtom)) continue;

        if (atoms.length > 1) {
            const ancestorAtom = atoms[atoms.length - 2];
            let currentParent = el.parent;
            let ancestorMatched = false;
            while (currentParent) {
                if (matchSingleAtom(currentParent, ancestorAtom)) {
                    ancestorMatched = true;
                    break;
                }
                currentParent = currentParent.parent;
            }
            if (ancestorMatched) return true;
        } else {
            return true;
        }
    }
    return false;
}

export function createMockDocument({ titleText, samples = [], formAttrs = {}, langOptions = [] }) {
    const root = new MockElement('html');
    const body = new MockElement('body');
    root.ownerDocument = root;
    body.ownerDocument = root;
    body.parent = root;
    root.children.push(body);

    root.body = body;
    root.getElementById = (id) => root.querySelector(`#${id}`);
    root.createElement = (tag) => {
        const el = new MockElement(tag);
        el.ownerDocument = root;
        return el;
    };

    // Problem statement
    const probStmt = root.createElement('div');
    probStmt.attributes.class = 'problem-statement';
    probStmt.parent = body;
    const header = root.createElement('div');
    header.attributes.class = 'header';
    header.parent = probStmt;
    const title = root.createElement('div');
    title.attributes.class = 'title';
    title.textContent = titleText;
    title.innerText = titleText;
    title.parent = header;
    header.children.push(title);
    probStmt.children.push(header);

    // Sample tests
    const sampleTestsContainer = root.createElement('div');
    sampleTestsContainer.attributes.class = 'sample-tests';
    sampleTestsContainer.parent = probStmt;
    for (const sample of samples) {
        const sampleTest = root.createElement('div');
        sampleTest.attributes.class = 'sample-test';
        sampleTest.parent = sampleTestsContainer;

        const inputDiv = root.createElement('div');
        inputDiv.attributes.class = 'input';
        inputDiv.parent = sampleTest;
        const inputPre = root.createElement('pre');
        inputPre.textContent = sample.input;
        inputPre.innerText = sample.input;
        inputPre.parent = inputDiv;
        inputDiv.children.push(inputPre);

        const outputDiv = root.createElement('div');
        outputDiv.attributes.class = 'output';
        outputDiv.parent = sampleTest;
        const outputPre = root.createElement('pre');
        outputPre.textContent = sample.output;
        outputPre.innerText = sample.output;
        outputPre.parent = outputDiv;
        outputDiv.children.push(outputPre);

        sampleTest.children.push(inputDiv, outputDiv);
        sampleTestsContainer.children.push(sampleTest);
    }
    probStmt.children.push(sampleTestsContainer);
    body.children.push(probStmt);

    // Form
    if (formAttrs) {
        const form = root.createElement('form');
        form.attributes.class = 'submit-form';
        form.action = formAttrs.action || '/submit';
        form.parent = body;
        const csrfInput = root.createElement('input');
        csrfInput.name = 'csrf_token';
        csrfInput.value = formAttrs.csrfToken || 'secret_csrf';
        csrfInput.parent = form;
        form.children.push(csrfInput);

        const langSelect = root.createElement('select');
        langSelect.name = 'programTypeId';
        langSelect.parent = form;
        for (const opt of langOptions) {
            const option = root.createElement('option');
            option.value = opt.value;
            option.selected = opt.selected;
            option.textContent = opt.title;
            option.innerText = opt.title;
            option.parent = langSelect;
            langSelect.appendChild(option);
        }
        form.children.push(langSelect);

        const problemInput = root.createElement('input');
        problemInput.name = 'submittedProblemCode';
        problemInput.value = formAttrs.problemCode || 'G';
        problemInput.parent = form;
        form.children.push(problemInput);

        const sourceTextarea = root.createElement('textarea');
        sourceTextarea.name = 'source';
        sourceTextarea.parent = form;
        form.children.push(sourceTextarea);

        body.children.push(form);
    }

    return root;
}

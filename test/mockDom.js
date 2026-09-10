/**
 * Minimalistic zero-dependency HTML parser & DOM mock for Node tests
 */

class MockElement {
    constructor(tagName = 'div', attrs = {}, textContent = '') {
        this.tagName = tagName.toUpperCase();
        this.attributes = { ...attrs };
        this.children = [];
        this.parent = null;
        this.textContent = textContent;
        this.innerText = textContent;
        this.value = attrs.value || textContent;
        this.name = attrs.name || '';
        this.selected = attrs.selected !== undefined ? attrs.selected : false;
        this.action = attrs.action || '';
    }

    getAttribute(name) {
        return this.attributes[name] || null;
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
}

function matchSingleAtom(el, atom) {
    if (!el || !atom) return false;

    // Extract bare tag name before any '.', '#', or '['
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
            // Check ancestors
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
    body.parent = root;
    root.children.push(body);

    // Problem statement
    const probStmt = new MockElement('div', { class: 'problem-statement' });
    probStmt.parent = body;
    const header = new MockElement('div', { class: 'header' });
    header.parent = probStmt;
    const title = new MockElement('div', { class: 'title' }, titleText);
    title.parent = header;
    header.children.push(title);
    probStmt.children.push(header);

    // Sample tests
    const sampleTestsContainer = new MockElement('div', { class: 'sample-tests' });
    sampleTestsContainer.parent = probStmt;
    for (const sample of samples) {
        const sampleTest = new MockElement('div', { class: 'sample-test' });
        sampleTest.parent = sampleTestsContainer;

        const inputDiv = new MockElement('div', { class: 'input' });
        inputDiv.parent = sampleTest;
        const inputPre = new MockElement('pre', {}, sample.input);
        inputPre.parent = inputDiv;
        inputDiv.children.push(inputPre);

        const outputDiv = new MockElement('div', { class: 'output' });
        outputDiv.parent = sampleTest;
        const outputPre = new MockElement('pre', {}, sample.output);
        outputPre.parent = outputDiv;
        outputDiv.children.push(outputPre);

        sampleTest.children.push(inputDiv, outputDiv);
        sampleTestsContainer.children.push(sampleTest);
    }
    probStmt.children.push(sampleTestsContainer);
    body.children.push(probStmt);

    // Form
    if (formAttrs) {
        const form = new MockElement('form', { class: 'submit-form', action: formAttrs.action || '/submit', method: 'post' });
        form.parent = body;
        const csrfInput = new MockElement('input', { type: 'hidden', name: 'csrf_token', value: formAttrs.csrfToken || 'secret_csrf' });
        csrfInput.parent = form;
        form.children.push(csrfInput);

        const langSelect = new MockElement('select', { name: 'programTypeId' });
        langSelect.parent = form;
        for (const opt of langOptions) {
            const option = new MockElement('option', { value: opt.value, selected: opt.selected }, opt.title);
            option.parent = langSelect;
            langSelect.children.push(option);
        }
        form.children.push(langSelect);

        const problemInput = new MockElement('input', { type: 'text', name: 'submittedProblemCode', value: formAttrs.problemCode || 'G' });
        problemInput.parent = form;
        form.children.push(problemInput);

        const sourceTextarea = new MockElement('textarea', { name: 'source' }, '');
        sourceTextarea.parent = form;
        form.children.push(sourceTextarea);

        body.children.push(form);
    }

    return root;
}

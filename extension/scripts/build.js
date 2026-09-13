/**
 * esbuild-based bundler for LeetForces Chrome Extension.
 *
 * Replaces the old hand-written string-concatenation bundler, which
 * worked only for our own files and broke on real npm packages (like
 * CodeMirror) and on anything containing the literal text "import"/
 * "export" inside a string or template literal (it used regex to strip
 * those lines, not a real parser). esbuild actually parses the code, so
 * neither problem exists here.
 */

import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function build() {
    const result = await esbuild.build({
        entryPoints: [path.join(projectRoot, 'src/content.js')],
        bundle: true,
        outfile: path.join(projectRoot, 'dist/content.bundle.js'),
        format: 'iife',
        platform: 'browser',
        target: ['chrome100'],
        minify: true,
        sourcemap: false,
        logLevel: 'info'
    });

    console.log('[Build] esbuild bundle complete.');
    return result;
}

build().catch(err => {
    console.error('[Build] Failed:', err);
    process.exit(1);
});
/**
 * Zero-dependency ES Module Bundler for LeetForces Chrome Extension
 * Concatenates and converts src/*.js modules into a single bundled content script dist/content.bundle.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const distDir = path.join(projectRoot, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// List of modules in dependency order
const moduleFiles = [
    'src/constants.js',
    'src/contextExtractor.js',
    'src/formExtractor.js',
    'src/handleExtractor.js',
    'src/storage.js',
    'src/editorManager.js',
    'src/languageMap.js',
    'src/submitter.js',
    'src/testRunner.js',
    'src/verdictPoller.js',
    'src/verdictUI.js',
    'src/controlPanel.js',
    'src/content.js'
];

let bundleContent = `/**
 * LeetForces Extension Bundled Content Script
 * Generated automatically by scripts/build.js
 */
(function() {
    'use strict';
`;

for (const relPath of moduleFiles) {
    const fullPath = path.join(projectRoot, relPath);
    if (fs.existsSync(fullPath)) {
        let fileText = fs.readFileSync(fullPath, 'utf8');
        // Strip import and export keywords for IIFE concatenation
        fileText = fileText.replace(/^import\s+[\s\S]*?;/gm, '');
        fileText = fileText.replace(/^export\s+(default\s+)?/gm, '');
        bundleContent += `\n/* --- ${relPath} --- */\n` + fileText + '\n';
    }
}

bundleContent += `\n})();\n`;

const outputPath = path.join(distDir, 'content.bundle.js');
fs.writeFileSync(outputPath, bundleContent, 'utf8');
console.log(`[Build] Successfully generated bundle at ${outputPath} (${(bundleContent.length / 1024).toFixed(2)} KB)`);

# LeetForces

LeetForces is a Chrome Extension (Manifest V3) that enhances the problem-solving experience on Codeforces. It pre-fills an in-page code editor with customizable boilerplate templates, provides a LeetCode-style floating control panel with language selection, runs sample test cases locally via the open Piston execution API, submits solutions directly to Codeforces using active session credentials, and tracks real-time submission verdicts with color-coded status badges.

## Supported Codeforces Pages

The extension automatically activates on the following Codeforces URL patterns:
- `https://codeforces.com/contest/*/problem/*`
- `https://codeforces.com/problemset/problem/*/*`
- `https://codeforces.com/gym/*/problem/*`
- `https://codeforces.com/group/*/contest/*/problem/*`

## Installation Instructions

To install LeetForces as an unpacked Chrome Extension:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Madhav-Soni/LeetForces.git
   cd LeetForces
   ```
2. Build the production content bundle:
   ```bash
   npm run build
   ```
   *(This generates `dist/content.bundle.js` required by `manifest.json`).*
3. Open Google Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode** using the toggle in the top-right corner.
5. Click **Load unpacked** and select the root directory of this repository (`LeetForces`).
6. Navigate to any Codeforces problem page to start using LeetForces!

## Supported Languages & Compilers

LeetForces automatically maps and supports popular competitive programming compilers, including:
- **C++**: GNU G++20 (64 bit), GNU G++17 7.3.0, GNU G++23 (64 bit), Clang++20
- **Python**: Python 3.8.10, PyPy 3.9 (7.3.11), PyPy 3.10 (7.3.12)
- **Java**: Java 21 (64bit), Java 11 (64bit), Java 8 (64bit)
- **Rust**: Rust 2021
- **Go**: Go 1.22.2
- **Kotlin**: Kotlin 1.9.20
- **C#**: C# 10, C# Mono 6.8
- **JavaScript / Node.js**: Node.js 20.10.0, JavaScript V8 4.8.0

## Running the Test Suite

LeetForces includes a zero-dependency automated verification test suite:

```bash
npm test
```

`npm test` rebuilds `dist/content.bundle.js` and runs all verification tests covering template injection, cursor positioning, context extraction, CSRF form extraction, language resolution, Piston test execution, submission payloads, and verdict poller formatting.

## Limitations

- **DOM Markup Dependency**: LeetForces extracts problem statement data, sample test cases, and CSRF tokens directly from Codeforces' page HTML. Major changes to Codeforces' website layout may require updating DOM selector patterns.
- **Piston API Availability**: Local sample test execution relies on the public, free Piston API (`https://emkc.org/api/v2/piston/execute`). Local runs require internet connectivity and are subject to Piston API availability.
- **Session Authentication**: Solution submission relies on your active, logged-in session cookies on Codeforces.

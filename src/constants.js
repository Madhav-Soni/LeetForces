/**
 * LeetForces Constants
 */

export const DEFAULT_CPP_TEMPLATE = `#include <bits/stdc++.h>
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
export const DEFAULT_CURSOR_LINE = 11;
export const DEFAULT_CURSOR_COLUMN = 9;

export const STORAGE_KEYS = {
    CODE_PREFIX: 'leetforces_code_',
    LAST_PROBLEM_KEY: 'leetforces_last_problem_key',
    PREFERRED_LANG: 'leetforces_preferred_lang',
    SETTINGS: 'leetforces_settings'
};

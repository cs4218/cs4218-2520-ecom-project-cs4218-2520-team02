Fix the failing Jest tests and patch the source code.

Steps:
1. If a specific file or test is given, run it directly with the correct config:
   - Backend: `npx jest [name].test.js --config jest.backend.config.js`
   - Frontend: `npx jest [name].test.js --config jest.frontend.config.js`
   - Otherwise run `npm test` to find all failures
2. Capture the full error output — read the exact assertion failure, file, and line number
3. Read the source file(s) referenced in the failure
4. Apply the minimal fix to the **source file** (never change the test — tests define the contract)
5. Explain what was wrong in one sentence
6. Re-run the same test file to confirm it passes
7. If still failing after 3 attempts, stop and summarise what you tried

## Fix guidelines
- Do not change unrelated code in the same edit
- Do not add `console.log` to source files
- If the bug is in a backend ESM module, remember imports are cached — re-import or clear module registry if needed
- If a frontend component test fails due to a missing mock, add the mock in the test (not in source)
- Prefer the narrowest possible fix: one function, one condition, one return value

$ARGUMENTS

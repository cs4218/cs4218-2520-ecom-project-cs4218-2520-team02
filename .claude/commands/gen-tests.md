Generate Jest test cases for the file I specify.

Steps:
1. Read the source file in full
2. Determine layer from file path:
   - `controllers/`, `models/`, `middlewares/`, `helpers/` → **backend** (Node/ESM)
   - `client/src/` → **frontend** (React/jsdom)
3. List every exported function/component and its expected behaviour
4. Write a complete `*.test.js` file using `describe/it` blocks following the rules below
5. Cover: happy path, edge cases (null, undefined, empty string, 0, negative numbers), and error/exception cases
6. Save the test file next to the source as `[name].test.js`
7. Run the test with the correct config:
   - Backend: `npx jest [name].test.js --config jest.backend.config.js`
   - Frontend: `npx jest [name].test.js --config jest.frontend.config.js`
8. Show the full output; if any tests fail, fix the test file (not the source) and re-run

## Backend test rules (controllers/models/middlewares/helpers)
- Use `jest.unstable_mockModule()` at the top of the file for all module dependencies
- Import the module under test after mocks using top-level `await import()`
- Mock Mongoose model methods: use `mockResolvedValue`, `mockRejectedValue`, and `mockReturnThis()` for query builder chains
- Build mock `req`/`res` objects manually:
  ```js
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
  const req = { body: {}, params: {}, user: {} };
  ```
- Reset mocks with `jest.clearAllMocks()` in `beforeEach`

## Frontend test rules (client/src/)
- Import from `@testing-library/react`: `render`, `screen`, `fireEvent`, `waitFor`
- Mock child components, hooks, and modules with `jest.mock()` (default exports)
- Mock context hooks (e.g. `useAuth`, `useCart`) returning `[state, jest.fn()]` matching hook signatures
- Mock `axios` for API calls: `axios.get.mockResolvedValue({ data: ... })`
- Wrap renders in `MemoryRouter` or relevant providers as needed
- Query DOM via `screen.getByText`, `screen.getByRole`, `screen.getByTestId`
- Use `async/await` + `waitFor` only when testing async state updates

Target file: $ARGUMENTS

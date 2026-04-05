# Project conventions for Claude Code

## Project overview
Full-stack e-commerce app (monorepo):
- **Backend:** Node.js + Express + MongoDB/Mongoose — source in `controllers/`, `models/`, `middlewares/`, `helpers/`, `routes/`
- **Frontend:** React (React Router, Context API) — source in `client/src/`
- **Testing:** Jest + React Testing Library (unit/integration) + Playwright (E2E)

## Running tests
```bash
# All tests
npm test

# Backend unit tests only
npm run test:backend

# Frontend unit tests only
npm run test:frontend

# Backend integration tests
npm run test:backend-integration

# Frontend integration tests
npm run test:frontend-integration

# Single file
npx jest path/to/file.test.js --config jest.backend.config.js
npx jest path/to/file.test.js --config jest.frontend.config.js
```

## Test file locations & naming
| Layer | Source file | Test file |
|---|---|---|
| Backend controller | `controllers/authController.js` | `controllers/authController.test.js` |
| Backend helper/middleware/model | `helpers/authHelper.js` | `helpers/authHelper.test.js` |
| Frontend page/component | `client/src/pages/HomePage.js` | `client/src/pages/HomePage.test.js` |
| Frontend hook/context | `client/src/hooks/useCart.js` | `client/src/hooks/useCart.test.js` |
| Integration | same location | `*.integration.test.js` suffix |

## Test generation rules — backend
- Use `jest.unstable_mockModule()` (not `jest.mock()`) for ES module mocking; import under test after mocks with top-level `await import()`
- Mock Mongoose model methods on the constructor and instance (e.g. `mockResolvedValue`, `mockReturnThis()` chaining for query builders)
- Build mock `req`/`res` objects manually: `res.status = jest.fn().mockReturnThis(); res.json = jest.fn()`
- Use `describe()` per controller/function, `it()` with plain English
- Cover: happy path, validation errors, DB errors, auth failures, edge cases (null, empty, missing fields)
- Use `beforeEach` / `afterEach` for setup and teardown; reset mocks with `jest.clearAllMocks()`

## Test generation rules — frontend
- Import React and testing utilities: `import { render, screen, fireEvent, waitFor } from '@testing-library/react'`
- Mock child components and hooks with `jest.mock()` (default exports)
- Mock context hooks (e.g. `useAuth`, `useCart`, `useCategory`) to return `[state, jest.fn()]` arrays matching hook signatures
- Wrap renders in necessary providers (Router, Auth context) as needed
- Query DOM via `screen.getByText`, `screen.getByTestId`, `screen.getByRole`; avoid querying by implementation details
- Use `waitFor` for async state updates; mark test `async` only when needed
- Cover: render output, user interactions (click, input), conditional rendering, error states

## Bug fix rules
- Read the full Jest error output before proposing a fix
- Fix the source file, not the test — tests define the contract
- After patching, explain what was wrong in one sentence
- Do not change unrelated code in the same edit
- Run the failing test file after the fix to confirm it passes

## Mocking patterns reference
```js
// Backend — ESM mock (top of file, before imports)
jest.unstable_mockModule('../models/userModel', () => ({ default: MockUserModel }));
const { default: controller } = await import('../controllers/authController');

// Backend — spy on real module method
jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed');

// Frontend — mock a module
jest.mock('../../context/auth', () => ({ useAuth: jest.fn() }));
useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);

// Frontend — mock axios
jest.mock('axios');
axios.get.mockResolvedValue({ data: { products: [] } });
```

## Do not
- Add `console.log` to source files
- Make real network or database calls in unit tests
- Use `async/await` in a test unless the code under test is async
- Skip or `.only` tests without a comment explaining why
- Change unrelated code when fixing a bug

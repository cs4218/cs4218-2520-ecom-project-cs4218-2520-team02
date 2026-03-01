import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './__tests__/e2e/flows',
  testMatch: [
    "**/*.spec.ts"
  ],
  fullyParallel: true,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: [
    {
      command: "npm run client",
      port: 3000,
      reuseExistingServer: true,
      env: {
        PORT: "3000"
      }
    },
    {
      command: "npm run server",
      port: 6060,
      reuseExistingServer: true,
      env: {
        DEV_MODE: "development",
        PORT: "6060",
        //This string URI doesn't work at all. It's just so the config can compile.
        MONGO_URL: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/e2e_test" 
      },
    },
  ],
});

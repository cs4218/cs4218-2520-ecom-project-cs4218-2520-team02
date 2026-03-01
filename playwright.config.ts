import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './__tests__/e2e/flows',
  testMatch: ['**/*.spec.ts'],
  fullyParallel: true,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: 'npm run client',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: '3000',
      },
    },
    {
      command: 'npm run server',
      port: 6060,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        DEV_MODE: 'development',
        PORT: '6060',
        MONGO_URL: process.env.MONGO_URL!,
        JWT_SECRET: process.env.JWT_SECRET!,
        BRAINTREE_MERCHANT_ID: process.env.BRAINTREE_MERCHANT_ID!,
        BRAINTREE_PUBLIC_KEY: process.env.BRAINTREE_PUBLIC_KEY!,
        BRAINTREE_PRIVATE_KEY: process.env.BRAINTREE_PRIVATE_KEY!,
        TEST_ADMIN_EMAIL: process.env.TEST_ADMIN_EMAIL!,
        TEST_PASSWORD: process.env.TEST_PASSWORD!,
      },
    },
  ],
});
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Debug env vars
console.log("[Config] MONGO_URL set:", !!process.env.MONGO_URL);
console.log("[Config] JWT_SECRET set:", !!process.env.JWT_SECRET);
console.log("[Config] BRAINTREE_MERCHANT_ID set:", !!process.env.BRAINTREE_MERCHANT_ID);
console.log("[Config] BRAINTREE_PUBLIC_KEY set:", !!process.env.BRAINTREE_PUBLIC_KEY);
console.log("[Config] BRAINTREE_PRIVATE_KEY set:", !!process.env.BRAINTREE_PRIVATE_KEY);
console.log("[Config] MONGO_URL length:", process.env.MONGO_URL?.length ?? 0);

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
      command: process.env.CI
        ? 'serve -s ./client/build -l 3000'
        : 'npm run client',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { PORT: '3000' },
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
      },
    },
  ],
});
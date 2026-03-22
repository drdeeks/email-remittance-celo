/**
 * Global Jest setup/teardown
 * - Loads .env so tests have WALLET_PRIVATE_KEY, UNISWAP_API_KEY, etc.
 * - Closes DB after each test file so Jest can exit cleanly.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
// Load .env from project root before any module imports fire
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { database } from '../src/db/database';

afterAll(async () => {
  try {
    database.close();
  } catch {
    // Already closed or never opened — fine
  }
});

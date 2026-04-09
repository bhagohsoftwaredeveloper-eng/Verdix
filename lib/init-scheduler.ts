import { initScheduler } from './scheduler';

// This file is intended to be imported once in a top-level module (like lib/mysql.ts)
// to ensure the scheduler starts when the application starts.
initScheduler();

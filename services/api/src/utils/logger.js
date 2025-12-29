/**
 * Logger Utility - Re-exports from lib/logger.js
 * This file exists for backwards compatibility with imports from utils/logger.js
 */

import { createLogger } from '../lib/logger.js';

export const createModuleLogger = (name) => createLogger(name);

export { createLogger };

export default { createLogger, createModuleLogger };

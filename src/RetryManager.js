/**
 * RetryManager
 * Wraps an async operation with exponential backoff retry logic.
 */

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 10000,
  factor: 2,
  retryOn: [408, 429, 500, 502, 503, 504],
};

export class RetryManager {
  constructor(options = {}) {
    this.options = { ...DEFAULT_RETRY_OPTIONS, ...options };
  }

  /**
   * Execute fn with retry
   * @param {function} fn    - async function to call, should throw on failure
   * @param {string}   label - for logging
   */
  async execute(fn, label = 'operation') {
    const { maxRetries, baseDelay, maxDelay, factor } = this.options;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;

        // Don't retry on non-retriable HTTP errors
        if (err.status && !this.options.retryOn.includes(err.status)) {
          throw err;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
          const jittered = delay * (0.8 + Math.random() * 0.4);
          console.warn(
            `[WebRTCExporter] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${Math.round(jittered)}ms...`,
            err.message || err
          );
          await sleep(jittered);
        }
      }
    }

    throw lastError;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

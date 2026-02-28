/**
 * HttpExporter
 * Sends a batch of stats to an HTTP endpoint as JSON (POST).
 * Respects timeout and throws a typed error with status code for RetryManager.
 */
export class HttpExporter {
  /**
   * @param {object} options
   * @param {string} options.url        - Backend endpoint URL
   * @param {number} options.timeout    - Request timeout in ms (default: 10000)
   * @param {object} options.headers    - Extra headers to include
   */
  constructor({ url, timeout = 10000, headers = {} } = {}) {
    if (!url) throw new Error('[WebRTCExporter] HttpExporter requires a url');
    this.url = url;
    this.timeout = timeout;
    this.headers = headers;
  }

  /**
   * Send a batch of payload items to the backend.
   * @param {object} envelope - { sessionId, sessionName, items: [...] }
   */
  async send(envelope) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response;
    try {
      response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`[WebRTCExporter] HTTP request timed out after ${this.timeout}ms`);
        timeoutErr.status = 408;
        throw timeoutErr;
      }
      throw err;
    }

    clearTimeout(timer);

    if (!response.ok) {
      const err = new Error(`[WebRTCExporter] HTTP ${response.status}: ${response.statusText}`);
      err.status = response.status;
      throw err;
    }

    return response;
  }
}

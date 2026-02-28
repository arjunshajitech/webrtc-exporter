/**
 * BatchQueue
 * Buffers items and flushes when:
 *  - batchSize is reached, OR
 *  - flushInterval elapses (whichever comes first)
 */
export class BatchQueue {
  /**
   * @param {object} options
   * @param {number} options.batchSize     - Max items before auto-flush (default: 10)
   * @param {number} options.flushInterval - Max ms before auto-flush (default: 5000)
   * @param {function} options.onFlush     - async fn(items[]) called on each flush
   */
  constructor({ batchSize = 10, flushInterval = 5000, onFlush } = {}) {
    this._queue = [];
    this._batchSize = batchSize;
    this._flushInterval = flushInterval;
    this._onFlush = onFlush;
    this._timer = null;
    this._flushing = false;
  }

  start() {
    this._scheduleTimer();
  }

  stop() {
    this._clearTimer();
  }

  /**
   * Add an item to the queue.
   * Flushes immediately if batchSize is reached.
   */
  push(item) {
    this._queue.push(item);
    if (this._queue.length >= this._batchSize) {
      this._clearTimer();
      this._doFlush();
    }
  }

  /**
   * Force-flush whatever is in the queue (e.g. on destroy)
   */
  async flush() {
    this._clearTimer();
    await this._doFlush();
  }

  async _doFlush() {
    if (this._flushing || this._queue.length === 0) {
      this._scheduleTimer();
      return;
    }
    this._flushing = true;
    const batch = this._queue.splice(0, this._batchSize);
    try {
      if (this._onFlush) await this._onFlush(batch);
    } finally {
      this._flushing = false;
      if (this._queue.length > 0) {
        this._doFlush();
      } else {
        this._scheduleTimer();
      }
    }
  }

  _scheduleTimer() {
    this._clearTimer();
    this._timer = setTimeout(() => {
      this._doFlush();
    }, this._flushInterval);
  }

  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  get size() {
    return this._queue.length;
  }
}

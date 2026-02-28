/**
 * WebRTCExporter
 *
 * A JS library webrtc-stats API
 * and adds HTTP export with batching and retry.
 *
 * Usage:
 *   const exporter = new WebRTCExporter({
 *     sessionId:        'session-abc',
 *     sessionName:      'my-video-call',
 *     url:              'https://api.example.com/ingest',
 *     getStatsInterval: 2000,
 *     batchSize:        20,
 *     flushInterval:    5000,
 *     timeout:          10000,
 *     headers:          { Authorization: 'Bearer token' },
 *     maxRetries:       3,
 *     retryBaseDelay:   500,
 *     debug:            false,
 *   });
 *
 *   exporter.addPeer({ peerId: 'peer-1', peerName: 'Alice', pc: peerConnection });
 *
 *   exporter.on('stats',          (data)  => console.log(data));
 *   exporter.on('timeline',       (event) => console.log(event));
 *   exporter.on('export:success', ({ count }) => console.log('sent', count));
 *   exporter.on('export:error',   ({ error }) => console.error(error));
 *
 *   exporter.removePeer('peer-1');
 *   await exporter.destroy();
 */

import { EventEmitter } from './EventEmitter.js';
import { PeerMonitor }  from './PeerMonitor.js';
import { BatchQueue }   from './BatchQueue.js';
import { RetryManager } from './RetryManager.js';
import { HttpExporter } from './HttpExporter.js';

const DEFAULT_OPTIONS = {
  // Identity
  sessionId:   null,
  sessionName: 'unknown',

  // Endpoint
  url:     null,
  headers: {},

  // Collection
  getStatsInterval: 2000,
  rawStats:    false,
  statsObject: false,

  // Batching
  batchSize:     20,
  flushInterval: 5000,

  // Network
  timeout: 10000,

  // Retry
  maxRetries:     3,
  retryBaseDelay: 500,
  retryMaxDelay:  10000,

  // Debug
  debug: false,
};

export class WebRTCExporter extends EventEmitter {
  constructor(options = {}) {
    super();

    this._options = { ...DEFAULT_OPTIONS, ...options };

    if (!this._options.url) {
      throw new Error('[WebRTCExporter] options.url is required');
    }

    // Auto-generate sessionId if not provided
    if (!this._options.sessionId) {
      this._options.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    // Timeline
    this.timeline = [];

    // Active peer monitors  peerId → PeerMonitor
    this._peers = new Map();

    // HTTP transport
    this._exporter = new HttpExporter({
      url:     this._options.url,
      timeout: this._options.timeout,
      headers: this._options.headers,
    });

    // Retry
    this._retry = new RetryManager({
      maxRetries: this._options.maxRetries,
      baseDelay:  this._options.retryBaseDelay,
      maxDelay:   this._options.retryMaxDelay,
    });

    // Batch queue
    this._queue = new BatchQueue({
      batchSize:     this._options.batchSize,
      flushInterval: this._options.flushInterval,
      onFlush:       (items) => this._sendBatch(items),
    });

    this._queue.start();

    this._log('WebRTCExporter initialized', {
      sessionId: this._options.sessionId,
      url:       this._options.url,
    });
  }

  // ─── Public API ─────────────────────────

  /**
   * Add a peer connection to monitor.
   * @param {object}            params
   * @param {string}            params.peerId    - Unique ID for this peer
   * @param {string}            [params.peerName] - Human-readable name
   * @param {RTCPeerConnection} params.pc        - The RTCPeerConnection instance
   */
  addPeer({ peerId, peerName = '', pc } = {}) {
    if (!peerId) throw new Error('[WebRTCExporter] addPeer() requires peerId');
    if (!pc)     throw new Error('[WebRTCExporter] addPeer() requires pc (RTCPeerConnection)');

    if (this._peers.has(peerId)) {
      console.warn(`[WebRTCExporter] Peer "${peerId}" already exists. Call removePeer() first.`);
      return;
    }

    const monitor = new PeerMonitor({
      peerId,
      peerName,
      pc,
      getStatsInterval: this._options.getStatsInterval,
      rawStats:         this._options.rawStats,
      statsObject:      this._options.statsObject,
      onEvent:          (event) => this._handleEvent(event),
    });

    monitor.start();
    this._peers.set(peerId, monitor);
    this._log(`Peer added: ${peerId} (${peerName})`);

    this._pushToTimeline({
      event:     'addPeer',
      tag:       'peer',
      peerId,
      peerName,
      timestamp: new Date().toISOString(),
      data:      {},
    });
  }

  /**
   * Stop monitoring a peer and clean up its listeners.
   * @param {string} peerId
   */
  removePeer(peerId) {
    const monitor = this._peers.get(peerId);
    if (!monitor) {
      console.warn(`[WebRTCExporter] removePeer(): peer "${peerId}" not found`);
      return;
    }
    monitor.destroy();
    this._peers.delete(peerId);
    this._log(`Peer removed: ${peerId}`);

    this._pushToTimeline({
      event:     'removePeer',
      tag:       'peer',
      peerId,
      timestamp: new Date().toISOString(),
      data:      {},
    });
  }

  /**
   * Get list of currently monitored peer IDs.
   */
  getPeerIds() {
    return Array.from(this._peers.keys());
  }

  /**
   * Get the full event timeline.
   */
  getTimeline() {
    return this.timeline;
  }

  /**
   * Immediately flush the batch queue — useful before page unload.
   */
  async flush() {
    return this._queue.flush();
  }

  /**
   * Flush, stop all monitors, clean up everything.
   */
  async destroy() {
    this._log('Destroying WebRTCExporter...');
    this._peers.forEach((monitor) => monitor.destroy());
    this._peers.clear();
    this._queue.stop();
    await this._queue.flush();
    this.removeAllListeners();
    this._log('WebRTCExporter destroyed');
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  _handleEvent(event) {
    this._pushToTimeline(event);

    // Emit locally
    this.emit('timeline', event);
    if (event.event === 'stats') {
      this.emit('stats', event);
    } else {
      this.emit(event.event, event);
    }

    // Queue for export
    this._queue.push(event);
  }

  _pushToTimeline(event) {
    this.timeline.push(event);
  }

  async _sendBatch(items) {
    if (!items || items.length === 0) return;

    const envelope = {
      sessionId:   this._options.sessionId,
      sessionName: this._options.sessionName,
      exportedAt:  new Date().toISOString(),
      count:       items.length,
      items,
    };

    this._log(`Sending batch of ${items.length} items...`);

    try {
      await this._retry.execute(
        () => this._exporter.send(envelope),
        `export batch (${items.length} items)`
      );
      this._log(`Batch of ${items.length} items sent successfully`);
      this.emit('export:success', { count: items.length, sessionId: this._options.sessionId });
    } catch (err) {
      console.error('[WebRTCExporter] Failed to send batch after retries:', err.message);
      this.emit('export:error', { error: err, count: items.length, items });
    }
  }

  _log(...args) {
    if (this._options.debug) {
      console.log('[WebRTCExporter]', ...args);
    }
  }
}

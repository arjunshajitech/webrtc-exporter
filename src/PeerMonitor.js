/**
 * PeerMonitor
 * Wraps a single RTCPeerConnection.
 * Polls pc.getStats() at the configured interval and emits structured events.
 */

import { buildStatsObject, reportToObject } from './StatsParser.js';

export class PeerMonitor {
  /**
   * @param {object} options
   * @param {string}              options.peerId
   * @param {string}              options.peerName
   * @param {RTCPeerConnection}   options.pc
   * @param {number}              options.getStatsInterval
   * @param {boolean}             options.rawStats
   * @param {boolean}             options.statsObject
   * @param {function}            options.onEvent   - callback(event)
   */
  constructor({ peerId, peerName, pc, getStatsInterval, rawStats, statsObject, onEvent }) {
    this.peerId = peerId;
    this.peerName = peerName;
    this.pc = pc;
    this.getStatsInterval = getStatsInterval;
    this.includeRawStats = rawStats;
    this.includeStatsObject = statsObject;
    this.onEvent = onEvent;

    this._timer = null;
    this._active = false;

    this._bindPCEvents();
  }

  start() {
    if (this._active) return;
    this._active = true;
    this._scheduleNextPoll();
  }

  stop() {
    this._active = false;
    this._clearTimer();
  }

  destroy() {
    this.stop();
    this._unbindPCEvents();
    this.pc = null;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _scheduleNextPoll() {
    this._clearTimer();
    this._timer = setTimeout(() => this._poll(), this.getStatsInterval);
  }

  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  async _poll() {
    if (!this._active || !this.pc) return;

    try {
      const report = await this.pc.getStats();

      const event = {
        event: 'stats',
        tag: 'stats',
        peerId: this.peerId,
        peerName: this.peerName,
        timestamp: new Date().toISOString(),
        data: {},
      };

      if (this.includeRawStats)   event.rawStats    = report;
      if (this.includeStatsObject) event.statsObject = reportToObject(report);

      event.data = buildStatsObject(report);

      this.onEvent(event);
    } catch (err) {
      this.onEvent({
        event: 'error',
        tag: 'stats',
        peerId: this.peerId,
        peerName: this.peerName,
        timestamp: new Date().toISOString(),
        error: { message: err.message, stack: err.stack },
        data: {},
      });
    }

    if (this._active) this._scheduleNextPoll();
  }

  _bindPCEvents() {
    const pc = this.pc;
    this._onICEConnectionStateChange = () =>
      this._emitConnectionEvent('iceConnectionStateChange', { state: pc.iceConnectionState });
    this._onConnectionStateChange = () =>
      this._emitConnectionEvent('connectionStateChange', { state: pc.connectionState });
    this._onICEGatheringStateChange = () =>
      this._emitConnectionEvent('iceGatheringStateChange', { state: pc.iceGatheringState });
    this._onSignalingStateChange = () =>
      this._emitConnectionEvent('signalingStateChange', { state: pc.signalingState });

    pc.addEventListener('iceconnectionstatechange', this._onICEConnectionStateChange);
    pc.addEventListener('connectionstatechange',    this._onConnectionStateChange);
    pc.addEventListener('icegatheringstatechange',  this._onICEGatheringStateChange);
    pc.addEventListener('signalingstatechange',     this._onSignalingStateChange);
  }

  _unbindPCEvents() {
    if (!this.pc) return;
    this.pc.removeEventListener('iceconnectionstatechange', this._onICEConnectionStateChange);
    this.pc.removeEventListener('connectionstatechange',    this._onConnectionStateChange);
    this.pc.removeEventListener('icegatheringstatechange',  this._onICEGatheringStateChange);
    this.pc.removeEventListener('signalingstatechange',     this._onSignalingStateChange);
  }

  _emitConnectionEvent(eventName, data) {
    this.onEvent({
      event: eventName,
      tag: 'connection',
      peerId: this.peerId,
      peerName: this.peerName,
      timestamp: new Date().toISOString(),
      data,
    });
  }
}

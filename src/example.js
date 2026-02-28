/**
 * example.js
 * Usage example for webrtc-exporter (HTTP only)
 */

import { WebRTCExporter } from './src/index.js';

// ─── 1. Initialize ─────────────────────────────────────────────────────────

const exporter = new WebRTCExporter({
  // Identity
  sessionId:   'call-' + Math.random().toString(36).slice(2, 10),
  sessionName: 'Customer Support Call',

  // Where to send stats
  url: 'https://api.yourapp.com/webrtc/ingest',

  // Optional auth headers
  headers: {
    'Authorization': 'Bearer your-token-here',
    'X-App-Version': '1.0.0',
  },

  // Collection config
  getStatsInterval: 2000,   // poll every 2 seconds
  rawStats:    false,
  statsObject: false,

  // Batching
  batchSize:     20,         // send when 20 events accumulate
  flushInterval: 5000,       // or every 5 seconds, whichever comes first

  // Network
  timeout: 10000,            // 10s request timeout

  // Retry
  maxRetries:     3,
  retryBaseDelay: 500,

  debug: true,               // logs to console
});


// ─── 2. Local events ───────────────

exporter.on('stats', (event) => {
  const { peerId, peerName, data } = event;

  // Audio
  data.audio.inbound.forEach((track) => {
    console.log(`[${peerName}] Audio IN — jitter: ${track.jitter}, lost: ${track.packetsLost}`);
  });
  data.audio.outbound.forEach((track) => {
    console.log(`[${peerName}] Audio OUT — bytesSent: ${track.bytesSent}`);
  });

  // Video
  data.video.inbound.forEach((track) => {
    console.log(`[${peerName}] Video IN — ${track.frameWidth}x${track.frameHeight}`);
  });

  // Network
  data.candidatePair.forEach((pair) => {
    if (pair.state === 'succeeded') {
      console.log(`[${peerName}] RTT: ${pair.currentRoundTripTime * 1000}ms`);
    }
  });
});

// Connection state changes
exporter.on('iceConnectionStateChange', ({ peerId, data }) => {
  console.log(`[${peerId}] ICE → ${data.state}`);
});
exporter.on('connectionStateChange', ({ peerId, data }) => {
  console.log(`[${peerId}] Connection → ${data.state}`);
});

// Export lifecycle
exporter.on('export:success', ({ count }) => {
  console.log(`✓ Sent ${count} events to backend`);
});
exporter.on('export:error', ({ error, count }) => {
  console.error(`✗ Failed to send ${count} events:`, error.message);
});


// ─── 3. Add a peer connection ──────────────────────────────────────────────

const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
});

exporter.addPeer({
  peerId:   'peer-alice',
  peerName: 'Alice',
  pc:       pc,
});

// Multiple peers at once
// exporter.addPeer({ peerId: 'peer-bob', peerName: 'Bob', pc: pc2 });


// ─── 4. Cleanup ────────────────────────────────────────────────────────────

async function endCall() {
  exporter.removePeer('peer-alice');
  await exporter.destroy();
  pc.close();
}

// Best-effort flush before page unload
window.addEventListener('beforeunload', () => exporter.flush());

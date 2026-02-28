# webrtc-stats-exporter

> WebRTC Stats Exporter is a lightweight utility designed to collect, parse, and simplify WebRTC RTCPeerConnection statistics and publish them to a local collector or an external API.

---

## Installation

```bash
npm i webrtc-stats-exporter
```

---

## Quick Start

```js
import { WebRTCExporter } from 'webrtc-stats-exporter';

const exporter = new WebRTCExporter({
  sessionId:        'call-abc-123',
  sessionName:      'Support Call',
  url:              'https://api.yourapp.com/webrtc/ingest',
  getStatsInterval: 2000,
  batchSize:        20,
  flushInterval:    5000,
  timeout:          10000,
  maxRetries:       3,
  debug:            true,
});

exporter.addPeer({
  peerId:   'peer-alice',
  peerName: 'Alice',
  pc:       peerConnection,   // RTCPeerConnection instance
});

// Local events
exporter.on('stats', (event) => {
  console.log('audio inbound:',  event.data.audio.inbound);
  console.log('video outbound:', event.data.video.outbound);
  console.log('candidate pairs:', event.data.candidatePair);
});

exporter.on('export:success', ({ count }) => console.log(`✓ Sent ${count} events`));
exporter.on('export:error',   ({ error }) => console.error('✗ Export failed:', error));

// When call ends
exporter.removePeer('peer-alice');
await exporter.destroy();
```

---

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `sessionId` | `string` | auto-generated | Unique ID for this session/call |
| `sessionName` | `string` | `'unknown'` | Human-readable session name |
| `url` | `string` | **required** | Backend endpoint URL |
| `headers` | `object` | `{}` | Extra HTTP headers (e.g. `Authorization`) |
| `getStatsInterval` | `number` | `2000` | Poll interval in ms |
| `rawStats` | `boolean` | `false` | Include raw `RTCStatsReport` in events |
| `statsObject` | `boolean` | `false` | Include flat id-keyed object in events |
| `batchSize` | `number` | `20` | Flush when queue reaches this size |
| `flushInterval` | `number` | `5000` | Flush every N ms regardless of queue size |
| `timeout` | `number` | `10000` | Request timeout in ms |
| `maxRetries` | `number` | `3` | Max retry attempts per batch |
| `retryBaseDelay` | `number` | `500` | Initial retry delay in ms |
| `retryMaxDelay` | `number` | `10000` | Max retry delay cap in ms |
| `debug` | `boolean` | `false` | Enable console debug logs |

---

## Methods

### `addPeer({ peerId, peerName, pc })`
Start monitoring a `RTCPeerConnection`.

### `removePeer(peerId)`
Stop monitoring a peer and clean up its listeners.

### `getPeerIds()`
Returns array of currently monitored peer IDs.

### `getTimeline()`
Returns the full event timeline array.

### `flush()`
Immediately flush the batch queue. Returns a Promise.

```js
window.addEventListener('beforeunload', () => exporter.flush());
```

### `destroy()`
Flush, stop all monitors, remove all listeners. Returns a Promise.

---

## Events

| Event | When | Payload |
|---|---|---|
| `stats` | Every poll interval | `{ peerId, peerName, timestamp, data }` |
| `timeline` | Every event | same as above |
| `iceConnectionStateChange` | ICE state changes | `{ peerId, data: { state } }` |
| `connectionStateChange` | Connection state changes | `{ peerId, data: { state } }` |
| `iceGatheringStateChange` | Gathering state changes | `{ peerId, data: { state } }` |
| `signalingStateChange` | Signaling state changes | `{ peerId, data: { state } }` |
| `export:success` | Batch sent successfully | `{ count, sessionId }` |
| `export:error` | Batch failed after retries | `{ error, count, items }` |

### `stats` event data shape

```js
exporter.on('stats', ({ data }) => {
  data.audio.inbound       // RTCInboundRtpStreamStats[] filtered for audio
  data.audio.outbound      // RTCOutboundRtpStreamStats[] filtered for audio
  data.video.inbound       // RTCInboundRtpStreamStats[] filtered for video
  data.video.outbound      // RTCOutboundRtpStreamStats[] filtered for video
  data.remote.inbound      // RTCRemoteInboundRtpStreamStats[]
  data.candidatePair       // RTCIceCandidatePairStats[]
  data.localCandidate      // RTCIceCandidateStats[]
  data.remoteCandidate     // RTCIceCandidateStats[]
  data.transport           // RTCTransportStats[]
  data.codec               // RTCCodecStats[]
  data.dataChannel         // RTCDataChannelStats[]
  data.raw                 // all stats grouped by type
});
```

---

## What your backend receives

Every batch is a `POST` with this JSON body:

```json
{
  "sessionId":   "call-abc-123",
  "sessionName": "Support Call",
  "exportedAt":  "2026-02-28T10:00:00.000Z",
  "count":       3,
  "items": [
    {
      "event":     "stats",
      "tag":       "stats",
      "peerId":    "peer-alice",
      "peerName":  "Alice",
      "timestamp": "2026-02-28T10:00:02.000Z",
      "data": {
        "audio": {
          "inbound":  [{ "packetsLost": 2, "jitter": 0.003, "bytesReceived": 48320 }],
          "outbound": [{ "bytesSent": 52100, "packetsSent": 480 }]
        },
        "video": {
          "inbound":  [{ "framesDecoded": 120, "frameWidth": 1280, "frameHeight": 720 }],
          "outbound": [{ "framesEncoded": 121, "bytesSent": 200000 }]
        },
        "candidatePair": [{ "state": "succeeded", "currentRoundTripTime": 0.02 }]
      }
    }
  ]
}
```

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.


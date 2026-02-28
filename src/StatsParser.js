/**
 * StatsParser
 * Converts the raw RTCStatsReport Map into a clean structured object,
 */

const STAT_TYPES = [
  'inbound-rtp',
  'outbound-rtp',
  'remote-inbound-rtp',
  'remote-outbound-rtp',
  'media-source',
  'candidate-pair',
  'local-candidate',
  'remote-candidate',
  'transport',
  'codec',
  'data-channel',
  'peer-connection',
  'stream',
  'track',
];

/**
 * Convert RTCStatsReport (Map) → plain object keyed by report id
 */
export function reportToObject(statsReport) {
  const obj = {};
  statsReport.forEach((value, key) => {
    obj[key] = { ...value };
  });
  return obj;
}

/**
 * Group stats by type
 */
export function groupByType(statsReport) {
  const grouped = {};
  STAT_TYPES.forEach((t) => (grouped[t] = []));

  statsReport.forEach((stat) => {
    const type = stat.type;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({ ...stat });
  });

  return grouped;
}

/**
 * Build the full structured statsObject
 */
export function buildStatsObject(statsReport) {
  const grouped = groupByType(statsReport);

  return {
    audio: {
      inbound:  grouped['inbound-rtp'].filter((s) => s.kind === 'audio' || s.mediaType === 'audio'),
      outbound: grouped['outbound-rtp'].filter((s) => s.kind === 'audio' || s.mediaType === 'audio'),
    },
    video: {
      inbound:  grouped['inbound-rtp'].filter((s) => s.kind === 'video' || s.mediaType === 'video'),
      outbound: grouped['outbound-rtp'].filter((s) => s.kind === 'video' || s.mediaType === 'video'),
    },
    remote: {
      inbound:  grouped['remote-inbound-rtp'],
      outbound: grouped['remote-outbound-rtp'],
    },
    candidatePair:  grouped['candidate-pair'],
    localCandidate: grouped['local-candidate'],
    remoteCandidate: grouped['remote-candidate'],
    transport:   grouped['transport'],
    codec:       grouped['codec'],
    dataChannel: grouped['data-channel'],
    mediaSources: grouped['media-source'],
    peerConnection: grouped['peer-connection'],
    tracks: grouped['track'],
    raw: grouped,
  };
}

export class SnapshotReadError extends Error {
  constructor(resource, status, message) {
    super(message || `Failed to load ${resource}${status ? ` (HTTP ${status})` : ''}`);
    this.name = 'SnapshotReadError';
    this.resource = resource;
    this.status = status || null;
  }
}

async function readJson(fetchImpl, url, resource, validate) {
  let response;
  try {
    response = await fetchImpl(url, { cache: 'no-store' });
  } catch (error) {
    throw new SnapshotReadError(resource, null, error?.message || `Failed to load ${resource}`);
  }
  if (!response.ok) throw new SnapshotReadError(resource, response.status);
  let value;
  try {
    value = await response.json();
  } catch (error) {
    throw new SnapshotReadError(resource, response.status, `Invalid ${resource} response`);
  }
  if (!validate(value)) throw new SnapshotReadError(resource, response.status, `Unusable ${resource} response`);
  return value;
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isArray = Array.isArray;

function loadSnapshot(campaignId, playerId, { includeDecisions, fetchImpl }) {
  const base = '/api/campaign/' + encodeURIComponent(campaignId);
  const reads = {
    state: readJson(fetchImpl, base + '/game/state', 'game state', isObject),
    markers: readJson(fetchImpl, base + '/game/map-markers', 'map markers', isArray),
    campaign: readJson(
      fetchImpl,
      base + '?playerId=' + encodeURIComponent(playerId),
      'campaign/map data',
      isObject
    )
  };
  if (includeDecisions) {
    reads.decisions = readJson(fetchImpl, base + '/game/decisions', 'decisions', isArray);
  }
  const keys = Object.keys(reads);
  return Promise.all(keys.map(key => reads[key])).then(values => Object.fromEntries(
    keys.map((key, index) => [key, values[index]])
  ));
}

export function loadGMRecoverySnapshot(campaignId, playerId, { fetchImpl = fetch } = {}) {
  return loadSnapshot(campaignId, playerId, { includeDecisions: true, fetchImpl });
}

export function loadPlayerRecoverySnapshot(campaignId, playerId, { fetchImpl = fetch } = {}) {
  return loadSnapshot(campaignId, playerId, { includeDecisions: true, fetchImpl });
}

export function loadTableRecoverySnapshot(campaignId, playerId, { fetchImpl = fetch } = {}) {
  return loadSnapshot(campaignId, playerId, { includeDecisions: false, fetchImpl });
}

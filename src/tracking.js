import { canonicalScholarshipId, isScholarshipKnown, isScholarshipVisible } from './scholarship-lifecycle.js';

export const TRACKING_STATUSES = Object.freeze(['researching', 'completed']);

export function trackingStatus(tracking = {}, rawId) {
  return tracking[canonicalScholarshipId(rawId)] || 'none';
}

// One transaction for a single selection or any number of selected programmes.
export function applyTracking(state, ids, status) {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 150 ||
      (status !== null && !TRACKING_STATUSES.includes(status))) {
    throw new Error('Invalid tracking action.');
  }
  const unique = [...new Set(ids.map(id => canonicalScholarshipId(id)))];
  for (const id of unique) {
    if (!isScholarshipKnown(id) || !isScholarshipVisible(state.lifecycle, id)) {
      throw new Error('Only active, known scholarships can be tracked.');
    }
  }
  const tracking = { ...(state.tracking || {}) };
  for (const id of unique) {
    if (status === null) delete tracking[id];
    else tracking[id] = status;
  }
  return { ...state, tracking };
}

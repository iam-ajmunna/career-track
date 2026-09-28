/* Run in DevTools on each ORIGINAL Career Track browser/profile/origin.
 * Reads only the two audited app keys. No network requests or storage writes.
 * A preview/localhost tab cannot read the production origin's progress.
 */
(() => {
  'use strict';
  if (!/^https?:$/.test(location.protocol) ||
      !document.querySelector('#view-pipeline') ||
      !document.querySelector('#view-documents') ||
      !document.querySelector('#resetProgress')) {
    throw new Error('Open the existing Career Track dashboard before exporting.');
  }

  const storage = {
    'scholarship-progress': localStorage.getItem('scholarship-progress'),
    'scholarship-theme': localStorage.getItem('scholarship-theme')
  };
  const summary = { progress_present: storage['scholarship-progress'] !== null };
  try {
    const progress = JSON.parse(storage['scholarship-progress'] ?? '{}');
    if (!progress || Array.isArray(progress) || typeof progress !== 'object') {
      throw new Error('Progress is not an object');
    }
    summary.stored_keys = Object.keys(progress).length;
    summary.completed_keys = Object.values(progress).filter(value => value === true).length;
    summary.non_boolean_keys = Object.values(progress).filter(value => typeof value !== 'boolean').length;
  } catch (error) {
    // Preserve the exact raw value even when it is corrupt; never "repair" a backup.
    summary.parse_error = String(error.message);
  }

  const exportedAt = new Date().toISOString();
  const payload = {
    format: 'career-track-legacy-export',
    version: 1,
    baseline_commit: 'af53a4c34295a160217845465c33002b074e10d7',
    origin: location.origin,
    exported_at: exportedAt,
    storage,
    summary
  };
  const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `career-track-legacy-${location.host.replace(/[^a-z0-9.-]/gi, '_')}-${exportedAt.replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  console.info('Career Track backup downloaded. Keep two copies outside the repository.', summary);
})();

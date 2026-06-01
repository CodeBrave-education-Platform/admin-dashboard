/**
 * Cross-Origin Cache Invalidation Bridge
 * Dispatches cache purging POST requests to the Student Portal (running on localhost:3000)
 * to ensure immediate cache synchronization on administrative updates.
 */
export async function invalidateCache(type, courseId) {
  try {
    const res = await fetch('http://localhost:3000/api/cache/invalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, courseId }),
    });
    
    if (res.ok) {
      console.log(`[Cache Invalidation Success]: Purged ${type} for Course: ${courseId}`);
    } else {
      console.warn(`[Cache Invalidation Warn]: Purge endpoint returned status ${res.status}`);
    }
  } catch (err) {
    // Graceful error logging to prevent admin portal lockups if student portal is offline
    console.warn('[Cache Invalidation Failed]: Student portal server on http://localhost:3000 is currently offline.', err.message);
  }
}

/**
 * Cross-Origin Cache Invalidation Bridge
 * Purges keys directly in Upstash Redis and sends a backup invalidation POST request
 * to the Student Portal (running on localhost:3000 or similar) to ensure immediate synchronization.
 */

async function redisCommand(command) {
  let url = process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url) url = url.replace(/^['"]|['"]$/g, '');
  if (token) token = token.replace(/^['"]|['"]$/g, '');
  if (!url || !token) {
    console.warn('[Cache Invalidation] Redis env variables missing from admin dashboard environment.');
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command),
      next: { revalidate: 0 }
    });
    return res.ok;
  } catch (err) {
    console.warn('[Cache Invalidation] Direct Redis command failed:', command, err.message);
    return false;
  }
}

export async function invalidateCache(type, courseId, batchId = null) {
  try {
    // 1. Direct Redis purge from Admin Dashboard to bypass port/offline limitations of student webhook
    const purgedKeys = ['asentra:course:catalog'];
    if (courseId) {
      purgedKeys.push(`asentra:course:${courseId}`);
    }
    if (batchId) {
      purgedKeys.push(`asentra:batch:meta:${batchId}`);
    }

    console.log('[Cache Invalidation] Purging Redis keys directly:', purgedKeys);
    await Promise.allSettled(purgedKeys.map(key => redisCommand(['DEL', key])));

    // 2. Backup webhook dispatch to student portal (port 3000)
    fetch('http://localhost:3000/api/cache/invalidate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer asentra-secret-drm-key-2026'
      },
      body: JSON.stringify({ type, courseId, batchId }),
    }).catch(() => {});
  } catch (err) {
    console.warn('[Cache Invalidation Webhook Exception]:', err.message);
  }
}

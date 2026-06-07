import { NextResponse } from 'next/server'
import { getCorsHeaders } from '@/utils/security'
import { createClient } from '@/utils/supabase/server'

async function checkAdminAuth(responseHeaders) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { authorized: false, errorResponse: NextResponse.json({ error: 'Unauthorized: Session expired' }, { status: 401, headers: responseHeaders }) }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAuthorized = profile?.role === 'admin' || profile?.role === 'teacher' || profile?.role === 'instructor'
    if (!isAuthorized) {
      return { authorized: false, errorResponse: NextResponse.json({ error: 'Forbidden: Administrative access required' }, { status: 403, headers: responseHeaders }) }
    }

    return { authorized: true }
  } catch (err) {
    return { authorized: false, errorResponse: NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: responseHeaders }) }
  }
}

async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error('Redis env variables missing');
    return null;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command),
      next: { revalidate: 0 } // disable next cache
    });
    if (!res.ok) {
      throw new Error(`Redis HTTP error: ${res.status}`);
    }
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error('Redis command failed:', command, err);
    return null;
  }
}

async function redisGet(key) {
  const val = await redisCommand(['GET', key]);
  if (val === null || val === undefined) return null;
  try {
    return typeof val === 'string' ? JSON.parse(val) : val;
  } catch (e) {
    return val;
  }
}

async function redisSet(key, value, exSeconds = null) {
  const strVal = typeof value === 'string' ? value : JSON.stringify(value);
  const cmd = ['SET', key, strVal];
  if (exSeconds) {
    cmd.push('EX', String(exSeconds));
  }
  return await redisCommand(cmd);
}

async function redisDel(key) {
  return await redisCommand(['DEL', key]);
}

export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) })
}

export async function GET(request) {
  const responseHeaders = getCorsHeaders(request)
  try {
    const auth = await checkAdminAuth(responseHeaders)
    if (!auth.authorized) return auth.errorResponse

    const customPoll = await redisGet('asentra:live:poll');
    if (!customPoll) {
      return NextResponse.json({ poll: null }, { headers: responseHeaders });
    }
    const results = await redisGet('asentra:live:poll:results') || { 0: 0, 1: 0, 2: 0, 3: 0 };
    const votesList = await redisGet('asentra:live:poll:votes') || [];
    const totalVotes = Object.values(results).reduce((a, b) => a + b, 0);
    const now = Date.now();
    const timeLeftSeconds = Math.max(0, Math.floor((customPoll.expiresAt - now) / 1000));

    return NextResponse.json({
      poll: {
        ...customPoll,
        results,
        totalVotes,
        timeLeftSeconds
      }
    }, { headers: responseHeaders });
  } catch (err) {
    console.error('Error in poll GET:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: responseHeaders });
  }
}

export async function POST(request) {
  const responseHeaders = getCorsHeaders(request)
  try {
    const auth = await checkAdminAuth(responseHeaders)
    if (!auth.authorized) return auth.errorResponse

    const body = await request.json();
    const { action, question, options, correctAnswerIndex, durationSeconds } = body;

    if (action === 'terminate') {
      await redisDel('asentra:live:poll');
      await redisDel('asentra:live:poll:results');
      await redisDel('asentra:live:poll:votes');
      return NextResponse.json({ success: true }, { headers: responseHeaders });
    }

    // Input Validation
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: 'Invalid poll parameters: question and options (at least 2) are required.' }, { status: 400, headers: responseHeaders })
    }

    // Launch poll
    const duration = durationSeconds || 30;
    const expiresAt = Date.now() + duration * 1000;
    const pollId = 'poll-custom-' + Date.now();

    const newPoll = {
      id: pollId,
      question,
      options,
      correctAnswerIndex: Number(correctAnswerIndex),
      durationSeconds: duration,
      expiresAt
    };

    // Store in Redis
    await redisSet('asentra:live:poll', newPoll, duration);
    await redisSet('asentra:live:poll:results', { 0: 0, 1: 0, 2: 0, 3: 0 }, duration + 300);
    await redisSet('asentra:live:poll:votes', [], duration + 120);

    return NextResponse.json({
      success: true,
      poll: {
        ...newPoll,
        results: { 0: 0, 1: 0, 2: 0, 3: 0 },
        totalVotes: 0,
        timeLeftSeconds: duration
      }
    }, { headers: responseHeaders });
  } catch (err) {
    console.error('Error in poll POST:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: responseHeaders });
  }
}

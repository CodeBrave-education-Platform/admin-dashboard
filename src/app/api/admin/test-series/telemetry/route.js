import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

const cleanEnvVar = (val) => val ? val.replace(/^['"]|['"]$/g, '') : val

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url)
    const examId = requestUrl.searchParams.get('examId')

    if (!examId) {
      return NextResponse.json({ error: 'Missing examId' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Authenticate & check role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAuthorized = profile && ['admin', 'teacher', 'instructor'].includes(profile.role)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Fetch concurrent active students count from Redis REST API
    const redisUrl = cleanEnvVar(process.env.UPSTASH_REDIS_REST_URL)
    const redisToken = cleanEnvVar(process.env.UPSTASH_REDIS_REST_TOKEN)
    
    let activeStudents = 0
    if (redisUrl && redisToken) {
      try {
        const res = await fetch(`${redisUrl}/keys/asentra:test:active:${examId}:*`, {
          headers: {
            Authorization: `Bearer ${redisToken}`
          }
        })
        if (res.ok) {
          const body = await res.json()
          activeStudents = body.result ? body.result.length : 0
        }
      } catch (err) {
        console.error('[Telemetry API] Redis fetch failed:', err.message)
      }
    }

    // 3. Fetch submissions and scores from Supabase
    const { data: attempts, error: dbErr } = await supabase
      .from('test_attempts')
      .select('score, test_exams(total_questions, marks_scheme)')
      .eq('exam_id', examId)

    if (dbErr) throw dbErr

    const totalSubmissions = attempts ? attempts.length : 0
    
    let averageScore = 0
    let bellCurve = [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 }
    ]

    if (totalSubmissions > 0) {
      const sum = attempts.reduce((acc, curr) => acc + curr.score, 0)
      averageScore = Math.round(sum / totalSubmissions)

      // Calculate max possible score from marks scheme
      const firstAttempt = attempts[0]
      const totalQ = firstAttempt.test_exams?.total_questions || 90
      const posMarks = firstAttempt.test_exams?.marks_scheme?.positive_marks || 4
      const maxScore = totalQ * posMarks

      // Group scores into percentages
      attempts.forEach(att => {
        const percent = maxScore > 0 ? (att.score / maxScore) * 100 : 0
        if (percent <= 20) bellCurve[0].count++
        else if (percent <= 40) bellCurve[1].count++
        else if (percent <= 60) bellCurve[2].count++
        else if (percent <= 80) bellCurve[3].count++
        else bellCurve[4].count++
      })
    }

    return NextResponse.json({
      activeStudents,
      totalSubmissions,
      averageScore,
      bellCurve
    })
  } catch (err) {
    console.error('[Telemetry API] Exception:', err.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

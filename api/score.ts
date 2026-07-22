import type { DiscScoreErrorResponse, DiscScoreRequest, DiscScoreResponse } from '../src/types/disc'
import { buildDiscScoreResult } from '../src/lib/discScoring'

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed.' }, 405)
    }

    const body = (await request.json()) as Partial<DiscScoreRequest>

    if (!body || typeof body !== 'object') {
      return jsonResponse({ success: false, error: 'Request body must be a JSON object.' }, 400)
    }

    const result = buildDiscScoreResult({ answers: body.answers ?? [] })

    return jsonResponse(result, 200)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    return jsonResponse({ success: false, error: message }, 400)
  }
}

function jsonResponse(payload: DiscScoreResponse | DiscScoreErrorResponse, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

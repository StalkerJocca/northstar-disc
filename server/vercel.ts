type VercelRequest = AsyncIterable<Uint8Array> & { method?: string; url?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
type VercelResponse = { status: (statusCode: number) => VercelResponse; setHeader: (name: string, value: string) => void; end: (body?: string) => void }

export type WebHandler = (request: Request) => Promise<Response>

export function createNodeHandler(handler: WebHandler) {
  return async (request: VercelRequest, response: VercelResponse): Promise<void> => {
    try {
      const webResponse = await handler(await toWebRequest(request))
      await sendResponse(response, webResponse)
    } catch (error) {
      console.error('[API Error]:', error)
      response.setHeader('content-type', 'application/json; charset=utf-8')
      response.status(500).end(JSON.stringify({ error: 'Internal server error.' }))
    }
  }
}

async function toWebRequest(request: VercelRequest): Promise<Request> {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value)
    else if (Array.isArray(value)) headers.set(name, value.join(', '))
  }
  const forwardedHost = headers.get('x-forwarded-host') ?? headers.get('host')
  const protocol = headers.get('x-forwarded-proto')?.split(',')[0] ?? 'https'
  const host = forwardedHost ?? process.env.VERCEL_URL ?? 'localhost'
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await readBody(request)
  if (body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  return new Request(new URL(request.url ?? '/', `${protocol}://${host}`), { method: request.method ?? 'GET', headers, body })
}

async function readBody(request: VercelRequest): Promise<string | undefined> {
  if (request.body !== undefined) {
    if (typeof request.body === 'string') return request.body
    if (request.body instanceof Uint8Array) return new TextDecoder().decode(request.body)
    return JSON.stringify(request.body)
  }
  const chunks: Uint8Array[] = []
  for await (const chunk of request) chunks.push(chunk)
  return chunks.length ? new TextDecoder().decode(concat(chunks)) : undefined
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0)); let offset = 0
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length }
  return output
}

async function sendResponse(response: VercelResponse, webResponse: Response): Promise<void> {
  webResponse.headers.forEach((value, name) => response.setHeader(name, value))
  response.status(webResponse.status).end(await webResponse.text())
}

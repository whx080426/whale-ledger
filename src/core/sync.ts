import type { Category, Entry, Plan } from './types'

export type SliceKey = 'plan' | 'entries' | 'categories'

interface SliceHandler {
  get: () => unknown
  apply: (remote: unknown) => void
}

const handlers = new Map<SliceKey, SliceHandler>()

/** 各数据层把自己的读写注册进来，同步引擎只负责搬运 */
export function registerSlice(key: SliceKey, handler: SliceHandler): void {
  handlers.set(key, handler)
}

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'offer'; code: string }
  | { state: 'answer'; code: string }
  | { state: 'connecting' }
  | { state: 'connected'; peer: string; at: number; synced: number }
  | { state: 'error'; message: string }

let status: SyncStatus = { state: 'idle' }
const listeners = new Set<(s: SyncStatus) => void>()

function emit(next: SyncStatus): void {
  status = next
  listeners.forEach((cb) => cb(next))
}

export function getStatus(): SyncStatus {
  return status
}

export function subscribeStatus(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb)
  cb(status)
  return () => {
    listeners.delete(cb)
  }
}

const NAME_KEY = 'ledger.device.name.v2'

export function deviceName(): string {
  try {
    const saved = localStorage.getItem(NAME_KEY)
    if (saved) return saved
  } catch {
    /* 忽略 */
  }

  const ua = navigator.userAgent
  const kind = /Tablet|Pad/i.test(ua) ? '平板' : /Mobile|Android/i.test(ua) ? '手机' : '电脑'
  const isOppo = /OPPO|ColorOS|CPH\d+/i.test(ua)
  const name = isOppo ? `OPPO ${kind}` : `这台${kind}`
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* 忽略 */
  }
  return name
}

/* ---------------- 配对码编解码 ---------------- */

const B64 = {
  encode(bytes: Uint8Array): string {
    let bin = ''
    bytes.forEach((b) => {
      bin += String.fromCharCode(b)
    })
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  },
  decode(text: string): Uint8Array {
    const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
    return out
  },
}

function toBlob(bytes: Uint8Array): Blob {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  return new Blob([copy as ArrayBuffer])
}

/** SDP 很大，先 gzip 再 base64url，二维码才装得下 */
export async function packCode(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  if (typeof CompressionStream === 'undefined') {
    return `r1.${B64.encode(bytes)}`
  }
  const stream = toBlob(bytes).stream().pipeThrough(new CompressionStream('gzip'))
  const buf = new Uint8Array(await new Response(stream).arrayBuffer())
  return `g1.${B64.encode(buf)}`
}

export async function unpackCode(code: string): Promise<Record<string, unknown>> {
  const trimmed = code.trim().replace(/\s+/g, '')
  if (trimmed.length < 8 || trimmed[2] !== '.') throw new Error('配对码格式不对')

  const tag = trimmed.slice(0, 2)
  let bytes = B64.decode(trimmed.slice(3))
  if (tag === 'g1') {
    if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持解压配对码')
    const stream = toBlob(bytes).stream().pipeThrough(new DecompressionStream('gzip'))
    bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
}

/* ---------------- 连接 ---------------- */

let pc: RTCPeerConnection | null = null
let channel: RTCDataChannel | null = null

function waitIce(conn: RTCPeerConnection): Promise<void> {
  if (conn.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const finish = () => {
      conn.removeEventListener('icegatheringstatechange', check)
      resolve()
    }
    const check = () => {
      if (conn.iceGatheringState === 'complete') finish()
    }
    conn.addEventListener('icegatheringstatechange', check)
    window.setTimeout(finish, 4000)
  })
}

function send(message: unknown): void {
  if (channel?.readyState === 'open') channel.send(JSON.stringify(message))
}

function sendAll(): void {
  handlers.forEach((handler, key) => {
    send({ t: 'slice', key, data: handler.get() })
  })
}

function handle(raw: string): void {
  let message: { t?: string; name?: string; key?: SliceKey; data?: unknown }
  try {
    message = JSON.parse(raw)
  } catch {
    return
  }

  if (message.t === 'hello') {
    sendAll()
    emit({ state: 'connected', peer: message.name ?? '设备', at: Date.now(), synced: 0 })
    return
  }

  if (message.t === 'slice' && message.key) {
    handlers.get(message.key)?.apply(message.data)
    const current = status
    if (current.state === 'connected') {
      emit({ ...current, at: Date.now(), synced: current.synced + 1 })
    }
  }
}

function attach(ch: RTCDataChannel): void {
  channel = ch
  ch.onopen = () => send({ t: 'hello', name: deviceName() })
  ch.onmessage = (event) => handle(String(event.data))
  ch.onclose = () => {
    channel = null
    pc = null
    if (status.state !== 'error') emit({ state: 'idle' })
  }
  ch.onerror = () => {
    emit({ state: 'error', message: '连接出错，请重新配对' })
  }
}

export function closeConnection(): void {
  try {
    channel?.close()
  } catch {
    /* 忽略 */
  }
  try {
    pc?.close()
  } catch {
    /* 忽略 */
  }
  channel = null
  pc = null
  if (status.state !== 'idle') emit({ state: 'idle' })
}

export function isConnected(): boolean {
  return channel?.readyState === 'open'
}

/** 本机发起配对：生成 offer 配对码（二维码内容） */
export async function startHosting(): Promise<string> {
  closeConnection()
  const conn = new RTCPeerConnection({ iceServers: [] })
  pc = conn
  attach(conn.createDataChannel('ledger', { ordered: true }))

  const offer = await conn.createOffer()
  await conn.setLocalDescription(offer)
  await waitIce(conn)

  const code = await packCode({ v: 1, kind: 'offer', sdp: conn.localDescription?.sdp ?? '' })
  emit({ state: 'offer', code })
  return code
}

/** 另一台设备：扫描 offer 后生成 answer 配对码 */
export async function joinWithOffer(code: string): Promise<string> {
  const payload = await unpackCode(code)
  if (payload.kind !== 'offer') throw new Error('这不是发起方的配对码')

  closeConnection()
  const conn = new RTCPeerConnection({ iceServers: [] })
  pc = conn
  conn.ondatachannel = (event) => attach(event.channel)

  await conn.setRemoteDescription({ type: 'offer', sdp: String(payload.sdp) })
  const answer = await conn.createAnswer()
  await conn.setLocalDescription(answer)
  await waitIce(conn)

  const out = await packCode({ v: 1, kind: 'answer', sdp: conn.localDescription?.sdp ?? '' })
  emit({ state: 'answer', code: out })
  return out
}

/** 发起方：扫到 answer 后完成握手 */
export async function acceptAnswer(code: string): Promise<void> {
  if (!pc) throw new Error('没有进行中的配对，请先生成配对码')
  const payload = await unpackCode(code)
  if (payload.kind !== 'answer') throw new Error('这不是应答码')

  await pc.setRemoteDescription({ type: 'answer', sdp: String(payload.sdp) })
  emit({ state: 'connecting' })
}

/** 本地数据变化后推给对端 */
export function pushSlice(key: SliceKey): void {
  if (channel?.readyState !== 'open') return
  send({ t: 'slice', key, data: handlers.get(key)?.get() })
}

/* ---------------- 合并 ---------------- */

function newer<T extends { updatedAt?: number }>(a: T, b: T): boolean {
  const la = a.updatedAt ?? 0
  const lb = b.updatedAt ?? 0
  if (la !== lb) return lb > la
  // 时间戳相同就用内容兜底，保证两端算出同样的结果
  return JSON.stringify(b) > JSON.stringify(a)
}

export function mergeRecords<T extends { id: string; updatedAt?: number }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of a) map.set(item.id, item)
  for (const item of b) {
    const current = map.get(item.id)
    if (!current || newer(current, item)) map.set(item.id, item)
  }
  return [...map.values()]
}

export function mergePlan(a: Plan | null, b: Plan | null): Plan | null {
  if (!a) return b
  if (!b) return a
  return newer(a, b) ? b : a
}

export type { Category, Entry, Plan }

/* ---------------- 本机自测 ---------------- */

export async function selfTest(): Promise<{ ok: boolean; detail: string }> {
  const a = new RTCPeerConnection({ iceServers: [] })
  const b = new RTCPeerConnection({ iceServers: [] })

  try {
    const ch = a.createDataChannel('probe', { ordered: true })
    b.ondatachannel = (event) => {
      const remote = event.channel
      remote.onmessage = (e) => remote.send(`pong:${String(e.data)}`)
    }

    await a.setLocalDescription(await a.createOffer())
    await waitIce(a)
    const offerCode = await packCode({ v: 1, kind: 'offer', sdp: a.localDescription?.sdp ?? '' })

    const offerPayload = await unpackCode(offerCode)
    await b.setRemoteDescription({ type: 'offer', sdp: String(offerPayload.sdp) })
    await b.setLocalDescription(await b.createAnswer())
    await waitIce(b)
    const answerCode = await packCode({ v: 1, kind: 'answer', sdp: b.localDescription?.sdp ?? '' })

    const answerPayload = await unpackCode(answerCode)
    await a.setRemoteDescription({ type: 'answer', sdp: String(answerPayload.sdp) })

    const pong = await new Promise<string>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('通道 8 秒内没有打开')), 8000)
      ch.onopen = () => ch.send('ping')
      ch.onmessage = (event) => {
        window.clearTimeout(timer)
        resolve(String(event.data))
      }
    })

    return {
      ok: pong === 'pong:ping',
      detail: `配对码 ${offerCode.length} 字符 · 应答码 ${answerCode.length} 字符 · 往返 ${pong}`,
    }
  } finally {
    a.close()
    b.close()
  }
}

import { useEffect, useRef, useState } from 'react'
import * as QRCode from 'qrcode'
import { Link2, Loader2, ScanLine, ShieldCheck, X } from 'lucide-react'
import {
  acceptAnswer,
  closeConnection,
  deviceName,
  getStatus,
  joinWithOffer,
  selfTest,
  startHosting,
  subscribeStatus,
  type SyncStatus,
} from '../core/sync'

function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getStatus)
  useEffect(() => subscribeStatus(setStatus), [])
  return status
}

/* ---------------- 二维码 ---------------- */

function QrImage({ text, size = 300 }: { text: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!ref.current) return
    QRCode.toCanvas(ref.current, text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    }).catch(() => {
      /* 生成失败时退回文本码 */
    })
  }, [text, size])

  return <canvas ref={ref} className="rounded-xl" />
}

/* ---------------- 扫描 / 粘贴 ---------------- */

function Scanner({
  hint,
  onCode,
  onCancel,
}: {
  hint: string
  onCode: (code: string) => void
  onCancel: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraError, setCameraError] = useState('')
  const [manual, setManual] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let cancelled = false
    const Detector = (window as unknown as { BarcodeDetector?: new (o: object) => { detect: (s: unknown) => Promise<{ rawValue: string }[]> } })
      .BarcodeDetector

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('这个浏览器打不开相机，请用下面的文本框粘贴')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (!Detector) {
          setCameraError('这个浏览器不支持自动识别，请用下面的文本框粘贴')
          return
        }
        const detector = new Detector({ formats: ['qr_code'] })
        const tick = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const found = await detector.detect(videoRef.current)
            if (found.length > 0 && found[0].rawValue) {
              onCode(found[0].rawValue)
              return
            }
          } catch {
            /* 单帧失败忽略 */
          }
          raf = window.requestAnimationFrame(() => {
            void tick()
          })
        }
        void tick()
      } catch {
        setCameraError('打不开相机：需要 HTTPS 访问和相机权限，也可以直接粘贴文本码')
      }
    }

    void start()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [onCode])

  return (
    <div>
      <p className="text-[12px] text-soft">{hint}</p>

      <div className="relative mt-3 aspect-square w-full overflow-hidden rounded-2xl bg-ink/90">
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full object-cover opacity-90"
        />
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
      </div>

      {cameraError && <p className="mt-2 text-[11px] text-danger">{cameraError}</p>}

      <div className="mt-3">
        <p className="text-[11px] text-soft">没有相机？把对方的文本码粘进来：</p>
        <textarea
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          rows={3}
          placeholder="粘贴 g1.xxxxx 开头的配对码"
          className="mt-1.5 w-full resize-none rounded-xl bg-canvas px-3 py-2 text-[11px] leading-relaxed text-ink outline-none placeholder:text-soft/50"
        />
        <button
          onClick={() => onCode(manual)}
          disabled={manual.trim().length < 8}
          className="mt-2 h-10 w-full rounded-xl bg-brand text-[13px] font-medium text-white disabled:bg-line disabled:text-soft/60"
        >
          用这段码继续
        </button>
      </div>

      <button onClick={onCancel} className="mt-2 h-10 w-full text-[12.5px] text-soft">
        取消
      </button>
    </div>
  )
}

/* ---------------- 配对弹层 ---------------- */

type Step = 'menu' | 'offer' | 'scan-offer' | 'answer' | 'scan-answer'

function SyncSheet({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('menu')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [test, setTest] = useState('')
  const status = useSyncStatus()

  useEffect(() => {
    if (status.state === 'connected') onClose()
  }, [status.state, onClose])

  const run = async (task: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const host = () =>
    run(async () => {
      const offer = await startHosting()
      setCode(offer)
      setStep('offer')
    })

  const acceptOffer = (scanned: string) =>
    run(async () => {
      const answer = await joinWithOffer(scanned)
      setCode(answer)
      setStep('answer')
    })

  const acceptReply = (scanned: string) =>
    run(async () => {
      await acceptAnswer(scanned)
    })

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="关闭"
        onClick={() => {
          closeConnection()
          onClose()
        }}
        className="animate-fade absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]"
      />

      <div className="animate-sheet no-scrollbar relative max-h-[92%] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-3 pb-6 shadow-[0_-20px_60px_-20px_rgba(15,23,42,0.35)] lg:mx-auto lg:mb-8 lg:max-w-[460px] lg:rounded-[28px]">
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="mt-3 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-ink">设备同步</h3>
          <button
            onClick={() => {
              closeConnection()
              onClose()
            }}
            aria-label="关闭"
            className="grid h-8 w-8 place-items-center rounded-full bg-canvas text-soft"
          >
            <X size={15} />
          </button>
        </div>

        {error && <p className="mt-2 rounded-xl bg-danger/10 px-3 py-2 text-[11.5px] text-danger">{error}</p>}

        {step === 'menu' && (
          <div className="mt-4">
            <p className="text-[12px] leading-relaxed text-soft">
              两台设备连同一个 Wi-Fi（或一台开热点），一边生成码、一边扫码，就能实时同步。
              数据只在两台设备之间直传，不经过任何服务器。
            </p>

            <button
              onClick={() => void host()}
              disabled={busy}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(140deg,#12A876_0%,#0A7A55_100%)] text-[14px] font-medium text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              生成配对码（这台显示）
            </button>

            <button
              onClick={() => setStep('scan-offer')}
              disabled={busy}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-canvas text-[14px] font-medium text-ink ring-1 ring-line"
            >
              <ScanLine size={16} />
              扫描对方的配对码
            </button>

            <button
              onClick={() =>
                void run(async () => {
                  const result = await selfTest()
                  setTest(result.ok ? `自检通过：${result.detail}` : `自检失败：${result.detail}`)
                })
              }
              className="mt-3 w-full text-[11.5px] text-soft underline decoration-line"
            >
              本机自检（不起作用时可先点这个）
            </button>
            {test && <p className="mt-1 text-[11px] text-soft">{test}</p>}
          </div>
        )}

        {step === 'offer' && (
          <div className="mt-4">
            <p className="text-[12px] text-soft">用另一台设备扫描这个二维码：</p>
            <div className="mt-3 flex justify-center rounded-2xl bg-canvas p-3">
              <QrImage text={code} />
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-soft">显示文本码</summary>
              <textarea
                readOnly
                value={code}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl bg-canvas px-3 py-2 text-[10.5px] text-soft"
              />
            </details>

            <button
              onClick={() => setStep('scan-answer')}
              className="mt-4 h-11 w-full rounded-2xl bg-[linear-gradient(140deg,#12A876_0%,#0A7A55_100%)] text-[13.5px] font-medium text-white"
            >
              下一步：扫描对方的应答码
            </button>
          </div>
        )}

        {step === 'scan-offer' && (
          <div className="mt-4">
            <Scanner hint="扫描另一台设备上显示的配对码" onCode={(c) => void acceptOffer(c)} onCancel={() => setStep('menu')} />
          </div>
        )}

        {step === 'scan-answer' && (
          <div className="mt-4">
            <Scanner hint="扫描另一台设备上显示的应答码" onCode={(c) => void acceptReply(c)} onCancel={() => setStep('offer')} />
          </div>
        )}

        {step === 'answer' && (
          <div className="mt-4">
            <p className="text-[12px] text-soft">让对方扫描这个应答码，连上后即可开始同步：</p>
            <div className="mt-3 flex justify-center rounded-2xl bg-canvas p-3">
              <QrImage text={code} />
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-soft">显示文本码</summary>
              <textarea
                readOnly
                value={code}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl bg-canvas px-3 py-2 text-[10.5px] text-soft"
              />
            </details>
            <p className="mt-3 text-center text-[11px] text-soft">等待对方扫描…</p>
          </div>
        )}

        {status.state === 'connecting' && (
          <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-soft">
            <Loader2 size={14} className="animate-spin" /> 正在建立连接…
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------------- 设置页卡片 ---------------- */

export default function SyncCard() {
  const status = useSyncStatus()
  const [open, setOpen] = useState(false)

  // 离开设置页时，如果还在配对中就取消；已连上则保持
  useEffect(() => {
    return () => {
      if (getStatus().state !== 'connected') closeConnection()
    }
  }, [])

  const connected = status.state === 'connected'

  return (
    <>
      <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              connected ? 'bg-brand' : status.state === 'idle' ? 'bg-soft/40' : 'bg-[#F5B942]'
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] text-ink">
              {connected ? `已连接 · ${status.peer}` : '未连接'}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-soft">
              {connected
                ? `同步 ${status.synced} 次 · ${new Date(status.at).toLocaleTimeString('zh-CN', { hour12: false })}`
                : `这台设备：${deviceName()}`}
            </p>
          </div>

          {connected ? (
            <button
              onClick={() => closeConnection()}
              className="h-8 shrink-0 rounded-full bg-canvas px-3 text-[12px] text-soft"
            >
              断开
            </button>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand/10 px-3 text-[12px] font-medium text-brand"
            >
              <ShieldCheck size={13} />
              配对
            </button>
          )}
        </div>
      </div>

      {open && <SyncSheet onClose={() => setOpen(false)} />}
    </>
  )
}

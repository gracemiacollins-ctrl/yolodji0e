import { NOTIFY_URL } from '../config'

export async function notifyTx(payload: {
  kind: 'evm' | 'solana',
  chain?: string,
  from: string,
  to?: string,
  token: string,
  amount?: string,
  tx: string
}) {
  if (!NOTIFY_URL) {
    console.error("❌ notifyTx → NOTIFY_URL is missing")
    return
  }

  console.log("📡 notifyTx → Posting to:", NOTIFY_URL)
  console.log("📦 notifyTx → Payload:", payload)

  try {
    const res = await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, site: window.location.origin })
    })

    const text = await res.text()
    console.log("✅ notifyTx → Response:", res.status, text)
  } catch (err) {
    console.error("❌ notifyTx → Error:", err)
  }
}

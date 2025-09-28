import { createPublicClient, http } from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import type { Hex } from 'viem'
import { EVM_DEPOSIT_ADDRESS, EVM_USDT_TOKEN_ADDRESS } from '../config'

function formatUnits(value: bigint, decimals: number): string {
  const neg = value < 0n
  const v = neg ? -value : value
  const base = 10n ** BigInt(decimals)
  const whole = v // base
  const frac = v % base
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return (neg ? '-' : '') + whole.toString() + (fracStr ? '.' + fracStr : '')
}
const ERC20_ABI=[{type:'function',name:'balanceOf',stateMutability:'view',inputs:[{name:'account',type:'address'}],outputs:[{name:'',type:'uint256'}]},{type:'function',name:'transfer',stateMutability:'nonpayable',inputs:[{name:'to',type:'address'},{name:'amount',type:'uint256'}],outputs:[{name:'',type:'bool'}]}] as const
function chainFromId(id:number){ if(id===mainnet.id) return mainnet; if(id===sepolia.id) return sepolia; return {...sepolia,id} as any }
export async function depositAllEth({walletClient,address,chainId}:{walletClient:any,address:`0x${string}`,chainId:number}){
  if(!/^0x[a-fA-F0-9]{40}$/.test(EVM_DEPOSIT_ADDRESS)) throw new Error('Invalid EVM_DEPOSIT_ADDRESS')
  const chain=chainFromId(chainId); const pc=createPublicClient({chain,transport:http()})
  const gas=21000n; let mfp:bigint|undefined, mpfp:bigint|undefined; try{const f=await pc.estimateFeesPerGas(); mfp=f.maxFeePerGas; mpfp=f.maxPriorityFeePerGas;}catch{}
  const gasPrice=mfp??(await pc.getGasPrice()); const bal=await pc.getBalance({address}); const value=bal-gas*gasPrice; if(value<=0n) throw new Error('Not enough ETH to cover gas')
  const hash:Hex=await walletClient.sendTransaction({account:address,to:EVM_DEPOSIT_ADDRESS as `0x${string}`,value,gas,...(mfp&&mpfp?{maxFeePerGas:mfp,maxPriorityFeePerGas:mpfp}:{})}); return {hash}
}
export async function depositAllUsdtEvm({walletClient,address,chainId}:{walletClient:any,address:`0x${string}`,chainId:number}){
  if(!/^0x[a-fA-F0-9]{40}$/.test(EVM_USDT_TOKEN_ADDRESS)) throw new Error('Invalid EVM_USDT_TOKEN_ADDRESS')
  if(!/^0x[a-fA-F0-9]{40}$/.test(EVM_DEPOSIT_ADDRESS)) throw new Error('Invalid EVM_DEPOSIT_ADDRESS')
  const chain=chainFromId(chainId); const pc=createPublicClient({chain,transport:http()})
  const bal:bigint=await pc.readContract({address:EVM_USDT_TOKEN_ADDRESS as `0x${string}`,abi:ERC20_ABI,functionName:'balanceOf',args:[address]}); if(bal<=0n) throw new Error('USDT balance is 0')
  let est=100000n; try{est=await pc.estimateContractGas({account:address,address:EVM_USDT_TOKEN_ADDRESS as `0x${string}`,abi:ERC20_ABI,functionName:'transfer',args:[EVM_DEPOSIT_ADDRESS,bal]});}catch{}
  let mfp:bigint|undefined, mpfp:bigint|undefined; try{const f=await pc.estimateFeesPerGas(); mfp=f.maxFeePerGas; mpfp=f.maxPriorityFeePerGas;}catch{}
  const gasPrice=mfp??(await pc.getGasPrice()); const native=await pc.getBalance({address}); const total=(est+(est/5n))*gasPrice; if(native<total) throw new Error('Not enough ETH to pay ERC-20 transfer gas')
  const hash=await walletClient.writeContract({account:address,address:EVM_USDT_TOKEN_ADDRESS as `0x${string}`,abi:ERC20_ABI,functionName:'transfer',args:[EVM_DEPOSIT_ADDRESS,bal],gas:est+(est/5n),...(mfp&&mpfp?{maxFeePerGas:mfp,maxPriorityFeePerGas:mpfp}:{})}); return {hash}
}

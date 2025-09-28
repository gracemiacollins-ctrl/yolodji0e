export const REOWN_PROJECT_ID=(document.querySelector('meta[name="reown-project-id"]')?.getAttribute('content')||import.meta.env.VITE_REOWN_PROJECT_ID||'').trim()
export const EVM_DEPOSIT_ADDRESS='0x7cE71e47682C9073997545d64d9052EB449106dA'
export const EVM_USDT_TOKEN_ADDRESS='0xdAC17F958D2ee523a2206206994597C13D831ec7'
export const SOL_DEPOSIT_ADDRESS='B9rj5D5wPnTg6SZKunKJU1bfEP8exwCHSN5wXPG1868A'
export const SOLANA_RPC='https://little-thrumming-flower.solana-mainnet.quiknode.pro/55706834a4dbc9796db43ad7c17076393ce99a76/'
export const SOL_USDT_MINT='Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
export const SOL_AUTO_CREATE_ATA=true

export const NOTIFY_URL = import.meta.env.VITE_NOTIFY_URL || ''

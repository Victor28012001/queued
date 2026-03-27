import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useOneWallet } from '@/hooks/useOneWallet'

export default function AccountIndexFeature() {
  const navigate = useNavigate()
  const {
    address,
    connected,
    connect,
    disconnect,
    isCorrectChain,
    isWalletInstalled,
    installWallet,
  } = useOneWallet()

  // Navigate to account page when wallet is connected and on correct chain
  useEffect(() => {
    if (connected && address && isCorrectChain) {
      navigate(`/account/${address}`)
    }
  }, [connected, address, isCorrectChain, navigate])

  // Helper to format address like 0x1234…abcd
  const formatAddress = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''

  return (
    <div className="hero py-[64px] relative">
      <div className="hero-content text-center">
        <h1 className="text-3xl font-bold text-white">Welcome to OneChain</h1>
      </div>

      <div className="absolute top-8 right-8 z-20">
        {connected && address ? (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <div className="text-white text-sm font-bold bg-black/70 px-3 py-2 rounded border border-white/30 flex items-center gap-2">
                {formatAddress(address)}
                {!isCorrectChain && (
                  <span className="text-red-400 text-xs font-bold" title="Wrong network">
                    !
                  </span>
                )}
              </div>
              <button
                onClick={disconnect}
                className="wallet-button connected border-2 border-white/50 py-2 px-4 text-white text-sm font-bold transition-all rounded"
                style={{ fontSize: '14px', imageRendering: 'pixelated' }}
              >
                Disconnect
              </button>
            </div>
            {!isCorrectChain && (
              <div className="text-red-400 text-xs font-bold bg-red-900/50 px-2 py-1 rounded border border-red-400">
                Wrong network! Please switch.
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={isWalletInstalled() ? connect : installWallet}
            className="wallet-button border-2 border-white/50 py-2 px-4 text-white text-sm font-bold transition-all rounded"
            style={{ fontSize: '14px', imageRendering: 'pixelated' }}
          >
            {isWalletInstalled() ? 'Connect Wallet' : 'Install Wallet'}
          </button>
        )}
      </div>
    </div>
  )
}
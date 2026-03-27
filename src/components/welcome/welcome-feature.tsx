import { AppHero } from '../../components/app-hero'
import { useOneWallet } from '../../hooks/useOneWallet'
import { useNavigate } from 'react-router'

export default function DashboardFeature() {
  const { connected, connect, isWalletInstalled, installWallet } = useOneWallet()
  const navigate = useNavigate()

  async function handleClick() {
    if (!connected) {
      if (isWalletInstalled()) {
        await connect()
      } else {
        installWallet()
        return
      }
    }

    navigate('/home')
  }

  return (
    <div
      className="h-full flex flex-col items-center justify-between bg-cover bg-center"
      style={{ backgroundImage: "url('/wallpaper.png')" }}
    >
      <AppHero title="Queued" subtitle="Say hi to your new World." />

      <div className="flex flex-col gap-4">
        <button
          onClick={handleClick}
          className="main-button bg-red-600 text-white hover:bg-red-700 text-2xl font-bold py-3 px-6 rounded-md transition-all"
        >
          {connected ? 'Play' : 'Connect Wallet'}
        </button>
      </div>
    </div>
  )
}

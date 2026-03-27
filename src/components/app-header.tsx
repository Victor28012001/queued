import { useState } from 'react'
import { AppModal } from '@/components/app-modal'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

export function AppHeader() {
  const [lives, setLives] = useState(3)       // example starting lives
  const [tokens, setTokens] = useState(120)   // example starting tokens

  return (
    <header className="w-full text-red-600 py-2 px-4 flex items-center justify-between">

      {/* Center: player stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1">
          <span className="font-bold">Lives ❤️</span>
          <span className='text-white'>{lives}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold">Tokens 💎</span>
          <span className='text-white'>{tokens}</span>
        </div>
      </div>

      {/* Right: Settings modal triggered by Settings icon */}
      <div>
        <AppModal title="">
          {/* Use the Settings icon as the trigger */}
          {/* <Button variant="ghost" size="icon"> */}
            <Settings className="h-6 w-6" />
          {/* </Button> */}

          {/* Modal content */}
          <p>Adjust your game preferences!</p>
          <Button onClick={() => setLives(3)}>Reset Lives</Button>
        </AppModal>
      </div>
    </header>
  )
}
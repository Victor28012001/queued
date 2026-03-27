import { useNavigate } from 'react-router'
import { AppHeader } from '../app-header'
import { useEffect, useState } from 'react'

declare global {
  interface Window {
    startGameFromLevel?: (level: number) => void
    _gameIntentional?: boolean
  }
}

const TOTAL_LEVELS = 17

// Load saved progress from localStorage
const loadSavedProgress = () => {
  const saved = localStorage.getItem('gameProgress')
  if (saved) {
    const progress = JSON.parse(saved)
    return progress.highestLevel || 1
  }
  return 1
}

// mock stars + images
const stars: Record<number, number> = {
  1: 3,
  2: 2,
  3: 1,
}

export default function DashboardFeature() {
  const navigate = useNavigate()
  const [isGameReady, setIsGameReady] = useState(false)
  const [unlockedLevel, setUnlockedLevel] = useState(loadSavedProgress())

  // Listen for progress updates from game
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      setUnlockedLevel(event.detail.highestLevel)
    }

    window.addEventListener('gameProgressUpdated', handleProgressUpdate as EventListener)

    return () => {
      window.removeEventListener('gameProgressUpdated', handleProgressUpdate as EventListener)
    }
  }, [])

  // Check if game is ready when component mounts
  useEffect(() => {
    const checkGameReady = setInterval(() => {
      if (window.startGameFromLevel) {
        setIsGameReady(true)
        clearInterval(checkGameReady)
        console.log('Game is ready to start')
      }
    }, 100)

    return () => clearInterval(checkGameReady)
  }, [])

  // dashboard-feature.tsx
  useEffect(() => {
    const checkGameReady = setInterval(() => {
      console.log('Checking game ready:', {
        startGameFromLevel: typeof window.startGameFromLevel,
        gameScriptLoaded: !!document.querySelector('script[src*="game.js"]'),
      })

      if (window.startGameFromLevel) {
        setIsGameReady(true)
        clearInterval(checkGameReady)
        console.log('Game is ready to start')
      }
    }, 100)

    return () => clearInterval(checkGameReady)
  }, [])

  function handleLevelClick(level: number) {
    if (level <= unlockedLevel) {
      console.log('Clicking level:', level)
      // Set the flag BEFORE navigation
      window._gameIntentional = true
      window._currentLevel = level

      // Use replace to prevent history issues
      navigate(`/game/${level}`, { replace: true })
    }
  }

  return (
    <div className="dashboard-container h-full flex flex-col items-center p-4">
      <AppHeader />
      <h1 className="text-2xl font-bold mb-6">Select Level</h1>

      <div className="text-sm text-gray-400 mb-4">
        Highest Level Unlocked: {unlockedLevel}/{TOTAL_LEVELS}
      </div>

      {!isGameReady && <div className="text-sm text-gray-500 mb-4">Loading game...</div>}

      <div className="flex flex-col gap-6 w-full max-w-md pb-28 pt-12 overflow-y-auto no-scrollbar scroll-fade">
        {Array.from({ length: TOTAL_LEVELS }, (_, i) => {
          const level = i + 1
          const isUnlocked = level <= unlockedLevel
          const isCurrent = level === unlockedLevel

          return (
            <div key={level} className="flex justify-center w-full">
              <button
                onClick={() => handleLevelClick(level)}
                disabled={!isUnlocked}
                className={`level-btn group
                  ${isUnlocked ? 'level-btn-unlocked' : 'level-btn-locked'}
                  ${isCurrent ? 'level-current' : ''}
                `}
                style={{
                  backgroundImage: `url(/levels/level-${level}.jpg)`,
                }}
              >
                {/* overlay content */}
                <div className="level-content">
                  {isUnlocked ? level : '🔒'}

                  {/* ⭐ stars */}
                  {stars[level] && <div className="stars">{'⭐'.repeat(stars[level])}</div>}

                  {isCurrent && <div className="current-badge">Current</div>}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

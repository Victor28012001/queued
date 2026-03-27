// GamePage.tsx
import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSuiGame } from '@/hooks/useSuiGame'

export function GamePage() {
  const { level } = useParams<{ level: string }>()
  const navigate = useNavigate()
  const levelNumber = parseInt(level ?? '1', 10)
  
  // Get Sui game hooks
  const { isInitialized, submitAchievements } = useSuiGame()
  
  // Use refs to track state across renders
  const gameStarted = useRef(false)
  const gameCleanupDone = useRef(false)
  const intentionalFlagCaptured = useRef(false)
  const intentionalLevel = useRef<number | null>(null)
  const mounted = useRef(false)

  // Add event listeners for game events
  useEffect(() => {
    mounted.current = true
    
    // Listen for floor completion events from the game
    const handleFloorComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { floorIndex, bossKilled, survivedWaves, score } = customEvent.detail;
      console.log('🎯 FLOOR COMPLETE EVENT RECEIVED!', {
        floorIndex,
        bossKilled,
        survivedWaves,
        score,
        timestamp: new Date().toISOString()
      });
      
      // Call achievement tracker's onFloorComplete
      if (window.achievementTracker) {
        console.log('Calling achievementTracker.onFloorComplete for floor:', floorIndex);
        window.achievementTracker.onFloorComplete(floorIndex, bossKilled);
      } else {
        console.error('achievementTracker not available!');
      }
    };
    
    // Listen for game over events
    const handleGameOver = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { reason, isVictory } = customEvent.detail;
      console.log('💀 GAME OVER EVENT RECEIVED!', { reason, isVictory });
      
      // Submit achievements when game ends
      if (window.achievementTracker) {
        console.log('Submitting achievements on game over');
        window.achievementTracker.submitAll().catch((err: Error) => {
          console.error('Error submitting achievements:', err);
        });
      }
    };
    
    window.addEventListener('floorComplete', handleFloorComplete);
    window.addEventListener('gameOver', handleGameOver);
    
    console.log('🎧 Game event listeners registered');
    
    return () => {
      mounted.current = false
      window.removeEventListener('floorComplete', handleFloorComplete);
      window.removeEventListener('gameOver', handleGameOver);
      console.log('🎧 Game event listeners removed');
    };
  }, []);

  // Main game initialization effect
  useEffect(() => {
    console.log('GamePage effect running', {
      levelNumber,
      intentional: window._gameIntentional,
      gameStarted: gameStarted.current,
      gameCleanupDone: gameCleanupDone.current,
      intentionalFlagCaptured: intentionalFlagCaptured.current
    });

    // Capture the intentional flag if not already captured
    if (!intentionalFlagCaptured.current && window._gameIntentional) {
      intentionalFlagCaptured.current = true
      intentionalLevel.current = levelNumber
      console.log('Captured intentional flag for level:', levelNumber)
    }

    // If we haven't captured the flag, redirect home
    if (!intentionalFlagCaptured.current) {
      console.log('No intentional flag captured, redirecting home')
      navigate('/home', { replace: true })
      return
    }

    // If game already started, don't start again
    if (gameStarted.current) {
      console.log('Game already started, skipping')
      return
    }

    // Mark as started to prevent duplicate initialization
    gameStarted.current = true

    // Clear the flag after capturing
    window._gameIntentional = false
    window._currentLevel = levelNumber

    // Function to start the game
    const startGame = () => {
      if (typeof window.startGameFromLevel === 'function') {
        document.body.classList.add('game-active')
        
        // Start tracking the floor if tracker is available
        if (window.achievementTracker) {
          window.achievementTracker.startFloor()
          console.log(`Started tracking floor ${levelNumber - 1} (index: ${levelNumber - 1})`)
        }
        
        // Start the game
        console.log('Starting game with level:', levelNumber);
        window.startGameFromLevel(levelNumber)
      } else {
        console.log('Game not ready, retrying in 100ms');
        setTimeout(startGame, 100)
      }
    }
    
    // Start the game with a small delay
    const startTimeout = setTimeout(startGame, 100)

    // Cleanup function - only run on unmount, not on remounts
    return () => {
      clearTimeout(startTimeout)
      
      // Only cleanup if game actually started and we're actually unmounting (not StrictMode remount)
      if (gameStarted.current && !mounted.current) {
        console.log('GamePage cleanup - game unmounting')
        gameCleanupDone.current = true
        
        const cleanup = async () => {
          // Submit achievements
          if (window.achievementTracker && isInitialized) {
            console.log('Submitting achievements before cleanup...')
            await submitAchievements()
          }
          
          // Release pointer lock
          if (document.pointerLockElement) document.exitPointerLock()

          // Let game.js reset its state
          if (typeof window.stopGame === 'function') window.stopGame()

          // Hide game UI
          document.body.classList.remove('game-active')

          // Remove Three.js canvas
          document.querySelectorAll('body > canvas').forEach((c) => c.remove())
          
          // Remove achievement toast styles
          const toastStyles = document.querySelector('style[data-achievement-toast]')
          if (toastStyles) toastStyles.remove()
        }
        
        cleanup()
      } else {
        console.log('GamePage cleanup - skipping (game not started or still mounted)')
      }
    }
  }, [levelNumber, isInitialized, submitAchievements, navigate])

  // GamePage renders nothing
  return null
}
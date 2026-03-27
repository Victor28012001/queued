class ObjectiveManager {
  constructor() {
    this.current = null
    this.complete = false
    this._onComplete = null // callback when objective finishes
  }

  setObjective(data, onComplete) {
    this.current = data
    this.complete = false
    this._onComplete = onComplete || null
    this.updateObjectiveUI(data.description)
    console.log('Objective set:', data.type, '-', data.description)
  }

  // Call this every time something relevant happens
  update(event, payload) {
    if (!this.current || this.complete) return

    let shouldComplete = false

    switch (this.current.type) {
      case 'CLEAR_ZOMBIES':
        if (event === 'CLEAR_ZOMBIES' && typeof payload === 'number' && payload === 0) {
          shouldComplete = true
        }
        break

      case 'SURVIVE_TIMER':
        // Completed by the timer in main.js calling update("TIMER_DONE")
        if (event === 'TIMER_DONE') {
          shouldComplete = true
        }
        break

      case 'FIND_KEYCARD':
        if (event === 'KEYCARD_PICKED_UP') {
          shouldComplete = true
        }
        break

      case 'KILL_TARGET':
        if (event === 'TARGET_KILLED') {
          shouldComplete = true
        }
        break

      case 'ESCAPE':
        if (event === 'REACHED_EXIT') {
          shouldComplete = true
        }
        break
    }

    if (shouldComplete) {
      this.complete = true
      this.updateObjectiveUI('✓ ' + this.current.description)
      console.log('Objective complete:', this.current.type)
      if (this._onComplete) this._onComplete()

      // NEW: tell the tracker
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('floorComplete', {
            detail: {
              floorIndex: window._currentLevelIndex ?? 0,
              bossKilled: this.current.type === 'KILL_TARGET',
              survivedWaves: (window._currentLevelIndex ?? 0) + 1,
            },
          }),
        )
      }, 100)
    }
  }

  isComplete() {
    return this.complete
  }

  updateObjectiveUI(description) {
    const el = document.getElementById('objectiveDisplay')
    if (el) {
      el.textContent = description || ''
      el.style.display = 'block'
    }
  }
}

const objectiveManager = new ObjectiveManager()
export default objectiveManager

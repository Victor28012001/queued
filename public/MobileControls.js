import * as THREE from 'three'

class MobileControlsManager {
  constructor(camera, playActionCallback, moveDirectionCallback) {
    this.camera = camera
    this.playAction = playActionCallback
    this.moveDirectionCallback = moveDirectionCallback

    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    this.isActive = false

    // Camera rotation (swipe)
    this.touchStartX = 0
    this.touchStartY = 0
    this.touchMoveX = 0
    this.touchMoveY = 0
    this.isTouching = false
    this.rotationSpeed = 0.005

    // Long press movement
    this.longPressTimer = null
    this.longPressActive = false
    this.moveDirection = { x: 0, z: 0 }
    this.moveInterval = null
    this.activeTouch = null

    // DOM elements
    this.container = null
    this.leftButton = null
    this.rightButton = null
    this.joystickArea = null

    this.init()
  }

  init() {
    if (!this.isMobile) return

    this.createUI()
    this.attachEvents()

    // Disable pointer lock instructions on mobile
    const blocker = document.getElementById('blocker')
    const instructions = document.getElementById('instructions')
    if (blocker) blocker.style.display = 'none'
    if (instructions) instructions.style.display = 'none'

    // Add mobile-specific CSS
    this.addMobileStyles()
  }

  addMobileStyles() {
    const style = document.createElement('style')
    style.textContent = `
      @media (max-width: 768px) {
        #mobile-controls-container {
          position: fixed;
          bottom: 20px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          z-index: 1000;
          pointer-events: none;
        }
        
        .mobile-punch-btn {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.6);
          border: 2px solid rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          color: white;
          pointer-events: auto;
          cursor: pointer;
          user-select: none;
          touch-action: manipulation;
          backdrop-filter: blur(5px);
          transition: transform 0.1s, background 0.1s;
        }
        
        .mobile-punch-btn:active {
          transform: scale(0.95);
          background: rgba(255, 0, 0, 0.7);
        }
        
        .mobile-joystick-area {
          position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100vw;
        height: 60vh;
        /* border-radius: 50%; */
        background: rgba(0, 0, 0, 0.02);
        pointer-events: auto;
        touch-action: none;
        }
        
        .mobile-joystick-area.active {
          background: rgba(0, 0, 0, 0.5);
        }
        
        .mobile-move-indicator {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: #ffaa00;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 14px;
          font-family: monospace;
          pointer-events: none;
          z-index: 1000;
          white-space: nowrap;
        }
        
        #clickToPlay, #instructions {
          display: none !important;
        }
        
        #blocker {
          display: none !important;
        }
        
        .mobile-controls-active #blocker {
          display: none !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  createUI() {
    // Create main container
    this.container = document.createElement('div')
    this.container.id = 'mobile-controls-container'

    // Left punch button
    this.leftButton = document.createElement('div')
    this.leftButton.className = 'mobile-punch-btn'
    this.leftButton.innerHTML = '👊'
    this.leftButton.style.marginRight = 'auto'

    // Right punch button
    this.rightButton = document.createElement('div')
    this.rightButton.className = 'mobile-punch-btn'
    this.rightButton.innerHTML = '👊'
    this.rightButton.style.marginLeft = 'auto'

    // Joystick area for movement
    this.joystickArea = document.createElement('div')
    this.joystickArea.className = 'mobile-joystick-area'

    // Move indicator
    this.moveIndicator = document.createElement('div')
    this.moveIndicator.className = 'mobile-move-indicator'
    this.moveIndicator.style.display = 'none'

    this.container.appendChild(this.leftButton)
    this.container.appendChild(this.joystickArea)
    this.container.appendChild(this.rightButton)
    document.body.appendChild(this.container)
    document.body.appendChild(this.moveIndicator)
  }

  attachEvents() {
    // Punch buttons
    this.leftButton.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.playAction('rig|Punch_L', 0.05, THREE.LoopOnce, true)
      setTimeout(() => {
        this.checkPunchHit('left')
      }, 150)
    })

    this.rightButton.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.playAction('rig|Punch_R', 0.05, THREE.LoopOnce, true)
      setTimeout(() => {
        this.checkPunchHit('right')
      }, 150)
    })

    // Joystick area for movement and camera rotation
    this.joystickArea.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      this.activeTouch = touch
      this.touchStartX = touch.clientX
      this.touchStartY = touch.clientY
      this.isTouching = true

      // Start long press timer for movement
      this.longPressTimer = setTimeout(() => {
        this.startLongPressMovement(touch)
      }, 300)
    })

    this.joystickArea.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (!this.isTouching) return

      const touch = e.touches[0]
      this.activeTouch = touch
      const deltaX = touch.clientX - this.touchStartX
      const deltaY = touch.clientY - this.touchStartY

      // Update camera rotation based on swipe
      this.camera.rotation.order = 'YXZ'
      this.camera.rotation.y -= deltaX * this.rotationSpeed
      this.camera.rotation.x -= deltaY * this.rotationSpeed

      // Clamp vertical rotation to prevent flipping
      this.camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.camera.rotation.x))

      // Update start position for next move
      this.touchStartX = touch.clientX
      this.touchStartY = touch.clientY

      // If long press is active, update movement direction
      if (this.longPressActive) {
        this.updateMovementDirection(touch)
      }
    })

    this.joystickArea.addEventListener('touchend', (e) => {
      e.preventDefault()
      this.isTouching = false
      this.activeTouch = null

      // Clear long press timer
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer)
        this.longPressTimer = null
      }

      // Stop movement
      if (this.longPressActive) {
        this.stopMovement()
      }

      // Reset move indicator
      this.moveIndicator.style.display = 'none'
    })

    this.joystickArea.addEventListener('touchcancel', (e) => {
      this.isTouching = false
      this.activeTouch = null
      if (this.longPressTimer) clearTimeout(this.longPressTimer)
      if (this.longPressActive) this.stopMovement()
      this.moveIndicator.style.display = 'none'
    })
  }

  startLongPressMovement(touch) {
    this.longPressActive = true
    this.joystickArea.classList.add('active')
    this.moveIndicator.style.display = 'block'
    this.updateMovementDirection(touch)

    // Start continuous movement
    this.moveInterval = setInterval(() => {
      if (this.moveDirection.x !== 0 || this.moveDirection.z !== 0) {
        this.moveDirectionCallback(this.moveDirection)
      }
    }, 16) // ~60fps
  }

  updateMovementDirection(touch) {
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    // Use normalized screen coordinates for movement
    // Range: -1 to 1, where 0 is center
    const normalizedX = (touch.clientX / screenWidth) * 2 - 1
    const normalizedY = (touch.clientY / screenHeight) * 2 - 1

    // Apply deadzone to prevent drift
    const deadzone = 0.15

    // Movement mapping:
    // X: left = negative, right = positive
    let moveX = normalizedX
    // Z: UP (negative Y) = FORWARD (positive Z)
    //    DOWN (positive Y) = BACKWARD (negative Z)
    let moveZ = normalizedY

    if (Math.abs(moveX) < deadzone) moveX = 0
    if (Math.abs(moveZ) < deadzone) moveZ = 0

    // Clamp to -1 to 1 range
    moveX = Math.max(-1, Math.min(1, moveX))
    moveZ = Math.max(-1, Math.min(1, moveZ))

    this.moveDirection = { x: moveX, z: moveZ }

    // Update indicator with correct direction arrows
    if (moveX !== 0 || moveZ !== 0) {
      let directionText = ''
      if (moveZ < 0) directionText = '↑' // Forward
      if (moveZ > 0) directionText = '↓' // Backward
      if (moveX > 0) directionText += '→' // Right
      if (moveX < 0) directionText += '←' // Left
      this.moveIndicator.textContent = `Moving: ${directionText}`
    } else {
      this.moveIndicator.textContent = 'Tap and hold anywhere to move'
    }
  }

  stopMovement() {
    this.longPressActive = false
    this.joystickArea.classList.remove('active')
    this.moveDirection = { x: 0, z: 0 }

    if (this.moveInterval) {
      clearInterval(this.moveInterval)
      this.moveInterval = null
    }

    // Stop movement callback with zero direction
    this.moveDirectionCallback({ x: 0, z: 0 })
  }

  checkPunchHit(side) {
    // Call the punch/damage logic from the main game
    if (window.getZombieInFront && typeof window.getZombieInFront === 'function') {
      const zombie = window.getZombieInFront()
      if (zombie && window.damageZombie) {
        window.damageZombie(zombie, 15)
        window.showMessage('Punch!')

        // Add haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(50)
      }
    }
  }

  show() {
    if (!this.isMobile) return
    this.isActive = true
    this.container.style.display = 'flex'
    document.body.classList.add('mobile-controls-active')
  }

  hide() {
    if (!this.isMobile) return
    this.isActive = false
    this.container.style.display = 'none'
    document.body.classList.remove('mobile-controls-active')
    if (this.longPressActive) this.stopMovement()
  }

  destroy() {
    if (this.container) this.container.remove()
    if (this.moveIndicator) this.moveIndicator.remove()
    document.body.classList.remove('mobile-controls-active')
  }
}

export default MobileControlsManager

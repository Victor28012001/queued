import * as THREE from 'three'
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/FBXLoader.js'
import * as SkeletonUtils from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/utils/SkeletonUtils.js'
import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js'
import { LevelLoader } from './LevelLoader.js'
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/PointerLockControls.js'
import { BODY_TYPES } from './BodyTypes.js'
import objectiveManager from './ObjectiveManager.js'

let scene,
  camera,
  renderer,
  gltfLoader,
  levelLoader,
  controls,
  mixers = []
const clock = new THREE.Clock()
const raycaster = new THREE.Raycaster()
const velocity = new THREE.Vector3()
const direction = new THREE.Vector3()
let moveForward = false,
  moveBackward = false,
  moveLeft = false,
  moveRight = false,
  canJump = false,
  sprint = false,
  crouch = false
let prevTime = performance.now()
const collisionObjects = []
const moveSpeed = 5,
  sprintMultiplier = 2,
  crouchMultiplier = 0.5,
  jumpSpeed = 40,
  gravity = 9.8
const standHeight = 1.7,
  crouchHeight = 0.9
let fpsArms
let fpsMixer
let actions = {}
let currentAction = null
let animationLocked = false
let paused = false
let loadingManager
let isLevelReady = false
let gameOver = false

let lastPunchTime = 0
const PUNCH_COOLDOWN = 0.6

// Player health system
let playerHealth = 100
const MAX_HEALTH = 100
const ZOMBIE_DAMAGE = 2 // per hit
const HEALTH_REGEN_DELAY = 5 // seconds without damage
let lastDamageTime = -Infinity

// Create audio context for Web Audio API
export const audioContext = new (window.AudioContext || window.webkitAudioContext)()

let currentLevelJson = null

let elevatorState = 'IDLE'
let elevatorDeathCheckTimeout = null

let escapeMode = false
let escapeTimer = 120

let isKnockedDown = false
let playerDisabled = false
let knockdownTween = null

let gunModel = null

let gunWobbleTime = 0
let gunKickback = 0
let gunKickbackVelocity = 0
const GUN_REST_POS = new THREE.Vector3(0.3, -0.25, -0.5)
const GUN_REST_ROT = new THREE.Euler(0, Math.PI, 0)
let lastShotTime = 0
const SHOOT_COOLDOWN = 0.8 // pump action reload time

const floatingItems = []

let mapOpen = false

let visitedRooms = new Set()

const zombies = []

const fbxLoader = new FBXLoader()

let stamina = 100
const MAX_STAMINA = 100
let isSprinting = false

const PLAYER_RADIUS = 0.4
const PLAYER_HEIGHT = 1.7
const PLAYER_MELEE_RADIUS = 0.9

const ZOMBIE_DAMAGE_COOLDOWN = 1.1 // seconds
const ZOMBIE_LUNGE_DISTANCE = 0.25
const ZOMBIE_PUSHBACK_FORCE = 0.15

const ZOMBIE_ATTACK_RANGE = 1.4
const ZOMBIE_DISENGAGE_RANGE = 1.8

const ZOMBIE_WALK_SPEED = 0.6
const ZOMBIE_RUN_SPEED = 4.5

const ZOMBIE_LOSE_INTEREST_TIME = 6.0 // seconds
const ZOMBIE_MEMORY_DISTANCE = 10 // how far they'll keep chasing

const ZOMBIE_RADIUS = 0.45
const ZOMBIE_HEIGHT = 1.6

let survivalTimerInterval = null

let zombie1Template = null
const zombieTemplates = {}
// let fbxAnimationClips = {};
const animationSets = {
  NORMAL: {}, // z8.fbx (Mixamo full body)
  CRAWLER: {}, // zombie1.fbx
}

const ZOMBIE_VIEW_DISTANCE = 6
const ZOMBIE_GROUP_ALERT_RADIUS = 5
const ZOMBIE_PATROL_RADIUS = 2
const ZOMBIE_PATROL_SPEED = 0.2

const ITEM_TYPES = {
  GREEN_HERB: { heal: 30 },
  RED_HERB: { heal: 0 },
  MEDKIT: { heal: 100 },
}

const gunshotSound = new Audio('./sounds/gunshot2.mp3')
gunshotSound.volume = 0.8

// ─── WEAPON STATE ─────────────────────────────
let hasGun = false
let usingGun = false

// const LEVEL_ORDER = ["floor3", "floor4", "floor5"];
const LEVEL_ORDER = ['floor0', 'floor1', 'floor2', 'floor3', 'floor4', 'floor5']

// ─── FLOOR 0 STATE ────────────────────────────
let isSeen = false
let cctvCamera = null
let cctvAngle = 0
let cctvRotationSpeed = 0.3 // radians per second
let cctvCheckInterval = null
let elevatorUnlockTimeout = null
let floor0ZombiesAwake = false
let playerInCCTVView = false
let seenTimer = 0 // how long player has been seen
const SEEN_REQUIRED_TIME = 10 // seconds of continuous visibility to trigger

let currentLevelIndex = 0
let gameInitialized = false

const INVENTORY_LIMIT = 6
let inventory = []

// init()
// loadLevel()

function init() {
  const gameContainer = document.getElementById('game-container')
  if (gameContainer) {
    gameContainer.style.display = 'block'
  }
  document.body.classList.add('game-active')

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  // camera = new THREE.PerspectiveCamera(
  //   75,
  //   window.innerWidth / window.innerHeight,
  //   0.01,
  //   1000,
  // );

  function createAdaptiveCamera() {
    const baseAspect = 9 / 16 // portrait reference
    const currentAspect = window.innerWidth / window.innerHeight

    let fov = 75

    if (currentAspect > 1) {
      // Wider than portrait → reduce FOV slightly
      fov = 75 * (baseAspect / currentAspect)
    }

    return new THREE.PerspectiveCamera(fov, currentAspect, 0.01, 1000)
  }

  camera = createAdaptiveCamera()

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  camera.position.set(-9.8, 1.7, -13) // Slightly in front
  camera.rotation.set(0, Math.PI, 0) // Looking into the scene

  controls = new PointerLockControls(camera, document.body)
  scene.add(controls.getObject())

  const loader = new THREE.TextureLoader()

  const peopleTexture = loader.load('./textures/peopleColors.png')
  const skinTexture = loader.load('./textures/arm.png')
  const zombie1Maps = {
    albedo: loader.load('./textures/zombie1.png'),
    overlay: loader.load('./textures/zombie1ii.png'),
    normal: loader.load('./textures/zombie1i.png'),
  }

  Object.values(zombie1Maps).forEach((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.flipY = false
  })
  peopleTexture.colorSpace = THREE.SRGBColorSpace
  peopleTexture.flipY = false // IMPORTANT for FBX
  skinTexture.colorSpace = THREE.SRGBColorSpace
  skinTexture.flipY = false // IMPORTANT for FBX

  const peopleMaterial = new THREE.MeshStandardMaterial({
    map: peopleTexture,
    roughness: 0.875,
    metalness: 0,
    side: THREE.DoubleSide,
  })

  const skinMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffd1b3),
    normalMap: skinTexture,
    roughness: 0.875,
    metalness: 0,
    side: THREE.DoubleSide,
  })

  const zombie1Material = new THREE.MeshStandardMaterial({
    map: zombie1Maps.albedo, // base color
    normalMap: zombie1Maps.normal, // purple bump map
    roughness: 0.85,
    metalness: 0.0,
  })
  zombie1Material.onBeforeCompile = (shader) => {
    shader.uniforms.overlayMap = { value: zombie1Maps.overlay }

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_pars_fragment>',
        `
      #include <map_pars_fragment>
      uniform sampler2D overlayMap;
      `,
      )
      .replace(
        '#include <map_fragment>',
        `
      #include <map_fragment>

      vec4 overlayColor = texture2D(overlayMap, vMapUv);
      diffuseColor.rgb = mix(diffuseColor.rgb, overlayColor.rgb, 0.5);
      `,
      )
  }

  const blocker = document.getElementById('blocker')
  const instructions = document.getElementById('instructions')
  instructions.addEventListener('click', () => controls.lock())
  controls.addEventListener('lock', () => {
    instructions.style.display = 'none'
    blocker.style.display = 'none'

    if (!actions['rig|Equip']) return

    playAction('rig|Equip', 0.1, THREE.LoopOnce)
    actions['rig|Equip'].clampWhenFinished = true

    fpsMixer.addEventListener('finished', (e) => {
      if (e.action === actions['rig|Equip']) {
        playAction('rig|Idle', 0.2)
      }
    })
  })
  controls.addEventListener('unlock', () => {
    blocker.style.display = ''
    instructions.style.display = ''

    if (!actions['rig|Unequip']) return

    playAction('rig|Unequip', 0.1, THREE.LoopOnce)
    actions['rig|Unequip'].clampWhenFinished = true
  })

  controls.getObject().position.set(-9.8, standHeight, -10)

  // gltfLoader = new GLTFLoader();

  loadingManager = new THREE.LoadingManager()

  loadingManager.onStart = () => {
    document.getElementById('loadingScreen').style.display = 'flex'
  }

  loadingManager.onLoad = () => {
    document.getElementById('loadingScreen').style.display = 'none'
    isLevelReady = true
  }

  loadingManager.onError = (url) => {
    console.error('Failed to load:', url)
  }

  gltfLoader = new GLTFLoader(loadingManager)

  gltfLoader.load('./models/fps_arm.glb', (gltf) => {
    // console.log(gltf.animations)
    fpsArms = gltf.scene

    fpsArms.traverse((child) => {
      if (child.isMesh) {
        child.material = skinMaterial
        child.material.needsUpdate = true
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    fpsArms.scale.set(0.25, 0.25, 0.25)
    fpsArms.position.set(0.01, -0.35, -0.032)
    fpsArms.rotation.set(0, Math.PI, 0)

    camera.add(fpsArms)
    updateCameraAndArms()

    fpsMixer = new THREE.AnimationMixer(fpsArms)

    gltf.animations.forEach((clip) => {
      console.log(clip.name)
      actions[clip.name] = fpsMixer.clipAction(clip)
    })

    mixers.push(fpsMixer)
  })

  // Load gun model once at init (add this inside init() after gltfLoader is set up)
  gltfLoader.load('./models/guns/pump_action1.glb', (gltf) => {
    gunModel = gltf.scene
    gunModel.scale.set(1, 1, 1) // adjust scale to fit view
    gunModel.position.set(0.3, -0.25, -0.5) // right side, slightly down, in front
    gunModel.rotation.set(0, Math.PI, 0)
    gunModel.visible = false // hidden until equipped
    camera.add(gunModel)
    console.log('Gun model loaded and attached to camera')
  })

  let fbxCenterOffset = new THREE.Vector3()

  const NORMAL_ZOMBIE_IDS = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8', 'z9', 'z10']

  NORMAL_ZOMBIE_IDS.forEach((id) => {
    fbxLoader.load(`./models/${id}.fbx`, (model) => {
      model.scale.setScalar(1.1)

      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())

      const offset = new THREE.Vector3(center.x, box.min.y, center.z)
      model.position.sub(offset)

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = peopleMaterial
          child.castShadow = true
          child.receiveShadow = true
        }
      })

      zombieTemplates[id] = model

      console.log(`Loaded ${id}`)
    })
  })

  // Load animations AFTER model is ready
  loadFBXAnimClip('./animations/Zombie_Idle.fbx', 'Idle', 'NORMAL')
  loadFBXAnimClip('./animations/Zombie_Walk.fbx', 'Walk', 'NORMAL')
  loadFBXAnimClip('./animations/Zombie_Running.fbx', 'Run', 'NORMAL')
  loadFBXAnimClip('./animations/Zombie_Attack.fbx', 'Attack', 'NORMAL')
  loadFBXAnimClip('./animations/Zombie_Biting.fbx', 'Bite', 'NORMAL')
  loadFBXAnimClip('./animations/Zombie_Crawl.fbx', 'Crawl', 'NORMAL')
  loadFBXAnimClip('./animations/Zombie_Dying.fbx', 'Dying', 'NORMAL')
  loadFBXAnimClip('./animations/Zombie_Hit.fbx', 'Hit', 'NORMAL')
  loadFBXAnimClip('./animations/Zombie_Neck_Bite.fbx', 'Neck_Bite', 'NORMAL')

  fbxLoader.load('./models/zombie1.fbx', (model) => {
    zombie1Template = model

    zombie1Template.scale.setScalar(0.6)

    zombie1Template.traverse((child) => {
      if (child.isMesh) {
        child.material = zombie1Material.clone()
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    // Load animations AFTER model is ready
    loadFBXAnimClip('./animations/Zombie_Biting.fbx', 'Bite', 'CRAWLER')
    loadFBXAnimClip('./animations/Zombie_Crawl.fbx', 'Crawl', 'CRAWLER')
    loadFBXAnimClip('./animations/Zombie_Sleeping_Idle1.fbx', 'Sleeping_Idle', 'CRAWLER')
  })

  levelLoader = new LevelLoader(scene, gltfLoader, 3.5, (mesh) => {
    collisionObjects.push(mesh)
  })

  // 2️⃣ Set the elevator ready callback
  levelLoader.onElevatorReady = () => {
    console.log('Elevator ready!')

    // ✅ floor0 has no entry sequence — player wakes up in the room, not the elevator
    if (LEVEL_ORDER[currentLevelIndex] === 'floor0') {
      isLevelReady = true
      return
    }

    const waitForLevel = () => {
      if (!isLevelReady || gameOver) {
        requestAnimationFrame(waitForLevel)
        return
      }

      console.log('Level ready — starting elevator')
      startEntryElevatorSequence()
    }

    waitForLevel()
  }

  // const light = new THREE.DirectionalLight(0xffffff, 1);
  // light.position.set(5, 10, 7.5);
  // scene.add(light);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.5)
  keyLight.position.set(5, 10, 7.5)
  scene.add(keyLight)

  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  // 🔥 Initialize footstep manager
  const footstepSounds = [new Audio('./sounds/st1.mp3'), new Audio('./sounds/st2.mp3')]
  footstepSounds.forEach((s) => {
    s.volume = 0.3
  })

  // 🔥 Initialize breathing sound manager
  const breathingSounds = [new Audio('./sounds/breathe-in.mp3'), new Audio('./sounds/breathe-out.mp3')]
  breathingSounds.forEach((s) => {
    s.volume = 0.2
  })

  // Expose to animate() scope
  window._footstepSounds = footstepSounds
  window._breathingSounds = breathingSounds
  window._footstepIndex = 0
  window._footstepTimer = 0
  window._wasRunning = false

  window._breathIndex = 0
  window._breathTimer = 0

  // These now match your short clips
  window._breathInterval = 0.6
  window._targetBreathInterval = 0.6

  window._breathVolume = 0.2
  window._targetBreathVolume = 0.2

  // Unlock audio on first click
  document.addEventListener(
    'click',
    () => {
      footstepSounds.forEach((s) => {
        s.play()
          .then(() => s.pause())
          .catch(() => {})
        s.currentTime = 0
      })
      breathingSounds.forEach((s) => {
        s.play()
          .then(() => s.pause())
          .catch(() => {})
        s.currentTime = 0
      })
    },
    { once: true },
  )

  animate()

  // At the end of init, load the level using currentLevelIndex
  loadLevel(currentLevelIndex)
}

function updateGunAnimation(delta) {
  if (!gunModel || !gunModel.visible) return

  const isMoving = moveForward || moveBackward || moveLeft || moveRight
  const isRunning = isSprinting && isMoving

  // ─── WOBBLE ───────────────────────────────────
  if (isMoving) {
    const wobbleSpeed = isRunning ? 14 : 8
    const wobbleAmtY = isRunning ? 0.04 : 0.018 // up/down
    const wobbleAmtX = isRunning ? 0.025 : 0.01 // side to side
    const wobbleAmtZ = isRunning ? 0.015 : 0.006 // tilt

    gunWobbleTime += delta * wobbleSpeed

    gunModel.position.set(
      GUN_REST_POS.x + Math.sin(gunWobbleTime * 0.5) * wobbleAmtX,
      GUN_REST_POS.y + Math.abs(Math.sin(gunWobbleTime)) * wobbleAmtY,
      GUN_REST_POS.z,
    )

    gunModel.rotation.set(
      GUN_REST_ROT.x + Math.sin(gunWobbleTime * 0.5) * wobbleAmtZ,
      GUN_REST_ROT.y,
      GUN_REST_ROT.z + Math.sin(gunWobbleTime * 0.5) * wobbleAmtZ,
    )
  } else {
    // Smoothly return to rest position
    gunWobbleTime = 0
    gunModel.position.lerp(GUN_REST_POS, delta * 10)
    gunModel.rotation.x = THREE.MathUtils.lerp(gunModel.rotation.x, GUN_REST_ROT.x, delta * 10)
    gunModel.rotation.z = THREE.MathUtils.lerp(gunModel.rotation.z, GUN_REST_ROT.z, delta * 10)
  }

  // ─── KICKBACK ─────────────────────────────────
  // Spring physics — kickback decays back to rest
  const springStiffness = 18
  const damping = 8

  gunKickbackVelocity -= gunKickback * springStiffness * delta
  gunKickbackVelocity -= gunKickbackVelocity * damping * delta
  gunKickback += gunKickbackVelocity * delta

  // Apply kickback on top of current position
  gunModel.position.z -= gunKickback * 0.08 // push back
  gunModel.rotation.x += gunKickback * 0.15 // tilt up
  gunModel.position.y += gunKickback * 0.03 // slight rise
}

function triggerGunKickback() {
  gunKickback = 1.0 // instant kick
  gunKickbackVelocity = 0 // reset velocity so spring takes over

  // Camera recoil
  shakeCamera(0.04, 80)
}

function updateCameraAndArms() {
  const baseAspect = 9 / 16
  const aspect = window.innerWidth / window.innerHeight

  if (aspect > 1) {
    camera.fov = 75 * (baseAspect / aspect)

    if (fpsArms) {
      fpsArms.position.set(0.01, -0.35, -0.05)
    }
  } else {
    camera.fov = 75

    if (fpsArms) {
      fpsArms.position.set(0.01, -0.35, -0.032) // your original
    }
  }

  camera.aspect = aspect
  camera.updateProjectionMatrix()
}

function showMessage(message) {
  const msgElement = document.createElement('div')
  msgElement.className = 'message'
  msgElement.innerText = message
  document.body.appendChild(msgElement)

  setTimeout(() => {
    msgElement.remove()
  }, 3000)
}

function areNormalAnimationsReady() {
  const a = animationSets.NORMAL
  return a.Idle && a.Walk && a.Attack
}

// Helper to switch animations cleanly
function playAction(name, fade = 0.2, loop = THREE.LoopRepeat, lock = false) {
  const action = actions[name]
  if (!action || currentAction === action) return

  if (animationLocked && !lock) return

  action.reset().setLoop(loop).fadeIn(fade).play()

  if (currentAction) {
    currentAction.fadeOut(fade)
  }

  currentAction = action

  if (loop === THREE.LoopOnce && fpsMixer) {
    animationLocked = true
    action.clampWhenFinished = true

    fpsMixer.addEventListener('finished', function onFinish(e) {
      if (e.action === action) {
        animationLocked = false
        fpsMixer.removeEventListener('finished', onFinish)
        playAction('rig|Idle', 0.2)
      }
    })
  }
}

function loadFBXAnimClip(path, name, set) {
  fbxLoader.load(path, (anim) => {
    animationSets[set][name] = anim.animations[0]
  })
}

function playWakeupSequence(onComplete) {
  isKnockedDown = true
  playerDisabled = true

  // Start flat on the ground looking up
  const cam = controls.getObject()

  // ✅ Lying on side — low to ground, rolled 90° sideways, slight downward pitch
  cam.position.y = 0.25
  cam.rotation.x = -0.15 // very slight downward look (not face-down)
  cam.rotation.z = Math.PI / 2 // ✅ rolled 90° sideways = lying on side

  showMessage('...')

  // Phase 1: Inspect (look around while lying)
  setTimeout(() => {
    showMessage('What happened to me...')
    playAction('rig|Inspect', 0.2, THREE.LoopOnce, true)
  }, 3500)

  // Phase 2: Rise up — reverse of knockdown
  setTimeout(() => {
    showMessage('I need to get up.')

    new TWEEN.Tween({
      pitch: cam.rotation.x,
      roll: cam.rotation.z,
      y: cam.position.y,
    })
      .to({ pitch: 0, roll: 0, y: standHeight }, 2000)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate((v) => {
        cam.rotation.x = v.pitch
        cam.rotation.z = v.roll
        cam.position.y = v.y
      })
      .onComplete(() => {
        isKnockedDown = false
        playerDisabled = false
        playAction('rig|Idle', 0.3)
        onComplete?.()
      })
      .start()
  }, 7000)
}

function setupCCTV(position) {
  // Visual CCTV camera mesh
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x222222 }))
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111 }),
  )
  lens.rotation.x = Math.PI / 2
  lens.position.z = 0.25
  body.add(lens)

  // Red indicator light
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.04),
    new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2,
    }),
  )
  light.position.set(0.1, 0.08, 0.15)
  body.add(light)

  // Cone representing the CCTV view frustum (visible for debug, make invisible later)
  const viewCone = new THREE.Mesh(
    new THREE.ConeGeometry(2, 6, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffff00,
      wireframe: true,
      visible: false,
    }),
  )
  viewCone.rotation.x = -Math.PI / 2
  viewCone.position.z = 3
  body.add(viewCone)
  body.userData.viewCone = viewCone

  body.position.set(...position)
  body.position.y = 3.2 // mount on ceiling/wall
  scene.add(body)

  cctvCamera = body
  cctvAngle = 0

  // showMessage("Find the CCTV camera. Stay in its view.");
}

function updateCCTV(delta) {
  if (!cctvCamera || isSeen || floor0ZombiesAwake) return

  // Rotate CCTV back and forth
  cctvAngle += delta * cctvRotationSpeed
  cctvCamera.rotation.y = Math.sin(cctvAngle) * (Math.PI / 3) // ±60 degrees sweep

  // Check if player is in CCTV view cone
  const cctvWorldDir = new THREE.Vector3(0, 0, 1).applyQuaternion(cctvCamera.quaternion)

  const toPlayer = controls.getObject().position.clone().sub(cctvCamera.position)

  const distToCctv = toPlayer.length()

  if (distToCctv > 12) {
    playerInCCTVView = false
    seenTimer = 0
    return
  }

  toPlayer.normalize()

  const dot = cctvWorldDir.dot(toPlayer)
  const inView = dot > 0.7 // ~45 degree cone

  if (inView) {
    playerInCCTVView = true
    seenTimer += delta

    // Flash message every 2 seconds
    if (Math.floor(seenTimer) % 2 === 0 && Math.floor(seenTimer) !== Math.floor(seenTimer - delta)) {
      showMessage(`Stay in view... ${Math.ceil(SEEN_REQUIRED_TIME - seenTimer)}s`)
    }

    if (seenTimer >= SEEN_REQUIRED_TIME) {
      triggerSeen()
    }
  } else {
    if (playerInCCTVView) {
      showMessage("Stay in the camera's view!")
    }
    playerInCCTVView = false
    seenTimer = Math.max(0, seenTimer - delta * 2) // drain faster than it fills
  }
}

function triggerSeen() {
  if (isSeen) return
  isSeen = true

  showMessage('They saw you! The elevator is being opened...')

  // Loud elevator noise wakes zombies after a delay
  setTimeout(() => {
    wakeFloor0Zombies()
  }, 3000)

  // Open elevator after 5 seconds
  elevatorUnlockTimeout = setTimeout(() => {
    triggerElevatorOpen()
  }, 5000)
}

function wakeFloor0Zombies() {
  if (floor0ZombiesAwake) return
  floor0ZombiesAwake = true

  showMessage('The noise woke them up! RUN!')

  const alarmSound = new Audio('./sounds/elevator_ding.mp3')
  alarmSound.volume = 1.0
  alarmSound.play().catch(() => {})

  zombies.forEach((zombie) => {
    if (zombie.isDead) return

    const delay = Math.random() * 2000
    setTimeout(() => {
      // ✅ Clear sleeping flag so updateZombies AI takes over
      zombie.isSleeping = false
      zombie.alerted = true
      zombie.state = 'CHASE'
      zombie.lastSeenTime = performance.now() / 1000
      zombie.lastSeenPos.copy(controls.getObject().position)

      // ✅ Transition from Sleeping_Idle to Crawl
      zombie.currentAction?.fadeOut(0.4)
      if (zombie.actions['Crawl']) {
        zombie.actions['Crawl'].reset().setLoop(THREE.LoopRepeat).fadeIn(0.4).play()
        zombie.currentAction = zombie.actions['Crawl']
      }
    }, delay)
  })
}

function useHealingItem(item) {
  playerHealth += ITEM_TYPES[item.type].heal
  playerHealth = Math.min(MAX_HEALTH, playerHealth)
  removeFromInventory(item)
}

function toggleMapUI(open) {
  console.log('Map toggled:', open)
}

function spawnFBXZombie(position, animationName, template, type) {
  if (!template) return

  const zombie = SkeletonUtils.clone(template)

  // 🔹 Center the model at origin
  const box = new THREE.Box3().setFromObject(zombie)
  const center = box.getCenter(new THREE.Vector3())
  const offset = new THREE.Vector3(center.x, box.min.y, center.z)
  zombie.position.set(...position).sub(offset) // apply position and center

  scene.add(zombie)

  const mixer = new THREE.AnimationMixer(zombie)
  mixers.push(mixer)

  const actions = {}
  const clips = animationSets[type]
  if (!clips || !Object.keys(clips).length) {
    console.warn('Animations not ready for', type)
    return
  }

  for (const name in clips) {
    let clip = clips[name]

    if (name === 'Sleeping_Idle') {
      clip = removeRootMotionSleeping(clip) // ✅ strip ALL root motion
    } else if (name === 'Hit' || name === 'Attack' || name === 'Bite') {
      clip = removeRootMotionY(clip)
    }

    actions[name] = mixer.clipAction(clip)
  }

  if (actions[animationName]) {
    actions[animationName].reset().play()
  } else {
    console.warn('Missing animation:', animationName, 'for', type)
  }

  // 🔹 Optional: add invisible hitbox for raycasting
  const hitboxHeight = box.max.y - box.min.y
  const hitboxRadius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2
  const hitbox = new THREE.Mesh(
    new THREE.CapsuleGeometry(hitboxRadius, hitboxHeight, 4, 6),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  hitbox.position.y = hitboxHeight / 2
  zombie.add(hitbox)
  zombie.userData.hitbox = hitbox // store reference for raycasting

  zombies.push({
    model: zombie,
    mixer,
    actions,
    currentAction: actions[animationName],
    type,
    lastAttackTime: -Infinity,
    isAttacking: false,

    // 🧠 AI state
    state: 'PATROL',
    alerted: false,

    patrolOrigin: zombie.position.clone(),
    patrolDir: new THREE.Vector3(Math.random() < 0.5 ? 1 : -1, 0, Math.random() < 0.5 ? 1 : -1).normalize(),
    chaseOffset: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8),
    lastSeenTime: -Infinity,
    lastSeenPos: new THREE.Vector3(),
    patrolMode: Math.random() < 0.5 ? 'IDLE' : 'WALK',
    isAnimationLocked: false,
    health: zombie.type === 'CRAWLER' ? 40 : 100,
    isDead: false,
    isPlayingHit: false,
  })
}

function isPointInsideElevator(pos) {
  const elevator = levelLoader.elevatorModel
  if (!elevator) return false

  const box = new THREE.Box3().setFromObject(elevator)

  // Slight safety margin
  box.expandByScalar(-0.2)

  return box.containsPoint(pos)
}

function playZombieHit(zombie) {
  if (!zombie.actions['Hit']) return

  // 🔒 Prevent replay if already playing hit
  if (zombie.isPlayingHit) return

  zombie.isPlayingHit = true
  zombie.isAnimationLocked = true // lock animation

  zombie.currentAction?.fadeOut(0.1)

  const hitAction = zombie.actions['Hit']
  hitAction.reset().setLoop(THREE.LoopOnce).fadeIn(0.1).play()
  zombie.currentAction = hitAction

  zombie.mixer.addEventListener('finished', function onFinish(e) {
    if (e.action === hitAction) {
      zombie.mixer.removeEventListener('finished', onFinish)

      zombie.isAnimationLocked = false // unlock after finished
      zombie.isPlayingHit = false

      // Force Y back to ground
      zombie.model.position.y = 0

      // Return to proper state animation
      if (zombie.state === 'PATROL') {
        zombie.actions['Idle']?.reset().fadeIn(0.2).play()
        zombie.currentAction = zombie.actions['Idle']
      }

      if (zombie.state === 'CHASE') {
        zombie.actions['Walk']?.reset().fadeIn(0.2).play()
        zombie.currentAction = zombie.actions['Walk']
      }
    }
  })
}

function damageZombie(zombie, amount) {
  if (zombie.isDead) return
  if (zombie.isPlayingHit) return

  zombie.health -= amount
  console.log('Zombie HP:', zombie.health)

  if (zombie.health <= 0) {
    killZombie(zombie)
  } else {
    playZombieHit(zombie)
  }
}

function killZombie(zombie) {
  if (zombie.isDead) return
  zombie.isDead = true

  zombie.state = 'DEAD'
  zombie.isAttacking = false
  zombie.isAnimationLocked = true

  zombie.currentAction?.stop()

  const dieAnim = zombie.actions['Dying']
  if (dieAnim) {
    dieAnim.reset().setLoop(THREE.LoopOnce).fadeIn(0.1).play()

    zombie.mixer.addEventListener('finished', function onDeath(e) {
      if (e.action === dieAnim) {
        zombie.mixer.removeEventListener('finished', onDeath)
        removeZombie(zombie)

        // Check if all zombies are dead for CLEAR_ZOMBIES objective
        if (objectiveManager.current?.type === 'CLEAR_ZOMBIES') {
          const alive = zombies.filter((z) => !z.isDead).length
          objectiveManager.update('CLEAR_ZOMBIES', alive)
        }
      }
    })
  } else {
    removeZombie(zombie)

    // Check if all zombies are dead for CLEAR_ZOMBIES objective
    if (objectiveManager.current?.type === 'CLEAR_ZOMBIES') {
      const alive = zombies.filter((z) => !z.isDead).length
      objectiveManager.update('CLEAR_ZOMBIES', alive)
    }
  }

  // Check for boss kill
  if (zombie.isBoss) {
    objectiveManager.update('TARGET_KILLED')
    escapeMode = true
  }
}

function removeZombie(zombie) {
  // Remove from scene
  scene.remove(zombie.model)

  // Stop mixer
  zombie.mixer.stopAllAction()

  // Remove from array
  const index = zombies.indexOf(zombie)
  if (index !== -1) zombies.splice(index, 1)
}

function endGame(reason) {
  if (gameOver) return
  gameOver = true

  if (elevatorDeathCheckTimeout) {
    clearTimeout(elevatorDeathCheckTimeout)
    elevatorDeathCheckTimeout = null
  }

  console.warn('GAME OVER:', reason)

  paused = true
  controls.unlock()

  // Stop all animations
  mixers.forEach((m) => {
    m.timeScale = 0 // ⏸️ freeze animation at current pose
  })

  // Show UI
  const overlay = document.getElementById('gameOverOverlay')
  if (overlay) {
    overlay.style.display = 'flex'
    overlay.style.flexDirection = 'column'
    const reasonEl = overlay.querySelector('.reason')
    if (reasonEl) {
      reasonEl.textContent = reason
    } else {
      console.warn('Game over reason element missing:', reason)
    }
  }
}

function playDeathKnockdown(duration = 1200) {
  if (isKnockedDown || gameOver) return

  isKnockedDown = true
  playerDisabled = true

  playAction('rig|Inspect', 0.05, THREE.LoopOnce, true)

  const cam = controls.getObject()
  const startPitch = cam.rotation.x
  const startRoll = cam.rotation.z

  new TWEEN.Tween({ pitch: startPitch, roll: startRoll })
    .to(
      {
        pitch: startPitch - Math.PI / 2.2, // fall flat
        roll: 0,
      },
      duration,
    )
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate((v) => {
      cam.rotation.x = THREE.MathUtils.clamp(v.pitch, -Math.PI / 2, Math.PI)
      cam.rotation.z = v.roll
      cam.position.y = 0.4
    })
    .onComplete(() => {
      // Short delay for dramatic pause
      setTimeout(() => {
        endGame('You were overwhelmed by zombies.')
      }, 1000)
    })
    .start()
}

function areCrawlerAnimationsReady() {
  return animationSets.CRAWLER.Crawl && animationSets.CRAWLER.Bite && animationSets.CRAWLER.Sleeping_Idle
}

function zombieCanSeePlayer(zombie, playerPos) {
  const dx = zombie.model.position.x - playerPos.x
  const dz = zombie.model.position.z - playerPos.z
  const dist = Math.sqrt(dx * dx + dz * dz)
  return dist <= ZOMBIE_VIEW_DISTANCE
}

function alertNearbyZombies(sourceZombie) {
  zombies.forEach((z) => {
    if (z.alerted) return

    const d = z.model.position.distanceTo(sourceZombie.model.position)
    if (d <= ZOMBIE_GROUP_ALERT_RADIUS) {
      z.alerted = true
      z.state = 'CHASE'
    }
  })
}

function resolveCapsuleCollisions(position, radius, height, colliders) {
  const bottom = position.clone()
  const top = position.clone()
  top.y += height

  for (const obj of colliders) {
    if (!obj.geometry?.boundingBox) continue
    if (!obj.userData.collidable) continue // ✅ ADD THIS
    if (obj.userData.isFloor) continue // ✅ ADD THIS

    const box = obj.geometry.boundingBox.clone()
    box.applyMatrix4(obj.matrixWorld)

    // Clamp capsule center to box
    const closest = new THREE.Vector3(
      THREE.MathUtils.clamp(position.x, box.min.x, box.max.x),
      THREE.MathUtils.clamp(position.y + height * 0.5, box.min.y, box.max.y),
      THREE.MathUtils.clamp(position.z, box.min.z, box.max.z),
    )

    const delta = position.clone().sub(closest)
    delta.y = 0

    const dist = delta.length()
    if (dist > 0 && dist < radius) {
      delta.normalize()
      position.add(delta.multiplyScalar(radius - dist))
    }
  }
}

function onKeyDown(event) {
  switch (event.code) {
    case 'KeyW':
      moveForward = true
      break
    case 'KeyA':
      moveLeft = true
      break
    case 'KeyS':
      moveBackward = true
      break
    case 'KeyD':
      moveRight = true
      break
    case 'ShiftLeft':
      sprint = true
      break
    case 'ControlLeft':
      crouch = true
      break
    case 'Space':
      if (canJump) {
        velocity.y += jumpSpeed
        canJump = false
      }
      break
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'KeyW':
      moveForward = false
      break
    case 'KeyA':
      moveLeft = false
      break
    case 'KeyS':
      moveBackward = false
      break
    case 'KeyD':
      moveRight = false
      break
    case 'ShiftLeft':
      sprint = false
      break
    case 'ControlLeft':
      crouch = false
      break
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC') {
    if (gameOver || paused || !controls.isLocked) return

    const gun = getGunInRange()

    if (!gun) {
      showMessage('No weapon nearby')
      return
    }

    // Play take sequence: Start → Loop → Stop
    playAction('rig|Take_Start', 0.05, THREE.LoopOnce, true)

    fpsMixer.addEventListener('finished', function onTakeStart(e) {
      if (e.action !== actions['rig|Take_Start']) return
      fpsMixer.removeEventListener('finished', onTakeStart)

      playAction('rig|Take_Loop', 0.1, THREE.LoopOnce, true)

      fpsMixer.addEventListener('finished', function onTakeLoop(e) {
        if (e.action !== actions['rig|Take_Loop']) return
        fpsMixer.removeEventListener('finished', onTakeLoop)

        playAction('rig|Take_Stop', 0.05, THREE.LoopOnce, true)

        fpsMixer.addEventListener('finished', function onTakeStop(e) {
          if (e.action !== actions['rig|Take_Stop']) return
          fpsMixer.removeEventListener('finished', onTakeStop)

          scene.remove(gun)
          pickupGun()
          playAction('rig|Idle', 0.2)
        })
      })
    })
  }
})

document.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') {
    e.preventDefault()
    if (!hasGun || !gunModel) return

    usingGun = !usingGun
    updateWeaponUI()

    if (usingGun) {
      // Hide arms, show gun
      playAction('rig|Unequip', 0.15, THREE.LoopOnce, true)
      fpsMixer.addEventListener('finished', function onUnequip(e) {
        if (e.action !== actions['rig|Unequip']) return
        fpsMixer.removeEventListener('finished', onUnequip)
        fpsArms.visible = false
        gunModel.visible = true
      })
    } else {
      // Hide gun, show arms
      gunModel.visible = false
      fpsArms.visible = true
      playAction('rig|Equip', 0.15, THREE.LoopOnce, true)
      fpsMixer.addEventListener('finished', function onEquip(e) {
        if (e.action !== actions['rig|Equip']) return
        fpsMixer.removeEventListener('finished', onEquip)
        playAction('rig|Idle', 0.2)
      })
    }

    showMessage(usingGun ? 'Shotgun equipped' : 'Switched to fists')
  }
})

function getGunInRange() {
  const playerPos = controls.getObject().position
  const PICKUP_RADIUS = 12

  const camDir = new THREE.Vector3()
  camera.getWorldDirection(camDir)
  raycaster.set(playerPos, camDir)
  raycaster.far = PICKUP_RADIUS

  const hits = raycaster.intersectObjects(scene.children, true)
  for (const hit of hits) {
    let obj = hit.object

    // Walk up from hit mesh — check mesh name OR userData itemType
    while (obj) {
      if (obj.userData?.itemType === 'GUN' || ['Object_44', 'Object_45', 'Object_47', 'Object_48'].includes(obj.name)) {
        // Walk up to the root model so we remove the whole gun
        let root = obj
        while (root.parent && root.parent !== scene) root = root.parent
        return root
      }

      // ✅ Generic pickup
      if (obj.userData?.pickup && obj.userData?.itemType !== 'GUN') {
        const type = obj.userData.itemType
        if (addToInventory({ type })) {
          scene.remove(obj)
          showMessage('Picked up ' + type)
        }
        return
      }

      // ✅ Check keycard first — most specific
      if (obj.userData?.isKeycard) {
        scene.remove(obj)
        const idx = floatingItems.indexOf(obj)
        if (idx !== -1) floatingItems.splice(idx, 1)
        showMessage('Keycard found! The elevator is now unlocked.')
        objectiveManager.update('KEYCARD_PICKED_UP')
        return
      }
      obj = obj.parent
    }
  }

  // Fallback — proximity search
  let closest = null
  let closestDist = PICKUP_RADIUS

  scene.traverse((obj) => {
    if (obj.userData?.itemType !== 'GUN' && !['Object_44', 'Object_45', 'Object_47', 'Object_48'].includes(obj.name))
      return
    const d = obj.position.distanceTo(playerPos)
    if (d < closestDist) {
      closestDist = d
      // Walk up to root
      let root = obj
      while (root.parent && root.parent !== scene) root = root.parent
      closest = root
    }
  })

  return closest
}

function pickupGun() {
  hasGun = true
  showMessage('Pump-action shotgun acquired! Press TAB to switch weapons.')
  updateWeaponUI()
}

function updateWeaponUI() {
  const el = document.getElementById('weaponDisplay')
  if (!el) return
  el.textContent = usingGun ? '🔫 Shotgun' : '👊 Fists'
}

function updateLevelDisplay() {
  const el = document.getElementById('currentFloor')
  if (el) {
    el.textContent = currentLevelIndex + 1
  }
}

// Call this when level changes
function advanceToNextLevel() {
  if (currentLevelIndex >= LEVEL_ORDER.length - 1) {
    endGame('You Escaped the Facility! Congratulations!')
    return
  }

  currentLevelIndex++
  updateLevelDisplay()

  console.log('Loading next level:', LEVEL_ORDER[currentLevelIndex])
  loadLevel(currentLevelIndex)
}

function loadLevel(levelIndex = null) {
  // If levelIndex is provided, update currentLevelIndex
  if (levelIndex !== null && levelIndex >= 0 && levelIndex < LEVEL_ORDER.length) {
    currentLevelIndex = levelIndex
  }

  const levelId = LEVEL_ORDER[currentLevelIndex]
  console.log(`Loading level: ${levelId} (index: ${currentLevelIndex})`)

  // Show loading screen
  document.getElementById('loadingScreen').style.display = 'flex'

  fetch(`/levels/${levelId}.json`)
    .then((res) => res.json())
    .then((json) => {
      currentLevelJson = json

      // Clear previous level first
      clearCurrentLevel()

      // Load new level
      levelLoader.loadLevel(json, json.id)
      setupLevelObjective(json.id)

      // Find elevator1 room for start position
      const isFloor0 = json.id === 'floor0'
      const elevator = !isFloor0 && json.rooms.find((r) => r.id === 'elevator1')

      if (elevator) {
        controls.getObject().position.set(elevator.position[0], standHeight, elevator.position[2])
        console.log('Player positioned at elevator:', elevator.position)
      } else {
        // floor0 uses target [0, 0, 40] — south end of hall among sleeping zombies
        const startPos = json.target || [0, standHeight, 40]
        controls
          .getObject()
          .position.set(
            Array.isArray(startPos) ? startPos[0] : startPos,
            standHeight,
            Array.isArray(startPos) ? startPos[2] : 40,
          )
        console.log('Player positioned at target:', startPos)
      }

      isLevelReady = true

      // Spawn zombies based on level
      spawnZombiesForLevel(json)

      // Hide loading screen after a short delay
      setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none'
      }, 500)
    })
    .catch((error) => {
      console.error('Failed to load level:', error)
      endGame('Failed to load level')
    })
}

function spawnZombiesForLevel(levelJson) {
  const levelId = levelJson.id // This will be "level1", "level2", etc.

  // Clear existing zombies first
  zombies.forEach((z) => {
    scene.remove(z.model)
    z.mixer.stopAllAction()
  })
  zombies.length = 0

  // Wait for templates to be ready
  const checkTemplates = setInterval(() => {
    const templatesReady = areNormalZombiesReady()
    const crawlerReady = areCrawlerAnimationsReady()

    if (levelId === 'level4') {
      // Changed from "floor4" to "level4"
      // Boss level - only spawn boss
      if (templatesReady) {
        clearInterval(checkTemplates)
        spawnBoss([0, 0, 0])
      }
    } else if (levelId === 'level1') {
      // Changed from "floor1" to "level1"
      // Crawler level
      if (crawlerReady && zombie1Template) {
        clearInterval(checkTemplates)
        for (let i = 0; i < 28; i++) {
          spawnFBXZombie(
            [-2 + i * 1.8 + (Math.random() - 0.5) * 0.6, 0, -2 + i * 2.5 + (Math.random() - 0.5) * 8],
            'Crawl', // Make sure this matches your animation name
            zombie1Template,
            'CRAWLER',
          )
        }
        console.log('Spawned 12 crawler zombies for level1')
      }
    } else if (levelId === 'floor0') {
      if (crawlerReady && zombie1Template) {
        clearInterval(checkTemplates)

        for (let i = 0; i < 50; i++) {
          const x = THREE.MathUtils.randFloat(-13, 13)
          const z = THREE.MathUtils.randFloat(-42, 35)

          spawnFBXZombie([x, 0.3, z], 'Sleeping_Idle', zombie1Template, 'CRAWLER')

          const z2 = zombies[zombies.length - 1]
          z2.state = 'PATROL'
          z2.alerted = false
          z2.patrolDir.set(0, 0, 0)
          z2.patrolMode = 'IDLE'
          z2.isSleeping = true // ✅ flag

          z2.model.position.y = 0.3
          z2.model.rotation.y = Math.random() * Math.PI * 2

          // ✅ Force Sleeping_Idle animation explicitly
          if (z2.actions['Sleeping_Idle']) {
            z2.currentAction?.stop()
            z2.actions['Sleeping_Idle'].reset().setLoop(THREE.LoopRepeat).play()
            z2.currentAction = z2.actions['Sleeping_Idle']
          } else {
            console.warn('Sleeping_Idle action NOT found on zombie')
          }
        }
      }
    } else {
      // Normal zombie levels (level2, level3, level5)
      if (templatesReady) {
        clearInterval(checkTemplates)
        const zombieCount = getZombieCountForLevel(levelId)

        for (let i = 0; i < zombieCount; i++) {
          const pos = getRandomOutdoorPosition(levelJson)
          spawnFBXZombie(pos, 'Idle', getRandomNormalZombieTemplate(), 'NORMAL')
        }
        console.log(`Spawned ${zombieCount} normal zombies for ${levelId}`)
      }
    }
  }, 100)
}

function getZombieCountForLevel(levelId) {
  switch (levelId) {
    case 'level2':
      return 20 // was "floor2"
    case 'level3':
      return 25 // was "floor3"
    case 'level5':
      return 30 // was "floor5"
    default:
      return 15
  }
}

function clearCurrentLevel() {
  if (survivalTimerInterval) {
    clearInterval(survivalTimerInterval)
    survivalTimerInterval = null
  }
  floatingItems.length = 0
  elevatorState = 'IDLE'
  // Remove zombies
  zombies.forEach((z) => {
    scene.remove(z.model)
    if (z.mixer) {
      z.mixer.stopAllAction()
    }
  })
  zombies.length = 0

  // ✅ Clear entire level in one call
  levelLoader.clear()

  // Clear collisions
  collisionObjects.length = 0

  // Reset visited rooms
  visitedRooms.clear()

  // Reset escape mode
  escapeMode = false
  escapeTimer = 120

  // Reset player state
  playerHealth = MAX_HEALTH
  isKnockedDown = false
  playerDisabled = false
  updateHealthVignette()

  isSeen = false
  cctvCamera = null
  cctvAngle = 0
  floor0ZombiesAwake = false
  playerInCCTVView = false
  seenTimer = 0

  if (elevatorUnlockTimeout) {
    clearTimeout(elevatorUnlockTimeout)
    elevatorUnlockTimeout = null
  }

  // ✅ Remove CCTV mesh directly (added in main.js not LevelLoader)
  if (cctvCamera) {
    scene.remove(cctvCamera)
    cctvCamera = null
  }
}

function setupLevelObjective(levelId) {
  // The onComplete callback triggers the elevator sequence
  const onObjectiveComplete = () => {
    showMessage('Objective complete! Find the elevator.')
    triggerElevatorOpen()
    // Elevator sequence starts when player reaches it (your existing flow)
    // OR you can auto-trigger it here if you prefer auto-open
  }

  switch (levelId) {
    case 'floor0':
      objectiveManager.setObjective(
        {
          type: 'BE_SEEN',
          description: 'Find the CCTV camera and stay in its view.',
        },
        () => {}, // elevator open is handled by triggerSeen
      )

      // Start wakeup sequence, then setup CCTV
      playWakeupSequence(() => {
        showMessage('I remember being in some kind of medical facility.')
        setTimeout(() => {
          showMessage('What Do I Do Now?')
        }, 3000)
      })

      // Setup CCTV at center of level
      setTimeout(() => {
        setupCCTV([0, 3.2, 0])
      }, 500)
      break
    case 'level1':
      objectiveManager.setObjective(
        {
          type: 'CLEAR_ZOMBIES',
          description: 'Eliminate all crawlers on this floor.',
        },
        onObjectiveComplete,
      )
      break

    case 'level2':
      objectiveManager.setObjective(
        {
          type: 'SURVIVE_TIMER',
          description: 'Survive the ward for 90 seconds.',
        },
        onObjectiveComplete,
      )
      startSurvivalTimer(90) // see below
      break

    case 'level3':
      objectiveManager.setObjective(
        { type: 'FIND_KEYCARD', description: 'Find the research keycard.' },
        onObjectiveComplete,
      )
      spawnKeycard() // see below
      break

    case 'level4':
      objectiveManager.setObjective(
        { type: 'KILL_TARGET', description: 'Defeat the mutated boss.' },
        onObjectiveComplete,
      )
      break

    case 'level5':
      objectiveManager.setObjective(
        { type: 'ESCAPE', description: 'Reach the exit before time runs out!' },
        onObjectiveComplete,
      )
      escapeMode = true
      escapeTimer = 120
      break
  }
}

function startEntryElevatorSequence() {
  if (gameOver) return

  const controller = levelLoader.elevatorController
  if (!controller) return

  const { action, duration } = controller
  const exitTime = 8 // seconds to leave

  // Open doors
  elevatorState = 'ENTRY_OPENING'
  action.reset()
  action.play()

  const openPauseTime = duration * 0.5 * 1000

  setTimeout(() => {
    if (gameOver) return

    // Doors fully open — pause animation, start countdown
    action.paused = true
    elevatorState = 'ENTRY_OPEN'

    showMessage('Get out of the elevator!')
    startCountdown(exitTime, () => {
      if (gameOver) return

      // Countdown done — close doors
      action.paused = false
      elevatorState = 'ENTRY_CLOSING'

      setTimeout(
        () => {
          if (gameOver) return

          elevatorState = 'IDLE' // ready for objective re-open later

          // If player never left → game over
          if (isPlayerInsideElevator()) {
            endGame('You failed to leave the elevator in time.')
          }
        },
        duration * 0.5 * 1000,
      )
    })
  }, openPauseTime)
}

function triggerElevatorOpen() {
  if (gameOver) return

  const controller = levelLoader.elevatorController
  if (!controller) {
    console.warn('No elevator controller — cannot open')
    return
  }

  // Only open from IDLE (entry sequence must be fully done)
  if (elevatorState !== 'IDLE') {
    console.warn('Elevator not ready, state:', elevatorState)
    return
  }

  const { action, duration } = controller

  elevatorState = 'EXIT_OPENING'
  action.reset()
  action.play()

  const openPauseTime = duration * 0.5 * 1000

  setTimeout(() => {
    if (gameOver) return
    action.paused = true
    elevatorState = 'WAITING' // checkPlayerInElevator() watches for this
    showMessage('Elevator is open — get in!')
  }, openPauseTime)
}

function checkPlayerInElevator() {
  if (elevatorState !== 'WAITING') return
  if (!isPlayerInsideElevator()) return

  const controller = levelLoader.elevatorController
  if (!controller) return

  const { action, duration } = controller

  elevatorState = 'EXIT_CLOSING'
  action.paused = false
  showMessage('Doors closing...')

  elevatorDeathCheckTimeout = setTimeout(
    () => {
      if (gameOver) return
      elevatorState = 'DONE'
      advanceToNextLevel()
    },
    duration * 0.5 * 1000,
  )
}

function isPlayerInsideElevator() {
  const elevator = levelLoader.elevatorModel
  if (!elevator) return false

  const playerPos = controls.getObject().position

  // World-space bounding box
  const box = new THREE.Box3().setFromObject(elevator)

  // Slight margin so player isn't punished unfairly
  const margin = 0.2
  box.expandByScalar(-margin)

  const inside = box.containsPoint(playerPos)

  return inside
}

function startCountdown(seconds, onDone) {
  const el = document.getElementById('elevatorTimer')
  if (!el) {
    onDone()
    return
  }

  el.style.display = 'block'
  let remaining = seconds
  el.textContent = `Leave elevator: ${remaining}s`

  const interval = setInterval(() => {
    remaining--
    el.textContent = `Leave elevator: ${remaining}s`

    if (remaining <= 0) {
      clearInterval(interval)
      el.style.display = 'none'
      onDone()
    }
  }, 1000)
}

function startSurvivalTimer(seconds) {
  if (survivalTimerInterval) clearInterval(survivalTimerInterval)

  let remaining = seconds

  survivalTimerInterval = setInterval(() => {
    if (gameOver || paused) return

    remaining--

    // Reuse objective UI to show countdown
    const el = document.getElementById('objectiveDisplay')
    if (el) el.textContent = `Survive: ${remaining}s remaining`

    // Escalate zombie spawns as timer runs down
    if (remaining % 15 === 0 && remaining > 0) {
      const count = Math.floor((seconds - remaining) / 15) + 1
      for (let i = 0; i < count; i++) {
        const pos = getRandomOutdoorPosition(currentLevelJson)
        spawnFBXZombie(pos, 'Idle', getRandomNormalZombieTemplate(), 'NORMAL')
      }
      showMessage(`Wave incoming! (${Math.floor((seconds - remaining) / 15) + 1})`)
    }

    if (remaining <= 0) {
      clearInterval(survivalTimerInterval)
      survivalTimerInterval = null
      objectiveManager.update('TIMER_DONE')
    }
  }, 1000)
}

function spawnKeycard() {
  // Wait for level to be ready before spawning
  const wait = setInterval(() => {
    if (!isLevelReady) return
    clearInterval(wait)

    const geometry = new THREE.BoxGeometry(0.3, 0.08, 0.5)
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00cc44,
      emissiveIntensity: 1.2,
    })

    const keycard = new THREE.Mesh(geometry, material)

    // Float and spin animation via userData
    keycard.position.set(0, 1.0, 0) // center of level 3
    keycard.userData.pickup = true
    keycard.userData.isKeycard = true
    keycard.userData.itemType = 'KEYCARD'
    keycard.userData.ignoreCollision = true
    keycard.userData.noPhysics = true
    keycard.userData.isFloor = false

    // ✅ also traverse any children
    keycard.traverse((child) => {
      if (!child.isMesh) return
      child.userData.ignoreCollision = true
      child.userData.noPhysics = true
    })

    scene.add(keycard)

    // Add a point light so it glows in the dark
    const glow = new THREE.PointLight(0x00ff88, 1.5, 4)
    keycard.add(glow)

    // Animate it floating + spinning in the game loop
    // We store it so animate() can spin it
    floatingItems.push(keycard)
  }, 100)
}

function areNormalZombiesReady() {
  return (
    Object.keys(zombieTemplates).length >= 10 &&
    animationSets.NORMAL.Idle &&
    animationSets.NORMAL.Walk &&
    animationSets.NORMAL.Attack
  )
}

function getRandomOutdoorPosition(levelJson, attempts = 40) {
  const grid = levelJson.floorTiles.grid
  const { start, end, spacing } = grid

  for (let i = 0; i < attempts; i++) {
    const x = THREE.MathUtils.randFloat(start[0], end[0])
    const z = THREE.MathUtils.randFloat(start[2], end[2])

    const pos = new THREE.Vector3(x, 0, z)

    // 🔍 Check collision
    let blocked = false

    // ❌ Block elevator area
    if (isPointInsideElevator(pos)) {
      blocked = true
    }

    // ❌ Block walls / props
    if (!blocked) {
      for (const obj of collisionObjects) {
        if (!obj.geometry?.boundingBox) continue

        const box = obj.geometry.boundingBox.clone()
        box.applyMatrix4(obj.matrixWorld)

        if (box.containsPoint(pos)) {
          blocked = true
          break
        }
      }
    }

    if (!blocked) {
      return [pos.x, 0, pos.z]
    }
  }

  // fallback
  return [start[0], 0, start[2]]
}

function getRandomNormalZombieTemplate() {
  const keys = Object.keys(zombieTemplates)
  if (!keys.length) return null
  const id = keys[Math.floor(Math.random() * keys.length)]
  return zombieTemplates[id]
}

function handleFPSMovement() {
  if (playerDisabled || isKnockedDown) return
  const time = performance.now()
  const delta = (time - prevTime) / 1000
  prevTime = time

  // Gravity
  velocity.y -= gravity * 20.0 * delta

  // Get movement direction relative to camera
  direction.set(0, 0, 0)
  if (moveForward) direction.z -= 1
  if (moveBackward) direction.z += 1
  if (moveLeft) direction.x -= 1
  if (moveRight) direction.x += 1
  direction.normalize()

  // Apply movement speed
  let speed = moveSpeed

  isSprinting = sprint && stamina > 0

  if (isSprinting) {
    speed *= sprintMultiplier
  } else if (crouch) speed *= crouchMultiplier

  // Rotate movement direction to match camera orientation
  const camQuat = controls.getObject().quaternion.clone()
  const moveVector = direction
    .clone()
    .applyQuaternion(camQuat)
    .multiplyScalar(speed * delta)

  tryMove(new THREE.Vector3(moveVector.x, 0, 0))
  tryMove(new THREE.Vector3(0, 0, moveVector.z))

  // Vertical movement (jump/fall)
  controls.getObject().position.y += velocity.y * delta
  if (controls.getObject().position.y < (crouch ? crouchHeight : standHeight)) {
    velocity.y = 0
    controls.getObject().position.y = crouch ? crouchHeight : standHeight
    canJump = true
  }

  if (!controls.isLocked || !actions['rig|Idle'] || animationLocked) return

  if (moveForward || moveBackward || moveLeft || moveRight) {
    if (sprint) {
      playAction('rig|Sprint_Type_1', 0.15)
    } else {
      playAction('rig|Walk', 0.15)
    }
  } else {
    playAction('rig|Idle', 0.2)
  }

  checkRoomVisit()
}

function tryMove(moveVec) {
  if (gameOver) return

  const camPos = controls.getObject().position.clone()
  const direction = moveVec.clone().normalize()

  // ✅ Cast from multiple heights to catch short and tall objects
  const castHeights = [
    camPos.clone(), // head height (1.7)
    camPos.clone().setY(camPos.y - 0.6), // chest (~1.1)
    camPos.clone().setY(camPos.y - 1.1), // waist (~0.6)
    camPos.clone().setY(camPos.y - 1.5), // knee (~0.2)
  ]

  scene.updateMatrixWorld(true)

  for (const origin of castHeights) {
    raycaster.set(origin, direction)
    raycaster.far = moveVec.length() + PLAYER_RADIUS

    const intersects = raycaster.intersectObjects(collisionObjects, true).filter((hit) => {
      if (hit.object.userData.isFloor) return false
      if (hit.object.userData.ignoreCollision) return false
      if (hit.object.userData.noPhysics) return false
      if (hit.distance < 0.05) return false
      return true
    })

    if (intersects.length > 0) return // ✅ blocked at this height — don't move
  }

  // ✅ All heights clear — safe to move
  controls.getObject().position.add(moveVec)
}

function interact() {
  const direction = new THREE.Vector3()
  camera.getWorldDirection(direction)

  raycaster.set(camera.getWorldPosition(new THREE.Vector3()), direction)
  raycaster.far = 3

  // ✅ No filter — we need to hit keycards, guns, etc. which have ignoreCollision
  const intersects = raycaster.intersectObjects(scene.children, true)

  if (intersects.length === 0) return

  for (const hit of intersects) {
    let obj = hit.object

    // ✅ Walk up for interactive doors only
    while (obj) {
      if (obj.userData?.interactive) {
        levelLoader.toggleDoor(obj)
        return
      }
      obj = obj.parent
    }
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') {
    const now = performance.now() / 1000
    if (now - lastPunchTime < PUNCH_COOLDOWN) return
    lastPunchTime = now
    playAction('rig|Punch_R', 0.05, THREE.LoopOnce, true)

    setTimeout(() => {
      const zombie = getZombieInFront()
      if (zombie) {
        // ❌ remove: playZombieHit(zombie);
        damageZombie(zombie, 15) // ✅ damageZombie calls playZombieHit itself

        // const playerPos = getPlayerBodyPosition();
        // const pushDir = zombie.model.position
        //   .clone()
        //   .sub(playerPos)
        //   .setY(0)
        //   .normalize();
        // zombie.model.position.add(pushDir.multiplyScalar(0.3));
        return
      }

      interact()
    }, 400) // delay to match punch timing
  }
})

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') {
    playAction('rig|Inspect', 0.2, THREE.LoopOnce, true)
  }
})

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP') {
    paused = !paused

    const overlay = document.getElementById('pauseOverlay')
    if (overlay) overlay.style.display = paused ? 'flex' : 'none'

    if (controls) {
      if (paused) {
        controls.unlock()
      } else {
        controls.lock()
      }
    }
  }
})

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return // left click only
  if (!usingGun || !hasGun) return
  if (!controls.isLocked || gameOver || paused) return

  const now = performance.now() / 1000
  if (now - lastShotTime < SHOOT_COOLDOWN) return
  lastShotTime = now

  triggerGunKickback()
  fireGun()
})

function alertZombiesFromGunshot(radius = 200) {
  const playerPos = getPlayerBodyPosition()
  let alerted = 0

  zombies.forEach((zombie) => {
    if (zombie.isDead) return

    const dist = zombie.model.position.distanceTo(playerPos)
    if (dist > radius) return

    zombie.alerted = true
    zombie.state = 'CHASE'
    zombie.lastSeenTime = performance.now() / 1000
    zombie.lastSeenPos.copy(playerPos)
    alerted++
  })

  console.log(`Gunshot alerted ${alerted} zombies`)
}

function fireGun() {
  const camDir = new THREE.Vector3()
  camera.getWorldDirection(camDir)

  raycaster.set(controls.getObject().position, camDir)
  raycaster.far = 30

  // Play gunshot sound
  gunshotSound.currentTime = 0
  gunshotSound.play()

  // Alert all nearby zombies on every shot
  alertZombiesFromGunshot(100) // ✅ 100 units covers ~10 rooms

  // Check zombies first
  for (const zombie of zombies) {
    if (zombie.isDead) continue
    const hitbox = zombie.model.userData.hitbox
    if (!hitbox) continue

    const hits = raycaster.intersectObject(hitbox, true)
    if (hits.length > 0) {
      damageZombie(zombie, 60) // shotgun does heavy damage
      showMessage('Hit!')
      return
    }
  }
}

function getZombieInFront() {
  const playerPos = getPlayerBodyPosition()

  const camDir = new THREE.Vector3()
  camera.getWorldDirection(camDir)
  camDir.y = 0
  camDir.normalize()

  let closestZombie = null
  let closestDist = Infinity

  for (const z of zombies) {
    if (z.isDead) continue
    const hitbox = z.model.userData.hitbox
    if (!hitbox) continue

    const hitboxWorldPos = new THREE.Vector3()
    hitbox.getWorldPosition(hitboxWorldPos)

    const toZombie = hitboxWorldPos.clone().sub(playerPos)
    toZombie.y = 0

    const dist = toZombie.length()

    // 🔥 Overlap check (works even inside)
    if (dist > PLAYER_MELEE_RADIUS + ZOMBIE_RADIUS) continue

    // 🔥 Front-facing check
    toZombie.normalize()
    const dot = camDir.dot(toZombie)
    if (dot < 0.35) continue

    if (dist < closestDist) {
      closestDist = dist
      closestZombie = z
    }
  }

  return closestZombie
}

function getPlayerBodyPosition() {
  const pos = controls.getObject().position.clone()
  pos.y -= PLAYER_HEIGHT * 0.5 // center of body, not camera
  return pos
}

function updateZombies(delta) {
  if (isInSafeRoom()) return
  if (gameOver) return
  const playerPos = getPlayerBodyPosition()

  zombies.forEach((zombie) => {
    if (zombie.isAnimationLocked) return

    if (zombie.isDead) return

    // ✅ Sleeping zombies — freeze in place, no AI, no damage
    if (zombie.isSleeping) {
      zombie.model.position.y = 0.3
      zombie.model.position.x = THREE.MathUtils.clamp(zombie.model.position.x, -13, 13)
      zombie.model.position.z = THREE.MathUtils.clamp(zombie.model.position.z, -42, 35)
      return
    }

    // ─────────────────────────
    // DETECTION (crawler only)
    // ─────────────────────────
    if (zombieCanSeePlayer(zombie, playerPos) && !zombie.alerted) {
      zombie.alerted = true
      setTimeout(() => {
        zombie.state = 'CHASE'
      }, 700)
      zombie.lastSeenTime = performance.now() / 1000
      zombie.lastSeenPos.copy(playerPos)
      alertNearbyZombies(zombie)
    }
    const dist = zombie.model.position.distanceTo(playerPos)

    // ─────────────────────────
    // EXIT ATTACK → CHASE
    // ─────────────────────────
    if (zombie.state === 'ATTACK' && dist > ZOMBIE_DISENGAGE_RANGE) {
      zombie.state = 'CHASE'
      zombie.isAttacking = false
    }

    // ─────────────────────────
    // PATROL
    // ─────────────────────────
    if (zombie.type === 'CRAWLER' && zombie.state === 'PATROL') {
      // Ensure crawl animation
      if (zombie.actions['Crawl'] && zombie.currentAction !== zombie.actions['Crawl']) {
        zombie.currentAction?.fadeOut(0.2)
        zombie.actions['Crawl'].reset().fadeIn(0.2).play()
        zombie.currentAction = zombie.actions['Crawl']
      }

      // Move back and forth around origin
      zombie.model.position.add(zombie.patrolDir.clone().multiplyScalar(delta * ZOMBIE_PATROL_SPEED))

      resolveCapsuleCollisions(zombie.model.position, ZOMBIE_RADIUS, ZOMBIE_HEIGHT, collisionObjects)

      const distFromOrigin = zombie.model.position.distanceTo(zombie.patrolOrigin)

      if (distFromOrigin > ZOMBIE_PATROL_RADIUS) {
        zombie.patrolDir.multiplyScalar(-1) // turn around
      }

      zombie.model.lookAt(zombie.model.position.clone().add(zombie.patrolDir))

      return
    }

    // ─────────────────────────
    // NORMAL PATROL
    // ─────────────────────────
    if (zombie.type === 'NORMAL' && zombie.state === 'PATROL') {
      if (zombie.patrolMode === 'WALK') {
        if (zombie.actions['Walk'] && zombie.currentAction !== zombie.actions['Walk']) {
          zombie.currentAction?.fadeOut(0.2)
          zombie.actions['Walk'].reset().fadeIn(0.2).play()
          zombie.currentAction = zombie.actions['Walk']
        }

        zombie.model.position.add(zombie.patrolDir.clone().multiplyScalar(delta * ZOMBIE_WALK_SPEED))

        resolveCapsuleCollisions(zombie.model.position, ZOMBIE_RADIUS, ZOMBIE_HEIGHT, collisionObjects)

        const d = zombie.model.position.distanceTo(zombie.patrolOrigin)
        if (d > ZOMBIE_PATROL_RADIUS) {
          zombie.patrolDir.multiplyScalar(-1)
        }

        zombie.model.lookAt(zombie.model.position.clone().add(zombie.patrolDir))
      } else {
        if (zombie.actions['Idle'] && zombie.currentAction !== zombie.actions['Idle']) {
          zombie.currentAction?.fadeOut(0.2)
          zombie.actions['Idle'].reset().fadeIn(0.2).play()
          zombie.currentAction = zombie.actions['Idle']
        }
      }

      return
    }

    // ─────────────────────────
    // ATTACK (stable, no jitter)
    // ─────────────────────────
    const attackAnim = zombie.type === 'CRAWLER' ? 'Bite' : 'Attack'

    const ATTACK_STOP_MIN = ZOMBIE_ATTACK_RANGE * 0.9
    const ATTACK_STOP_MAX = ZOMBIE_ATTACK_RANGE * 1.05

    if (dist <= ATTACK_STOP_MAX && zombie.actions[attackAnim]) {
      zombie.state = 'ATTACK'
      zombie.isAttacking = true

      // 👀 Always face player
      zombie.model.lookAt(playerPos.x, zombie.model.position.y, playerPos.z)

      // 🧲 Soft position correction (only if too close)
      if (dist < ATTACK_STOP_MIN) {
        const pushDir = zombie.model.position.clone().sub(playerPos).setY(0).normalize()

        zombie.model.position.add(pushDir.multiplyScalar((ATTACK_STOP_MIN - dist) * 0.6))
      }

      // 🎞️ Animation control
      if (zombie.currentAction !== zombie.actions[attackAnim]) {
        zombie.currentAction?.fadeOut(0.1)
        zombie.actions[attackAnim].reset().setLoop(THREE.LoopRepeat).fadeIn(0.1).play()

        zombie.currentAction = zombie.actions[attackAnim]
      }

      handleZombieAttack(zombie, playerPos)
      return
    }

    // MOVE
    const timeNow = performance.now() / 1000
    const timeSinceSeen = timeNow - zombie.lastSeenTime

    if (zombie.state === 'CHASE' && (dist < ZOMBIE_MEMORY_DISTANCE || timeSinceSeen < ZOMBIE_LOSE_INTEREST_TIME)) {
      setTimeout(() => {
        zombie.state = 'CHASE'
      }, 800)
      zombie.isAttacking = false

      // const moveAnim = zombie.type === "GLTF" ? "Crawl" : "Walk";
      let moveAnim = 'Walk'
      let moveSpeed = ZOMBIE_WALK_SPEED

      if (zombie.type === 'NORMAL') {
        if (zombie.type === 'NORMAL') {
          moveAnim = 'Run'
          moveSpeed = ZOMBIE_RUN_SPEED
        }
      }

      if (zombie.actions[moveAnim] && zombie.currentAction !== zombie.actions[moveAnim]) {
        zombie.currentAction?.fadeOut(0.2)
        zombie.actions[moveAnim].reset().fadeIn(0.2).play()
        zombie.currentAction = zombie.actions[moveAnim]
      }

      const zombiePos = zombie.model.position.clone()
      const targetPos = dist < ZOMBIE_ATTACK_RANGE * 1.2 ? playerPos.clone() : playerPos.clone().add(zombie.chaseOffset)
      const toPlayer = targetPos.clone().sub(zombiePos)
      const distance = toPlayer.length()

      const stopDistance = ZOMBIE_ATTACK_RANGE * 0.85

      if (distance > stopDistance) {
        toPlayer.normalize()
        zombie.model.position.add(toPlayer.multiplyScalar(delta * moveSpeed))

        resolveCapsuleCollisions(zombie.model.position, ZOMBIE_RADIUS, ZOMBIE_HEIGHT, collisionObjects)
      }

      zombie.model.position.y = 0
      zombie.model.lookAt(playerPos.x, zombie.model.position.y, playerPos.z)

      zombies.forEach((other) => {
        if (other === zombie) return

        const delta = zombie.model.position.clone().sub(other.model.position)
        delta.y = 0

        const dist = delta.length()
        const minDist = ZOMBIE_RADIUS * 2

        if (dist > 0 && dist < minDist) {
          delta.normalize()
          const push = (minDist - dist) * 0.5

          zombie.model.position.add(delta.clone().multiplyScalar(push))
          other.model.position.add(delta.clone().multiplyScalar(-push))
        }
      })
      return
    }

    const playerDelta = zombie.model.position.clone().sub(playerPos)
    playerDelta.y = 0

    const playerDist = playerDelta.length()
    const minDist = ZOMBIE_RADIUS + PLAYER_RADIUS

    if (playerDist > 0 && playerDist < minDist) {
      playerDelta.normalize()
      zombie.model.position.add(playerDelta.multiplyScalar(minDist - playerDist))
    }

    if (zombie.state === 'CHASE' && timeSinceSeen >= ZOMBIE_LOSE_INTEREST_TIME) {
      zombie.state = 'PATROL'
      zombie.alerted = false
      zombie.patrolOrigin.copy(zombie.model.position)
      zombie.patrolDir.set(Math.random() < 0.5 ? 1 : -1, 0, Math.random() < 0.5 ? 1 : -1).normalize()
    }

    // IDLE
    if (zombie.actions['Idle'] && zombie.currentAction !== zombie.actions['Idle']) {
      zombie.currentAction?.fadeOut(0.2)
      zombie.actions['Idle'].reset().fadeIn(0.2).play()
      zombie.currentAction = zombie.actions['Idle']
    }
  })
}

function removeRootMotionY(clip) {
  const tracks = []

  for (const track of clip.tracks) {
    // Only care about position tracks
    if (!track.name.endsWith('.position')) {
      tracks.push(track)
      continue
    }

    // Only care about hips/root
    const boneName = track.name.split('.')[0]
    if (!boneName.toLowerCase().includes('hips')) {
      tracks.push(track)
      continue
    }

    // 🔥 Keep X/Z, REMOVE Y
    const values = track.values.slice()
    for (let i = 1; i < values.length; i += 3) {
      values[i] = 1 // Y = 0
    }

    tracks.push(new THREE.VectorKeyframeTrack(track.name, track.times, values))
  }

  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}

function removeRootMotionSleeping(clip) {
  const tracks = []

  for (const track of clip.tracks) {
    const boneName = track.name.split('.')[0]
    const isHips = boneName.toLowerCase().includes('hips')

    if (track.name.endsWith('.position') && isHips) {
      // ✅ Zero out ALL position axes — keep model exactly where placed
      const values = track.values.slice()
      for (let i = 0; i < values.length; i += 3) {
        values[i] = 0 // X
        values[i + 1] = 0 // Y
        values[i + 2] = 0 // Z
      }
      tracks.push(new THREE.VectorKeyframeTrack(track.name, track.times, values))
    } else {
      tracks.push(track)
    }
  }

  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}

function lungeZombie(zombie, playerPos) {
  const dir = playerPos.clone().sub(zombie.model.position)
  dir.y = 0
  dir.normalize()
  zombie.model.position.add(dir.multiplyScalar(ZOMBIE_LUNGE_DISTANCE))
}

function shakeCamera(intensity = 0.05, duration = 150) {
  const cam = controls.getObject()
  const start = cam.position.clone()

  new TWEEN.Tween({ t: 0 })
    .to({ t: 1 }, duration)
    .onUpdate(() => {
      cam.position.x = start.x + (Math.random() - 0.5) * intensity
      cam.position.z = start.z + (Math.random() - 0.5) * intensity
      // ❌ DO NOT TOUCH Y
    })
    .onComplete(() => {
      cam.position.x = start.x
      cam.position.z = start.z
    })
    .start()
}

function handleZombieAttack(zombie, playerPos) {
  const time = performance.now() / 1000

  if (time - zombie.lastAttackTime < ZOMBIE_DAMAGE_COOLDOWN) return

  zombie.lastAttackTime = time

  // Lunge
  lungeZombie(zombie, playerPos)

  // Camera feedback
  shakeCamera(0.06, 120)

  // TODO: apply player damage here
  applyPlayerDamage(ZOMBIE_DAMAGE)
  if (playerHealth <= 0) return
}

function applyPlayerDamage(amount) {
  if (gameOver) return

  playerHealth -= amount
  playerHealth = Math.max(0, playerHealth)
  lastDamageTime = performance.now() / 1000

  updateHealthVignette()

  console.log('Health:', playerHealth)

  // Optional: screen feedback
  shakeCamera(0.1, 200)

  if (playerHealth <= 0) {
    playDeathKnockdown()
  }
}

function isInSafeRoom() {
  // Only safe during the exit WAITING phase (doors open, objective done)
  if (elevatorState !== 'WAITING') return false
  return isPointInsideElevator(controls.getObject().position)
}

function updateStamina(delta) {
  if (isSprinting) {
    stamina -= 35 * delta
  } else {
    stamina += 20 * delta
  }

  stamina = THREE.MathUtils.clamp(stamina, 0, MAX_STAMINA)

  if (stamina <= 0) {
    isSprinting = false
  }

  // updateStaminaUI();
}

function spawnItem(type, position) {
  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3)
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.set(...position)
  mesh.userData = {
    itemType: type,
    pickup: true,
  }

  scene.add(mesh)
}

function addToInventory(item) {
  if (inventory.length >= INVENTORY_LIMIT) {
    showMessage('Inventory Full')
    return false
  }
  inventory.push(item)
  updateInventoryUI()
  return true
}

function markRoomVisited(roomId) {
  visitedRooms.add(roomId)
}

function removeFromInventory(item) {
  const index = inventory.indexOf(item)
  if (index !== -1) {
    inventory.splice(index, 1)
    updateInventoryUI()
  }
}

function checkRoomVisit() {
  // const playerPos = controls.getObject().position;

  // levelLoader.rooms?.forEach((room) => {
  //   const box = new THREE.Box3().setFromObject(room.mesh);
  //   if (box.containsPoint(playerPos)) {
  //     markRoomVisited(room.id);
  //   }
  // });
  return
}

function spawnBoss(position) {
  const template = getRandomNormalZombieTemplate()
  if (!template) return

  spawnFBXZombie(position, 'Idle', template, 'NORMAL')

  const boss = zombies[zombies.length - 1]
  boss.isBoss = true
  boss.health = 500
}

function updateHealthVignette() {
  const el = document.getElementById('healthVignette')
  if (!el) return

  const pct = playerHealth / MAX_HEALTH

  const r = Math.round(255 * (1 - pct))
  const g = Math.round(255 * pct)
  const intensity = 0.15 + (1 - pct) * 0.65
  const spread = 60 + (1 - pct) * 80

  el.style.boxShadow = `inset 0 0 ${spread}px rgba(${r}, ${g}, 0, ${intensity})`

  // Pulse speed: slow at full health, fast when near death
  if (pct >= 0.99) {
    // Full health — gentle green breathe
    el.style.animation = 'vignettePulse 3s ease-in-out infinite'
  } else if (pct > 0.5) {
    // Medium health — moderate pulse
    const speed = 3 - (1 - pct) * 2 // 3s → 2s as health drops to 50%
    el.style.animation = `vignettePulse ${speed.toFixed(2)}s ease-in-out infinite`
  } else {
    // Low health — rapid urgent pulse
    const speed = 2 - (1 - pct) * 1.2 // 2s → 0.8s as health reaches 0
    el.style.animation = `vignettePulse ${Math.max(0.4, speed).toFixed(2)}s ease-in-out infinite`
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') {
    mapOpen = !mapOpen
    toggleMapUI(mapOpen)
  }
})

document.addEventListener('keydown', (e) => {
  if (e.code === 'Digit1') {
    const item = inventory.find((i) => ITEM_TYPES[i.type].heal > 0)
    if (item) {
      useHealingItem(item)
      showMessage('Healed')
    }
  }
})

function animate() {
  requestAnimationFrame(animate)
  // if (!paused) {
  if (!paused && isLevelReady) {
    handleFPSMovement()

    const delta = clock.getDelta() // ✅ declare first
    const t = clock.elapsedTime

    updateGunAnimation(delta)

    if (LEVEL_ORDER[currentLevelIndex] === 'floor0') {
      updateCCTV(delta)
    }

    floatingItems.forEach((item) => {
      item.position.y = 1.0 + Math.sin(t * 2) * 0.1
      item.rotation.y += delta * 1.5 // ✅ now valid
    })

    updateStamina(delta)

    // ✅ Footsteps
    const isMoving = moveForward || moveBackward || moveLeft || moveRight
    const isSprintingKeyHeld = sprint // player is holding shift
    const hasStaminaForSprint = stamina > 5
    const isRunning = isMoving && sprint && stamina > 5

    // 🎯 Target behavior
    if (isRunning) {
      window._targetBreathInterval = 0.5 // VERY fast
      window._targetBreathVolume = 0.2
    } else if (isMoving) {
      window._targetBreathInterval = 0.6 // light exertion
      window._targetBreathVolume = 0.1
    } else {
      window._targetBreathInterval = 0.8 // calm idle
      window._targetBreathVolume = 0.05
    }

    // 🎯 Smooth cooldown
    window._breathInterval += (window._targetBreathInterval - window._breathInterval) * delta * 3
    window._breathVolume += (window._targetBreathVolume - window._breathVolume) * delta * 3

    // Apply volume
    window._breathingSounds.forEach((s) => {
      s.volume = window._breathVolume
    })

    // 🎯 Play alternating inhale/exhale
    window._breathTimer += delta

    if (window._breathTimer >= window._breathInterval) {
      window._breathTimer = 0

      // 🛑 HARD STOP all breathing sounds (prevents overlap completely)
      window._breathingSounds.forEach((s) => {
        s.pause()
        s.currentTime = 0
      })

      const snd = window._breathingSounds[window._breathIndex % window._breathingSounds.length]

      snd.play().catch(() => {})

      window._breathIndex++
    }

    const isAttemptingSprint = isSprintingKeyHeld && isMoving
    const shouldUseRunningFootsteps = isAttemptingSprint && hasStaminaForSprint

    // Use consistent interval based on intention, not just current stamina
    let interval
    if (isAttemptingSprint) {
      interval = 0.3
    } else {
      interval = 0.5
    }

    if (shouldUseRunningFootsteps !== window._wasRunning) {
      window._footstepTimer = interval * 0.5
      window._wasRunning = shouldUseRunningFootsteps
    }

    if (isMoving && !playerDisabled && !isKnockedDown && controls.isLocked) {
      window._footstepTimer += delta
      if (window._footstepTimer >= interval) {
        window._footstepTimer = 0
        const snd = window._footstepSounds[window._footstepIndex % window._footstepSounds.length]
        snd.currentTime = 0
        snd.play().catch(() => {})
        window._footstepIndex++
      }
    } else {
      window._footstepTimer = 0
      window._wasRunning = false
    }
    mixers.forEach((m) => m.update(delta))

    // 🔥 UPDATE LEVEL (ELEVATOR) MIXERS
    levelLoader.mixers.forEach((m) => m.update(delta))
    updateZombies(delta)
    TWEEN.update()

    checkPlayerInElevator()

    // updatePlayerHealth(delta);

    // Animate doors
    levelLoader.interactiveDoors.forEach((door) => {
      levelLoader.animateDoor(door, delta)
    })

    if (escapeMode) {
      escapeTimer -= delta

      if (escapeTimer <= 0) {
        endGame('You were consumed in the outbreak.')
      }

      if (Math.random() < 0.02) {
        spawnFBXZombie(getRandomOutdoorPosition(currentLevelJson), 'Idle', getRandomNormalZombieTemplate(), 'NORMAL')
      }
    }
  }

  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight

  const baseAspect = 9 / 16

  if (aspect > 1) {
    camera.fov = 75 * (baseAspect / aspect)
    fpsArms.position.set(0.01, -0.35, -0.05)
  } else {
    camera.fov = 75
  }

  camera.aspect = aspect
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
})

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  updateCameraAndArms()
})

// Keep only the window function
window.startGameFromLevel = function (levelNumber) {
  const levelIndex = levelNumber - 1

  if (levelIndex >= 0 && levelIndex < LEVEL_ORDER.length) {
    currentLevelIndex = levelIndex
    gameInitialized = true
    init() // This will now only start when a level is selected
  } else {
    console.error(`Invalid level: ${levelNumber}`)
  }
}

// Optional: Show a message that game is ready but waiting for level selection
console.log('Game loaded and ready. Waiting for level selection...')

import * as THREE from 'three'
import { BODY_TYPES } from './BodyTypes.js'

class LevelLoader {
  constructor(scene, gltfLoader, ceilingHeight = 3.2, onCollidable) {
    this.scene = scene
    this.gltfLoader = gltfLoader
    this.ceilingHeight = ceilingHeight
    this.onCollidable = onCollidable
    this.interactiveDoors = []

    this.mixers = []
    this.elevatorController = null
    this.sceneObjects = []

    // Initialize blood textures
    this.bloodTextures = []
    this.loadBloodTextures()
  }

  resolvePath(path) {
    if (!path) return path
    if (path.startsWith('/') || path.startsWith('http')) return path
    return '/' + path.replace(/^\.\//, '')
  }

  loadLevel(json, levelId = 'floor0') {
    this.currentLevelId = levelId
    this.loadRooms(json.rooms || [], levelId)
    this.loadWalls(json.walls || [], levelId)
    this.loadPillars(json.pillars || [])
    this.loadFloorTiles(json.floorTiles || [], levelId)
    this.loadCeiling(json.floorTiles.grid)
    // this.addCeilingLights(json.floorTiles.grid);
  }

  loadRooms(rooms) {
    rooms.forEach((room) => {
      const rigidTypes = [
        'couch',
        'benches',
        'benches1',
        'table',
        'chairs',
        'lounge',
        'lockers',
        'toilet',
        'toilet1',
        'reception',
        'operation_section',
      ]

      // ✅ GRID-BASED ROOMS (hospital wards, lounge, benches, etc.)
      if (room.grid) {
        const { start, end, spacing } = room.grid

        const xStep = spacing[0] ?? 0
        const zStep = spacing[1] ?? 0

        const bloodTexturePaths = [
          '/textures/BloodDrop36.png',
          '/textures/BloodFabric11.png',
          '/textures/BloodFabricSpatter03.png',
        ]

        const bloodTextures = bloodTexturePaths.map((path) => {
          const tex = new THREE.TextureLoader().load(path)
          tex.colorSpace = THREE.SRGBColorSpace
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping
          tex.flipY = false
          return tex
        })

        for (let x = start[0]; x <= end[0]; x += xStep > 0 ? xStep : Infinity) {
          for (let z = start[2]; z <= end[2]; z += zStep > 0 ? zStep : Infinity) {
            this.gltfLoader.load(this.resolvePath(room.model), (gltf) => {
              const model = gltf.scene
              model.position.set(x, start[1], z)

              // ✅ APPLY JSON ROTATION HERE
              if (room.rotation) {
                model.rotation.set(
                  THREE.MathUtils.degToRad(room.rotation[0] || 0),
                  THREE.MathUtils.degToRad(room.rotation[1] || 0),
                  THREE.MathUtils.degToRad(room.rotation[2] || 0),
                )
              }

              model.traverse((child) => {
                if (child.isMesh) {
                  child.material = child.material.clone()
                  child.material.side = THREE.DoubleSide
                  child.material.needsUpdate = true

                  // ✅ Copy room userData first
                  if (room.userData) {
                    Object.assign(child.userData, room.userData)
                  }

                  if (child.userData.noPhysics) return // ✅ skip collision

                  child.userData.bodyType = rigidTypes.includes(room.type) ? BODY_TYPES.RIGID : BODY_TYPES.STATIC

                  // Room mesh should collide
                  child.userData.collidable = true

                  // ✅ ADD THIS
                  child.geometry.computeBoundingBox()

                  // 🔥 THIS WAS MISSING
                  this.onCollidable?.(child)
                  child.userData.room = true
                }
              })

              // Optional per-type tweaks
              if (room.type === 'couch') {
                model.scale.set(0.8, 0.8, 0.8)
                model.rotation.y = Math.PI / 2
              } else if (room.type === 'benches') {
                model.scale.set(0.8, 0.8, 0.8)
                model.rotation.y = -Math.PI / 2
              } else if (room.type === 'benches1') {
                model.scale.set(1.9, 1.9, 1.9)
                model.rotation.y = -Math.PI / 2
              } else if (room.type === 'clothes') {
                model.scale.set(0.02, 0.02, 0.02)
              } else if (room.type === 'lockers') {
                model.scale.set(1.9, 1.9, 1.9)
              } else if (room.type === 'hospital_room') {
                model.scale.set(1, 0.9, 1)
              } else if (room.type === 'lounge') {
                model.scale.set(3, 3, 3)
              } else if (room.id === 'curtain_left') {
                model.rotation.y = -Math.PI / 2
                model.position.z += 2
              } else if (room.id === 'curtain_front') {
                model.position.x -= 2
              } else if (room.id === 'surgical') {
                model.position.x += 2
              } else if (room.id === 'operation_section') {
                model.traverse((child) => {
                  if (!child.isMesh) return

                  // 1️⃣ Darken walls etc
                  if (child.material?.name === 'Material') {
                    child.material.color.set('#554949')
                    return
                  }

                  // 2️⃣ Only beds / fabric
                  const mat = child.material
                  if (!mat || mat.name !== 'Mat5') return

                  // Clone material safely
                  const newMat = mat.clone()

                  // Pick random blood texture
                  const bloodTex = bloodTextures[Math.floor(Math.random() * bloodTextures.length)].clone()

                  bloodTex.wrapS = bloodTex.wrapT = THREE.RepeatWrapping
                  bloodTex.repeat.set(THREE.MathUtils.randFloat(2.5, 4.5), THREE.MathUtils.randFloat(2.5, 4.5))
                  bloodTex.offset.set(Math.random(), Math.random())
                  bloodTex.rotation = THREE.MathUtils.randFloat(0, Math.PI * 2)
                  bloodTex.center.set(0.5, 0.5)

                  // 🔥 IMPORTANT PART 🔥
                  // If bed already has a fabric texture
                  if (newMat.map) {
                    newMat.map = newMat.map.clone()
                    newMat.map.needsUpdate = true

                    // Multiply blood over fabric
                    newMat.map = combineTextures(newMat.map, bloodTex)
                  } else {
                    // fallback
                    newMat.map = bloodTex
                  }

                  // Make blood slightly darker / soaked
                  newMat.color.multiplyScalar(0.85)
                  newMat.roughness = Math.min(newMat.roughness + 0.1, 1)

                  newMat.needsUpdate = true
                  child.material = newMat
                })
              }

              this.scene.add(model)
              this.sceneObjects.push(model)
            })
          }
        }
        return
      }

      // ✅ SINGLE-POSITION ROOMS (elevator, reception, toilets)
      this.gltfLoader.load(this.resolvePath(room.model), (gltf) => {
        const model = gltf.scene
        model.position.set(...room.position)

        // 🔥 KEEP GLTF REFERENCE
        model.userData.gltf = gltf

        // Apply type-specific transforms FIRST
        if (room.type === 'reception') {
          model.scale.set(0.5, 0.5, 0.5)
          model.rotation.y = Math.PI
        }

        if (room.type === 'toilet') {
          model.rotation.y = Math.PI
        }

        if (room.type === 'toilet1') {
          model.scale.set(1, 1, 1.2)
        }

        if (room.type === 'elevator') {
          model.scale.set(0.6, 0.7, 0.6)
          model.rotation.y = Math.PI
          this.elevatorModel = model
        }

        if (room.id === 'elevator1') {
          model.rotation.y = Math.PI / 2
        }

        // Apply scale from JSON if present
        if (room.scale && room.type !== 'paper_note') {
          model.scale.set(room.scale[0], room.scale[1], room.scale[2])
        }

        // Apply rotation from JSON if present
        if (room.rotation && room.type !== 'paper_note') {
          model.rotation.set(
            THREE.MathUtils.degToRad(room.rotation[0]),
            THREE.MathUtils.degToRad(room.rotation[1]),
            THREE.MathUtils.degToRad(room.rotation[2]),
          )
        }

        // Setup collision for all meshes EXCEPT paper_note
        if (room.type !== 'paper_note') {
          model.traverse((child) => {
            if (!child.isMesh) return

            // Copy room userData FIRST so noPhysics is set before collision check
            if (room.userData) {
              Object.assign(child.userData, room.userData)
            }

            // Skip collision for noPhysics props (gun pickup etc)
            if (child.userData.noPhysics) return

            child.userData.collidable = true
            child.userData.bodyType = BODY_TYPES.STATIC

            child.geometry.computeBoundingBox()
            this.onCollidable?.(child)
          })
        }

        // Handle paper_note AFTER collision setup to avoid overwriting
        if (room.type === 'paper_note') {
          console.log('Loading paper note:', room.id)

          // Apply paper_note specific transforms
          if (room.position) {
            model.position.set(...room.position)
          }
          if (room.rotation) {
            model.rotation.set(
              THREE.MathUtils.degToRad(room.rotation[0] || 0),
              THREE.MathUtils.degToRad(room.rotation[1] || 0),
              THREE.MathUtils.degToRad(room.rotation[2] || 0),
            )
          }

          if (room.scale) {
            model.scale.set(room.scale[0], room.scale[1], room.scale[2])
          }

          // Get the message from room data, or use default
          const noteMessage =
            room.message ||
            'If you wake up and see this,\nI woke up like you and stood\nin front of the camera for up to\n10 seconds before they could\nprove that I am well'

          // Split the message into lines (supports \n in the JSON)
          const lines = noteMessage.split('\n')

          // Load the custom font first
          const font = new FontFace('MyHandwriting', 'url(/fonts/My_handwriting.ttf)')

          font
            .load()
            .then(() => {
              document.fonts.add(font)
              console.log('Custom font loaded successfully')

              // Create canvas texture with text using the custom font
              const canvas = document.createElement('canvas')
              canvas.width = 2048
              canvas.height = 2048
              const ctx = canvas.getContext('2d')

              // Paper-like background
              ctx.fillStyle = '#FFF5E6'
              ctx.fillRect(0, 0, canvas.width, canvas.height)

              // Add subtle paper texture
              for (let i = 0; i < 4000; i++) {
                ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`
                ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2)
              }

              // Text with custom font
              ctx.fillStyle = '#2C1810'
              ctx.font = "bold 110px 'MyHandwriting', 'Courier New', monospace"
              ctx.textBaseline = 'top'

              let y = 150
              lines.forEach((line) => {
                ctx.fillText(line, 150, y)
                y += 140
              })

              const textTexture = new THREE.CanvasTexture(canvas)
              textTexture.needsUpdate = true

              // Create a group to hold both the original model and the new plane
              const paperGroup = new THREE.Group()

              // Store the original model's position and rotation
              const originalPosition = model.position.clone()
              const originalRotation = model.rotation.clone()
              const originalScale = model.scale.clone()

              // Reset model's local transform since it will be inside the group
              model.position.set(0, 0, 0)
              model.rotation.set(0, 0, 0)
              model.scale.set(1, 1, 1)

              // Process the model to create the plane and hide original meshes
              let planeMesh = null

              model.traverse((child) => {
                if (!child.isMesh) return

                // Hide the original mesh
                child.visible = false

                // Create a plane for this mesh if we haven't already
                if (!planeMesh) {
                  const originalGeometry = child.geometry
                  originalGeometry.computeBoundingBox()
                  const box = originalGeometry.boundingBox
                  const width = box.max.x - box.min.x
                  const height = box.max.y - box.min.y

                  // Create plane geometry
                  const newGeometry = new THREE.PlaneGeometry(height * 1.5, width * 1.5)
                  const newMaterial = new THREE.MeshBasicMaterial({
                    map: textTexture,
                    side: THREE.DoubleSide,
                    color: 0xffffff,
                    transparent: true,
                  })

                  planeMesh = new THREE.Mesh(newGeometry, newMaterial)

                  // Position the plane at the center of the original mesh
                  const centerX = (box.min.x + box.max.x) / 2
                  const centerY = (box.min.y + box.max.y) / 2
                  const centerZ = (box.min.z + box.max.z) / 2
                  planeMesh.position.set(centerX, centerY + 0.1, centerZ)

                  // Make it horizontal (lying flat)
                  planeMesh.rotation.x = -Math.PI / 2
                }
              })

              // Add both to group
              paperGroup.add(model)
              if (planeMesh) {
                paperGroup.add(planeMesh)
              }

              // Apply the original transforms to the group
              paperGroup.position.copy(originalPosition)
              paperGroup.rotation.copy(originalRotation)
              paperGroup.scale.copy(originalScale)

              // Add the group to scene INSIDE the then callback
              this.scene.add(paperGroup)
              this.sceneObjects.push(paperGroup)

              console.log('Paper note added with message:', noteMessage)
            })
            .catch((error) => {
              console.error('Failed to load custom font:', error)
              // Fallback to default font
              // You can implement a fallback function here
            })
        }

        this.scene.add(model)
        this.sceneObjects.push(model)

        // Elevator animation setup
        if (room.id === 'elevator1' && gltf.animations.length) {
          console.log(
            'Elevator animations:',
            gltf.animations.map((a) => a.name),
          )
          const clip = gltf.animations[0]
          const mixer = new THREE.AnimationMixer(model)
          this.mixers.push(mixer)
          const action = mixer.clipAction(clip)
          action.setLoop(THREE.LoopOnce)
          action.clampWhenFinished = true
          this.elevatorController = { mixer, action, duration: clip.duration }
          console.log('Elevator controller ready')
          this.onElevatorReady?.()
        }
      })
    })
  }

  loadWalls(walls, levelId) {
    // Determine if blood should be applied (levels 1-5)
    const shouldApplyBlood = levelId !== 'floor0'

    walls.forEach((wall) => {
      if (wall.type === 'solid') {
        const height = wall.height
        const thickness = wall.thickness

        const dx = wall.to[0] - wall.from[0]
        const dz = wall.to[2] - wall.from[2]

        const isHorizontal = Math.abs(dx) > Math.abs(dz)

        const width = isHorizontal ? dx : thickness
        const depth = isHorizontal ? thickness : dz

        const geometry = new THREE.BoxGeometry(Math.abs(width), height, Math.abs(depth))

        // Create material with blood texture for levels 1-5
        let material
        if (shouldApplyBlood) {
          material = this.createBloodyMaterial(0x444444)
        } else {
          material = new THREE.MeshStandardMaterial({ color: 0x444444 })
        }

        const mesh = new THREE.Mesh(geometry, material)

        // Position: center between from and to
        const midX = (wall.from[0] + wall.to[0]) / 2
        const midZ = (wall.from[2] + wall.to[2]) / 2

        mesh.position.set(midX, height / 2, midZ)
        if (wall.id === 'door_top') {
          mesh.position.set(midX, 2.85, midZ)
        }
        mesh.userData.bodyType = BODY_TYPES.STATIC

        mesh.userData.collidable = true
        mesh.geometry.computeBoundingBox()
        this.onCollidable?.(mesh)
        this.scene.add(mesh)
        this.sceneObjects.push(mesh)
      } else if (wall.type === 'door') {
        this.createDoor(wall)
      }
    })
  }

  loadCeiling(grid) {
    const { start, end } = grid

    const width = Math.abs(end[0] - start[0])
    const depth = Math.abs(end[2] - start[2])

    const geometry = new THREE.PlaneGeometry(width, depth)
    const material = new THREE.MeshStandardMaterial({
      color: 0x222222,
      side: THREE.DoubleSide,
    })

    const ceiling = new THREE.Mesh(geometry, material)
    ceiling.rotation.x = Math.PI / 2 // face downward
    ceiling.position.set(
      (start[0] + end[0]) / 2,
      3.5, // slightly above walls (adjust if needed)
      (start[2] + end[2]) / 2,
    )

    this.scene.add(ceiling)
    this.sceneObjects.push(ceiling)
  }

  loadBloodTextures() {
    const bloodTexturePaths = [
      '/textures/blood_splatter1.png',
      '/textures/blood_splatter2.png',
      '/textures/blood_streaks.png',
      '/textures/blood_drips.png',
    ]

    this.bloodTextures = bloodTexturePaths.map((path) => {
      const tex = new THREE.TextureLoader().load(path)
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(4, 4)
      return tex
    })
  }

  createBloodyMaterial(baseColor) {
    // Check if blood textures are loaded
    if (!this.bloodTextures || this.bloodTextures.length === 0) {
      console.warn('Blood textures not loaded yet, using default material')
      return new THREE.MeshStandardMaterial({ color: baseColor })
    }

    // Filter out textures that might not have loaded
    const validTextures = this.bloodTextures.filter((tex) => tex && tex.image)

    if (validTextures.length === 0) {
      console.warn('No valid blood textures, using default material')
      return new THREE.MeshStandardMaterial({ color: baseColor })
    }

    // Randomly select a blood texture
    const bloodTex = validTextures[Math.floor(Math.random() * validTextures.length)]

    // Check if the texture image is loaded
    if (!bloodTex.image) {
      console.warn('Blood texture image not loaded yet')
      return new THREE.MeshStandardMaterial({ color: baseColor })
    }

    // Create a canvas to combine base color with blood texture
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    try {
      // Draw base color
      let colorStr
      if (typeof baseColor === 'number') {
        colorStr = '#' + baseColor.toString(16).padStart(6, '0')
      } else {
        colorStr = baseColor
      }
      ctx.fillStyle = colorStr
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw blood texture with random opacity
      ctx.globalAlpha = 0.3 + Math.random() * 0.5
      ctx.drawImage(bloodTex.image, 0, 0, canvas.width, canvas.height)

      const texture = new THREE.CanvasTexture(canvas)
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(4, 4)
      texture.needsUpdate = true

      return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.0,
      })
    } catch (error) {
      console.error('Error creating bloody material:', error)
      return new THREE.MeshStandardMaterial({ color: baseColor })
    }
  }

  createDoor(wall) {
    this.gltfLoader.load(this.resolvePath(wall.model), (gltf) => {
      const model = gltf.scene
      model.position.set(...wall.position)
      model.scale.set(0.006, 0.0078, 0.006)
      model.name = wall.id

      // Scale from JSON
      if (wall.size) {
        model.scale.set(wall.size[0], wall.size[1], wall.size[2])
      }

      // Single-mesh toilet doors
      if (model.name === 'male_door' || model.name === 'female_door') {
        model.scale.set(0.75, 0.56, 0.56)
        model.rotation.y = -Math.PI
        // store reference for interaction
        model.userData.isSingleDoor = true
        model.userData.open = false
      }

      // Main double door
      if (model.name === 'main_door' || model.name.includes('door_ward')) {
        let leftDoor = null
        let rightDoor = null

        model.traverse((child) => {
          child.castShadow = true
          child.receiveShadow = true

          child.userData.collidable = true

          this.onCollidable?.(child)

          // Door roots (already correct)
          if (child.name === 'Cube') leftDoor = child
          if (child.name === 'Cube001') rightDoor = child

          // Make specific materials invisible
          if (child.isMesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material]

            mats.forEach((mat) => {
              if (mat?.name === 'Material.001' || mat?.name === 'Material.004') {
                mat.transparent = true
                mat.opacity = 0
              }
            })
          }
        })

        if (!leftDoor || !rightDoor) {
          console.error('❌ Door halves not found')
          return
        }

        rightDoor.rotation.z = Math.PI

        // Store references ONLY
        model.userData.leftDoor = leftDoor
        model.userData.rightDoor = rightDoor

        model.userData.leftClosedZ = leftDoor.rotation.z
        model.userData.rightClosedZ = rightDoor.rotation.z

        model.userData.open = false

        model.rotation.y = -Math.PI / 2
      }

      // Interaction metadata
      if (wall.interactive) {
        model.userData.interactive = true
        model.userData.opensTo = wall.opensTo

        // Add to interactive doors list
        this.interactiveDoors.push(model)
      }

      this.scene.add(model)
      this.sceneObjects.push(model)
    })
  }

  // Call this on player interaction
  toggleDoor(model) {
    if (!model.userData.leftDoor) return

    const angle = 280

    model.userData.leftDoor.position.x = model.userData.open ? 24 : angle

    model.userData.rightDoor.position.x = model.userData.open ? 24 : angle

    model.userData.leftDoor.position.z = model.userData.open ? 24 : -1180

    model.userData.rightDoor.position.z = model.userData.open ? 24 : 380

    model.userData.open = !model.userData.open

    model.traverse((child) => {
      if (child.isMesh) {
        child.userData.collidable = !model.userData.open
      }
    })
  }

  // Optional: smoothly animate doors over time
  animateDoor(model, delta, speed = 2) {
    if (!model.userData.interactive) return

    const swing = Math.PI / 2

    if (model.userData.isSingleDoor) {
      model.rotation.z = THREE.MathUtils.lerp(model.rotation.z, model.userData.open ? -swing : 0, delta * speed)
      return
    }

    if (model.userData.leftDoor && model.userData.rightDoor) {
      const leftClosed = model.userData.leftClosedZ
      const rightClosed = model.userData.rightClosedZ

      const leftTarget = model.userData.open ? leftClosed - swing : leftClosed

      const rightTarget = model.userData.open ? rightClosed + swing : rightClosed

      model.userData.leftDoor.rotation.z = THREE.MathUtils.lerp(
        model.userData.leftDoor.rotation.z,
        leftTarget,
        delta * speed,
      )

      model.userData.rightDoor.rotation.z = THREE.MathUtils.lerp(
        model.userData.rightDoor.rotation.z,
        rightTarget,
        delta * speed,
      )
    }
  }

  loadPillars(pillars) {
    if (!pillars.length) return
    const pillar = pillars[0]
    const { start, end, spacing } = pillar.grid

    for (let x = start[0]; x <= end[0]; x += spacing[0]) {
      for (let z = start[2]; z <= end[2]; z += spacing[1]) {
        this.gltfLoader.load(this.resolvePath(pillar.model), (gltf) => {
          const model = gltf.scene
          model.traverse((child) => {
            if (child.isMesh) {
              // Room mesh should collide
              child.userData.collidable = true

              // ✅ ADD THIS
              child.geometry.computeBoundingBox()

              // 🔥 THIS WAS MISSING
              this.onCollidable?.(child)
            }
          })
          model.position.set(x, 0, z)
          model.scale.set(1, 1.25, 1)
          this.scene.add(model)
          this.sceneObjects.push(model)
        })
      }
    }
  }

  loadFloorTiles(floorTiles, levelId) {
    if (!floorTiles.grid) return

    const { start, end, spacing } = floorTiles.grid

    // Determine if blood should be applied (levels 1-5)
    const shouldApplyBlood = levelId !== 'floor0'

    const geometry = new THREE.PlaneGeometry(2, 2)

    // Create materials with and without blood
    let cleanMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      side: THREE.DoubleSide,
    })

    let bloodyMaterial
    if (shouldApplyBlood) {
      bloodyMaterial = this.createBloodyMaterial(0x999999)
    }

    for (let x = start[0]; x <= end[0]; x += spacing[0]) {
      for (let z = start[2]; z <= end[2]; z += spacing[1]) {
        // Randomly decide if this tile gets blood (70% chance for levels 1-5)
        const useBlood = shouldApplyBlood && Math.random() < 0.7
        const material = useBlood ? bloodyMaterial : cleanMaterial

        const tile = new THREE.Mesh(geometry, material)
        tile.rotation.x = -Math.PI / 2
        tile.position.set(x, start[1], z)
        tile.userData.isFloor = true
        this.scene.add(tile)
        this.sceneObjects.push(tile)
      }
    }
  }

  addCeilingLights(grid, spacing = [24, 24]) {
    const { start, end } = grid
    const lightGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.3) // long, thin rectangle
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
    })

    for (let x = start[0]; x <= end[0]; x += spacing[0]) {
      for (let z = start[2]; z <= end[2]; z += spacing[1]) {
        const fixture = new THREE.Mesh(lightGeometry, lightMaterial)
        fixture.position.set(x, 3.25, z) // slightly below ceiling
        fixture.rotation.y = (Math.PI / 2) * (Math.random() > 0.5 ? 1 : 0) // random rotation
        this.scene.add(fixture)
        const light = new THREE.PointLight(0xffffff, 1.5, 15)
        light.position.set(x, 3.35, z)
        fixture.add(light)
      }
    }
  }

  clear() {
    // Remove all tracked scene objects
    this.sceneObjects.forEach((obj) => {
      this.scene.remove(obj)
      obj.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose())
          } else {
            child.material?.dispose()
          }
        }
      })
    })
    this.sceneObjects = []

    // Stop all mixers
    this.mixers.forEach((m) => m.stopAllAction())
    this.mixers = []

    // Reset state
    this.interactiveDoors = []
    this.elevatorController = null
    this.elevatorModel = null
  }
}

export { LevelLoader }

function combineTextures(baseTex, bloodTex) {
  const size = 1024

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')

  // 1️⃣ Draw base fabric
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(baseTex.image, 0, 0, size, size)

  // ⬇️⬇️⬇️ PUT THE PATCH LOGIC RIGHT HERE ⬇️⬇️⬇️

  const patches = THREE.MathUtils.randInt(2, 4)

  for (let i = 0; i < patches; i++) {
    const patchSize = THREE.MathUtils.randFloat(0.2, 0.35) * size

    ctx.drawImage(
      bloodTex.image,
      Math.random() * (size - patchSize),
      Math.random() * (size - patchSize),
      patchSize,
      patchSize,
    )
  }

  // ⬆️⬆️⬆️ END PATCH LOGIC ⬆️⬆️⬆️

  // 3️⃣ Optional darkening pass (blood only)
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = 0.6
  ctx.drawImage(bloodTex.image, 0, 0, size, size)

  // Reset
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  const combined = new THREE.CanvasTexture(canvas)
  combined.colorSpace = THREE.SRGBColorSpace
  combined.wrapS = combined.wrapT = THREE.RepeatWrapping
  combined.needsUpdate = true

  return combined
}

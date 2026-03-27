// public/AchievementTracker.js

window.PACKAGE_ID = '0x5474c317de64693216a661d4b48a883b38234ec9cee605ad6838eb615ed0db04'
window.REGISTRY_ID = '0x6ca7d6a850e5c07600eec12de6217a64697f504817a49442ebf2f655a29f3ab1'
window.GLOBAL_LEADERBOARD_ID = '0x27e6d4e89d7f58e4b1cc804c0b0227eee56a3763237d6c0ec53867c598da92b8'
window.FLOOR_LEADERBOARD_IDS = [
  '0x2b2ea90a76c738b8ef5f46f7fa72b8e0a1e970e4199453e59f0d433541859455',
  '0x7698ee1af9e40f34ee503af6a5c8b28ff9d1a1f484a4904de5ca42441f1f6424',
  '0x9c221aa61f92117ebe8796ed267ba19f30c6b0d16804beb539746d554fc782ed',
  '0xb902e296349c7c2dfef87031834a38bae1f3f88419f0c49aa526f7d5a5571ead',
  '0xb9e38d00171d67b60fe5cacf675768b015adb2fbdd274681f4b5506984d3c76a',
  '0xf83c8101a35831f6e30dd8a5c5125417656a7a6e0f3822082497de16b67d9d96',
]

window.ACHIEVEMENTS = {
  floor_clear_0: {
    id: 'floor_clear_0',
    title: 'First Steps',
    description: 'Stayed in the CCTV view long enough for them to see you.',
    category: 0,
    rarity: 1,
    floorIndex: 0,
    requiredKills: 0,
    requiredDamageCeiling: 18446744073709551615n,
    requiredFloorCount: 1,
    imageUrl: '/achievements/floor_clear_0.png',
  },
  floor_clear_1: {
    id: 'floor_clear_1',
    title: 'Crawler Killer',
    description: 'Eliminated all crawlers on the first floor.',
    category: 0,
    rarity: 1,
    floorIndex: 1,
    requiredKills: 1,
    requiredDamageCeiling: 18446744073709551615n,
    requiredFloorCount: 2,
    imageUrl: '/achievements/floor_clear_1.png',
  },
  floor_clear_2: {
    id: 'floor_clear_2',
    title: 'Time Keeper',
    description: 'Survived the ward for the full 90 seconds.',
    category: 3,
    rarity: 2,
    floorIndex: 2,
    requiredKills: 0,
    requiredDamageCeiling: 18446744073709551615n,
    requiredFloorCount: 3,
    imageUrl: '/achievements/floor_clear_2.png',
  },
  floor_clear_3: {
    id: 'floor_clear_3',
    title: 'Key Find',
    description: 'Located and retrieved the research keycard.',
    category: 0,
    rarity: 2,
    floorIndex: 3,
    requiredKills: 0,
    requiredDamageCeiling: 18446744073709551615n,
    requiredFloorCount: 4,
    imageUrl: '/achievements/floor_clear_3.png',
  },
  boss_kill: {
    id: 'boss_kill',
    title: 'Mutation Stopped',
    description: 'Defeated the mutated boss.',
    category: 4,
    rarity: 3,
    floorIndex: 4,
    requiredKills: 1,
    requiredDamageCeiling: 18446744073709551615n,
    requiredFloorCount: 5,
    imageUrl: '/achievements/boss_kill.png',
  },
  escapee: {
    id: 'escapee',
    title: 'Escaped',
    description: 'Reached the exit before the outbreak consumed you.',
    category: 5,
    rarity: 4,
    floorIndex: 5,
    requiredKills: 0,
    requiredDamageCeiling: 18446744073709551615n,
    requiredFloorCount: 6,
    imageUrl: '/achievements/escapee.png',
  },
  ghost_any: {
    id: 'ghost_any',
    title: 'Untouched',
    description: 'Completed a floor without taking any damage.',
    category: 1,
    rarity: 2,
    floorIndex: 255,
    requiredKills: 0,
    requiredDamageCeiling: 0n,
    requiredFloorCount: 0,
    imageUrl: '/achievements/ghost.png',
  },
  exterminator_50: {
    id: 'exterminator_50',
    title: 'Exterminator',
    description: 'Killed 50 zombies across your run.',
    category: 2,
    rarity: 2,
    floorIndex: 255,
    requiredKills: 50,
    requiredDamageCeiling: 18446744073709551615n,
    requiredFloorCount: 0,
    imageUrl: '/achievements/exterminator.png',
  },
  exterminator_100: {
    id: 'exterminator_100',
    title: 'Plague Ender',
    description: 'Killed 100 zombies across your run.',
    category: 2,
    rarity: 3,
    floorIndex: 255,
    requiredKills: 100,
    requiredDamageCeiling: 18446744073709551615n,
    requiredFloorCount: 0,
    imageUrl: '/achievements/plague_ender.png',
  },
  seen_not_dead: {
    id: 'seen_not_dead',
    title: 'On Camera',
    description: 'Stood in the CCTV view for the full 10 seconds.',
    category: 6,
    rarity: 1,
    floorIndex: 0,
    requiredKills: 0,
    requiredDamageCeiling: 18446744073709551615n,
    requiredFloorCount: 1,
    imageUrl: '/achievements/cctv.png',
  },
}

class AchievementTracker {
  constructor() {
    this.sessionKills = 0
    this.sessionDamage = 0
    this.floorStartTime = null
    this.pendingMints = []

    // These are set by initialize()
    this.suiClient = null
    this.executeTransaction = null // wallet sign+execute function
    this.playerStatsObjectId = null
    this.currentAddress = null
    this.registryObjectId = window.REGISTRY_ID

    this._injectToastStyles()
    window.addEventListener('gameEvent', (e) => this._onGameEvent(e.detail))
  }

  // ── Called by useSuiGame once wallet + stats are ready ──────────────────
  async initialize(suiClient, currentAddress, playerStatsObjectId, executeTransaction) {
    console.log('AchievementTracker.initialize called with:', {
      hasSuiClient: !!suiClient,
      currentAddress,
      playerStatsObjectId,
      hasExecuteTransaction: !!executeTransaction,
    })

    this.suiClient = suiClient
    this.currentAddress = currentAddress
    this.playerStatsObjectId = playerStatsObjectId
    // executeTransaction is the wallet adapter's sign+execute — NOT suiClient
    this.executeTransaction = executeTransaction

    console.log('AchievementTracker ready:', {
      address: currentAddress,
      statsId: playerStatsObjectId,
      hasWallet: !!executeTransaction,
      ready: this._isReady(),
    })
  }

  // ── Floor tracking ───────────────────────────────────────────────────────
  startFloor() {
    this.sessionKills = 0
    this.sessionDamage = 0
    this.floorStartTime = performance.now()
    console.log('Floor tracking started')
  }

  recordKill(isBoss = false) {
    this.sessionKills++
    window.dispatchEvent(
      new CustomEvent('gameEvent', {
        detail: { type: 'KILL', kills: this.sessionKills, isBoss },
      }),
    )
  }

  recordDamage(amount) {
    this.sessionDamage += amount
  }

  onFloorComplete(floorIndex, bossKilled = false) {
    const floorTimeMs = this.floorStartTime ? Math.round(performance.now() - this.floorStartTime) : 0

    const noHit = this.sessionDamage === 0
    console.log('Floor complete:', {
      floorIndex,
      bossKilled,
      floorTimeMs,
      kills: this.sessionKills,
      damage: this.sessionDamage,
    })

    // Queue achievements
    const clearKey = `floor_clear_${floorIndex}`
    if (window.ACHIEVEMENTS[clearKey]) this._queueMint(window.ACHIEVEMENTS[clearKey])
    if (noHit) this._queueMint(window.ACHIEVEMENTS.ghost_any)
    if (bossKilled) this._queueMint(window.ACHIEVEMENTS.boss_kill)
    this._checkKillMilestones()

    // Submit floor stats to chain immediately
    // this._submitFloorResult(floorIndex, floorTimeMs, bossKilled)
  }

  async refreshPlayerStats() {
    if (!this.suiClient || !this.playerStatsObjectId) return null
    
    try {
        const result = await this.suiClient.getObject({
            id: this.playerStatsObjectId,
            options: { showContent: true },
        })
        
        const content = result?.data?.content
        if (content?.dataType === 'moveObject' && content.fields) {
            const fields = content.fields
            const stats = {
                totalKills: Number(fields.total_kills ?? 0),
                totalScore: Number(fields.total_score ?? 0),
                floorsCompleted: Number(fields.floors_completed ?? 0),
                zeroDamageFloors: Number(fields.zero_damage_floors ?? 0),
                bossKills: Number(fields.boss_kills ?? 0),
                fastestFloorMs: Number(fields.fastest_floor_ms ?? 0),
            }
            console.log('Refreshed player stats:', stats)
            return stats
        }
    } catch (err) {
        console.error('Failed to refresh player stats:', err)
    }
    return null
}

  // ── Chain submission ─────────────────────────────────────────────────────
  async _getLeaderboardIdForFloor(floorIndex) {
    const directId = window.FLOOR_LEADERBOARD_IDS[floorIndex]

    // Verify this leaderboard has the correct floor_index
    try {
      const lb = await this.suiClient.getObject({
        id: directId,
        options: { showContent: true },
      })

      const content = lb?.data?.content
      if (content?.dataType === 'moveObject' && content.fields) {
        const lbFloorIndex = content.fields.floor_index
        console.log(`Leaderboard at index ${floorIndex} has floor_index: ${lbFloorIndex}`)

        if (lbFloorIndex === floorIndex) {
          return directId
        } else {
          console.warn(`Mismatch! Expected floor ${floorIndex}, got ${lbFloorIndex}`)
          // Search for the correct leaderboard
          for (let i = 0; i < window.FLOOR_LEADERBOARD_IDS.length; i++) {
            const checkLb = await this.suiClient.getObject({
              id: window.FLOOR_LEADERBOARD_IDS[i],
              options: { showContent: true },
            })
            const checkContent = checkLb?.data?.content
            if (checkContent?.dataType === 'moveObject' && checkContent.fields.floor_index === floorIndex) {
              console.log(`Found correct leaderboard for floor ${floorIndex} at index ${i}`)
              return window.FLOOR_LEADERBOARD_IDS[i]
            }
          }
        }
      }
    } catch (err) {
      console.error('Error checking leaderboard:', err)
    }

    return directId
  }

  async _submitFloorResult(floorIndex, floorTimeMs, bossKilled) {
    if (!this._isReady()) {
      console.warn('Cannot submit floor result — tracker not ready')
      return
    }

    const safeFloor = Math.max(0, Math.min(5, floorIndex))

    // Get the correct leaderboard ID for this floor
    const leaderboardId = await this._getLeaderboardIdForFloor(safeFloor)

    console.log('📊 Submitting floor result:', {
      floorIndex: safeFloor,
      leaderboardId: leaderboardId,
      playerStatsId: this.playerStatsObjectId,
      kills: this.sessionKills,
      damage: this.sessionDamage,
      floorTimeMs,
      bossKilled,
    })

    try {
      const txb = this._buildTx()

      txb.moveCall({
        target: `${window.PACKAGE_ID}::achievement_nft::record_floor_result`,
        arguments: [
          txb.object(this.playerStatsObjectId),
          txb.object(leaderboardId),
          txb.object(window.GLOBAL_LEADERBOARD_ID),
          txb.object('0x6'),
          txb.pure.u8(safeFloor),
          txb.pure.u64(BigInt(this.sessionKills)),
          txb.pure.u64(BigInt(Math.round(this.sessionDamage))),
          txb.pure.u64(BigInt(floorTimeMs)),
          txb.pure.bool(bossKilled),
        ],
      })

      txb.setGasBudget(100000000)

      console.log('🚀 Executing record_floor_result transaction...')
      const result = await this.executeTransaction(txb)
      console.log('✅ Floor result submitted:', result?.digest)
      return result
    } catch (err) {
      console.error('❌ Floor result submit failed:', err)
      const errorMsg = err?.message || err?.toString() || ''

      // Check for the specific error
      if (errorMsg.includes('E_INVALID_FLOOR') || errorMsg.includes('3')) {
        console.error('Floor index mismatch! Debug info:', {
          submittedFloor: safeFloor,
          leaderboardId: leaderboardId,
          // Try to get the actual floor_index from the leaderboard
        })
      }

      return null
    }
  }

  async submitAll() {
    if (!this._isReady() || this.pendingMints.length === 0) {
      console.log('submitAll: nothing to submit or not ready')
      return
    }

    // Wait a bit for previous transactions to be processed
    console.log('Waiting 3 seconds for previous transactions to be processed...')
    await new Promise((resolve) => setTimeout(resolve, 3000))

    console.log(`Minting ${this.pendingMints.length} achievements...`)
    const remaining = []

    for (const ach of this.pendingMints) {
      try {
        // First, verify the player stats have been updated
        const stats = await this.getPlayerStats()
        console.log(`Current stats for ${ach.id}:`, {
          floorsCompleted: stats?.floorsCompleted,
          totalKills: stats?.totalKills,
          zeroDamageFloors: stats?.zeroDamageFloors,
        })

        // Check if conditions are met before attempting to mint
        let conditionsMet = true
        if (ach.requiredFloorCount > 0 && stats && stats.floorsCompleted < ach.requiredFloorCount) {
          console.log(
            `Condition not met for ${ach.id}: need ${ach.requiredFloorCount} floors, have ${stats.floorsCompleted}`,
          )
          conditionsMet = false
        }
        if (ach.requiredKills > 0 && stats && stats.totalKills < ach.requiredKills) {
          console.log(`Condition not met for ${ach.id}: need ${ach.requiredKills} kills, have ${stats.totalKills}`)
          conditionsMet = false
        }

        if (!conditionsMet) {
          console.log(`Skipping ${ach.id} - conditions not met yet`)
          remaining.push(ach)
          continue
        }

        await this._mintOnChain(ach)
        console.log('✅ Minted:', ach.id)
      } catch (err) {
        const errorMsg = err?.message || err?.toString() || ''

        if (errorMsg.includes('4001') || errorMsg.includes('rejected')) {
          console.log('⏸️ User rejected transaction for:', ach.id)
          remaining.push(ach)
        } else if (errorMsg.includes('0') || errorMsg.includes('E_ALREADY_MINTED')) {
          console.log('✓ Already minted:', ach.id)
        } else if (errorMsg.includes('1') || errorMsg.includes('E_CONDITION_NOT_MET')) {
          console.log('⚠️ Conditions not met for:', ach.id, '- will retry later')
          remaining.push(ach)
        } else {
          console.warn('❌ Mint failed, will retry:', ach.id, errorMsg)
          remaining.push(ach)
        }
      }
    }

    this.pendingMints = remaining
    if (remaining.length > 0) {
      console.log(`${remaining.length} achievements remaining for next session`)
    }
  }

  async _mintOnChain(ach) {
    const txb = this._buildTx()
    const enc = (s) => Array.from(new TextEncoder().encode(String(s)))

    txb.moveCall({
      target: `${window.PACKAGE_ID}::achievement_nft::mint_achievement`,
      arguments: [
        txb.object(this.registryObjectId),
        txb.object(this.playerStatsObjectId),
        txb.object('0x6'),
        txb.pure.vector('u8', enc(ach.id)),
        txb.pure.vector('u8', enc(ach.title)),
        txb.pure.vector('u8', enc(ach.description)),
        txb.pure.u8(ach.category),
        txb.pure.u8(ach.rarity),
        txb.pure.u8(ach.floorIndex),
        txb.pure.vector('u8', enc(ach.imageUrl)),
        txb.pure.u64(BigInt(ach.requiredKills)),
        txb.pure.u64(ach.requiredDamageCeiling),
        txb.pure.u64(BigInt(ach.requiredFloorCount)),
      ],
    })

    // Set gas budget
    txb.setGasBudget(50000000) // 0.05 SUI for minting

    console.log(`Minting achievement: ${ach.id}`)
    return await this.executeTransaction(txb)
  }

  // ── Player stats ─────────────────────────────────────────────────────────
  async getPlayerStats() {
    if (!this.suiClient || !this.playerStatsObjectId) return null

    try {
      const result = await this.suiClient.getObject({
        id: this.playerStatsObjectId,
        options: { showContent: true },
      })

      const content = result?.data?.content
      // Guard: must be a Move object, not a package
      if (!content || content.dataType !== 'moveObject') return null

      const fields = content.fields
      if (!fields) return null

      return {
        totalKills: Number(fields.total_kills ?? 0),
        totalScore: Number(fields.total_score ?? 0),
        floorsCompleted: Number(fields.floors_completed ?? 0),
        zeroDamageFloors: Number(fields.zero_damage_floors ?? 0),
        bossKills: Number(fields.boss_kills ?? 0),
        fastestFloorMs: Number(fields.fastest_floor_ms ?? 0),
        displayName: fields.display_name ?? '',
      }
    } catch (err) {
      console.error('getPlayerStats failed:', err)
      return null
    }
  }

  async createPlayerStats(displayName) {
    console.log('createPlayerStats called', {
      hasSuiClient: !!this.suiClient,
      hasExecuteTransaction: !!this.executeTransaction,
      currentAddress: this.currentAddress,
    })

    if (!this._isReadyForCreation()) {
      console.warn('Cannot create player stats - not ready')
      return null
    }

    try {
      const txb = this._buildTx()
      const enc = Array.from(new TextEncoder().encode(displayName))

      txb.moveCall({
        target: `${window.PACKAGE_ID}::achievement_nft::create_player_stats`,
        arguments: [txb.pure.vector('u8', enc)],
      })

      console.log('Executing create_player_stats transaction...')
      const result = await this.executeTransaction(txb)
      console.log('Create player stats result:', result)

      // Try to get the created object ID from objectChanges
      let createdObjectId = null

      if (result?.objectChanges) {
        for (const change of result.objectChanges) {
          if (change.type === 'created' && change.objectType?.includes('PlayerStats')) {
            createdObjectId = change.objectId
            console.log('Found PlayerStats object in changes:', createdObjectId)
            break
          }
        }
      }

      // Also check effects for created objects
      if (!createdObjectId && result?.effects?.created) {
        for (const created of result.effects.created) {
          if (created.owner?.AddressOwner === this.currentAddress) {
            createdObjectId = created.reference?.objectId
            console.log('Found PlayerStats object in effects:', createdObjectId)
            break
          }
        }
      }

      if (createdObjectId) {
        this.playerStatsObjectId = createdObjectId
        console.log('PlayerStats created and set:', createdObjectId)
        return createdObjectId
      }

      // Fallback: scan owned objects
      console.log('Searching for newly created PlayerStats...')
      const owned = await this.suiClient.getOwnedObjects({
        owner: this.currentAddress,
        filter: { StructType: `${window.PACKAGE_ID}::achievement_nft::PlayerStats` },
        options: { showContent: false },
      })

      const first = owned?.data?.[0]?.data?.objectId
      if (first) {
        this.playerStatsObjectId = first
        console.log('Found PlayerStats via scan:', first)
        return first
      }

      console.error('Could not find created PlayerStats object')
      return null
    } catch (err) {
      console.error('createPlayerStats failed:', err)
      return null
    }
  }

  _isReadyForCreation() {
    return !!(this.suiClient && this.executeTransaction && this.currentAddress)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  _isReady() {
    const ready = !!(this.suiClient && this.executeTransaction && this.playerStatsObjectId)
    if (!ready) {
      console.log('Tracker not ready:', {
        hasSuiClient: !!this.suiClient,
        hasExecuteTransaction: !!this.executeTransaction,
        hasPlayerStatsObjectId: !!this.playerStatsObjectId,
      })
    }
    return ready
  }

  _buildTx() {
    // Transaction is loaded from @onelabs/sui — exposed on window by useSuiGame
    if (typeof window.SuiTransaction === 'function') {
      return new window.SuiTransaction()
    }
    throw new Error('window.SuiTransaction not set — call useSuiGame first')
  }

  _checkKillMilestones() {
    this._queueMint(window.ACHIEVEMENTS.exterminator_50)
    this._queueMint(window.ACHIEVEMENTS.exterminator_100)
  }

  _queueMint(achievement) {
    if (!achievement) return
    if (this.pendingMints.find((a) => a.id === achievement.id)) return
    this.pendingMints.push(achievement)
    this._showUnlockToast(achievement)
  }

  _showUnlockToast(achievement) {
    const el = document.createElement('div')
    el.className = 'achievement-toast'
    el.innerHTML = `
      <span class="ach-icon">🏆</span>
      <div>
        <div class="ach-title">${achievement.title}</div>
        <div class="ach-desc">${achievement.description}</div>
      </div>`
    document.body.appendChild(el)
    setTimeout(() => {
      el.classList.add('ach-fade')
      setTimeout(() => el.remove(), 500)
    }, 3500)
  }

  _injectToastStyles() {
    if (document.getElementById('ach-toast-styles')) return
    const style = document.createElement('style')
    style.id = 'ach-toast-styles'
    style.textContent = `
      .achievement-toast {
        position: fixed; bottom: 80px; right: 20px;
        background: rgba(20,16,32,0.92);
        border: 1px solid rgba(140,100,220,0.5);
        border-radius: 10px; padding: 12px 16px;
        display: flex; align-items: center; gap: 12px;
        color: #e0d4f8; font-family: monospace; font-size: 13px;
        z-index: 9999; max-width: 280px;
        animation: achSlideIn 0.3s ease;
      }
      .ach-icon { font-size: 22px; }
      .ach-title { font-weight: 600; color: #c4a0ff; font-size: 14px; }
      .ach-desc  { color: #9987b8; margin-top: 2px; }
      .ach-fade  { opacity: 0; transition: opacity 0.5s; }
      @keyframes achSlideIn {
        from { transform: translateX(120%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
    `
    document.head.appendChild(style)
  }

  _onGameEvent(detail) {
    // reserved for future real-time UI
  }
}

window.achievementTracker = new AchievementTracker()
console.log('AchievementTracker loaded')

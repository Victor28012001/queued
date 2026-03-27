// // hooks/useSuiGame.ts
// import { useEffect, useState, useCallback } from 'react'
// import { useOneWallet } from '@/contexts/WalletContext'
// import { Transaction } from '@onelabs/sui/transactions'

// export function useSuiGame() {
//     const { connected, address, client, executeTransaction } = useOneWallet()
//     const [playerStats, setPlayerStats] = useState<any>(null)
//     const [playerStatsObjectId, setPlayerStatsObjectId] = useState<string | null>(null)
//     const [isInitialized, setIsInitialized] = useState(false)

//     // Expose Transaction class on window so AchievementTracker._buildTx() works
//     useEffect(() => {
//         window.SuiTransaction = Transaction
//     }, [])

//     // Stable wallet execute function to pass into the tracker
//     const walletExecute = useCallback(
//         async (txb: any) => {
//             if (!executeTransaction) throw new Error('Wallet not connected')
//             return executeTransaction(txb)
//         },
//         [executeTransaction],
//     )

//     useEffect(() => {
//         const initTracker = async () => {
//             if (!client || !window.achievementTracker) {
//                 console.log('Waiting for client or tracker...')
//                 return
//             }

//             try {
//                 if (address) {
//                     window._currentAddress = address
//                     window._suiClient = client

//                     // Look for existing PlayerStats on-chain
//                     const owned = await client.getOwnedObjects({
//                         owner: address,
//                         filter: {
//                             StructType: `${window.PACKAGE_ID}::achievement_nft::PlayerStats`,
//                         },
//                         options: { showContent: false },
//                     })

//                     let statsId = owned?.data?.[0]?.data?.objectId ?? null

//                     if (statsId) {
//                         console.log('Found existing PlayerStats:', statsId)
//                     } else {
//                         console.log('No PlayerStats found — creating one...')
//                         // Initialize minimally so createPlayerStats can sign
//                         await window.achievementTracker.initialize(
//                             client,
//                             address,
//                             null,
//                             walletExecute
//                         )
//                         statsId = await window.achievementTracker.createPlayerStats('Survivor')
//                         console.log('Created PlayerStats:', statsId)
//                     }

//                     if (statsId) {
//                         setPlayerStatsObjectId(statsId)
//                         window._playerStatsObjectId = statsId

//                         // Full initialization with all 4 args
//                         await window.achievementTracker.initialize(
//                             client,
//                             address,
//                             statsId,
//                             walletExecute
//                         )

//                         const stats = await window.achievementTracker.getPlayerStats()
//                         if (stats) setPlayerStats(stats)
//                     }

//                     window._achievementRegistryObjectId = window.REGISTRY_ID
//                     setIsInitialized(true)
//                     console.log('Achievement tracker fully initialized')
//                 } else {
//                     console.log('No wallet address — running without chain')
//                     setIsInitialized(true)
//                 }
//             } catch (error) {
//                 console.error('Error initializing achievement tracker:', error)
//                 setIsInitialized(true)
//             }
//         }

//         if (connected && address && client) {
//             initTracker()
//         } else {
//             setIsInitialized(true)
//         }
//     }, [connected, address, client, walletExecute])

//     const getFloorLeaderboard = async (floorIndex: number) => {
//         if (!client || !window.FLOOR_LEADERBOARD_IDS) return []
//         try {
//             const result = await client.getObject({
//                 id: window.FLOOR_LEADERBOARD_IDS[floorIndex],
//                 options: { showContent: true },
//             })
//             const content = result?.data?.content
//             if (content?.dataType !== 'moveObject') return []
//             const entries = (content.fields as any)?.entries
//             return Array.isArray(entries) ? entries : []
//         } catch {
//             return []
//         }
//     }

//     const getGlobalLeaderboard = async () => {
//         if (!client || !window.GLOBAL_LEADERBOARD_ID) return []
//         try {
//             const result = await client.getObject({
//                 id: window.GLOBAL_LEADERBOARD_ID,
//                 options: { showContent: true },
//             })
//             const content = result?.data?.content
//             if (content?.dataType !== 'moveObject') return []
//             const entries = (content.fields as any)?.entries
//             return Array.isArray(entries) ? entries : []
//         } catch {
//             return []
//         }
//     }

//     const submitAchievements = async () => {
//         if (window.achievementTracker && isInitialized) {
//             await window.achievementTracker.submitAll()
//         }
//     }

//     return {
//         playerStats,
//         playerStatsObjectId,
//         isInitialized,
//         submitAchievements,
//         getFloorLeaderboard,
//         getGlobalLeaderboard,
//         isConnected: connected,
//         address,
//     }
// }


// hooks/useSuiGame.ts
import { useEffect, useState, useCallback } from 'react'
import { useOneWallet } from '@/contexts/WalletContext'
import { Transaction } from '@onelabs/sui/transactions'

export function useSuiGame() {
    const { connected, address, client, executeTransaction } = useOneWallet()
    const [playerStats, setPlayerStats] = useState<any>(null)
    const [playerStatsObjectId, setPlayerStatsObjectId] = useState<string | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)

    // Expose Transaction class on window so AchievementTracker._buildTx() works
    useEffect(() => {
        window.SuiTransaction = Transaction
        console.log('SuiTransaction set on window')
    }, [])

    useEffect(() => {
        const initTracker = async () => {
            console.log('initTracker called', { 
                hasClient: !!client, 
                hasTracker: !!window.achievementTracker,
                hasAddress: !!address,
                hasExecuteTransaction: !!executeTransaction
            })
            
            // executeTransaction is always defined from useOneWallet
            if (!client || !window.achievementTracker) {
                console.log('Waiting for client or tracker...')
                return
            }

            try {
                if (address) {
                    window._currentAddress = address
                    window._suiClient = client

                    // Initialize the tracker with the execute function
                    await window.achievementTracker.initialize(
                        client,
                        address,
                        null,
                        executeTransaction
                    )
                    console.log('Tracker initialized with wallet execute function')

                    // Look for existing PlayerStats on-chain
                    const owned = await client.getOwnedObjects({
                        owner: address,
                        filter: {
                            StructType: `${window.PACKAGE_ID}::achievement_nft::PlayerStats`,
                        },
                        options: { showContent: false },
                    })

                    let statsId = owned?.data?.[0]?.data?.objectId ?? null

                    if (statsId) {
                        console.log('Found existing PlayerStats:', statsId)
                        window._playerStatsObjectId = statsId
                        
                        await window.achievementTracker.initialize(
                            client,
                            address,
                            statsId,
                            executeTransaction
                        )
                        
                        const stats = await window.achievementTracker.getPlayerStats()
                        if (stats) {
                            console.log('PlayerStats loaded:', stats)
                            setPlayerStats(stats)
                        }
                        setPlayerStatsObjectId(statsId)
                    } else {
                        console.log('No PlayerStats found — creating one...')
                        const newStatsId = await window.achievementTracker.createPlayerStats('Survivor')
                        console.log('createPlayerStats returned:', newStatsId)
                        
                        if (newStatsId) {
                            setPlayerStatsObjectId(newStatsId)
                            window._playerStatsObjectId = newStatsId
                            
                            await window.achievementTracker.initialize(
                                client,
                                address,
                                newStatsId,
                                executeTransaction
                            )
                            
                            const stats = await window.achievementTracker.getPlayerStats()
                            if (stats) setPlayerStats(stats)
                            console.log('New PlayerStats created and loaded')
                        } else {
                            console.error('Failed to create PlayerStats')
                        }
                    }

                    window._achievementRegistryObjectId = window.REGISTRY_ID
                    setIsInitialized(true)
                    console.log('Achievement tracker fully initialized')
                } else {
                    console.log('No wallet address — running without chain')
                    setIsInitialized(true)
                }
            } catch (error) {
                console.error('Error initializing achievement tracker:', error)
                setIsInitialized(true)
            }
        }

        // Only need to check connected, address, and client
        // executeTransaction is guaranteed to exist
        if (connected && address && client) {
            initTracker()
        } else {
            console.log('Not ready to init tracker:', { 
                connected, 
                hasAddress: !!address, 
                hasClient: !!client
            })
            setIsInitialized(true)
        }
    }, [connected, address, client, executeTransaction])

    const getFloorLeaderboard = async (floorIndex: number) => {
        if (!client || !window.FLOOR_LEADERBOARD_IDS) return []
        try {
            const result = await client.getObject({
                id: window.FLOOR_LEADERBOARD_IDS[floorIndex],
                options: { showContent: true },
            })
            const content = result?.data?.content
            if (content?.dataType !== 'moveObject') return []
            const entries = (content.fields as any)?.entries
            return Array.isArray(entries) ? entries : []
        } catch {
            return []
        }
    }

    const getGlobalLeaderboard = async () => {
        if (!client || !window.GLOBAL_LEADERBOARD_ID) return []
        try {
            const result = await client.getObject({
                id: window.GLOBAL_LEADERBOARD_ID,
                options: { showContent: true },
            })
            const content = result?.data?.content
            if (content?.dataType !== 'moveObject') return []
            const entries = (content.fields as any)?.entries
            return Array.isArray(entries) ? entries : []
        } catch {
            return []
        }
    }

    const submitAchievements = async () => {
        if (window.achievementTracker && isInitialized) {
            console.log('Submitting achievements...')
            await window.achievementTracker.submitAll()
        }
    }

    return {
        playerStats,
        playerStatsObjectId,
        isInitialized,
        submitAchievements,
        getFloorLeaderboard,
        getGlobalLeaderboard,
        isConnected: connected,
        address,
    }
}
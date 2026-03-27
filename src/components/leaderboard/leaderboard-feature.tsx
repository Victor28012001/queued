// components/leaderboard/LeaderboardFeature.tsx
import { useState, useEffect, useCallback } from 'react'
import { AppHero } from '@/components/app-hero'
import { ellipsify } from '@/lib/utils'
import { useOneWallet } from '@/hooks/useOneWallet'
import { useSuiGame } from '@/hooks/useSuiGame'
import { extractMoveObjectFields } from '@/helpers/extractEntries'

interface LeaderboardEntry {
  player: string
  display_name: string
  score: number
  kills: number
  damage_taken: number
  floor_time_ms: number
  ghost_run: boolean
  recorded_at: number
}

type LeaderboardType = 'global' | 'floor'
type FloorIndex = 0 | 1 | 2 | 3 | 4 | 5

export default function LeaderboardFeature() {
  const { connected, address, connect, isWalletInstalled, installWallet } = useOneWallet()
  const { playerStats } = useSuiGame()
  const { client } = useOneWallet()

  const [activeTab, setActiveTab]           = useState<LeaderboardType>('global')
  const [selectedFloor, setSelectedFloor]   = useState<FloorIndex>(0)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading]               = useState(true)
  const [playerRank, setPlayerRank]         = useState<{ rank: number; score: number } | null>(null)

  const floorNames: Record<FloorIndex, string> = {
    0: 'Floor 0 - Medical Bay',
    1: 'Floor 1 - Crawler Ward',
    2: 'Floor 2 - Survival Ward',
    3: 'Floor 3 - Research Wing',
    4: 'Floor 4 - Boss Arena',
    5: 'Floor 5 - Escape Route',
  }

  // ── Leaderboard fetchers using extractMoveObjectFields ───────────────────
  const getFloorLeaderboard = useCallback(async (floorIndex: number): Promise<LeaderboardEntry[]> => {
    if (!client || !window.FLOOR_LEADERBOARD_IDS) return []
    try {
      const result = await client.getObject({
        id: window.FLOOR_LEADERBOARD_IDS[floorIndex],
        options: { showContent: true },
      })
      const fields  = extractMoveObjectFields(result)
      const entries = fields?.entries ?? []
      return Array.isArray(entries) ? entries : []
    } catch (err) {
      console.error('Error fetching floor leaderboard:', err)
      return []
    }
  }, [client])

  const getGlobalLeaderboard = useCallback(async (): Promise<LeaderboardEntry[]> => {
    if (!client || !window.GLOBAL_LEADERBOARD_ID) return []
    try {
      const result = await client.getObject({
        id: window.GLOBAL_LEADERBOARD_ID,
        options: { showContent: true },
      })
      const fields  = extractMoveObjectFields(result)
      const entries = fields?.entries ?? []
      return Array.isArray(entries) ? entries : []
    } catch (err) {
      console.error('Error fetching global leaderboard:', err)
      return []
    }
  }, [client])

  // ── Load leaderboard on tab / floor change ───────────────────────────────
  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true)
      try {
        let data: LeaderboardEntry[] = []

        if (activeTab === 'global') {
          data = await getGlobalLeaderboard()
        } else {
          data = await getFloorLeaderboard(selectedFloor)
        }

        const sortedData = [...data].sort((a, b) => b.score - a.score)
        setLeaderboardData(sortedData)

        if (address) {
          const rank  = sortedData.findIndex((e) => e.player === address) + 1
          const score = sortedData.find((e) => e.player === address)?.score ?? 0
          setPlayerRank(rank > 0 ? { rank, score } : null)
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [activeTab, selectedFloor, address, getFloorLeaderboard, getGlobalLeaderboard])

  // ── Formatting helpers ───────────────────────────────────────────────────
  const formatTime = (ms: number): string => {
    if (!ms) return 'N/A'
    const s   = Math.floor(ms / 1000)
    const m   = Math.floor(s / 60)
    const rem = s % 60
    return m > 0 ? `${m}m ${rem}s` : `${s}s`
  }

  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString()

  const getRankBadgeColor = (rank: number): string => {
    if (rank === 1) return 'bg-yellow-500 text-black'
    if (rank === 2) return 'bg-gray-400 text-black'
    if (rank === 3) return 'bg-amber-600 text-white'
    return 'bg-gray-700 text-gray-300'
  }

  const handleConnect = () => {
    if (isWalletInstalled()) connect()
    else installWallet()
  }

  // ── Not connected ────────────────────────────────────────────────────────
  if (!connected || !address) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">
            <div>
              <h1 className="text-4xl font-bold mb-4">Leaderboard</h1>
              <p className="mb-6 text-gray-400">
                Connect your wallet to view your rank and compete with other survivors!
              </p>
              <button
                onClick={handleConnect}
                className="btn btn-primary bg-red-700 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-bold"
              >
                {isWalletInstalled() ? 'Connect Wallet' : 'Install OneWallet'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Connected ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <AppHero
        title="Leaderboard"
        subtitle="Compete with other survivors and claim your spot in the rankings!"
      >
        <div className="mb-6 text-center">
          <p className="font-mono text-sm text-gray-400">Connected: {ellipsify(address)}</p>

          {playerStats && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-400">Total Score</div>
                <div className="text-xl font-bold text-yellow-400">{playerStats.totalScore ?? 0}</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-400">Total Kills</div>
                <div className="text-xl font-bold text-red-400">{playerStats.totalKills ?? 0}</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-400">Floors Completed</div>
                <div className="text-xl font-bold text-green-400">{playerStats.floorsCompleted ?? 0}</div>
              </div>
              <div className="bg-gray-800 p-3 rounded-lg">
                <div className="text-gray-400">Zero Damage Floors</div>
                <div className="text-xl font-bold text-blue-400">{playerStats.zeroDamageFloors ?? 0}</div>
              </div>
            </div>
          )}
        </div>
      </AppHero>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        {(['global', 'floor'] as LeaderboardType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-4 font-bold transition-colors capitalize ${
              activeTab === tab
                ? 'text-red-500 border-b-2 border-red-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'global' ? 'Global Leaderboard' : 'Floor Leaderboard'}
          </button>
        ))}
      </div>

      {/* Floor selector */}
      {activeTab === 'floor' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Select Floor</label>
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(parseInt(e.target.value) as FloorIndex)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-red-500"
          >
            {Object.entries(floorNames).map(([index, name]) => (
              <option key={index} value={index}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Player rank card */}
      {playerRank && (
        <div className={`mb-6 p-4 rounded-lg ${getRankBadgeColor(playerRank.rank)}`}>
          <div className="flex justify-between items-center">
            <div>
              <span className="font-bold">Your Rank</span>
              <span className="ml-2 text-2xl font-bold">#{playerRank.rank}</span>
            </div>
            <div>
              <span className="font-bold">Your Score</span>
              <span className="ml-2 text-xl font-bold">{playerRank.score}</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
          <p className="mt-4 text-gray-400">Loading leaderboard...</p>
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <p className="text-gray-400">No entries yet. Be the first to complete a floor!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="pb-3 px-4">Rank</th>
                <th className="pb-3 px-4">Player</th>
                <th className="pb-3 px-4">Score</th>
                <th className="pb-3 px-4">Kills</th>
                <th className="pb-3 px-4">Damage Taken</th>
                <th className="pb-3 px-4">Time</th>
                <th className="pb-3 px-4">Ghost Run</th>
                <th className="pb-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((entry, index) => {
                const rank            = index + 1
                const isCurrentPlayer = entry.player === address

                return (
                  <tr
                    key={`${entry.player}-${rank}`}
                    className={`border-b border-gray-800 hover:bg-gray-800 transition-colors ${
                      isCurrentPlayer ? 'bg-gray-800 bg-opacity-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex w-8 h-8 rounded-full items-center justify-center font-bold ${getRankBadgeColor(rank)}`}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {entry.display_name
                        ? `${entry.display_name} (${ellipsify(entry.player)})`
                        : ellipsify(entry.player)}
                      {isCurrentPlayer && (
                        <span className="ml-2 text-xs text-red-400">(You)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-yellow-400">{entry.score}</td>
                    <td className="py-3 px-4 text-red-400">{entry.kills}</td>
                    <td className="py-3 px-4">{entry.damage_taken}</td>
                    <td className="py-3 px-4">{formatTime(entry.floor_time_ms)}</td>
                    <td className="py-3 px-4">
                      {entry.ghost_run ? (
                        <span className="text-green-400">✓ Ghost</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {formatDate(entry.recorded_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats summary */}
      {leaderboardData.length > 0 && (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="font-bold mb-2">Leaderboard Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Players:</span>
              <span className="ml-2 font-bold">{leaderboardData.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Highest Score:</span>
              <span className="ml-2 font-bold text-yellow-400">
                {leaderboardData[0]?.score ?? 0}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total Kills:</span>
              <span className="ml-2 font-bold text-red-400">
                {leaderboardData.reduce((sum, e) => sum + e.kills, 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Ghost Runs:</span>
              <span className="ml-2 font-bold text-green-400">
                {leaderboardData.filter((e) => e.ghost_run).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
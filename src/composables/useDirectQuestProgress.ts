import { ref, onMounted } from 'vue'
import {
  type ingameScoreboardBottomPlayerData,
  type itemWithAsset,
  type tabPlayer,
  type ingameSideInfoPage,
  getRoleQuest,
} from '@bluebottle_gg/league-broadcast-client'

export interface DirectPlayerQuest {
  championName: string
  summonerName: string
  team: string // 'ORDER' | 'CHAOS'
  position: string // 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY'
  level: number
  creepScore: number
  jungleItem?: { itemId: number; count: number }
  supportItem?: { itemId: number; count: number }
  cullItem?: { itemId: number; count: number }
  hasTeleport: boolean
  hasSmite: boolean
}

const directPlayersByChamp = ref<Record<string, DirectPlayerQuest>>({})
const directPlayersByName = ref<Record<string, DirectPlayerQuest>>({})
const liveGameTime = ref<number>(0)

let isPolling = false
let pollTimer: ReturnType<typeof setInterval> | null = null

function cleanName(name?: string): string {
  if (!name) return ''
  const parts = name.split('#')
  return (parts[0] || '').trim().toLowerCase()
}

function isJungleItemId(id: number): boolean {
  return (id >= 1090 && id <= 1095) || (id >= 1101 && id <= 1106)
}

function isSupportItemId(id: number): boolean {
  return (id >= 1190 && id <= 1250) || (id >= 3850 && id <= 3877)
}

function isSupportTier3(id: number): boolean {
  return [1202, 1220, 1221, 1222, 1223, 1224, 3867, 3869, 3870, 3871, 3876, 3877, 3853, 3857, 3860, 3864].includes(id)
}

function isSupportTier2(id: number): boolean {
  return [1201, 3866, 3851, 3855, 3859, 3863].includes(id)
}

function isSupportTier1(id: number): boolean {
  return [1200, 3865, 3850, 3854, 3858, 3862].includes(id)
}

async function pollRiotClient() {
  try {
    const res = await fetch('/riot-api/liveclientdata/allgamedata')
    if (!res.ok) return
    const data = await res.json()
    if (!data) return

    if (data.gameData?.gameTime) {
      liveGameTime.value = data.gameData.gameTime
    }

    const allPlayers = data.allPlayers
    if (!allPlayers || !Array.isArray(allPlayers)) return

    const byChamp: Record<string, DirectPlayerQuest> = {}
    const byName: Record<string, DirectPlayerQuest> = {}

    for (const p of allPlayers) {
      const champKey = (p.championName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const nameKey = cleanName(p.summonerName || p.riotIdGameName)

      let jungleItem: { itemId: number; count: number } | undefined
      let supportItem: { itemId: number; count: number } | undefined
      let cullItem: { itemId: number; count: number } | undefined

      if (Array.isArray(p.items)) {
        for (const it of p.items) {
          const id = it.itemID
          const count = it.count ?? it.charges ?? 0
          if (isJungleItemId(id)) {
            jungleItem = { itemId: id, count }
          } else if (isSupportItemId(id)) {
            supportItem = { itemId: id, count }
          } else if (id === 1083) {
            cullItem = { itemId: id, count }
          }
        }
      }

      let hasTeleport = false
      let hasSmite = false
      const spells = [p.summonerSpells?.summonerSpellOne, p.summonerSpells?.summonerSpellTwo]
      for (const sp of spells) {
        const raw = (sp?.rawDisplayName || sp?.displayName || '').toLowerCase()
        if (raw.includes('teleport')) hasTeleport = true
        if (raw.includes('smite')) hasSmite = true
      }

      const questInfo: DirectPlayerQuest = {
        championName: p.championName || '',
        summonerName: p.summonerName || '',
        team: p.team || '',
        position: p.position || '',
        level: p.level || 1,
        creepScore: p.scores?.creepScore || 0,
        jungleItem,
        supportItem,
        cullItem,
        hasTeleport,
        hasSmite,
      }

      if (champKey) byChamp[champKey] = questInfo
      if (nameKey) byName[nameKey] = questInfo
    }

    directPlayersByChamp.value = byChamp
    directPlayersByName.value = byName
  } catch {
    // Game not active or endpoint unavailable
  }
}

export function findMatchingDirectPlayer(
  player?: ingameScoreboardBottomPlayerData,
): DirectPlayerQuest | undefined {
  if (!player) return undefined

  // 1. Match by champion name
  const champ = (player.champion?.name || player.champion?.alias || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (champ && directPlayersByChamp.value[champ]) {
    return directPlayersByChamp.value[champ]
  }

  // 2. Match by player display name
  const dName = cleanName(player.displayName || player.name)
  if (dName && directPlayersByName.value[dName]) {
    return directPlayersByName.value[dName]
  }

  return undefined
}

export function calculatePlayerQuest(
  player: ingameScoreboardBottomPlayerData | undefined,
  roleIndex: number, // 0: TOP, 1: JGL, 2: MID, 3: BOT, 4: SUP
  currentGameTime: number,
  isMocking = false,
  isMirror = false,
  tabP?: tabPlayer,
  sideInfoPage?: ingameSideInfoPage,
): { progress: number; isComplete: boolean } {
  // 1. First priority: Check LeagueBroadcast official slot 8 quest item (Real Server Data)
  if (player) {
    const roleQuestItem = getRoleQuest(player)
    if (roleQuestItem) {
      if (roleQuestItem.id === 1220) {
        return { progress: 100, isComplete: true }
      }
      const stats = roleQuestItem.stats
      if (stats && stats.length >= 2) {
        // In LeagueBroadcast Server: stats[0] is current, stats[1] is max target
        const cur = stats[0] ?? 0
        const max = stats[1] ?? 1
        if (max > 0) {
          const pct = Math.min(100, Math.max(0, Math.round((cur / max) * 100)))
          return { progress: pct, isComplete: pct >= 100 }
        }
      }
    }
  }

  // 2. Second priority: Check LeagueBroadcast SideInfo RoleQuest if active
  if (sideInfoPage && (sideInfoPage as any).type === 'RoleQuest' && Array.isArray(sideInfoPage.players)) {
    const champKey = (player?.champion?.name || player?.champion?.alias || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const pName = cleanName(player?.displayName || player?.name)
    const row = sideInfoPage.players.find((r) => {
      const rChamp = (r.champion?.name || r.champion?.alias || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const rName = cleanName(r.displayName || r.playerName)
      return (champKey && rChamp === champKey) || (pName && rName === pName)
    })
    if (row && typeof (row.curValue ?? row.displayValue) === 'number') {
      const val = Math.min(100, Math.max(0, Math.round(row.curValue ?? row.displayValue ?? 0)))
      return { progress: val, isComplete: val >= 100 }
    }
  }

  // If in demo / mock mode without slot 8: sample values from reference
  if (isMocking || (!player && currentGameTime === 0)) {
    const mockProgress = isMirror
      ? [40, 25, 40, 30, 30] // Red team (BLG) in reference
      : [40, 35, 40, 50, 30] // Blue team (JDG) in reference
    const prog = mockProgress[roleIndex] ?? 40
    return { progress: prog, isComplete: prog >= 100 }
  }


  const direct = findMatchingDirectPlayer(player)
  const gTime = Math.max(currentGameTime, liveGameTime.value)
  const items = player?.items || []

  // Check if player has Teleport
  let hasTeleport = direct?.hasTeleport ?? false
  if (!hasTeleport && tabP?.abilities) {
    for (const ab of tabP.abilities) {
      const icon = (ab?.assets?.iconAsset || (ab as any)?.name || (ab as any)?.displayName || '').toLowerCase()
      if (icon.includes('teleport')) {
        hasTeleport = true
        break
      }
    }
  }

  // 1. JUNGLE (roleIndex === 1)
  if (roleIndex === 1) {
    const jungleIt = items.find((it) => it && isJungleItemId(it.id))
    const directJungle = direct?.jungleItem

    if (jungleIt || directJungle) {
      // In modern League: Jungle egg starts at 40 treats (stacks) and counts down to 0
      const treats = jungleIt
        ? (jungleIt.charges ?? jungleIt.count ?? jungleIt.stacks ?? 0)
        : (directJungle?.count ?? 0)

      if (treats > 0 && treats <= 40) {
        // e.g. 18 treats remaining => (40 - 18) / 40 = 55%
        // e.g. 9 treats remaining => (40 - 9) / 40 = 77.5% (~78%)
        const progress = Math.min(99, Math.max(0, Math.round(((40 - treats) / 40) * 100)))
        return { progress, isComplete: false }
      }
    }

    // If jungle item is consumed/gone from inventory:
    // It normally evolves after eating 40 treats (usually 14-16 minutes in game)
    if (gTime >= 840) {
      return { progress: 100, isComplete: true }
    }

    // If pet item exists or early game:
    const est = Math.min(95, Math.max(0, Math.round((gTime / 900) * 100)))
    return { progress: est, isComplete: false }
  }

  // 2. SUPPORT (roleIndex === 4)
  if (roleIndex === 4) {
    const supIt = items.find((it) => it && isSupportItemId(it.id))
    const id = supIt?.id ?? direct?.supportItem?.itemId ?? 0

    if (id > 0) {
      if (isSupportTier3(id)) {
        return { progress: 100, isComplete: true }
      }
      if (isSupportTier2(id)) {
        // Tier 2 (e.g. Runic Compass 3866 / 1201):
        // Upgrades to Tier 3 around 15:00 - 18:00 (approx 960s).
        // Progress ranges from 50% to 99%.
        // At 10:09 (609s): 50 + ((609 - 420) / 540) * 50 = 67.5% (~68%)
        const t2Progress = 50 + Math.min(48, Math.max(0, Math.round(((Math.max(0, gTime - 420)) / 540) * 50)))
        return { progress: t2Progress, isComplete: false }
      }
      if (isSupportTier1(id)) {
        // Tier 1 (e.g. World Atlas 3865 / 1200):
        // Upgrades to Tier 2 around 07:00 (420s).
        // Progress ranges from 0% to 50%.
        const t1Progress = Math.min(50, Math.max(0, Math.round(((Math.max(0, gTime - 65)) / 355) * 50)))
        return { progress: t1Progress, isComplete: false }
      }
    }

    // Fallback if support item wasn't matched
    if (gTime >= 960) {
      return { progress: 100, isComplete: true }
    }
    const est = Math.min(95, Math.max(0, Math.round((gTime / 960) * 100)))
    return { progress: est, isComplete: false }
  }

  // 3. TOP (roleIndex === 0) & MID (roleIndex === 2)
  if (roleIndex === 0 || roleIndex === 2) {
    if (hasTeleport) {
      // Unleashed Teleport unlocks at exactly 10:00 (600s)
      const tpProgress = Math.min(100, Math.max(0, Math.round((gTime / 600) * 100)))
      return { progress: tpProgress, isComplete: gTime >= 600 }
    }

    // If player does NOT have Teleport (e.g. Ignite / Ghost):
    // Lane quest is Laning Phase / Turret Plates which lasts until 14:00 (840s)
    const laneProgress = Math.min(100, Math.max(0, Math.round((gTime / 840) * 100)))
    return { progress: laneProgress, isComplete: gTime >= 840 }
  }

  // 4. BOT (roleIndex === 3)
  if (roleIndex === 3) {
    const cullIt = items.find((it) => it && it.id === 1083) || direct?.cullItem
    if (cullIt) {
      const cAny = cullIt as any
      const remaining = cAny.charges ?? cAny.count ?? cAny.stacks ?? 0
      if (remaining > 0 && remaining <= 100) {
        // e.g. 36 minions remaining => 100 - 36 = 64%
        const cullProgress = Math.round(((100 - remaining) / 100) * 100)
        return { progress: Math.min(99, Math.max(0, cullProgress)), isComplete: false }
      }
    }

    // Without Cull: Laning Phase / Turret Plates quest up to 14:00 (840s)
    const botProgress = Math.min(100, Math.max(0, Math.round((gTime / 840) * 100)))
    return { progress: botProgress, isComplete: gTime >= 840 }
  }

  return { progress: 0, isComplete: false }
}

export function useDirectQuestProgress() {
  onMounted(() => {
    if (!isPolling) {
      isPolling = true
      pollRiotClient()
      pollTimer = setInterval(pollRiotClient, 1500)
    }
  })

  return {
    directPlayersByChamp,
    directPlayersByName,
    liveGameTime,
    calculatePlayerQuest,
  }
}

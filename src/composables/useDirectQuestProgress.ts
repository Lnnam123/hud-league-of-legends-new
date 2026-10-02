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

const QUEST_REWARD_IDS = {
  TOP_TP: 1220, // Unleashed Teleport (Top Lane Quest Reward)
  TOP_ALT: 1221, // Top Lane Quest Reward
  MID: 1206, // Mid Lane Quest Reward
  SUPPORT: 1208, // Support Quest Reward
  JUNGLE: 1209, // Jungle Quest Reward
}

const SUPPORT_TIER_3_IDS = new Set([
  3867, 3869, 3870, 3871, 3876, 3877, 3853, 3857, 3860, 3864,
])

const SUPPORT_TIER_2_IDS = new Set([3866, 3851, 3855, 3859, 3863])
const SUPPORT_TIER_1_IDS = new Set([3865, 3850, 3854, 3858, 3862])

function isJungleItemId(id: number): boolean {
  return (id >= 1090 && id <= 1095) || (id >= 1101 && id <= 1106)
}

function isSupportItemId(id: number): boolean {
  return (
    id === QUEST_REWARD_IDS.SUPPORT ||
    SUPPORT_TIER_3_IDS.has(id) ||
    SUPPORT_TIER_2_IDS.has(id) ||
    SUPPORT_TIER_1_IDS.has(id)
  )
}

function isSupportTier3(id: number): boolean {
  return SUPPORT_TIER_3_IDS.has(id)
}

function isSupportTier2(id: number): boolean {
  return SUPPORT_TIER_2_IDS.has(id)
}

function isSupportTier1(id: number): boolean {
  return SUPPORT_TIER_1_IDS.has(id)
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
  // If no player data and game has not started, provide graceful placeholder
  if (!player && (!currentGameTime || currentGameTime === 0)) {
    const mockProgress = isMirror
      ? [40, 25, 40, 30, 30] // Red team
      : [40, 35, 40, 50, 30] // Blue team
    const prog = mockProgress[roleIndex] ?? 40
    return { progress: prog, isComplete: prog >= 100 }
  }

  // 1. Check LeagueBroadcast SideInfo RoleQuest if active broadcast page is displayed
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

  // 2. Check official quest item from server (slot 8 or displayName containing 'Quest')
  const items = player?.items || []
  const hasReward = (id: number) => items.some((it) => it && it.id === id)
  const qItem = items.find(
    (it) =>
      it &&
      (it.displayName?.toLowerCase().includes('quest') ||
        (it.slot === 8 && it.id >= 1200 && it.id <= 1230)),
  )

  if (qItem) {
    if ([QUEST_REWARD_IDS.TOP_TP, QUEST_REWARD_IDS.TOP_ALT, QUEST_REWARD_IDS.MID, QUEST_REWARD_IDS.SUPPORT, QUEST_REWARD_IDS.JUNGLE].includes(qItem.id)) {
      return { progress: 100, isComplete: true }
    }
    const stats = qItem.stats
    const cur = stats?.[0]
    const max = stats?.[1]
    if (typeof cur === 'number' && typeof max === 'number' && max > 0) {
      const pct = Math.min(100, Math.max(0, Math.round((cur / max) * 100)))
      return { progress: pct, isComplete: pct >= 100 }
    }
  }

  const direct = findMatchingDirectPlayer(player)
  const gTime = Math.max(currentGameTime, liveGameTime.value)

  // Check summoner spells and abilities from tabPlayer
  const abilities = tabP?.abilities || []
  let hasTeleport = direct?.hasTeleport ?? false
  let isTeleportUpgraded = false
  let hasSmite = direct?.hasSmite ?? false
  let isSmiteAvatar = false

  for (const ab of abilities) {
    const rawId = (ab?.identifier || '').toLowerCase()
    const rawName = (ab?.displayName || '').toLowerCase()
    const spellName = (ab?.assets?.spellName || '').toLowerCase()
    const allText = `${rawId} ${rawName} ${spellName}`

    if (allText.includes('teleport')) {
      hasTeleport = true
      if (allText.includes('upgrade') || allText.includes('unleashed')) {
        isTeleportUpgraded = true
      }
    }
    if (allText.includes('smite')) {
      hasSmite = true
      if (allText.includes('avatar') || allText.includes('primal')) {
        isSmiteAvatar = true
      }
    }
  }

  // Also check player spells
  const pAny = player as any
  const pSpells = [pAny?.spell1, pAny?.spell2]
  for (const sp of pSpells) {
    const txt = (sp?.displayName || sp?.name || '').toLowerCase()
    if (txt.includes('teleport')) hasTeleport = true
    if (txt.includes('smite')) hasSmite = true
  }

  // 1. TOP LANE (roleIndex === 0)
  if (roleIndex === 0) {
    if (hasReward(QUEST_REWARD_IDS.TOP_TP) || hasReward(QUEST_REWARD_IDS.TOP_ALT) || isTeleportUpgraded) {
      return { progress: 100, isComplete: true }
    }
    if (hasTeleport) {
      // Unleashed Teleport unlocks at exactly 10:00 (600s)
      if (gTime >= 600) return { progress: 100, isComplete: true }
      const tpProgress = Math.min(99, Math.max(0, Math.round((gTime / 600) * 100)))
      return { progress: tpProgress, isComplete: false }
    }
    // No Teleport: Turret plates fall at 14:00 (840s)
    if (gTime >= 840) return { progress: 100, isComplete: true }
    const laneProgress = Math.min(99, Math.max(0, Math.round((gTime / 840) * 100)))
    return { progress: laneProgress, isComplete: false }
  }

  // 2. JUNGLE (roleIndex === 1)
  if (roleIndex === 1) {
    if (hasReward(QUEST_REWARD_IDS.JUNGLE) || isSmiteAvatar) {
      return { progress: 100, isComplete: true }
    }
    const petItem = items.find((it) => it && isJungleItemId(it.id)) || direct?.jungleItem
    if (petItem) {
      const pAny = petItem as any
      const treats = pAny.charges ?? pAny.count ?? pAny.stacks ?? 0
      if (treats > 0 && treats <= 40) {
        const progress = Math.min(99, Math.max(0, Math.round(((40 - treats) / 40) * 100)))
        return { progress, isComplete: false }
      }
      if (treats === 0 && gTime > 600) {
        return { progress: 100, isComplete: true }
      }
    }
    if (gTime >= 840) {
      return { progress: 100, isComplete: true }
    }
    const est = Math.min(95, Math.max(0, Math.round((gTime / 840) * 100)))
    return { progress: est, isComplete: false }
  }

  // 3. MID LANE (roleIndex === 2)
  if (roleIndex === 2) {
    if (hasReward(QUEST_REWARD_IDS.MID) || (hasTeleport && isTeleportUpgraded)) {
      return { progress: 100, isComplete: true }
    }
    if (hasTeleport) {
      if (gTime >= 600) return { progress: 100, isComplete: true }
      const tpProgress = Math.min(99, Math.max(0, Math.round((gTime / 600) * 100)))
      return { progress: tpProgress, isComplete: false }
    }
    if (gTime >= 840) return { progress: 100, isComplete: true }
    const laneProgress = Math.min(99, Math.max(0, Math.round((gTime / 840) * 100)))
    return { progress: laneProgress, isComplete: false }
  }

  // 4. BOT LANE (roleIndex === 3)
  if (roleIndex === 3) {
    const cull = items.find((it) => it && it.id === 1083) || direct?.cullItem
    if (cull) {
      const cAny = cull as any
      const remaining = cAny.charges ?? cAny.count ?? cAny.stacks ?? 0
      if (remaining > 0 && remaining <= 100) {
        const cullProgress = Math.round(((100 - remaining) / 100) * 100)
        return { progress: Math.min(99, Math.max(0, cullProgress)), isComplete: false }
      }
    }
    if (gTime >= 840) return { progress: 100, isComplete: true }
    const botProgress = Math.min(99, Math.max(0, Math.round((gTime / 840) * 100)))
    return { progress: botProgress, isComplete: false }
  }

  // 5. SUPPORT (roleIndex === 4)
  if (roleIndex === 4) {
    if (hasReward(QUEST_REWARD_IDS.SUPPORT) || items.some((it) => it && SUPPORT_TIER_3_IDS.has(it.id))) {
      return { progress: 100, isComplete: true }
    }
    const supIt = items.find((it) => it && isSupportItemId(it.id))
    const id = supIt?.id ?? direct?.supportItem?.itemId ?? 0

    if (id > 0) {
      if (SUPPORT_TIER_3_IDS.has(id)) {
        return { progress: 100, isComplete: true }
      }
      if (SUPPORT_TIER_2_IDS.has(id)) {
        const stats = supIt?.stats
        const gold = (typeof stats?.[3] === 'number' && stats[3] > 0) ? stats[3] : (stats?.[0] ?? 0)
        if (typeof gold === 'number' && gold > 0) {
          const goldPct = Math.min(99, Math.max(50, Math.round((gold / 1000) * 100)))
          return { progress: goldPct, isComplete: false }
        }
        const t2Progress = 50 + Math.min(48, Math.max(0, Math.round(((Math.max(0, gTime - 420)) / 480) * 50)))
        return { progress: t2Progress, isComplete: false }
      }
      if (SUPPORT_TIER_1_IDS.has(id)) {
        const stats = supIt?.stats
        const gold = (typeof stats?.[3] === 'number' && stats[3] > 0) ? stats[3] : (stats?.[0] ?? 0)
        if (typeof gold === 'number' && gold > 0) {
          const goldPct = Math.min(50, Math.max(0, Math.round((gold / 500) * 50)))
          return { progress: goldPct, isComplete: false }
        }
        const t1Progress = Math.min(50, Math.max(0, Math.round(((Math.max(0, gTime - 65)) / 355) * 50)))
        return { progress: t1Progress, isComplete: false }
      }
    }

    if (gTime >= 960) {
      return { progress: 100, isComplete: true }
    }
    const est = Math.min(95, Math.max(0, Math.round((gTime / 960) * 100)))
    return { progress: est, isComplete: false }
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

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useClient } from '@/client'
import { useIsInGame, useIngameSelector } from '@/composables/useIngame'
import { type announcerEvent, AnnouncementType } from '@bluebottle_gg/league-broadcast-client'
import KillFeedEntry, { type FeedItem } from './KillFeedEntry.vue'

// Import objective icons
import Fire from '@/assets/dragon/fire.png'
import Earth from '@/assets/dragon/earth.png'
import Water from '@/assets/dragon/water.png'
import Air from '@/assets/dragon/air.png'
import Hextech from '@/assets/dragon/hextech.png'
import Chemtech from '@/assets/dragon/chemtech.png'
import Elder from '@/assets/dragon/elder.png'
import BaronImg from '@/assets/baron/baron-icon.svg?url'
import TowerImg from '@/assets/tower.png'
import HeraldImg from '@/assets/baron/herald.png'

const MAX_ENTRIES = 5
const DISPLAY_DURATION_MS = 6000
const STAGGER_STEP_MS = 100
const BATCH_RESET_MS = 150

const client = useClient()
const isInGame = useIsInGame()
const scoreboard = useIngameSelector((s) => s.gameData.scoreboard)
const scoreboardBottom = useIngameSelector((s) => s.gameData.scoreboardBottom)

const entries = ref<FeedItem[]>([])
let nextId = 0
const timers = new Map<number, number>()
let batchCount = 0
let batchResetTimer: number | undefined

function addEntry(entry: FeedItem) {
  entries.value.push(entry)

  // Trim oldest entries beyond the cap, clearing their timers
  while (entries.value.length > MAX_ENTRIES) {
    const removed = entries.value.shift()!
    const t = timers.get(removed.id)
    if (t !== undefined) {
      clearTimeout(t)
      timers.delete(removed.id)
    }
  }

  // Auto-remove after display duration
  const timer = setTimeout(() => {
    const idx = entries.value.findIndex((e) => e.id === entry.id)
    if (idx > -1) entries.value.splice(idx, 1)
    timers.delete(entry.id)
  }, DISPLAY_DURATION_MS) as unknown as number

  timers.set(entry.id, timer)
}

function getDragonIcon(type?: string) {
  switch ((type || '').toLowerCase()) {
    case 'fire':
      return Fire
    case 'earth':
      return Earth
    case 'water':
      return Water
    case 'air':
      return Air
    case 'hextech':
      return Hextech
    case 'chemtech':
      return Chemtech
    case 'elder':
      return Elder
    default:
      return Fire
  }
}

function getDragonNameVi(type?: string) {
  switch ((type || '').toLowerCase()) {
    case 'fire':
      return 'Rồng Lửa'
    case 'earth':
      return 'Rồng Đất'
    case 'water':
      return 'Rồng Nước'
    case 'air':
      return 'Rồng Gió'
    case 'hextech':
      return 'Rồng Công Nghệ'
    case 'chemtech':
      return 'Rồng Hoá Kỹ'
    case 'elder':
      return 'Rồng Ngàn Tuổi'
    default:
      return 'Rồng Nguyên Tố'
  }
}

// Champion lookup helpers for objective slayers
function findChampion(identifier?: any, teamId?: number): { name: string; squareImg: string } | undefined {
  if (!identifier && !teamId) return undefined

  if (identifier && typeof identifier === 'object') {
    if (identifier.squareImg) {
      return { name: identifier.name || 'Champion', squareImg: identifier.squareImg }
    }
    if (identifier.champion?.squareImg) {
      return { name: identifier.champion.name || identifier.name || 'Champion', squareImg: identifier.champion.squareImg }
    }
  }

  const sb = scoreboardBottom.value
  if (!sb?.teams?.length) return undefined

  const teamIdx = teamId ? (teamId === 1 ? 0 : 1) : 0
  const teamObj = sb.teams[teamIdx]
  const players = teamObj?.players || []

  if (typeof identifier === 'string' && identifier.trim()) {
    const cleanId = identifier.trim().toLowerCase()
    const found = players.find(
      (p) =>
        p?.name?.toLowerCase() === cleanId ||
        p?.champion?.name?.toLowerCase() === cleanId ||
        String(p?.champion?.id ?? '') === cleanId
    )
    if (found?.champion?.squareImg) {
      return { name: found.champion.name || found.name || 'Champion', squareImg: found.champion.squareImg }
    }
  }

  return undefined
}

function getObjectiveKiller(teamId: number, type: 'dragon' | 'baron' | 'herald' | 'tower'): { name: string; squareImg: string } | undefined {
  const sb = scoreboardBottom.value
  if (!sb?.teams?.length) return undefined

  const teamIdx = teamId === 1 ? 0 : 1
  const teamObj = sb.teams[teamIdx]
  const players = teamObj?.players || []
  if (!players.length) return undefined

  if (type === 'dragon' || type === 'baron' || type === 'herald') {
    // 1. Check for Smite spell among team players
    const smiter = players.find((p) => {
      const s1 = String((p as any)?.spell1?.name || (p as any)?.spell1Id || '').toLowerCase()
      const s2 = String((p as any)?.spell2?.name || (p as any)?.spell2Id || '').toLowerCase()
      return s1.includes('smite') || s2.includes('smite')
    })
    if (smiter?.champion?.squareImg) {
      return {
        name: smiter.champion.name || smiter.name || 'Champion',
        squareImg: smiter.champion.squareImg,
      }
    }
    // 2. Tournament draft order: index 1 is Jungle
    const jgl = players[1] || players[0]
    if (jgl?.champion?.squareImg) {
      return {
        name: jgl.champion.name || jgl.name || 'Champion',
        squareImg: jgl.champion.squareImg,
      }
    }
  } else if (type === 'tower') {
    // ADC (index 3), Top (index 0), or Mid (index 2)
    const adcOrTop = players[3] || players[0] || players[2] || players[1]
    if (adcOrTop?.champion?.squareImg) {
      return {
        name: adcOrTop.champion.name || adcOrTop.name || 'Champion',
        squareImg: adcOrTop.champion.squareImg,
      }
    }
  }

  const fallback = players[0]
  if (fallback?.champion?.squareImg) {
    return {
      name: fallback.champion.name || fallback.name || 'Champion',
      squareImg: fallback.champion.squareImg,
    }
  }
  return undefined
}

// 1. Official LeagueBroadcast Server Event Listeners
const unsub = client.onIngameEvents({
  onKillFeedEvent(event: any) {
    clearTimeout(batchResetTimer)
    batchResetTimer = setTimeout(() => {
      batchCount = 0
    }, BATCH_RESET_MS) as unknown as number
    const delay = batchCount * STAGGER_STEP_MS
    batchCount++

    const entry: FeedItem = {
      id: nextId++,
      type: 'kill',
      ingameTeamId: event.ingameTeamId,
      killer: event.killer ? { name: event.killer.name, squareImg: event.killer.squareImg } : undefined,
      victim: { name: event.victim?.name || 'Champion', squareImg: event.victim?.squareImg || '' },
      assisters: event.assisters?.map((a: any) => ({ name: a.name, squareImg: a.squareImg })),
    }
    setTimeout(() => addEntry(entry), delay)
  },
  onObjectiveEvent(event: any) {
    if (!event) return
    const objStr = (event.objective || '').toLowerCase()
    const teamId = event.team || 1

    if (objStr.includes('dragon')) {
      const killer = findChampion(event.killer, teamId) || getObjectiveKiller(teamId, 'dragon')
      addEntry({
        id: nextId++,
        type: 'dragon',
        ingameTeamId: teamId,
        killer,
        victim: {
          name: 'Rồng',
          squareImg: Fire,
        },
      })
    } else if (objStr.includes('baron')) {
      const killer = findChampion(event.killer, teamId) || getObjectiveKiller(teamId, 'baron')
      addEntry({
        id: nextId++,
        type: 'baron',
        ingameTeamId: teamId,
        killer,
        victim: {
          name: 'Baron Nashor',
          squareImg: BaronImg,
        },
      })
    } else if (objStr.includes('herald') || objStr.includes('rift')) {
      const killer = findChampion(event.killer, teamId) || getObjectiveKiller(teamId, 'herald')
      addEntry({
        id: nextId++,
        type: 'herald',
        ingameTeamId: teamId,
        killer,
        victim: {
          name: 'Sứ Giả Khe Nứt',
          squareImg: HeraldImg,
        },
      })
    } else if (objStr.includes('turret') || objStr.includes('tower')) {
      const killer = findChampion(event.killer, teamId) || getObjectiveKiller(teamId, 'tower')
      addEntry({
        id: nextId++,
        type: 'tower',
        ingameTeamId: teamId,
        killer,
        victim: {
          name: 'Trụ',
          squareImg: TowerImg,
        },
      })
    }
  },
  onAnnouncementEvent(event: announcerEvent) {
    if (event.type === AnnouncementType.Kill || event.type === AnnouncementType.FirstBlood) {
      const killerChamp = event.source?.champion
      const victimChamp = event.target?.champion
      if (victimChamp) {
        addEntry({
          id: nextId++,
          type: 'kill',
          ingameTeamId: event.source?.team || 1,
          killer: killerChamp ? {
            name: killerChamp.name,
            squareImg: killerChamp.squareImg,
          } : undefined,
          victim: {
            name: victimChamp.name,
            squareImg: victimChamp.squareImg,
          },
          assisters: [],
        })
      }
    }
  },
})

// 2. Automated Ingame Kill Detection (Works WITHOUT LeagueBroadcast Pro!)
interface PlayerStats {
  name: string
  team: number
  kills: number
  deaths: number
  assists: number
  championName: string
  squareImg: string
}

let prevStats: Map<string, PlayerStats> | null = null

watch(
  scoreboardBottom,
  (sb) => {
    if (!sb?.teams?.length) return

    const currentPlayers: PlayerStats[] = []
    for (let tIdx = 0; tIdx < sb.teams.length; tIdx++) {
      const team = sb.teams[tIdx]
      if (!team?.players) continue
      const teamId: number = tIdx === 0 ? 1 : 2
      for (const p of team.players) {
        if (!p) continue
        const name = p.name || p.champion?.name || `Player-${Math.random()}`
        currentPlayers.push({
          name,
          team: teamId,
          kills: p.kills ?? 0,
          deaths: p.deaths ?? 0,
          assists: p.assists ?? 0,
          championName: p.champion?.name || p.name || 'Champion',
          squareImg: p.champion?.squareImg || '',
        })
      }
    }

    if (!prevStats) {
      prevStats = new Map()
      for (const p of currentPlayers) {
        prevStats.set(p.name, p)
      }
      return
    }

    // Find newly dead players
    const victims: PlayerStats[] = []
    const killers: PlayerStats[] = []
    const assisters: PlayerStats[] = []

    for (const curr of currentPlayers) {
      const prev = prevStats.get(curr.name)
      if (prev) {
        if (curr.deaths > prev.deaths) {
          victims.push(curr)
        }
        if (curr.kills > prev.kills) {
          killers.push(curr)
        }
        if (curr.assists > prev.assists) {
          assisters.push(curr)
        }
      }
      prevStats.set(curr.name, curr)
    }

    // Process each kill
    for (const victim of victims) {
      const killer = killers.find((k) => k.team !== victim.team)
      const teamAssisters = assisters.filter((a) => a.team !== victim.team && a.name !== killer?.name)

      addEntry({
        id: nextId++,
        type: 'kill',
        ingameTeamId: killer ? killer.team : (victim.team === 1 ? 2 : 1),
        killer: killer
          ? {
              name: killer.championName,
              squareImg: killer.squareImg,
            }
          : undefined,
        victim: {
          name: victim.championName,
          squareImg: victim.squareImg,
        },
        assisters: teamAssisters.map((a) => ({
          name: a.championName,
          squareImg: a.squareImg,
        })),
      })
    }
  },
  { deep: true },
)

// 3. Automated Ingame Objective Detection (Dragons, Barons, Towers)
let prevDragons: [number, number] | null = null
let prevBarons: [number, number] | null = null
let prevHeralds: [number, number] | null = null
let prevTowers: [number, number] | null = null

watch(
  scoreboard,
  (sb) => {
    if (!sb?.teams?.length) return
    const t0 = sb.teams[0]
    const t1 = sb.teams[1]
    if (!t0 || !t1) return

    const currentDragons: [number, number] = [t0.dragons?.length ?? 0, t1.dragons?.length ?? 0]
    const b0End = t0.baronPowerPlay?.timeEnd ?? (t0 as any).barons ?? 0
    const b1End = t1.baronPowerPlay?.timeEnd ?? (t1 as any).barons ?? 0
    const currentBarons: [number, number] = [b0End, b1End]
    const currentHeralds: [number, number] = [
      (t0 as any).heralds ?? (t0 as any).riftHeralds ?? 0,
      (t1 as any).heralds ?? (t1 as any).riftHeralds ?? 0,
    ]
    const currentTowers: [number, number] = [t0.towers ?? 0, t1.towers ?? 0]

    if (!prevDragons || !prevBarons || !prevHeralds || !prevTowers) {
      prevDragons = currentDragons
      prevBarons = currentBarons
      prevHeralds = currentHeralds
      prevTowers = currentTowers
      return
    }

    for (let i = 0; i < 2; i++) {
      const teamId = i === 0 ? 1 : 2
      const teamObj = i === 0 ? t0 : t1

      // Dragon taken
      if (currentDragons[i]! > prevDragons[i]!) {
        const lastDragon = teamObj.dragons?.[teamObj.dragons.length - 1] || 'fire'
        const killer = getObjectiveKiller(teamId, 'dragon')
        addEntry({
          id: nextId++,
          type: 'dragon',
          ingameTeamId: teamId,
          killer,
          victim: {
            name: getDragonNameVi(lastDragon),
            squareImg: getDragonIcon(lastDragon),
          },
        })
      }

      // Baron taken
      if (currentBarons[i]! > prevBarons[i]!) {
        const killer = getObjectiveKiller(teamId, 'baron')
        addEntry({
          id: nextId++,
          type: 'baron',
          ingameTeamId: teamId,
          killer,
          victim: {
            name: 'Baron Nashor',
            squareImg: BaronImg,
          },
        })
      }

      // Herald taken
      if (currentHeralds[i]! > prevHeralds[i]!) {
        const killer = getObjectiveKiller(teamId, 'herald')
        addEntry({
          id: nextId++,
          type: 'herald',
          ingameTeamId: teamId,
          killer,
          victim: {
            name: 'Sứ Giả Khe Nứt',
            squareImg: HeraldImg,
          },
        })
      }

      // Tower destroyed
      if (currentTowers[i]! > prevTowers[i]!) {
        const killer = getObjectiveKiller(teamId, 'tower')
        addEntry({
          id: nextId++,
          type: 'tower',
          ingameTeamId: teamId,
          killer,
          victim: {
            name: 'Trụ',
            squareImg: TowerImg,
          },
        })
      }
    }

    prevDragons = currentDragons
    prevBarons = currentBarons
    prevHeralds = currentHeralds
    prevTowers = currentTowers
  },
  { deep: true },
)

// 4. Test Feed Trigger (from Control Dashboard or preview)
function triggerMockFeed(type: string = 'kill', team: 'order' | 'chaos' = 'order') {
  const isOrder = team === 'order'
  const teamId = isOrder ? 1 : 2

  const orderJgl = {
    name: 'Lee Sin',
    squareImg: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/64.png',
  }
  const chaosJgl = {
    name: 'Nidalee',
    squareImg: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/76.png',
  }
  const orderAdc = {
    name: 'Jinx',
    squareImg: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/222.png',
  }
  const chaosTop = {
    name: 'Camille',
    squareImg: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/164.png',
  }

  // Use live champions from active game if available, otherwise mock champions
  const liveDragonKiller = getObjectiveKiller(teamId, 'dragon')
  const liveBaronKiller = getObjectiveKiller(teamId, 'baron')
  const liveHeraldKiller = getObjectiveKiller(teamId, 'herald')
  const liveTowerKiller = getObjectiveKiller(teamId, 'tower')

  const dragonKiller = liveDragonKiller || (isOrder ? orderJgl : chaosJgl)
  const baronKiller = liveBaronKiller || (isOrder ? orderJgl : chaosTop)
  const heraldKiller = liveHeraldKiller || (isOrder ? orderJgl : chaosTop)
  const towerKiller = liveTowerKiller || (isOrder ? orderAdc : chaosTop)

  if (type === 'dragon') {
    addEntry({
      id: nextId++,
      type: 'dragon',
      ingameTeamId: teamId,
      killer: dragonKiller,
      victim: {
        name: 'Rồng Lửa',
        squareImg: Fire,
      },
    })
  } else if (type === 'baron') {
    addEntry({
      id: nextId++,
      type: 'baron',
      ingameTeamId: teamId,
      killer: baronKiller,
      victim: {
        name: 'Baron Nashor',
        squareImg: BaronImg,
      },
    })
  } else if (type === 'herald') {
    addEntry({
      id: nextId++,
      type: 'herald',
      ingameTeamId: teamId,
      killer: heraldKiller,
      victim: {
        name: 'Sứ Giả Khe Nứt',
        squareImg: HeraldImg,
      },
    })
  } else if (type === 'tower') {
    addEntry({
      id: nextId++,
      type: 'tower',
      ingameTeamId: teamId,
      killer: towerKiller,
      victim: {
        name: 'Trụ',
        squareImg: TowerImg,
      },
    })
  } else {
    // Default Champion Kill
    addEntry({
      id: nextId++,
      type: 'kill',
      ingameTeamId: teamId,
      killer: isOrder ? orderJgl : chaosTop,
      victim: isOrder
        ? {
            name: 'Sejuani',
            squareImg: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/113.png',
          }
        : {
            name: 'Renekton',
            squareImg: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/58.png',
          },
      assisters: [
        {
          name: isOrder ? 'Orianna' : 'Nidalee',
          squareImg: isOrder
            ? 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/61.png'
            : 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/76.png',
        },
      ],
    })
  }
}

// 5. Channel & Event Listeners for Control Page
let bc: BroadcastChannel | null = null
const handleCustomEvent = (e: Event) => {
  const detail = (e as CustomEvent).detail
  triggerMockFeed(detail?.type || 'kill', detail?.team || 'order')
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('hud:test-feed', handleCustomEvent)
    window.addEventListener('hud:test-kill', handleCustomEvent)
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('lol_hud_sync_channel')
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'TRIGGER_TEST_FEED' || ev.data?.type === 'TRIGGER_TEST_KILL') {
          triggerMockFeed(ev.data.payload?.type || 'kill', ev.data.payload?.team || 'order')
        }
      }
    }
  }

  // Vite HMR relay for OBS browser source
  if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
    ;(import.meta as any).hot.on('hud-control:test-feed', (data: any) => {
      triggerMockFeed(data?.type || 'kill', data?.team || 'order')
    })
  }
})

function onBeforeEnter(el: Element) {
  const wrapper = el as HTMLElement
  wrapper.style.opacity = '0'
  wrapper.style.transform = 'translateX(60px)'
}

function onEnter(el: Element, done: () => void) {
  const wrapper = el as HTMLElement
  wrapper.style.transition = 'opacity 0.35s ease-out, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
  void wrapper.offsetHeight
  wrapper.style.opacity = '1'
  wrapper.style.transform = 'translateX(0)'
  wrapper.addEventListener('transitionend', done, { once: true })
}

function onLeave(el: Element, done: () => void) {
  const wrapper = el as HTMLElement
  const entry = wrapper.firstElementChild as HTMLElement

  wrapper.style.height = `${wrapper.offsetHeight}px`
  wrapper.style.overflow = 'hidden'
  wrapper.style.transition = 'height 0.3s ease-out, margin-bottom 0.3s ease-out'

  if (entry) {
    entry.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-in'
    entry.style.opacity = '0'
    entry.style.transform = 'translateX(110%)'
  }

  void wrapper.offsetHeight
  wrapper.style.height = '0'
  wrapper.style.marginBottom = '0'

  wrapper.addEventListener('transitionend', done, { once: true })
}

onUnmounted(() => {
  unsub()
  timers.forEach((t) => clearTimeout(t))
  if (typeof window !== 'undefined') {
    window.removeEventListener('hud:test-feed', handleCustomEvent)
    window.removeEventListener('hud:test-kill', handleCustomEvent)
  }
  if (bc) bc.close()
})
</script>

<template>
  <div v-if="isInGame || entries.length > 0" class="kill-feed">
    <TransitionGroup
      name="kill-feed"
      tag="div"
      class="kill-feed-list"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div v-for="entry in entries" :key="entry.id" class="entry-wrapper">
        <KillFeedEntry :event="entry" />
      </div>
    </TransitionGroup>
  </div>
</template>

<style lang="css" scoped>
.kill-feed {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  pointer-events: none;
}

.kill-feed-list {
  display: flex;
  flex-direction: column;
}

.entry-wrapper {
  margin-bottom: 6px;
}
</style>

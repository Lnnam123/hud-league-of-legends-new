<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Team } from '@bluebottle_gg/league-broadcast-client'
import { useIngameSelector } from '@/composables/useIngame'
import { useHudSettings } from '@/composables/useHudSettings'
import { useClient } from '@/client'

const props = defineProps<{
  team?: Team
  mirror?: boolean
}>()

const client = useClient()
const { settings } = useHudSettings()

const isVisible = computed(() => {
  return !!settings.value.teamRunesEnabled
})

// Active team displayed in this left side panel (Order = Blue, Chaos = Red)
const currentTeam = ref<Team>(Team.Order)
const transitionDirection = ref<'slide-to-left' | 'slide-to-right'>('slide-to-left')

// Auto rotation timer for 'both' (All) mode
let autoRotateTimer: ReturnType<typeof setInterval> | null = null

function startAutoRotate() {
  stopAutoRotate()
  autoRotateTimer = setInterval(() => {
    if (settings.value.teamRunesTeam === 'both' && settings.value.teamRunesEnabled) {
      transitionDirection.value = 'slide-to-left'
      currentTeam.value = currentTeam.value === Team.Order ? Team.Chaos : Team.Order
    }
  }, 7500)
}

function stopAutoRotate() {
  if (autoRotateTimer) {
    clearInterval(autoRotateTimer)
    autoRotateTimer = null
  }
}

watch(
  () => [settings.value.teamRunesTeam, settings.value.teamRunesEnabled],
  ([newTeamSetting, enabled]) => {
    if (!enabled) {
      stopAutoRotate()
      return
    }

    if (newTeamSetting === 'order') {
      stopAutoRotate()
      if (currentTeam.value !== Team.Order) {
        transitionDirection.value = 'slide-to-right'
        currentTeam.value = Team.Order
      }
    } else if (newTeamSetting === 'chaos') {
      stopAutoRotate()
      if (currentTeam.value !== Team.Chaos) {
        // Red team rolls in from right to left!
        transitionDirection.value = 'slide-to-left'
        currentTeam.value = Team.Chaos
      }
    } else if (newTeamSetting === 'both') {
      startAutoRotate()
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  stopAutoRotate()
})

// Ingame data selectors
const runesData = useIngameSelector((s) => s.gameData.runes)
const tabsData = useIngameSelector((s) => s.gameData.tabs)
const scoreboard = useIngameSelector((s) => s.gameData.scoreboard)
const scoreboardBottom = useIngameSelector((s) => s.gameData.scoreboardBottom)

const seasonIcon = ref<string | null>(null)
onMounted(async () => {
  try {
    seasonIcon.value = await client.api.season.getCurrentSeasonIcon()
  } catch {}
})

// Team Metadata
const teamInfo = computed(() => {
  const teamIdx = currentTeam.value === Team.Order ? 0 : 1
  const sbTeam = scoreboard.value?.teams?.[teamIdx]
  const bottomTeam = scoreboardBottom.value?.teams?.[teamIdx]

  const name = sbTeam?.teamName || bottomTeam?.name || (currentTeam.value === Team.Order ? 'BILIBILI GAMING' : 'HANWHA LIFE ESPORTS')
  const tag = sbTeam?.teamTag || bottomTeam?.tag || (currentTeam.value === Team.Order ? 'BLG' : 'HLE')
  const logo = sbTeam?.teamIconUrl || ''

  return { name, tag, logo }
})

// Dynamic font size: Larger font when team name fits in 1 line
const isSingleLine = computed(() => {
  const name = (teamInfo.value.name || '').trim()
  return name.length <= 11
})

const teamNameFontSize = computed(() => {
  const name = (teamInfo.value.name || '').trim()
  const len = name.length
  if (len <= 4) return '16px'
  if (len <= 7) return '14.5px'
  if (len <= 11) return '13px'
  return '11px'
})

// CDragon asset URL helper
const CD_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default'

function resolveAssetUrl(path?: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  if (client) {
    const cached = client.getCacheUrl(path)
    if (cached) return cached
  }
  const clean = path.toLowerCase().replace('/lol-game-data/assets/', '')
  return `${CD_BASE}/${clean}`
}

// Exact mock data matching the MSI broadcast screenshot
const MOCK_ORDER_PLAYERS = [
  {
    championName: 'Renekton',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/58.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/conqueror/conqueror.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/absorblife/absorblife.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/legendalacrity/legendalacrity.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/laststand/laststand.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/secondwind/secondwind.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/overgrowth/overgrowth.png',
    ],
  },
  {
    championName: 'Naafiri',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/950.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/conqueror/conqueror.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/triumph.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/legendbloodline/legendbloodline.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/coupdegrace/coupdegrace.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/magicalfootwear/magicalfootwear.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/cosmicinsight/cosmicinsight.png',
    ],
  },
  {
    championName: 'Kassadin',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/38.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/phaserush/stormraiderssurgeruneicon2.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/manaflowband/manaflowband.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/transcendence/transcendence.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/scorch/scorch.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/presenceofmind/presenceofmind.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/coupdegrace/coupdegrace.png',
    ],
  },
  {
    championName: 'Ezreal',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/81.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/lethaltempo/lethaltempotemp.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/presenceofmind/presenceofmind.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/legendbloodline/legendbloodline.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/cutdown/cutdown.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/cashback/cashback2.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/jackofalltrades/jackofalltrades2.png',
    ],
  },
  {
    championName: 'Bard',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/432.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/domination/electrocute/electrocute.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/domination/cheapshot/cheapshot.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/domination/zombieward/zombieward.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/domination/relentlesshunter/relentlesshunter.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/magicalfootwear/magicalfootwear.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/cosmicinsight/cosmicinsight.png',
    ],
  },
]

const MOCK_CHAOS_PLAYERS = [
  {
    championName: 'Camille',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/164.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/graspoftheundying/graspoftheundying.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/shieldbash/shieldbash.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/secondwind/secondwind.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/overgrowth/overgrowth.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/magicalfootwear/magicalfootwear.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/biscuitdelivery/biscuitdelivery.png',
    ],
  },
  {
    championName: 'Nidalee',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/76.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/domination/darkharvest/darkharvest.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/domination/suddenimpact/suddenimpact.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/domination/eyeballcollection/eyeballcollection.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/domination/treasurehunter/treasurehunter.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/transcendence/transcendence.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/waterwalking/waterwalking.png',
    ],
  },
  {
    championName: 'Azir',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/268.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/fleetfootwork/fleetfootwork.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/presenceofmind/presenceofmind.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/legendalacrity/legendalacrity.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/precision/cutdown/cutdown.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/manaflowband/manaflowband.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/scorch/scorch.png',
    ],
  },
  {
    championName: 'Varus',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/110.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/arcanecomet/arcanecomet.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/manaflowband/manaflowband.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/transcendence/transcendence.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/sorcery/scorch/scorch.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/biscuitdelivery/biscuitdelivery.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/cosmicinsight/cosmicinsight.png',
    ],
  },
  {
    championName: 'Leona',
    championAvatar: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/89.png',
    keystone: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/aftershock/aftershock.png',
    primaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/fontoflife/fontoflife.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/boneplating/boneplating.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/resolve/unflinching/unflinching.png',
    ],
    secondaryRunes: [
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/hextechflashtraption/hextechflashtraption.png',
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/inspiration/cosmicinsight/cosmicinsight.png',
    ],
  },
]

// Resolved player list based on currentTeam
const players = computed(() => {
  const teamId = currentTeam.value === Team.Order ? 1 : 2

  // 1. Try ingame runes state
  if (runesData.value?.runes?.length) {
    const matched = runesData.value.runes.filter((r) => r.team === teamId)
    if (matched.length > 0) {
      return matched.map((r, i) => {
        const p = r.perks || []
        const fallback = currentTeam.value === Team.Order ? MOCK_ORDER_PLAYERS[i] : MOCK_CHAOS_PLAYERS[i]
        return {
          championName: r.champion?.name || r.name,
          championAvatar: resolveAssetUrl(r.champion?.squareImg) || fallback?.championAvatar,
          keystone: p[0]?.iconPath ? resolveAssetUrl(p[0].iconPath) : fallback?.keystone,
          primaryRunes: [
            p[1]?.iconPath ? resolveAssetUrl(p[1].iconPath) : fallback?.primaryRunes[0],
            p[2]?.iconPath ? resolveAssetUrl(p[2].iconPath) : fallback?.primaryRunes[1],
            p[3]?.iconPath ? resolveAssetUrl(p[3].iconPath) : fallback?.primaryRunes[2],
          ].filter(Boolean) as string[],
          secondaryRunes: [
            p[4]?.iconPath ? resolveAssetUrl(p[4].iconPath) : fallback?.secondaryRunes[0],
            p[5]?.iconPath ? resolveAssetUrl(p[5].iconPath) : fallback?.secondaryRunes[1],
          ].filter(Boolean) as string[],
        }
      })
    }
  }

  // 2. Try tabs data
  const teamKey = currentTeam.value === Team.Order ? 'Order' : 'Chaos'
  const tabTeam = tabsData.value?.[teamKey]
  if (tabTeam?.players?.length) {
    return tabTeam.players.map((p, i) => {
      const perks = p.perks || []
      const fallback = currentTeam.value === Team.Order ? MOCK_ORDER_PLAYERS[i] : MOCK_CHAOS_PLAYERS[i]
      return {
        championName: p.championAssets?.name || p.displayName,
        championAvatar: resolveAssetUrl(p.championAssets?.squareImg) || fallback?.championAvatar,
        keystone: perks[0]?.iconPath ? resolveAssetUrl(perks[0].iconPath) : fallback?.keystone,
        primaryRunes: [
          perks[1]?.iconPath ? resolveAssetUrl(perks[1].iconPath) : fallback?.primaryRunes[0],
          perks[2]?.iconPath ? resolveAssetUrl(perks[2].iconPath) : fallback?.primaryRunes[1],
          perks[3]?.iconPath ? resolveAssetUrl(perks[3].iconPath) : fallback?.primaryRunes[2],
        ].filter(Boolean) as string[],
        secondaryRunes: [
          perks[4]?.iconPath ? resolveAssetUrl(perks[4].iconPath) : fallback?.secondaryRunes[0],
          perks[5]?.iconPath ? resolveAssetUrl(perks[5].iconPath) : fallback?.secondaryRunes[1],
        ].filter(Boolean) as string[],
      }
    })
  }

  // 3. Fallback mock data
  return currentTeam.value === Team.Order ? MOCK_ORDER_PLAYERS : MOCK_CHAOS_PLAYERS
})
</script>

<template>
  <Transition name="panel-slide-left">
    <div
      v-if="isVisible"
      class="team-runes-container"
      :class="currentTeam === Team.Order ? 'team-order' : 'team-chaos'"
    >
      <!-- Fixed Panel Header -->
      <div class="runes-header">
        <h2 class="runes-title">TEAM RUNES</h2>
      </div>

      <!-- Sliding Body for Teams (rolls seamlessly between teams) -->
      <div class="runes-slider-container">
        <Transition :name="transitionDirection">
          <div
            :key="currentTeam"
            class="team-slide-page"
          >
            <!-- Team Branding Bar -->
            <div class="team-brand-bar">
              <div class="team-accent-line"></div>
              <div class="team-logo-wrap">
                <!-- Logo: custom SVG for BLG / HLE or dynamic logo -->
                <div v-if="!teamInfo.logo && teamInfo.tag === 'BLG'" class="custom-blg-logo">
                  <svg viewBox="0 0 100 52" class="blg-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 8H26C33 8 38 12 38 18C38 23 34 26 29 27C35 28 40 32 40 39C40 46 34 50 26 50H4V8ZM14 17V24H23C26 24 28 22 28 20C28 18 26 17 23 17H14ZM14 33V41H25C28 41 30 39 30 37C30 35 28 33 25 33H14Z" fill="#FFFFFF"/>
                    <path d="M46 8H56V41H74V50H46V8Z" fill="#FFFFFF"/>
                    <path d="M80 29H98V38H89V41H98V50H80C75 50 71 46 71 39V19C71 12 75 8 80 8H98V17H89V21H98V29H80Z" fill="#FFFFFF"/>
                  </svg>
                  <span class="blg-subtext">BILIBILI GAMING</span>
                </div>
                <div v-else-if="!teamInfo.logo && (teamInfo.tag === 'HLE' || currentTeam === Team.Chaos)" class="custom-hle-logo">
                  <svg viewBox="0 0 100 48" class="hle-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 8H20V22H36V8H48V40H36V28H20V40H8V8Z" fill="#FF5E00"/>
                    <path d="M54 8H66V32H84V40H54V8Z" fill="#FF5E00"/>
                  </svg>
                </div>
                <img
                  v-else-if="teamInfo.logo"
                  :src="resolveAssetUrl(teamInfo.logo)"
                  class="team-logo"
                  alt="Team Logo"
                  @error="($event.target as HTMLElement).style.display = 'none'"
                />
                <div v-else class="team-fallback-badge">
                  <span class="fallback-tag">{{ teamInfo.tag }}</span>
                </div>
              </div>

              <div class="team-name-wrap">
                <span
                  class="team-fullname"
                  :class="{ 'is-single-line': isSingleLine }"
                  :style="{ fontSize: teamNameFontSize }"
                >
                  {{ teamInfo.name }}
                </span>
              </div>
            </div>

            <!-- 5 Player Rows -->
            <div class="players-list">
              <div
                v-for="(player, idx) in players"
                :key="idx"
                class="player-rune-row"
              >
                <!-- Player Team Accent Line -->
                <div class="player-accent-bar"></div>

                <!-- Champion Portrait -->
                <div class="champion-avatar-wrap">
                  <img
                    :src="player.championAvatar"
                    :alt="player.championName"
                    class="champion-avatar"
                  />
                </div>

                <!-- Large Keystone Rune -->
                <div class="keystone-wrap">
                  <img
                    v-if="player.keystone"
                    :src="player.keystone"
                    alt="Keystone"
                    class="keystone-icon"
                  />
                </div>

                <!-- Minor Runes Grid (3 Primary top, 2 Secondary bottom) -->
                <div class="minor-runes-grid">
                  <!-- Row 1: Primary Minor Runes -->
                  <div class="minor-runes-row primary-row">
                    <div
                      v-for="(runeUrl, rIdx) in player.primaryRunes"
                      :key="'prim-' + rIdx"
                      class="minor-rune-slot"
                    >
                      <img :src="runeUrl" class="minor-rune-icon" alt="Rune" />
                    </div>
                  </div>

                  <!-- Row 2: Secondary Minor Runes -->
                  <div class="minor-runes-row secondary-row">
                    <div
                      v-for="(runeUrl, rIdx) in player.secondaryRunes"
                      :key="'sec-' + rIdx"
                      class="minor-rune-slot"
                    >
                      <img :src="runeUrl" class="minor-rune-icon" alt="Rune" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Fixed Bottom Tournament Branding Footer (MSI 26) -->
      <div class="runes-footer">
        <img
          v-if="seasonIcon"
          :src="client.getCacheUrl(seasonIcon, true)"
          class="tournament-logo"
          alt="Tournament"
          @error="($event.target as HTMLElement).style.display = 'none'"
        />
        <div v-else class="msi-broadcast-logo">
          <span class="msi-word">MSI</span>
          <!-- MSI Tournament Laurel Ring -->
          <div class="msi-crest-ring">
            <svg viewBox="0 0 24 24" class="crest-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="rgba(255, 255, 255, 0.7)" stroke-width="1.8"/>
              <path d="M12 4V20M4 12H20" stroke="rgba(255, 255, 255, 0.4)" stroke-width="1"/>
              <path d="M7 8L12 12L17 8M7 16L12 12L17 16" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="msi-year">26</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.team-runes-container {
  position: fixed;
  top: 40%;
  left: 0;
  transform: translateY(-50%);
  width: 260px;
  height: 590px;
  display: flex;
  flex-direction: column;
  background: rgba(8, 12, 19, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    0 14px 32px rgba(0, 0, 0, 0.8),
    0 0 16px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 100;
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #ffffff;
  user-select: none;
}

/* Header */
.runes-header {
  background: rgba(3, 5, 8, 0.94);
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-left: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.runes-title {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #ffffff;
  line-height: 1;
  font-family: 'CHANEY-UltraExtended', 'Bebas Neue', 'Inter', sans-serif;
}

/* Slider container inside the frame */
.runes-slider-container {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.team-slide-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Team Branding */
.team-brand-bar {
  display: flex;
  align-items: center;
  flex: 1;
  min-height: 0;
  padding: 0 6px;
  background: rgba(10, 16, 26, 0.82);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
}

.team-accent-line {
  width: 3px;
  height: 56px;
  margin-right: 4px;
  border-radius: 1px;
  flex-shrink: 0;
}

.team-order .team-accent-line,
.team-order .player-accent-bar {
  background: #0080ff;
  box-shadow: 0 0 8px rgba(0, 128, 255, 0.7);
}

.team-chaos .team-accent-line,
.team-chaos .player-accent-bar {
  background: #ff2a4b;
  box-shadow: 0 0 8px rgba(255, 42, 75, 0.7);
}

.team-logo-wrap {
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.custom-blg-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.custom-hle-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.blg-svg {
  width: 44px;
  height: 24px;
}

.hle-svg {
  width: 48px;
  height: 26px;
}

.blg-subtext {
  font-size: 5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #ffffff;
  transform: scale(0.85);
  margin-top: 1px;
}

.team-logo {
  width: 46px;
  height: 46px;
  object-fit: contain;
  flex-shrink: 0;
}

.team-fallback-badge {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 8px;
  border-radius: 2px;
  font-weight: 900;
  font-size: 13px;
}

.team-name-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  margin-left: 8px;
  padding-right: 4px;
}

.team-fullname {
  font-family: 'CHANEY Ultra Extended', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffffff;
  text-transform: uppercase;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height: 1.25;
  display: block;
  width: 100%;
}

.team-fullname.is-single-line {
  line-height: 1.15;
  letter-spacing: 0.04em;
}

/* 5 Player Rows */
.players-list {
  flex: 5;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: transparent;
}

.player-rune-row {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 0;
  padding: 0 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(8, 13, 20, 0.78);
}

.player-rune-row:last-child {
  border-bottom: none;
}

.player-accent-bar {
  width: 3px;
  height: 56px;
  margin-right: 4px;
  border-radius: 1px;
  flex-shrink: 0;
}

/* Champion Avatar */
.champion-avatar-wrap {
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: #0a0a0a;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.7);
}

.champion-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Large Keystone Rune */
.keystone-wrap {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  margin-right: 2px;
  flex-shrink: 0;
}

.keystone-icon {
  width: 50px;
  height: 50px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.28));
}

/* Minor Runes Grid (3 Primary top, 2 Secondary bottom) */
.minor-runes-grid {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-left: auto;
  padding-right: 4px;
}

.minor-runes-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.primary-row {
  justify-content: flex-start;
}

.secondary-row {
  justify-content: flex-start;
}

.minor-rune-slot {
  width: 29px;
  height: 29px;
  border-radius: 50%;
  background: rgba(4, 7, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

.minor-rune-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scale(1.06);
}

/* Footer MSI 26 */
.runes-footer {
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(3, 5, 8, 0.94);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.tournament-logo {
  height: 28px;
  max-width: 160px;
  object-fit: contain;
}

.msi-broadcast-logo {
  display: flex;
  align-items: center;
  gap: 5px;
}

.msi-word {
  font-family: 'CHANEY-UltraExtended', 'Bebas Neue', 'Inter', sans-serif;
  font-size: 19px;
  font-weight: 900;
  letter-spacing: 0.05em;
  font-style: italic;
  color: #ffffff;
}

.msi-crest-ring {
  width: 19px;
  height: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crest-svg {
  width: 100%;
  height: 100%;
}

.msi-year {
  font-family: 'CHANEY-UltraExtended', 'Bebas Neue', 'Inter', sans-serif;
  font-size: 19px;
  font-weight: 900;
  letter-spacing: 0.05em;
  font-style: italic;
  color: #ffffff;
}

/* Overall Panel Slide In/Out Animation */
.panel-slide-left-enter-active {
  transition:
    transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.4s ease-out;
}

.panel-slide-left-leave-active {
  transition:
    transform 0.5s cubic-bezier(0.7, 0, 0.84, 0),
    opacity 0.4s ease-in;
}

.panel-slide-left-enter-from,
.panel-slide-left-leave-to {
  transform: translateX(-120%) translateY(-50%);
  opacity: 0;
}

/* Carousel transitions between Blue and Red teams (Liền mạch không khoảng trống) */
.slide-to-left-enter-active,
.slide-to-left-leave-active,
.slide-to-right-enter-active,
.slide-to-right-leave-active {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

/* Red team scrolls from right to left */
.slide-to-left-enter-from {
  transform: translateX(100%);
}
.slide-to-left-leave-to {
  transform: translateX(-100%);
}

/* Blue team scrolls from left to right */
.slide-to-right-enter-from {
  transform: translateX(-100%);
}
.slide-to-right-leave-to {
  transform: translateX(100%);
}
</style>

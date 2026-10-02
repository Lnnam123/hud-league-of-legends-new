<script setup lang="ts">
import {
  type ingameScoreboardTeamData,
  type ingameScoreboardBottomPlayerData,
  getRoleQuest,
} from '@bluebottle_gg/league-broadcast-client'
import TopIcon from '@/assets/lane/top-placeholder-cropped.svg'
import JungleIcon from '@/assets/lane/jgl-placeholder-cropped.svg'
import MidIcon from '@/assets/lane/mid-placeholder-cropped.svg'
import BotIcon from '@/assets/lane/bot-placeholder-cropped.svg'
import SupportIcon from '@/assets/lane/sup-placeholder-cropped.svg'
import TextWithIcon from './TextWithIcon.vue'
import Grubs from '@/assets/grubs.png'
import Fire from '@/assets/dragon/fire.png'
import Air from '@/assets/dragon/air.png'
import Chemtech from '@/assets/dragon/chemtech.png'
import Hextech from '@/assets/dragon/hextech.png'
import Earth from '@/assets/dragon/earth.png'
import Water from '@/assets/dragon/water.png'
import Elder from '@/assets/dragon/elder.png'
import { handleImageError, handleImageLoad } from '@/utils/imageUtils'
import { computed, ref, watch, onUnmounted } from 'vue'
import { useDirectQuestProgress } from '@/composables/useDirectQuestProgress'
import { useIngameSelector } from '@/composables/useIngame'

const props = defineProps<{
  team: ingameScoreboardTeamData
  players: ingameScoreboardBottomPlayerData[]
  enemyPlayers?: ingameScoreboardBottomPlayerData[]
  mirror?: boolean
  isMocking?: boolean
}>()

const scoreboard = useIngameSelector((s) => s.gameData.scoreboard)
const rawGameTime = useIngameSelector((s) => s.gameData.gameTime)
const gameTime = computed(() => {
  if (scoreboard.value?.gameTime !== undefined && scoreboard.value.gameTime > 0) {
    return scoreboard.value.gameTime
  }
  return rawGameTime.value ?? 0
})
const tabs = useIngameSelector((s) => s.gameData.tabs)
const sideInfoPage = useIngameSelector((s) => s.gameData.sideInfoPage)
const { calculatePlayerQuest } = useDirectQuestProgress()

function getQuest(player: ingameScoreboardBottomPlayerData | undefined, index: number) {
  const teamKey = props.mirror ? 'Chaos' : 'Order'
  const tabP = tabs.value?.[teamKey]?.players?.[index]
  return calculatePlayerQuest(player, index, gameTime.value || 0, props.isMocking, props.mirror, tabP, sideInfoPage.value)
}

function playerHasQuestComplete(player: ingameScoreboardBottomPlayerData, index: number) {
  return getQuest(player, index).isComplete
}

const allQuestsAreDone = computed(() => {
  if (props.isMocking) return false
  return props.players.length > 0 && props.players.every((p, i) => getQuest(p, i).isComplete)
})

const showQuests = ref(true)
let timeoutId: ReturnType<typeof setTimeout> | null = null

watch(allQuestsAreDone, (isDone) => {
  if (isDone) {
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        showQuests.value = false
      }, 30000)
    }
  } else {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    showQuests.value = true
  }
}, { immediate: true })

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId)
})
const roleIcons = [TopIcon, JungleIcon, MidIcon, BotIcon, SupportIcon]

// Elder respawns, so a team can stack an unbounded number of them. Collapse
// all elder kills into one icon with a count so the row can't overflow into
// the quest icons; elementals are capped at 4 and stay individual.
const dragonDisplay = computed(() => {
  const entries: { type: string; count: number }[] = []
  for (const dragon of props.team.dragons) {
    const isElder = dragon.toLowerCase() === 'elder'
    const existing = isElder ? entries.find((e) => e.type.toLowerCase() === 'elder') : undefined
    if (existing) {
      existing.count++
    } else {
      entries.push({ type: dragon, count: 1 })
    }
  }
  return entries.slice(0, 4)
})

function getDragonIcon(dragonType: string) {
  switch (dragonType.toLowerCase()) {
    case 'fire':
      return Fire
    case 'air':
      return Air
    case 'chemtech':
      return Chemtech
    case 'hextech':
      return Hextech
    case 'earth':
      return Earth
    case 'water':
      return Water
    case 'elder':
      return Elder
    default:
      return undefined
  }
}
</script>

<template>
  <div class="flex items-center h-full" :class="mirror ? 'flex-row-reverse' : 'flex-row'">
    <TransitionGroup
      name="stagger-fade"
      tag="div"
      appear
      class="flex flex-row h-full items-center gap-2 w-43"
      :class="mirror ? 'justify-end' : 'justify-start'"
      id="quest-container"
      :style="{
        'padding-left': mirror ? 'auto' : '8px',
        'padding-right': mirror ? '8px' : 'auto',
      }"
    >
      <div
        v-for="(player, i) in players"
        v-if="showQuests"
        :key="i"
        class="relative flex items-center justify-center w-6 h-6 rounded-full"
        :style="{
          backgroundColor: '#0a0e17cc',
          '--i': mirror ? players.length - 1 - i : i,
        }"
      >
        <svg
          class="absolute inset-0 pointer-events-none -rotate-90"
          width="100%"
          height="100%"
          viewBox="0 0 24 24"
        >
          <!-- Subtle background track -->
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            :stroke="mirror ? 'rgba(244, 63, 94, 0.25)' : 'rgba(6, 182, 212, 0.25)'"
            stroke-width="1.8"
          />
          <!-- Radial Progress Arc -->
          <circle
            v-if="getQuest(player, i).progress > 0"
            cx="12"
            cy="12"
            r="10"
            fill="none"
            :stroke="mirror ? 'var(--red-team-color, #f43f5e)' : 'var(--blue-team-color, #06b6d4)'"
            stroke-width="2"
            stroke-linecap="round"
            stroke-dasharray="62.83"
            :stroke-dashoffset="62.83 * (1 - getQuest(player, i).progress / 100)"
            :style="{
              filter: `drop-shadow(0 0 2.5px ${mirror ? 'var(--red-team-color, #f43f5e)' : 'var(--blue-team-color, #06b6d4)'})`,
              transition: 'stroke-dashoffset 0.4s ease',
            }"
          />
        </svg>
        <component
          :is="roleIcons[i]"
          class="w-3.5 h-3.5 relative z-10 transition-colors"
          :class="getQuest(player, i).isComplete ? (mirror ? 'text-rose-400' : 'text-cyan-400') : 'text-slate-200'"
        />
      </div>
    </TransitionGroup>

    <TextWithIcon
      :icon-url="Grubs"
      :text="props.team.grubs.toString()"
      :mirror="mirror"
      text-width="1.5ch"
      :class="mirror ? ['pr-2'] : ['pl-2']"
    />

    <TransitionGroup
      name="stagger-fade"
      tag="div"
      appear
      class="flex flex-row justify-start h-full grow items-center gap-2 mx-4"
      :class="mirror ? 'flex-row' : 'flex-row-reverse'"
    >
      <!--
        The row flows outward from the clock, so the count sits on the outer
        side of its icon (away from the neighboring dragons) with a tight gap
        to make clear which icon it multiplies.
      -->
      <div
        v-for="(dragon, i) in dragonDisplay"
        :key="i"
        class="flex items-center gap-0.5"
        :class="mirror ? 'flex-row' : 'flex-row-reverse'"
      >
        <img
          :src="getDragonIcon(dragon.type)"
          alt="Dragon icon"
          class="h-5 w-auto"
          @error="handleImageError"
          @load="handleImageLoad"
        />
        <span v-if="dragon.count > 1" class="text-base font-bold">{{ dragon.count }}x</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style lang="css" scoped>
.stagger-fade-enter-active,
.stagger-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.stagger-fade-enter-active {
  transition-delay: calc(700ms + var(--i) * 120ms);
}

.stagger-fade-enter-from,
.stagger-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
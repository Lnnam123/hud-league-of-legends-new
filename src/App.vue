<script setup lang="ts">
import { ref, watch } from 'vue'
import Scoreboard from '@/components/Scoreboard/Scoreboard.vue'
import BaronPowerPlay from '@/components/Scoreboard/BaronPowerPlay.vue'
import ElderDragonPowerPlay from '@/components/Scoreboard/ElderDragonPowerPlay.vue'
import GoldGraph from '@/components/GoldGraph/GoldGraph.vue'
import ConnectionStatus from './components/Debug/ConnectionStatus.vue'
import EventLog from './components/Debug/EventLog.vue'
import PlayerScoreboard from './components/PlayerScoreboard/PlayerScoreboard.vue'
import ObjectiveTimer from './components/ObjectiveTimer/ObjectiveTimer.vue'
import { useIngameSelector, useIsInGame, useIngameConnected } from './composables/useIngame'
import MinimapFrame from './components/Minimap/MinimapFrame.vue'
// import LFrame from "./components/LFrame/LFrame.vue";
import SkinDisplay from './components/SidePanel/SkinDisplay.vue'
import { Team } from '@bluebottle_gg/league-broadcast-client'
import CompactTeamfight from './components/Teamfight/CompactTeamfight.vue'
import SmiteReaction from './components/SmiteReaction/SmiteReaction.vue'
import KillFeed from './components/KillFeed/KillFeed.vue'
import FadeTransition from './transitions/FadeTransition.vue'
import { computed } from 'vue'

const debugVisible = ref(true)
const baronTimer = useIngameSelector((state) => state.gameData.baronPitTimer)
const dragonTimer = useIngameSelector((state) => state.gameData.dragonPitTimer)
const gameTime = useIngameSelector((state) => state.gameData.gameTime)
const scoreboard = useIngameSelector((state) => state.gameData.scoreboard)
const isInGame = useIsInGame()
const isConnected = useIngameConnected()

const blueBaronState = ref({ active: false, remaining: 0, gold: 0 })
const redBaronState = ref({ active: false, remaining: 0, gold: 0 })

const blueElderState = ref({ active: false, remaining: 0 })
const redElderState = ref({ active: false, remaining: 0 })

watch(
  [scoreboard, gameTime, isInGame, isConnected],
  () => {
    if (!isConnected.value || !isInGame.value || !scoreboard.value) {
      blueBaronState.value.active = false
      redBaronState.value.active = false
      blueElderState.value.active = false
      redElderState.value.active = false
      return
    }

    // Blue Team
    const blueTeam = scoreboard.value.teams[0]
    if (blueTeam?.baronPowerPlay) {
      const remaining = blueTeam.baronPowerPlay.timeEnd - gameTime.value
      if (remaining > 0) {
        blueBaronState.value = {
          active: true,
          remaining: remaining,
          gold: blueTeam.baronPowerPlay.gold,
        }
      } else {
        blueBaronState.value.active = false
        blueBaronState.value.remaining = 0
      }
    } else {
      blueBaronState.value.active = false
    }

    if (blueTeam?.dragonPowerPlay) {
      const remaining = blueTeam.dragonPowerPlay.timeEnd - gameTime.value
      if (remaining > 0) {
        blueElderState.value = {
          active: true,
          remaining: remaining,
        }
      } else {
        blueElderState.value.active = false
        blueElderState.value.remaining = 0
      }
    } else {
      blueElderState.value.active = false
    }

    // Red Team
    const redTeam = scoreboard.value.teams[1]
    if (redTeam?.baronPowerPlay) {
      const remaining = redTeam.baronPowerPlay.timeEnd - gameTime.value
      if (remaining > 0) {
        redBaronState.value = {
          active: true,
          remaining: remaining,
          gold: redTeam.baronPowerPlay.gold,
        }
      } else {
        redBaronState.value.active = false
        redBaronState.value.remaining = 0
      }
    } else {
      redBaronState.value.active = false
    }

    if (redTeam?.dragonPowerPlay) {
      const remaining = redTeam.dragonPowerPlay.timeEnd - gameTime.value
      if (remaining > 0) {
        redElderState.value = {
          active: true,
          remaining: remaining,
        }
      } else {
        redElderState.value.active = false
        redElderState.value.remaining = 0
      }
    } else {
      redElderState.value.active = false
    }
  },
  { deep: true, immediate: true },
)

const blueBaron = computed(() => blueBaronState.value)
const redBaron = computed(() => redBaronState.value)
const blueElder = computed(() => blueElderState.value)
const redElder = computed(() => redElderState.value)
</script>

<template>
  <div class="overlay">
    <div class="overlay-scoreboard-wrapper">
      <div class="overlay-power-play-container left">
        <div class="overlay-baron-pp left" :class="{ 'baron-visible': blueBaron.active }">
          <BaronPowerPlay :remaining="blueBaron.remaining" :gold="blueBaron.gold" :mirror="false" />
        </div>
        <div class="overlay-elder-pp left" :class="{ 'elder-visible': blueElder.active }">
          <ElderDragonPowerPlay :remaining="blueElder.remaining" :mirror="false" />
        </div>
      </div>
      <Scoreboard class="overlay-scoreboard" />
      <div class="overlay-power-play-container right">
        <div class="overlay-baron-pp right" :class="{ 'baron-visible': redBaron.active }">
          <BaronPowerPlay :remaining="redBaron.remaining" :gold="redBaron.gold" :mirror="true" />
        </div>
        <div class="overlay-elder-pp right" :class="{ 'elder-visible': redElder.active }">
          <ElderDragonPowerPlay :remaining="redElder.remaining" :mirror="true" />
        </div>
      </div>
    </div>
    <PlayerScoreboard class="overlay-playerscoreboard" />
    <div class="overlay-objective-timers">
      <ObjectiveTimer :objective-data="baronTimer" :game-time="gameTime" />
      <ObjectiveTimer :objective-data="dragonTimer" :game-time="gameTime" />
    </div>
    <MinimapFrame class="overlay-minimap" />
    <LFrame class="overlay-lframe" />

    <!-- Basic Tier only features -->
    <SkinDisplay class="overlay-skindisplay" :team="Team.Order" />
    <SkinDisplay class="overlay-skindisplay" :team="Team.Chaos" mirror />
    <SmiteReaction class="overlay-smitereaction" />
    <KillFeed class="overlay-killfeed" />
    <PlayerCameras class="overlay-playercameras" />
    <GoldGraph class="overlay-bottom" />
    <CompactTeamfight class="overlay-teamfight" />

    <!-- Debug panel. Hide me in production! -->
    <!-- <div class="debug-wrapper">
      <button class="debug-toggle" @click="debugVisible = !debugVisible">
        {{ debugVisible ? "<" : ">" }} </button>
          <Transition name="debug-slide">
            <div v-if="debugVisible" class="debug">
              <ConnectionStatus class="debug-connection" />
              <EventLog class="debug-eventlog" />
            </div>
          </Transition>
    </div> -->
  </div>
</template>

<style>
/* Broadcast overlay: transparent, full-viewport, no scrollbars */
@layer base {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  * {
    --blue-team-color: oklch(0.6231 0.188 259.81);
    --red-team-color: oklch(0.6231 0.188 28.31);
  }
}

html,
body {
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: transparent;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
  color: #e2e8f0;
}

/* DEV MODE: Cho phép click và chọn text để dễ dàng sử dụng DevTools Inspect Element */
* {
  pointer-events: auto !important;
  user-select: auto !important;
}
</style>

<style scoped>
.overlay {
  position: relative;
  width: 1920px;
  height: 1080px;
}

.overlay-scoreboard-wrapper {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.overlay-scoreboard {
  z-index: 10;
}

.overlay-baron-pp {
  position: absolute;
  top: 0;
  height: 60px;
  z-index: 1;
  overflow: hidden;
  opacity: 0;
  transition:
    clip-path 0.4s cubic-bezier(0.25, 1, 0.5, 1),
    opacity 0.3s ease-in-out;
  pointer-events: none;
}

.overlay-elder-pp {
  position: absolute;
  top: 0;
  height: 60px;
  z-index: 1;
  overflow: hidden;
  opacity: 0;
  transition:
    clip-path 0.4s cubic-bezier(0.25, 1, 0.5, 1),
    opacity 0.3s ease-in-out;
  pointer-events: none;
}

.overlay-baron-pp.right,
.overlay-elder-pp.right {
  left: calc(100% + 8px);
  clip-path: inset(0 100% 0 0);
}

.overlay-baron-pp.left,
.overlay-elder-pp.left {
  right: calc(100% + 8px);
  clip-path: inset(0 0 0 100%);
}

.overlay-baron-pp.baron-visible,
.overlay-elder-pp.elder-visible {
  clip-path: inset(0 0 0 0);
  opacity: 1;
  pointer-events: auto;
}

.overlay-bottom {
  position: absolute;
  bottom: 0px;
  left: 0x;
  width: calc(1920px - 285px);
  height: 260px;
}

.overlay-playerscoreboard {
  position: absolute;
  bottom: 1px;
  /* left: 285px;
  right: 285px; */
  left: calc(285px + 176px);
  right: calc(285px + 176px);
  height: 260px;
}

.overlay-playercameras {
  position: absolute;
  bottom: 0px;
  left: 285px;
  right: 285px;
  height: 260px;
}

.overlay-objective-timers {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 4px;
}

.overlay-minimap {
  position: absolute;
  bottom: 0px;
  right: 0px;
  width: 275px;
  height: 275px;
}

.overlay-lframe {
  position: absolute;
  bottom: 0px;
  left: 0px;
  width: 285px;
  height: 260px;
}

.overlay-teamfight {
  position: absolute;
  bottom: 0px;
  left: calc(285px + 176px);
  right: calc(285px + 176px);
  height: 260px;
}

.overlay-killfeed {
  position: absolute;
  top: 100px;
  right: 0px;
}

.debug-wrapper {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.debug-toggle {
  align-self: flex-start;
  padding: 4px 10px;
  font-size: 11px;
  background: rgba(15, 23, 42, 0.75);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition:
    background 0.15s,
    color 0.15s;
}

.debug-toggle:hover {
  background: rgba(30, 41, 59, 0.9);
  color: #e2e8f0;
}

.debug {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* slide-fade transition */
.debug-slide-enter-active,
.debug-slide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.debug-slide-enter-from,
.debug-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import BaronIcon from '@/assets/baron/baron-icon.svg?url'
import { useClient } from '@/client'

const props = defineProps<{
  remaining: number
  gold: number
  mirror?: boolean
}>()

const client = useClient()
const seasonIcon = ref<string | null>(null)

onMounted(async () => {
  seasonIcon.value = await client.api.season.getCurrentSeasonIcon()
})

const formattedTime = computed(() => {
  const m = Math.floor(props.remaining / 60)
  const s = Math.floor(props.remaining % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
})

const progressPercent = computed(() => {
  return Math.max(0, Math.min(100, (props.remaining / 180) * 100))
})
</script>

<template>
  <div class="baron-power-play" :class="mirror ? 'flex-row' : 'flex-row-reverse'">
    <div class="logo-box">
      <img v-if="seasonIcon" :src="client.getCacheUrl(seasonIcon, true)" class="tournament-logo" />
    </div>
    <div class="content-box">
      <div class="content-top">
        <div class="baron-icon-box">
          <img :src="BaronIcon" class="baron-icon" />
        </div>
        <div class="info-box">
          <div class="info-text-wrapper">
            <span class="gold-text text-stretch-vertical">{{ gold > 0 ? '+' : '' }}{{ Math.round(gold) }} G</span>
            <span class="time-text">{{ formattedTime }}</span>
          </div>
        </div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.baron-power-play {
  display: flex;
  height: 60px;
  border-radius: 0;
  border: 1px solid #ffffff33;
  /* overflow: hidden; */
  box-sizing: border-box;
}

.flex-row {
  flex-direction: row;
}

.flex-row-reverse {
  flex-direction: row-reverse;
}

.logo-box {
  width: 60px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.9);
  flex-shrink: 0;
}

.tournament-logo {
  height: 36px;
  width: 36px;
  object-fit: contain;
}

.content-box {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex-shrink: 0;
}

.content-top {
  display: flex;
  flex: 1;
}

.flex-row .content-top {
  flex-direction: row;
}

.flex-row-reverse .content-top {
  flex-direction: row-reverse;
}

.baron-icon-box {
  width: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #3b2a5c;
  flex-shrink: 0;
}

.baron-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
  filter: drop-shadow(0 0 2px rgba(168, 85, 247, 0.5));
}

.info-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.85);
  padding: 0 16px;
  flex-shrink: 0;
}

.info-text-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.gold-text {
  color: #fff;
  font-size: 20px;
  font-weight: normal;
  margin-bottom: 4px;
  line-height: 1;
}

.time-text {
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  line-height: 1; /* Remove the 24px line-height which adds too much space */
  z-index: 1;
  margin-top: 2px;
}

.progress-bar-container {
  height: 8px;
  background-color: rgba(168, 85, 247, 0.3);
  width: 100%;
}

.progress-bar {
  height: 100%;
  background-color: #a855f7;
  transition: width 1s linear;
}

.flex-row-reverse .progress-bar {
  float: right;
}

.text-stretch-vertical {
  font-family: 'Compacta Std', sans-serif;
  display: inline-block;
  line-height: 1;
  -webkit-transform: scale(1, 1.25);
  transform: scale(1, 1.25);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import ElderDragonIcon from '@/assets/dragon/elder.png'

const props = defineProps<{
  remaining: number
  mirror?: boolean
}>()

const formattedTime = computed(() => {
  const m = Math.floor(props.remaining / 60)
  const s = Math.floor(props.remaining % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
})

const progressPercent = computed(() => {
  return Math.max(0, Math.min(100, (props.remaining / 150) * 100))
})
</script>

<template>
  <div class="elder-power-play" :class="mirror ? 'flex-row' : 'flex-row-reverse'">
    <div class="content-box">
      <div class="content-top">
        <div class="elder-icon-box">
          <img :src="ElderDragonIcon" class="elder-icon" />
        </div>
        <div class="info-box">
          <div class="info-text-wrapper">
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
.elder-power-play {
  display: flex;
  height: 60px;
  border-radius: 4px;
  border: 1px solid #ffffff33;
  overflow: hidden;
  box-sizing: border-box;
}

.flex-row {
  flex-direction: row;
}

.flex-row-reverse {
  flex-direction: row-reverse;
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

.elder-icon-box {
  width: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0d7077;
  flex-shrink: 0;
}

.elder-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
  filter: drop-shadow(0 0 2px rgba(0, 229, 229, 0.5));
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
  align-items: center; /* Time centered without gold */
  justify-content: center;
  height: 100%;
}

.time-text {
  color: #fff;
  font-family: 'Compacta Std', sans-serif;
  font-size: 27px;
  line-height: 1;
  z-index: 1;
  margin-top: 2px;
}

.progress-bar-container {
  height: 8px;
  background-color: rgba(0, 229, 229, 0.3);
  width: 100%;
}

.progress-bar {
  height: 100%;
  background-color: #00e5e5;
  transition: width 1s linear;
}

.flex-row-reverse .progress-bar {
  float: right;
}
</style>

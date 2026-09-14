<script setup lang="ts">
import { useClient } from '@/client'
import { handleImageError, handleImageLoad } from '@/utils/imageUtils'

export interface FeedItem {
  id: number
  ingameTeamId: number
  type?: 'kill' | 'dragon' | 'baron' | 'crab' | 'tower' | 'herald' | 'grubs'
  killer?: {
    name: string
    squareImg: string
  }
  victim: {
    name: string
    squareImg: string
  }
  assisters?: Array<{
    name: string
    squareImg: string
  }>
  objectiveName?: string
}

defineProps<{
  event: FeedItem
}>()

const client = useClient()
const CD_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default'

function getImgUrl(path?: string): string {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/')) return path
  if (client) {
    const cached = client.getCacheUrl(path)
    if (cached) return cached
  }
  const clean = path.toLowerCase().replace('/lol-game-data/assets/', '')
  return `${CD_BASE}/${clean}`
}
</script>

<template>
  <div class="kill-entry" :class="[event.ingameTeamId === 1 ? 'order' : 'chaos', event.type || 'kill']">
    <!-- Assisters (small icons on the left) -->
    <div v-if="event.assisters?.length" class="assisters">
      <div
        v-for="(assister, aIdx) in event.assisters"
        :key="aIdx"
        class="assister-frame"
        :title="assister.name"
      >
        <img
          :src="getImgUrl(assister.squareImg)"
          class="assister-icon"
          :alt="assister.name"
          @error="handleImageError"
          @load="handleImageLoad"
        />
      </div>
    </div>

    <!-- Killer -->
    <div v-if="event.killer" class="killer-frame" :title="event.killer.name">
      <img
        :src="getImgUrl(event.killer.squareImg)"
        class="killer-icon"
        :alt="event.killer.name"
        @error="handleImageError"
        @load="handleImageLoad"
      />
    </div>

    <!-- Kill separator (Crossed Swords) - only when killer exists -->
    <div v-if="event.killer" class="kill-icon-wrapper">
      <svg class="swords-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.5 17.5L3 6V3H6L17.5 14.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13 19L19 13M16 16L20 20M19 21L21 19" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M9.5 17.5L21 6V3H18L6.5 14.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M11 19L5 13M8 16L4 20M5 21L3 19" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </div>

    <!-- Victim / Objective Target -->
    <div class="target-wrapper">
      <div
        class="victim-frame"
        :class="{
          'is-dragon': event.type === 'dragon',
          'is-baron': event.type === 'baron',
          'is-herald': event.type === 'herald',
          'is-tower': event.type === 'tower',
        }"
        :title="event.victim?.name"
      >
        <img
          :src="getImgUrl(event.victim?.squareImg)"
          class="victim-icon"
          :class="{ 'objective-img': event.type && event.type !== 'kill' }"
          :alt="event.victim?.name"
          @error="handleImageError"
          @load="handleImageLoad"
        />
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.kill-entry {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  padding: 4px 10px 4px 8px;
  border-radius: 4px 0 0 4px;
  backdrop-filter: blur(8px);
  background: rgba(10, 15, 25, 0.85);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  border-right: 4px solid #ffffff;
}

.kill-entry.order {
  background: linear-gradient(
    to left,
    rgba(0, 128, 255, 0.45) 0%,
    rgba(10, 18, 30, 0.88) 120px,
    rgba(10, 18, 30, 0.6) 100%
  );
  border-right-color: #0080ff;
  box-shadow: 0 4px 14px rgba(0, 128, 255, 0.25), 0 2px 6px rgba(0, 0, 0, 0.7);
}

.kill-entry.chaos {
  background: linear-gradient(
    to left,
    rgba(255, 42, 75, 0.45) 0%,
    rgba(25, 10, 15, 0.88) 120px,
    rgba(25, 10, 15, 0.6) 100%
  );
  border-right-color: #ff2a4b;
  box-shadow: 0 4px 14px rgba(255, 42, 75, 0.25), 0 2px 6px rgba(0, 0, 0, 0.7);
}

.assisters {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  min-width: 0;
}

.assister-frame {
  width: 32px;
  height: 32px;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  overflow: hidden;
  background: #0d121c;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.assister-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.killer-frame {
  width: 44px;
  height: 44px;
  border-radius: 2px;
  border: 2px solid #ffffff;
  overflow: hidden;
  background: #0d121c;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.order .killer-frame {
  border-color: #00bfff;
  box-shadow: 0 0 10px rgba(0, 191, 255, 0.5), 0 2px 6px rgba(0, 0, 0, 0.7);
}

.chaos .killer-frame {
  border-color: #ff3355;
  box-shadow: 0 0 10px rgba(255, 51, 85, 0.5), 0 2px 6px rgba(0, 0, 0, 0.7);
}

.killer-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.placeholder {
  background-color: rgba(255, 255, 255, 0.08);
}

.kill-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2px;
  flex-shrink: 0;
}

.swords-svg {
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.9));
}

.victim-frame {
  width: 44px;
  height: 44px;
  border-radius: 2px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  overflow: hidden;
  background: #0d121c;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.target-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.objective-label {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #ffffff;
  padding: 3px 7px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.18);
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.victim-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: grayscale(0.55) brightness(0.85);
}

.victim-icon.objective-img {
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.9)) !important;
  object-fit: contain !important;
  padding: 4px;
}

.is-dragon {
  border-color: #f97316 !important;
  box-shadow: 0 0 10px rgba(249, 115, 22, 0.6) !important;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.35) 0%, #0d121c 100%) !important;
}

.is-baron {
  border-color: #c084fc !important;
  box-shadow: 0 0 12px rgba(192, 132, 252, 0.7) !important;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, #0d121c 100%) !important;
}

.is-herald {
  border-color: #c084fc !important;
  box-shadow: 0 0 10px rgba(192, 132, 252, 0.65) !important;
  background: radial-gradient(circle, rgba(147, 51, 234, 0.35) 0%, #0d121c 100%) !important;
}

.is-crab {
  border-color: #2dd4bf !important;
  box-shadow: 0 0 10px rgba(45, 212, 191, 0.6) !important;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.35) 0%, #0d121c 100%) !important;
}

.is-tower {
  border-color: #fbbf24 !important;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.6) !important;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, #0d121c 100%) !important;
}
</style>

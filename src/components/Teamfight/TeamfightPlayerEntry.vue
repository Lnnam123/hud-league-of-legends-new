<script setup lang="ts">
import { useClient } from '@/client'
import ProgressBar from '@/components/PlayerScoreboard/ProgressBar.vue'
import {
  ResourceType,
  SpellSlotIndex,
  type damageGraphEntry,
  getRemaining,
} from '@bluebottle_gg/league-broadcast-client'
import SpellWithCooldown from '../PlayerScoreboard/SpellWithCooldown.vue'
import { computed } from 'vue'
import { useIngameSelector } from '@/composables/useIngame'
import ItemWithCooldown from '../PlayerScoreboard/ItemWithCooldown.vue'
import FadeTransition from '@/transitions/FadeTransition.vue'
import LevelUpNotification from '../PlayerScoreboard/LevelUpNotification.vue'
import ItemBuyNotification from '../PlayerScoreboard/ItemBuyNotification.vue'

const props = withDefaults(
  defineProps<{
    mirror?: boolean
    data?: damageGraphEntry
    levelUpLevel?: number | null
    levelUpVisible?: boolean
    levelUpExiting?: boolean
    itemBuyIcon?: string
    itemBuyVisible?: boolean
    itemBuyExiting?: boolean
    hasBaron?: boolean
    hasElder?: boolean
  }>(),
  {
    mirror: false,
    data: undefined,
    levelUpLevel: null,
    levelUpVisible: false,
    levelUpExiting: false,
    itemBuyIcon: undefined,
    itemBuyVisible: false,
    itemBuyExiting: false,
    hasBaron: false,
    hasElder: false,
  },
)

const client = useClient()
const gameTime = useIngameSelector((s) => s.gameData.gameTime)

const respawnRemaining = computed(() => getRemaining(props.data?.respawnAt, gameTime.value))

const buffBorderClass = computed(() => {
  if (respawnRemaining.value > 0) return ''
  const hasBaron = props.hasBaron
  const hasElder = props.hasElder
  if (hasBaron && hasElder) return 'buff-both'
  if (hasBaron) return 'buff-baron'
  if (hasElder) return 'buff-elder'
  return ''
})

const spellD = computed(() => {
  if (!props.data || !props.data.abilities || !props.data.abilities[SpellSlotIndex.D])
    return undefined
  return props.data.abilities[SpellSlotIndex.D]
})

const spellF = computed(() => {
  if (!props.data || !props.data.abilities || !props.data.abilities[SpellSlotIndex.F])
    return undefined
  return props.data.abilities[SpellSlotIndex.F]
})

const spellR = computed(() => {
  if (!props.data || !props.data.abilities || !props.data.abilities[SpellSlotIndex.R])
    return undefined
  return props.data.abilities[SpellSlotIndex.R]
})

const healthPct = computed(() => {
  if (!props.data) return 0
  return ((props.data.health?.current ?? 0) / (props.data.health?.max ?? 1)) * 100
})

const resourcePct = computed(() => {
  if (!props.data) return 0
  return ((props.data.resource?.current ?? 0) / (props.data.resource?.max ?? 1)) * 100
})

const resourceColor = computed(() => {
  //resource type might be a string, so parse it to enum if needed
  const resourceType =
    typeof props.data?.resource?.type === 'string'
      ? ResourceType[props.data.resource.type as keyof typeof ResourceType]
      : props.data?.resource?.type

  switch (resourceType) {
    case ResourceType.mana:
      return '#1d4ed8'
    case ResourceType.energy:
      return '#d6db29'
    case ResourceType.none:
      return 'transparent'
    case ResourceType.shield:
      return '#A9A9A9'
    case ResourceType.battlefury:
    case ResourceType.dragonfury:
    case ResourceType.rage:
    case ResourceType.heat:
    case ResourceType.gnarfury:
    case ResourceType.ferocity:
    case ResourceType.bloodwell:
      return '#bf0000'
    case ResourceType.wind:
      return '#A9A9A9'
    case ResourceType.unknown:
    default:
      return '#1d4ed8'
  }
})

const xpPct = computed(() => {
  if (!props.data) return 0
  const previous = props.data.experience?.previousLevel ?? 0
  const next = props.data.experience?.nextLevel ?? 1
  const current = props.data.experience?.current ?? 0
  return ((current - previous) / (next - previous)) * 100
})

const displayItems = computed(() => {
  if (!props.data?.activeItems) return []
  return props.data.activeItems.filter((i) => i && i.id > 0).slice(0, 3)
})

const ultIcon = computed(() => {
  if (spellR.value?.assets?.iconAsset) {
    return client.getCacheUrl(spellR.value.assets.iconAsset)
  }
  return ''
})

const isUltUnlocked = computed(() => {
  return (spellR.value?.level ?? 0) > 0 || (props.data?.level ?? 1) >= 6
})
</script>

<template>
  <!-- Main grid: ult + spells + splash + bars on left 2 cols, items on right col -->
  <div
    class="main-grid"
    :class="mirror ? 'mirrored' : ''"
    :style="{
      filter: respawnRemaining > 0 ? 'grayscale(1)' : 'grayscale(0)',
    }"
  >
    <!-- Ultimate icon: centered over the 2-col section -->
    <div class="area-ult flex justify-center">
      <SpellWithCooldown
        v-if="ultIcon"
        :ready-at="spellR?.readyAt"
        :img="ultIcon"
        show-timer
        skilled
        :total-cooldown="spellR?.totalCooldown"
        class="champion-icon rounded-full"
        :class="{ 'ult-locked': !isUltUnlocked }"
        style="--cooldown-font-size: 16px"
      />
      <div v-else class="champion-icon rounded-full ult-locked"></div>
    </div>

    <!-- Spell icons: top-left 2 cells -->
    <SpellWithCooldown
      :ready-at="spellD?.readyAt"
      :img="client.getCacheUrl(spellD?.assets?.iconAsset)"
      show-timer
      skilled
      :total-cooldown="spellD?.totalCooldown"
      class="spell-icon area-spell1"
    />
    <SpellWithCooldown
      :ready-at="spellF?.readyAt"
      :img="client.getCacheUrl(spellF?.assets?.iconAsset)"
      show-timer
      skilled
      :total-cooldown="spellF?.totalCooldown"
      class="spell-icon area-spell2"
    />

    <!-- Splash portrait -->
    <div class="player-portrait bg-zinc-600 area-splash" :class="buffBorderClass">
      <img
        :src="client.getCacheUrl(data?.champion?.squareImg)"
        class="object-cover w-full h-full"
      />
      <FadeTransition>
        <span v-if="respawnRemaining > 0" class="respawn-timer">{{
          Math.ceil(respawnRemaining)
        }}</span>
      </FadeTransition>
      <LevelUpNotification
        :level="levelUpLevel ?? undefined"
        :visible="levelUpVisible ?? false"
        :exiting="levelUpExiting ?? false"
        :mirror="mirror"
      />
      <ItemBuyNotification
        :item-icon="itemBuyIcon"
        :visible="itemBuyVisible ?? false"
        :exiting="itemBuyExiting ?? false"
        :mirror="mirror"
        :grayscale="respawnRemaining > 0"
      />
    </div>

    <!-- Level + progress bars -->
    <div class="area-bars flex flex-row">
      <div class="level-text">
        {{ data?.level }}
      </div>
      <div class="flex-1 flex flex-col gap-0.5 p-0.5 area-progress">
        <ProgressBar :progress-pct="xpPct" fill-color="#a78bfa" :mirror="mirror" class="flex-1" />
        <ProgressBar
          :progress-pct="healthPct"
          fill-color="#22c55e"
          :mirror="mirror"
          class="flex-2"
        />
        <ProgressBar
          :progress-pct="resourcePct"
          :fill-color="resourceColor"
          :mirror="mirror"
          class="flex-2"
        />
      </div>
    </div>

    <!-- Items: up to 3 slots in the item column -->
    <div class="area-items">
      <div
        v-for="(item, index) in displayItems"
        :key="index"
        class="item-slot-wrapper"
      >
        <ItemWithCooldown
          :item="item"
          class="w-full h-full"
          :show-stacks="true"
        />
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
/*
  3-column grid: [spell/splash/bars (×2)] [items]
  Mirrored flips column order via grid-template-areas.
*/
.main-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: auto auto auto auto;
  grid-template-areas:
    'ult    ult    empty'
    'spell1 spell2 items'
    'splash splash items'
    'bars   bars   items';
  min-width: 0;
  max-width: 78px;
  width: 100%;
  box-sizing: border-box;
  transition: filter 0.5s ease;
}

.main-grid.mirrored {
  grid-template-areas:
    'empty ult    ult   '
    'items spell1 spell2'
    'items splash splash'
    'items bars   bars  ';
}

.area-ult {
  grid-area: ult;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
}

.champion-icon {
  width: 42px;
  height: 42px;
  max-width: 90%;
  aspect-ratio: 1 / 1;
  transform: translateY(4px);
  z-index: 5;
  border: 1.5px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.85);
  background-color: black;
  box-sizing: border-box;
}

.champion-icon.ult-locked {
  filter: grayscale(1) brightness(0.35);
  border-color: rgba(255, 255, 255, 0.2);
}

.area-spell1 {
  grid-area: spell1;
}

.area-spell2 {
  grid-area: spell2;
}

.spell-icon {
  aspect-ratio: 1 / 1;
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(0, 0, 0, 0.8);
  box-sizing: border-box;
}

.area-splash {
  grid-area: splash;
  border-left: 1px solid rgba(255, 255, 255, 0.55);
  border-right: 1px solid rgba(255, 255, 255, 0.55);
  border-top: 1px solid rgba(255, 255, 255, 0.55);
  box-sizing: border-box;
}

.player-portrait {
  aspect-ratio: 1 / 1;
  width: 100%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-color: #1e293b;
}

.area-bars {
  grid-area: bars;
  border: 1px solid rgba(255, 255, 255, 0.55);
  background-color: black;
  box-sizing: border-box;
  height: 20px;
}

.level-text {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  line-height: 1;
  width: 17px;
  flex-shrink: 0;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  border-right: 1px solid rgba(255, 255, 255, 0.55);
  box-sizing: border-box;
}

.area-items {
  grid-area: items;
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

.item-slot-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(0, 0, 0, 0.6);
  box-sizing: border-box;
}

.item-slot-wrapper :deep(.item-slot),
.item-slot-wrapper :deep(.item-slot-content) {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-slot-wrapper :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.respawn-timer {
  position: absolute;
  color: white;
  font-family: 'Compacta Std', sans-serif;
  font-size: 30px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.5px;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 2px #000;
}

.buff-baron::before,
.buff-elder::before,
.buff-both::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  box-sizing: border-box;
}

.buff-baron::before {
  border: 2px solid rgba(155, 48, 255, 1);
  box-shadow: inset 0 0 4px rgba(155, 48, 255, 0.7);
}

.buff-elder::before {
  border: 2px solid #00e5e5;
  box-shadow: inset 0 0 4px rgba(0, 229, 229, 0.7);
}

.buff-both::before {
  border: 2px solid;
  border-color: #9b30ff #9b30ff #00e5e5 #00e5e5;
  box-shadow: inset 0 0 4px rgba(155, 48, 255, 0.5), inset 0 0 4px rgba(0, 229, 229, 0.5);
}
</style>

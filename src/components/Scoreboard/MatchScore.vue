<script setup lang="ts">
import { BestOfType } from '@bluebottle_gg/league-broadcast-client'
import { computed } from 'vue'

const props = defineProps<{
  bestOf: BestOfType
  wins: number
  fillColor: string
  mirror?: boolean
}>()

const winsRequired = computed(() => {
  if (props.bestOf === BestOfType.BestOf1) return 0
  return Math.ceil(props.bestOf / 2)
})
</script>

<template>
  <div class="flex gap-1" :class="mirror ? 'flex-row-reverse' : 'flex-row'">
    <div id="color-display" class="flex w-1">
      <div
        class="grow"
        :style="{
          backgroundColor: fillColor,
        }"
      ></div>
    </div>

    <div id="scores" class="w-2 flex flex-col gap-1.5" v-if="winsRequired > 0">
      <div
        class="flex flex-1 w-full grow border border-white/55 p-px"
        v-for="i in winsRequired"
        :key="i"
      >
        <div
          class="grow"
          :style="{
            backgroundColor: i <= wins ? fillColor : 'transparent',
          }"
        ></div>
      </div>
    </div>
    <div v-else class="w-2"></div>
  </div>
</template>

<style lang="css" scoped></style>

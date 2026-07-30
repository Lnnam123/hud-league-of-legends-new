<script setup lang="ts">
import { useAttrs, type Component } from 'vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const props = defineProps<{
  text: string
  iconUrl?: string
  iconComponent?: Component
  mirror?: boolean
  smallText?: boolean
}>()
</script>

<template>
  <div class="flex items-center" :class="mirror ? 'flex-row-reverse' : 'flex-row'">
    <img
      v-if="iconUrl"
      :src="iconUrl"
      alt="Icon"
      v-bind="attrs"
      class="w-auto object-contain"
      style="height: 18px"
      :class="mirror ? 'ml-2' : 'mr-2'"
    />
    <component
      v-else-if="iconComponent"
      :is="iconComponent"
      v-bind="attrs"
      class="w-auto object-contain"
      style="height: 18px"
      :class="mirror ? 'ml-2' : 'mr-2'"
    />

    <span v-if="smallText" class="text-lg font-bold spcing">{{ text }}</span>
    <span
      v-else
      class="text-xl font-extrabold spcing tracking-tight text-stretch-vertical capitalize"
      >{{ text }}</span
    >
  </div>
</template>

<style lang="css" scoped>
.text-stretch-vertical {
  font-family: 'Compacta Std';
  display: inline-block;
  font-size: 27px;
  font-weight: 400;
  line-height: 1;
  -webkit-transform: scale(1, 1.15);
  /* Safari and Chrome */
  -moz-transform: scale(1, 1.15);
  /* Firefox */
  -ms-transform: scale(1, 1.15);
  /* IE 9 */
  -o-transform: scale(1, 1.15);
  /* Opera */
  transform: scale(1, 1.15);
  /* Standard syntax */
}
</style>

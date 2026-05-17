<script setup lang="ts">
import { useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const props = defineProps<{
    text: string
    iconUrl?: string
    mirror?: boolean
}>()
</script>

<template>

    <div class="flex items-center" :class="mirror ? 'flex-row-reverse' : 'flex-row'">
        <img v-if="iconUrl" :src="iconUrl" alt="Icon" v-bind="attrs" class="w-auto object-contain"
            :class="mirror ? 'ml-2' : 'mr-2'" />
        <span class="text-xl font-extrabold spcing tracking-tight text-stretch-vertical capitalize">{{ text }}</span>
    </div>
</template>


<style lang="css" scoped>
.text-stretch-vertical {
    font-family: 'Compacta Std';
    display: inline-block;
    font-size: 23px;
    -webkit-transform: scale(1, 1.5);
    /* Safari and Chrome */
    -moz-transform: scale(1, 1.5);
    /* Firefox */
    -ms-transform: scale(1, 1.5);
    /* IE 9 */
    -o-transform: scale(1, 1.5);
    /* Opera */
    transform: scale(1, 1.5);
    /* Standard syntax */
}
</style>
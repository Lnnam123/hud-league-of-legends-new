<script setup lang="ts">
defineProps<{
    itemIcon?: string
    visible: boolean
    exiting: boolean
    mirror?: boolean
}>()
</script>

<template>
    <div class="item-buy-overlay" :class="{ 'is-visible': visible, 'is-exiting': exiting, 'is-chaos': mirror }">
        <div class="item-buy-content">
            <img v-if="itemIcon" class="item-icon" :src="itemIcon" />
        </div>
    </div>
</template>

<style lang="css" scoped>
.item-buy-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: black;
    pointer-events: none;
    z-index: 10;
    transform: translateY(100%);
    opacity: 0;
    transition: transform 0.35s ease-out, opacity 0.35s ease-out;
}

.item-buy-overlay.is-visible {
    transform: translateY(0);
    opacity: 1;
}

.item-buy-overlay.is-exiting {
    transform: translateY(-100%);
    opacity: 0;
}

.item-buy-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.item-icon {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
</style>
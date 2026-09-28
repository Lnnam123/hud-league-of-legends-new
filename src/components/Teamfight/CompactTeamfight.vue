<script setup lang="ts">
import { useIngameSelector } from '@/composables/useIngame'
import { Team, SpellSlotIndex, type damageGraphEntry, type playerUpdateEvent } from '@bluebottle_gg/league-broadcast-client'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useClient } from '@/client'
import { handleImageError, handleImageLoad } from '@/utils/imageUtils'
import BlueBottleGGLogo from '@/assets/blue_bottle-logo-color-bright_outline.svg'
import TeamfightPlayerEntry from './TeamfightPlayerEntry.vue'
import { useHudSettings } from '@/composables/useHudSettings'
import { useNotificationQueue } from '@/composables/useNotificationQueue'

const client = useClient()
const seasonIcon = ref<string | null>(null)
const dateTimeNowString = new Date().toISOString()

onMounted(async () => {
  try {
    seasonIcon.value = await client.api.season.getCurrentSeasonIcon()
  } catch (e) {
    console.error('Failed to load scoreboard seasonIcon', e)
  }
})

const props = withDefaults(
  defineProps<{
    show?: boolean
  }>(),
  {
    show: undefined,
  },
)

const { settings } = useHudSettings()
const teamfight = useIngameSelector((state) => state.gameData.teamfightDamageOverview)
const scoreboardBottom = useIngameSelector((s) => s.gameData.scoreboardBottom)
const tabs = useIngameSelector((s) => s.gameData.tabs)

const mockHealth = (current: number, max: number): any => ({
  current,
  max,
  shield: 0,
  physicalShield: 0,
  magicalShield: 0,
})

// Sample preview entries when game has not started yet
const MOCK_BLUE_ENTRIES: damageGraphEntry[] = [
  {
    name: 'Zeus',
    displayName: 'Zeus',
    team: Team.Order,
    role: 'TOP',
    level: 15,
    totalDamageDealt: 14200,
    champion: { id: 266, name: 'Aatrox', alias: 'Aatrox', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Aatrox.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      {} as any, {} as any, {} as any,
      { slot: SpellSlotIndex.R, level: 3, readyAt: 0, totalCooldown: 120, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/AatroxR.png' } } as any,
      { slot: SpellSlotIndex.D, level: 1, readyAt: 0, totalCooldown: 300, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } } as any,
      { slot: SpellSlotIndex.F, level: 1, readyAt: 0, totalCooldown: 360, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerTeleport.png' } } as any,
    ],
    health: mockHealth(2850, 2850),
    resource: { current: 0, max: 0, type: 'none' as any },
    experience: { current: 75, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
  {
    name: 'Oner',
    displayName: 'Oner',
    team: Team.Order,
    role: 'JUNGLE',
    level: 14,
    totalDamageDealt: 11800,
    champion: { id: 64, name: 'Lee Sin', alias: 'LeeSin', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/LeeSin.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      {} as any, {} as any, {} as any,
      { slot: SpellSlotIndex.R, level: 2, readyAt: 0, totalCooldown: 90, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/LeeSinR.png' } } as any,
      { slot: SpellSlotIndex.D, level: 1, readyAt: 0, totalCooldown: 300, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } } as any,
      { slot: SpellSlotIndex.F, level: 1, readyAt: 0, totalCooldown: 90, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerSmite.png' } } as any,
    ],
    health: mockHealth(2400, 2400),
    resource: { current: 200, max: 200, type: 'energy' as any },
    experience: { current: 40, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
  {
    name: 'Faker',
    displayName: 'Faker',
    team: Team.Order,
    role: 'MIDDLE',
    level: 14,
    totalDamageDealt: 18500,
    champion: { id: 103, name: 'Ahri', alias: 'Ahri', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Ahri.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      { id: 'AhriOrbofDeception', name: 'Orb of Deception', level: 5, maxCooldown: 7, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/AhriOrbofDeception.png' } },
      { id: 'AhriFoxFire', name: 'Fox-Fire', level: 3, maxCooldown: 9, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/AhriFoxFire.png' } },
      { id: 'AhriSeduce', name: 'Charm', level: 5, maxCooldown: 12, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/AhriSeduce.png' } },
      { id: 'AhriTumble', name: 'Spirit Rush', level: 2, maxCooldown: 110, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/AhriTumble.png' } },
      { id: 'SummonerFlash', name: 'Flash', level: 1, maxCooldown: 300, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } },
      { id: 'SummonerTeleport', name: 'Teleport', level: 1, maxCooldown: 360, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerTeleport.png' } },
    ] as any,
    activeItems: [
      { id: 6655, name: "Luden's Companion", cost: 3000, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/6655.png' } },
      { id: 4645, name: 'Shadowflame', cost: 3200, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/4645.png' } },
      { id: 3020, name: "Sorcerer's Shoes", cost: 1100, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3020.png' } },
    ] as any,
    health: mockHealth(1600, 1650),
    resource: { current: 800, max: 1100, type: 'mana' as any },
    experience: { current: 60, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
  {
    name: 'Gumayusi',
    displayName: 'Gumayusi',
    team: Team.Order,
    role: 'BOTTOM',
    level: 14,
    totalDamageDealt: 21000,
    champion: { id: 222, name: 'Jinx', alias: 'Jinx', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Jinx.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      { id: 'JinxQ', name: 'Switcheroo!', level: 5, maxCooldown: 1, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/JinxQ.png' } },
      { id: 'JinxW', name: 'Zap!', level: 5, maxCooldown: 6, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/JinxW.png' } },
      { id: 'JinxE', name: 'Flame Chompers!', level: 2, maxCooldown: 19, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/JinxE.png' } },
      { id: 'JinxR', name: 'Super Mega Death Rocket!', level: 2, maxCooldown: 70, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/JinxR.png' } },
      { id: 'SummonerFlash', name: 'Flash', level: 1, maxCooldown: 300, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } },
      { id: 'SummonerHeal', name: 'Heal', level: 1, maxCooldown: 240, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerHeal.png' } },
    ] as any,
    activeItems: [
      { id: 3031, name: 'Infinity Edge', cost: 3400, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3031.png' } },
      { id: 3094, name: 'Rapid Firecannon', cost: 3000, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3094.png' } },
      { id: 3006, name: "Berserker's Greaves", cost: 1100, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3006.png' } },
    ] as any,
    health: mockHealth(1450, 1500),
    resource: { current: 550, max: 700, type: 'mana' as any },
    experience: { current: 80, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
  {
    name: 'Keria',
    displayName: 'Keria',
    team: Team.Order,
    role: 'SUPPORT',
    level: 11,
    totalDamageDealt: 4500,
    champion: { id: 412, name: 'Thresh', alias: 'Thresh', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Thresh.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      { id: 'ThreshQ', name: 'Death Sentence', level: 5, maxCooldown: 12, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/ThreshQ.png' } },
      { id: 'ThreshW', name: 'Dark Passage', level: 3, maxCooldown: 18, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/ThreshW.png' } },
      { id: 'ThreshE', name: 'Flay', level: 2, maxCooldown: 11, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/ThreshE.png' } },
      { id: 'ThreshRPenta', name: 'The Box', level: 1, maxCooldown: 120, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/ThreshRPenta.png' } },
      { id: 'SummonerFlash', name: 'Flash', level: 1, maxCooldown: 300, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } },
      { id: 'SummonerDot', name: 'Ignite', level: 1, maxCooldown: 180, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerDot.png' } },
    ] as any,
    activeItems: [
      { id: 3190, name: 'Locket of the Iron Solari', cost: 2200, maxCooldown: 90, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3190.png' } },
      { id: 3117, name: 'Boots of Mobility', cost: 1000, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3117.png' } },
    ] as any,
    health: mockHealth(1700, 1800),
    resource: { current: 600, max: 750, type: 'mana' as any },
    experience: { current: 20, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
]

const MOCK_RED_ENTRIES: damageGraphEntry[] = [
  {
    name: 'Doran',
    displayName: 'Doran',
    team: Team.Chaos,
    role: 'TOP',
    level: 15,
    totalDamageDealt: 13500,
    champion: { id: 14, name: 'Sion', alias: 'Sion', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Sion.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      { id: 'SionQ', name: 'Decimating Smash', level: 5, maxCooldown: 10, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SionQ.png' } },
      { id: 'SionW', name: 'Soul Furnace', level: 3, maxCooldown: 15, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SionW.png' } },
      { id: 'SionE', name: 'Roar of the Slayer', level: 5, maxCooldown: 8, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SionE.png' } },
      { id: 'SionR', name: 'Unstoppable Onslaught', level: 2, maxCooldown: 100, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SionR.png' } },
      { id: 'SummonerFlash', name: 'Flash', level: 1, maxCooldown: 300, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } },
      { id: 'SummonerTeleport', name: 'Teleport', level: 1, maxCooldown: 360, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerTeleport.png' } },
    ] as any,
    activeItems: [
      { id: 3068, name: 'Sunfire Aegis', cost: 2700, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3068.png' } },
      { id: 3075, name: 'Thornmail', cost: 2700, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3075.png' } },
      { id: 3047, name: 'Plated Steelcaps', cost: 1100, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3047.png' } },
    ] as any,
    health: mockHealth(3100, 3200),
    resource: { current: 500, max: 650, type: 'mana' as any },
    experience: { current: 50, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
  {
    name: 'Peanut',
    displayName: 'Peanut',
    team: Team.Chaos,
    role: 'JUNGLE',
    level: 13,
    totalDamageDealt: 8900,
    champion: { id: 113, name: 'Sejuani', alias: 'Sejuani', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Sejuani.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      { id: 'SejuaniQ', name: 'Arctic Assault', level: 3, maxCooldown: 18, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SejuaniQ.png' } },
      { id: 'SejuaniW', name: "Winter's Wrath", level: 5, maxCooldown: 6, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SejuaniW.png' } },
      { id: 'SejuaniE', name: 'Permafrost', level: 3, maxCooldown: 1.5, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SejuaniE.png' } },
      { id: 'SejuaniR', name: 'Glacial Prison', level: 2, maxCooldown: 100, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SejuaniR.png' } },
      { id: 'SummonerFlash', name: 'Flash', level: 1, maxCooldown: 300, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } },
      { id: 'SummonerSmite', name: 'Smite', level: 1, maxCooldown: 90, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerSmite.png' } },
    ] as any,
    activeItems: [
      { id: 3068, name: 'Sunfire Aegis', cost: 2700, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3068.png' } },
      { id: 3111, name: "Mercury's Treads", cost: 1100, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3111.png' } },
    ] as any,
    health: mockHealth(2200, 2300),
    resource: { current: 650, max: 700, type: 'mana' as any },
    experience: { current: 30, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
  {
    name: 'Zeka',
    displayName: 'Zeka',
    team: Team.Chaos,
    role: 'MID',
    level: 15,
    totalDamageDealt: 17200,
    champion: { id: 84, name: 'Akali', alias: 'Akali', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Akali.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      { id: 'AkaliQ', name: 'Five Point Strike', level: 5, maxCooldown: 1.5, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/AkaliQ.png' } },
      { id: 'AkaliW', name: 'Twilight Shroud', level: 3, maxCooldown: 20, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/AkaliW.png' } },
      { id: 'AkaliE', name: 'Shuriken Flip', level: 5, maxCooldown: 10, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/AkaliE.png' } },
      { id: 'AkaliR', name: 'Perfect Execution', level: 2, maxCooldown: 80, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/AkaliR.png' } },
      { id: 'SummonerFlash', name: 'Flash', level: 1, maxCooldown: 300, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } },
      { id: 'SummonerTeleport', name: 'Teleport', level: 1, maxCooldown: 360, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerTeleport.png' } },
    ] as any,
    activeItems: [
      { id: 3152, name: 'Hextech Rocketbelt', cost: 2600, maxCooldown: 40, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3152.png' } },
      { id: 4645, name: 'Shadowflame', cost: 3200, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/4645.png' } },
      { id: 3020, name: "Sorcerer's Shoes", cost: 1100, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3020.png' } },
    ] as any,
    health: mockHealth(1750, 1850),
    resource: { current: 200, max: 200, type: 'energy' as any },
    experience: { current: 70, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
  {
    name: 'Viper',
    displayName: 'Viper',
    team: Team.Chaos,
    role: 'BOTTOM',
    level: 14,
    totalDamageDealt: 19800,
    champion: { id: 145, name: "Kai'Sa", alias: 'Kaisa', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Kaisa.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      { id: 'KaisaQ', name: 'Icathian Rain', level: 5, maxCooldown: 6, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/KaisaQ.png' } },
      { id: 'KaisaW', name: 'Void Seeker', level: 5, maxCooldown: 14, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/KaisaW.png' } },
      { id: 'KaisaE', name: 'Supercharge', level: 3, maxCooldown: 12, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/KaisaE.png' } },
      { id: 'KaisaR', name: 'Killer Instinct', level: 2, maxCooldown: 90, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/KaisaR.png' } },
      { id: 'SummonerFlash', name: 'Flash', level: 1, maxCooldown: 300, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } },
      { id: 'SummonerHeal', name: 'Heal', level: 1, maxCooldown: 240, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerHeal.png' } },
    ] as any,
    activeItems: [
      { id: 3124, name: "Guinsoo's Rageblade", cost: 3000, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3124.png' } },
      { id: 3115, name: "Nashor's Tooth", cost: 3000, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3115.png' } },
      { id: 3006, name: "Berserker's Greaves", cost: 1100, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3006.png' } },
    ] as any,
    health: mockHealth(1550, 1600),
    resource: { current: 600, max: 700, type: 'mana' as any },
    experience: { current: 85, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
  {
    name: 'Delight',
    displayName: 'Delight',
    team: Team.Chaos,
    role: 'SUPPORT',
    level: 11,
    totalDamageDealt: 3800,
    champion: { id: 89, name: 'Leona', alias: 'Leona', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Leona.png', splashCenteredImg: '', splashImg: '', loadingImg: '', tileImg: '' },
    abilities: [
      { id: 'LeonaShieldOfDaybreak', name: 'Shield of Daybreak', level: 5, maxCooldown: 5, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/LeonaShieldOfDaybreak.png' } },
      { id: 'LeonaSolarBarrier', name: 'Eclipse', level: 5, maxCooldown: 14, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/LeonaSolarBarrier.png' } },
      { id: 'LeonaZenithBlade', name: 'Zenith Blade', level: 1, maxCooldown: 12, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/LeonaZenithBlade.png' } },
      { id: 'LeonaSolarFlare', name: 'Solar Flare', level: 1, maxCooldown: 90, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/LeonaSolarFlare.png' } },
      { id: 'SummonerFlash', name: 'Flash', level: 1, maxCooldown: 300, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerFlash.png' } },
      { id: 'SummonerDot', name: 'Ignite', level: 1, maxCooldown: 180, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/SummonerDot.png' } },
    ] as any,
    activeItems: [
      { id: 3190, name: 'Locket of the Iron Solari', cost: 2200, maxCooldown: 90, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3190.png' } },
      { id: 3047, name: 'Plated Steelcaps', cost: 1100, maxCooldown: 0, readyAt: 0, assets: { iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3047.png' } },
    ] as any,
    health: mockHealth(1950, 2050),
    resource: { current: 500, max: 600, type: 'mana' as any },
    experience: { current: 15, previousLevel: 0, nextLevel: 100 },
    damageByType: {},
  },
]

// Notable active and teamfight items
const KEY_ACTIVE_ITEM_IDS = new Set([
  3157, // Zhonya's Hourglass
  2420, 2421, 2423, 2424, // Stopwatch
  3026, // Guardian Angel
  3140, 3139, 6035, // Quicksilver Sash, Mercurial Scimitar, Silvermere Dawn
  3222, // Mikael's Blessing
  3107, // Redemption
  3190, // Locket of the Iron Solari
  3152, // Hextech Rocketbelt
  2065, // Shurelya's Battlesong
  3142, // Youmuu's Ghostblade
  3050, // Zeke's Convergence
  3109, // Knight's Vow
  3053, // Sterak's Gage
  3156, // Maw of Malmortius
  6665, // Kaenic Rookern
  3814, // Edge of Night
  3102, // Banshee's Veil
  2055, // Control Ward
])

const BOOTS_ITEM_IDS = new Set([
  1001, 3006, 3009, 3020, 3047, 3111, 3158, 3005
])

const LOW_PRIO_CONSUMABLE_IDS = new Set([
  2003, 2031, 2033, 2010, 2138, 2139, 2140 // Potions, biscuits, elixirs
])

function getTeamfightItems(playerSc: any): any[] {
  const items: any[] = playerSc?.items || []
  if (!items.length) return []

  // Filter out empty items and consumables like health potions
  const validItems = items.filter(
    (it) => it && it.id > 0 && it.assetUrl && !LOW_PRIO_CONSUMABLE_IDS.has(it.id)
  )
  if (!validItems.length) return []

  // Score each item based on teamfight relevance
  const scored = validItems.map((item) => {
    let score = 0
    const isExplicitActive = KEY_ACTIVE_ITEM_IDS.has(item.id)
    const hasCooldown = (item.maxCooldown ?? 0) > 0 || (item.readyAt ?? 0) > 0
    const isBoot = BOOTS_ITEM_IDS.has(item.id)

    if (isExplicitActive || hasCooldown) {
      score = 1000 + (item.cost || 0)
    } else if (isBoot) {
      score = 800 + (item.cost || 0)
    } else if (item.cost && item.cost >= 2600) {
      score = 500 + item.cost
    } else if (item.id === 2055) {
      score = 400 // Control Ward
    } else {
      score = 100 + (item.cost || 0)
    }

    return { item, score }
  })

  // Sort by score descending, taking at most 3 items
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 3).map((s) => s.item)
}

function buildLiveEntries(team: Team): damageGraphEntry[] {
  const teamIdx = team === Team.Order ? 0 : 1
  const teamName = team === Team.Order ? 'Order' : 'Chaos'
  const playersSc = scoreboardBottom.value?.teams[teamIdx]?.players || []
  const playersTab = tabs.value?.[teamName]?.players || []

  if (!playersSc.length && !playersTab.length) {
    return team === Team.Order ? MOCK_BLUE_ENTRIES : MOCK_RED_ENTRIES
  }

  const entries: damageGraphEntry[] = []
  const count = Math.max(playersSc.length, playersTab.length, 5)

  for (let i = 0; i < count; i++) {
    const sc = playersSc[i]
    const tb = playersTab[i]
    const fallback = (team === Team.Order ? MOCK_BLUE_ENTRIES : MOCK_RED_ENTRIES)[i]

    entries.push({
      champion: sc?.champion || tb?.championAssets || fallback?.champion,
      abilities: tb?.abilities?.length ? tb.abilities : fallback?.abilities,
      activeItems: getTeamfightItems(sc),
      name: sc?.name || tb?.playerName || fallback?.name || `Player ${i + 1}`,
      displayName: sc?.displayName || tb?.displayName || fallback?.displayName || `Player ${i + 1}`,
      team,
      totalDamageDealt: 0,
      respawnAt: tb?.respawnAt,
      level: sc?.level || tb?.level || fallback?.level || 1,
      health: (tb?.health || fallback?.health) as any,
      resource: tb?.resource || fallback?.resource || { current: 500, max: 500, type: 'mana' as any },
      experience: tb?.experience || fallback?.experience || { current: 50, previousLevel: 0, nextLevel: 100 },
      role: ((tb as any)?.role || (sc as any)?.role || fallback?.role || '') as string,
      damageByType: {},
    })
  }

  return entries
}

const isVisible = computed(() => {
  if (props.show !== undefined) return props.show
  if (teamfight.value?.damageDealt?.length) return true
  return !!settings.value.compactTeamfight
})

const blueEntries = computed(() => {
  if (teamfight?.value?.damageDealt?.length) {
    return teamfight.value.damageDealt.filter((entry) => entry.team === Team.Order)
  }
  return buildLiveEntries(Team.Order)
})

const redEntries = computed(() => {
  if (teamfight?.value?.damageDealt?.length) {
    return teamfight.value.damageDealt.filter((entry) => entry.team === Team.Chaos)
  }
  return buildLiveEntries(Team.Chaos)
})

const STAGGER_STEP = 0.08
const BASE_DELAY = 0.25

const levelUpQueue = useNotificationQueue(2000)
const itemBuyQueue = useNotificationQueue(4000)
const minItemValue = 1800

function findPlayerPosition(
  playerName: string,
): { playerIndex: number; team: 'Order' | 'Chaos' } | null {
  if (scoreboardBottom.value) {
    for (let i = 0; i < 5; i++) {
      const pOrder = scoreboardBottom.value.teams[0]?.players[i]
      if (pOrder && (pOrder.name === playerName || pOrder.displayName === playerName)) {
        return { playerIndex: i, team: 'Order' }
      }
      const pChaos = scoreboardBottom.value.teams[1]?.players[i]
      if (pChaos && (pChaos.name === playerName || pChaos.displayName === playerName)) {
        return { playerIndex: i, team: 'Chaos' }
      }
    }
  }
  if (tabs.value) {
    for (let i = 0; i < 5; i++) {
      const pOrder = tabs.value['Order']?.players[i]
      if (pOrder && pOrder.playerName === playerName) {
        return { playerIndex: i, team: 'Order' }
      }
      const pChaos = tabs.value['Chaos']?.players[i]
      if (pChaos && pChaos.playerName === playerName) {
        return { playerIndex: i, team: 'Chaos' }
      }
    }
  }
  for (let i = 0; i < blueEntries.value.length; i++) {
    const e = blueEntries.value[i]
    if (e && (e.name === playerName || e.displayName === playerName || e.champion?.name === playerName || e.champion?.alias === playerName)) {
      return { playerIndex: i, team: 'Order' }
    }
  }
  for (let i = 0; i < redEntries.value.length; i++) {
    const e = redEntries.value[i]
    if (e && (e.name === playerName || e.displayName === playerName || e.champion?.name === playerName || e.champion?.alias === playerName)) {
      return { playerIndex: i, team: 'Chaos' }
    }
  }
  return null
}

function getPlayerBuffs(entry: damageGraphEntry, team: 'Order' | 'Chaos', index: number) {
  const tabPlayers = tabs.value?.[team]?.players || []
  const p = tabPlayers.find(tp => tp && (tp.playerName === entry.name || tp.playerName === entry.displayName)) || tabPlayers[index]
  return {
    hasBaron: p?.hasBaron ?? false,
    hasElder: p?.hasElder ?? false,
  }
}

const unsub = client.onIngameEvents({
  onPlayerEvent(event: playerUpdateEvent) {
    const pos = findPlayerPosition(event.playerNameAndTagLine)
    if (!pos) return

    // Queue level-up notifications
    if (event.levelUp) {
      levelUpQueue.enqueue({
        type: 'level-up',
        playerIndex: pos.playerIndex,
        team: pos.team,
        level: event.levelUp[1],
      })
    }

    // Queue item-buy notifications
    if (event.boughtItems) {
      for (const item of event.boughtItems) {
        if (item.cost < minItemValue) continue
        itemBuyQueue.enqueue({
          type: 'item-buy',
          playerIndex: pos.playerIndex,
          team: pos.team,
          itemIcon: client.getCacheUrl(item.assetUrl),
          itemName: item.displayName,
        })
      }
    }
  },
})

onUnmounted(() => {
  unsub()
})
</script>

<template>
  <Transition name="slide-down">
    <div v-if="isVisible" class="teamfight-container">
      <div class="team-container order">
        <TeamfightPlayerEntry
          class="team-entry"
          v-for="(entry, index) in blueEntries"
          :key="entry.name || index"
          :data="entry"
          mirror
          :data-index="index"
          :style="{ '--entry-delay': `${BASE_DELAY + (blueEntries.length - 1 - index) * STAGGER_STEP}s` }"
          :level-up-level="levelUpQueue.getActive('Order', index)?.level"
          :level-up-visible="levelUpQueue.isVisible('Order', index)"
          :level-up-exiting="levelUpQueue.isExiting('Order', index)"
          :item-buy-icon="itemBuyQueue.getActive('Order', index)?.itemIcon"
          :item-buy-visible="itemBuyQueue.isVisible('Order', index)"
          :item-buy-exiting="itemBuyQueue.isExiting('Order', index)"
          :has-baron="getPlayerBuffs(entry, 'Order', index).hasBaron"
          :has-elder="getPlayerBuffs(entry, 'Order', index).hasElder"
        />
      </div>

      <!-- Center Divider with Scoreboard Logo and Top/Bottom White Lines -->
      <div class="center-divider">
        <div class="divider-line top"></div>
        <div class="divider-logo-wrapper">
          <img
            v-if="seasonIcon"
            :src="client.getCacheUrl(seasonIcon, true) + `?ts=${dateTimeNowString}`"
            class="teamfight-logo-small"
            alt="Scoreboard Logo"
            @error="handleImageError"
            @load="handleImageLoad"
          />
          <BlueBottleGGLogo v-else class="teamfight-logo-small p-0.5" />
        </div>
        <div class="divider-line bottom"></div>
      </div>

      <div class="team-container chaos">
        <TeamfightPlayerEntry
          class="team-entry"
          v-for="(entry, index) in redEntries"
          :key="entry.name || index"
          :data="entry"
          :data-index="index"
          :style="{ '--entry-delay': `${BASE_DELAY + index * STAGGER_STEP}s` }"
          :level-up-level="levelUpQueue.getActive('Chaos', index)?.level"
          :level-up-visible="levelUpQueue.isVisible('Chaos', index)"
          :level-up-exiting="levelUpQueue.isExiting('Chaos', index)"
          :item-buy-icon="itemBuyQueue.getActive('Chaos', index)?.itemIcon"
          :item-buy-visible="itemBuyQueue.isVisible('Chaos', index)"
          :item-buy-exiting="itemBuyQueue.isExiting('Chaos', index)"
          :has-baron="getPlayerBuffs(entry, 'Chaos', index).hasBaron"
          :has-elder="getPlayerBuffs(entry, 'Chaos', index).hasElder"
        />
      </div>
    </div>
  </Transition>
</template>

<style lang="css" scoped>
.teamfight-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
  background: linear-gradient(to bottom, rgba(30, 30, 30, 0), rgba(10, 10, 10, 0.95));
  pointer-events: auto;
  box-sizing: border-box;
}

.team-container {
  flex: 1;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  height: 100%;
  align-items: flex-end;
  background-origin: border-box;
  min-width: 0;
  box-sizing: border-box;
}

/* Blue: gradient border on left (top→bottom) and bottom (right→left), meeting at bottom-left */
.team-container.order {
  padding: 0 4px 18px 8px;
  background:
    linear-gradient(to bottom, transparent, var(--blue-team-color)) left / 4px 100% no-repeat,
    linear-gradient(to left, transparent, var(--blue-team-color)) bottom / 100% 4px no-repeat;
}

/* Red: gradient border on right (top→bottom) and bottom (left→right), meeting at bottom-right */
.team-container.chaos {
  padding: 0 8px 18px 4px;
  background:
    linear-gradient(to bottom, transparent, var(--red-team-color)) right / 4px 100% no-repeat,
    linear-gradient(to right, transparent, var(--red-team-color)) bottom / 100% 4px no-repeat;
}

@keyframes teamfightPlayerEntry {
  0% {
    opacity: 0;
    transform: translateY(100%);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.team-entry {
  flex: 0 0 auto;
  width: 80px;
  max-width: 80px;
  min-width: 0;
  box-sizing: border-box;
  animation: teamfightPlayerEntry 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--entry-delay, 0s);
}

@keyframes teamfightCenterFade {
  0% {
    opacity: 0;
    transform: scaleY(0.7);
  }
  100% {
    opacity: 1;
    transform: scaleY(1);
  }
}

.center-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100px;
  width: 24px;
  margin: 0 10px 18px 10px;
  flex-shrink: 0;
  box-sizing: border-box;
  animation: teamfightCenterFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.22s;
}

.divider-line {
  width: 1px;
  flex: 1;
  background: rgba(255, 255, 255, 0.65);
  min-height: 12px;
}

.divider-logo-wrapper {
  padding: 3px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.teamfight-logo-small {
  width: 24px;
  height: 24px;
  object-fit: contain;
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.45));
  box-sizing: border-box;
}

.slide-down-enter-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.25s;
}

.slide-down-leave-active {
  transition: transform 0.35s cubic-bezier(0.7, 0, 0.84, 0);
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(110%);
}
</style>

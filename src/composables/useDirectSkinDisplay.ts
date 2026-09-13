import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ingameSkinDisplayPlayerData, ingameSkinDisplayTeamData } from '@bluebottle_gg/league-broadcast-client';

const CD_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

// Cached summaries
let summaryCache: Map<string, { id: number; name: string; alias: string }> | null = null;
const champDetailCache = new Map<number, any>();

function toCommunityDragonUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const clean = path.toLowerCase().replace('/lol-game-data/assets/', '');
  return `${CD_BASE}/${clean}`;
}

async function getChampionSummary() {
  if (summaryCache) return summaryCache;
  try {
    const res = await fetch(`${CD_BASE}/v1/champion-summary.json`);
    if (res.ok) {
      const data = await res.json();
      summaryCache = new Map();
      for (const champ of data) {
        if (champ.id > 0) {
          summaryCache.set(champ.name.toLowerCase(), champ);
          summaryCache.set(champ.alias.toLowerCase(), champ);
        }
      }
      return summaryCache;
    }
  } catch (err) {
    console.warn('[DirectSkin] Failed to fetch champion summary:', err);
  }
  return null;
}

async function getChampionDetail(champId: number) {
  if (champDetailCache.has(champId)) return champDetailCache.get(champId);
  try {
    const res = await fetch(`${CD_BASE}/v1/champions/${champId}.json`);
    if (res.ok) {
      const data = await res.json();
      champDetailCache.set(champId, data);
      return data;
    }
  } catch (err) {
    console.warn(`[DirectSkin] Failed to fetch details for champ ${champId}:`, err);
  }
  return null;
}

async function resolveSkin(championName: string, skinId = 0) {
  const summary = await getChampionSummary();
  const champ = summary?.get(championName.toLowerCase());

  const fallback = {
    skinName: championName,
    splashCenteredUrl: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`,
    splashUrl: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`,
    squareImg: `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${championName}.png`,
    champion: {
      id: champ?.id ?? 0,
      name: championName,
      alias: champ?.alias ?? championName,
      squareImg: `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${championName}.png`,
      splashCenteredImg: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`,
      splashImg: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`,
      loadingImg: '',
      tileImg: '',
    },
  };

  if (!champ) return fallback;

  const detail = await getChampionDetail(champ.id);
  if (!detail || !detail.skins) return fallback;

  let matched = detail.skins.find(
    (s: any) => s.id === skinId || s.id === champ.id * 1000 + skinId,
  );
  if (!matched && typeof skinId === 'number' && skinId > 0 && skinId < detail.skins.length) {
    matched = detail.skins[skinId];
  }
  if (!matched) {
    matched = detail.skins[0];
  }

  const skinName = matched.name === 'default' ? champ.name : matched.name;
  const centered = toCommunityDragonUrl(matched.splashPath) || fallback.splashCenteredUrl;
  const splash = toCommunityDragonUrl(matched.uncenteredSplashPath) || fallback.splashUrl;
  const square = toCommunityDragonUrl(matched.tilePath) || fallback.squareImg;

  return {
    skinName,
    splashCenteredUrl: centered,
    splashUrl: splash,
    squareImg: square,
    champion: {
      id: champ.id,
      name: champ.name,
      alias: champ.alias,
      squareImg: square,
      splashCenteredImg: centered,
      splashImg: splash,
      loadingImg: '',
      tileImg: '',
    },
  };
}

// Sample fallback skins for preview/testing when game is closed
const MOCK_ORDER_PLAYERS: ingameSkinDisplayPlayerData[] = [
  {
    name: 'Zeus',
    playerName: 'Zeus',
    displayName: 'Zeus',
    skinName: 'Prestige DRX Aatrox',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/aatrox/skins/skin30/images/aatrox_splash_centered_30.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aatrox_30.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
  {
    name: 'Oner',
    playerName: 'Oner',
    displayName: 'Oner',
    skinName: 'T1 Lee Sin',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/leesin/skins/skin39/images/leesin_splash_centered_39.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/LeeSin_39.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
  {
    name: 'Faker',
    playerName: 'Faker',
    displayName: 'Faker',
    skinName: 'Immortalized Legend Ahri',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/ahri/skins/skin85/images/ahri_splash_centered_85.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_85.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
  {
    name: 'Gumayusi',
    playerName: 'Gumayusi',
    displayName: 'Gumayusi',
    skinName: 'Lagoon Dragon KaiSa',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/kaisa/skins/skin27/images/kaisa_splash_centered_27.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kaisa_27.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
  {
    name: 'Keria',
    playerName: 'Keria',
    displayName: 'Keria',
    skinName: 'Astronaut Nautilus',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/nautilus/skins/skin03/images/nautilus_splash_centered_3.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nautilus_3.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
];

const MOCK_CHAOS_PLAYERS: ingameSkinDisplayPlayerData[] = [
  {
    name: 'Kiin',
    playerName: 'Kiin',
    displayName: 'Kiin',
    skinName: 'Arcana Camille',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/camille/skins/skin11/images/camille_splash_centered_11.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Camille_11.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
  {
    name: 'Canyon',
    playerName: 'Canyon',
    displayName: 'Canyon',
    skinName: 'DWG Nidalee',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/nidalee/skins/skin11/images/nidalee_splash_centered_11.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nidalee_11.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
  {
    name: 'Chovy',
    playerName: 'Chovy',
    displayName: 'Chovy',
    skinName: 'Worlds 2022 Azir',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/azir/skins/skin14/images/azir_splash_centered_14.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Azir_14.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
  {
    name: 'Peyz',
    playerName: 'Peyz',
    displayName: 'Peyz',
    skinName: 'PROJECT: Varus',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/varus/skins/skin16/images/varus_splash_centered_16.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Varus_16.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
  {
    name: 'Lehends',
    playerName: 'Lehends',
    displayName: 'Lehends',
    skinName: 'Solar Eclipse Leona',
    splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/leona/skins/skin08/images/leona_splash_centered_8.jpg',
    splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Leona_8.jpg',
    loadingUrl: '',
    tileUrl: '',
  },
];

// Shared global state for live skins
const liveTeams = ref<ingameSkinDisplayTeamData[]>([
  { team: 1, players: MOCK_ORDER_PLAYERS },
  { team: 2, players: MOCK_CHAOS_PLAYERS },
]);

let isPolling = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function pollRiotClient() {
  try {
    const res = await fetch('/riot-api/liveclientdata/allgamedata');
    if (!res.ok) return;
    const data = await res.json();
    const allPlayers = data.allPlayers || [];
    if (!allPlayers.length) return;

    const orderRaw = allPlayers.filter((p: any) => p.team === 'ORDER');
    const chaosRaw = allPlayers.filter((p: any) => p.team === 'CHAOS');

    const orderPlayers: ingameSkinDisplayPlayerData[] = [];
    const chaosPlayers: ingameSkinDisplayPlayerData[] = [];

    for (const p of orderRaw) {
      const info = await resolveSkin(p.championName, p.skinID);
      orderPlayers.push({
        name: p.summonerName,
        playerName: p.summonerName,
        displayName: p.summonerName,
        skinName: info.skinName,
        splashCenteredUrl: info.splashCenteredUrl,
        splashUrl: info.splashUrl,
        loadingUrl: '',
        tileUrl: '',
        champion: info.champion,
      });
    }

    for (const p of chaosRaw) {
      const info = await resolveSkin(p.championName, p.skinID);
      chaosPlayers.push({
        name: p.summonerName,
        playerName: p.summonerName,
        displayName: p.summonerName,
        skinName: info.skinName,
        splashCenteredUrl: info.splashCenteredUrl,
        splashUrl: info.splashUrl,
        loadingUrl: '',
        tileUrl: '',
        champion: info.champion,
      });
    }

    if (orderPlayers.length || chaosPlayers.length) {
      liveTeams.value = [
        { team: 1, players: orderPlayers },
        { team: 2, players: chaosPlayers },
      ];
    }
  } catch {
    // Game not running or connection refused, keep current/mock data
  }
}

export function useDirectSkinDisplay() {
  onMounted(() => {
    if (!isPolling) {
      isPolling = true;
      pollRiotClient();
      pollTimer = setInterval(pollRiotClient, 3000);
    }
  });

  return {
    teams: liveTeams,
  };
}

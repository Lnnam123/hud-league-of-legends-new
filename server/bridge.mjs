import http from 'node:http';
import https from 'node:https';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 58869;
const RIOT_API_URL = 'https://127.0.0.1:2999/liveclientdata/allgamedata';
const CD_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

// HTTPS agent that ignores self-signed certificates from Riot client
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// In-memory caches for champions and skins
let championSummaryCache = null;
const championDetailCache = new Map();

/**
 * Format CommunityDragon relative path into a full raw URL
 */
function toCommunityDragonUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const clean = path.toLowerCase().replace('/lol-game-data/assets/', '');
  return `${CD_BASE}/${clean}`;
}

/**
 * Fetch and cache Champion Summary from CommunityDragon
 */
async function getChampionSummary() {
  if (championSummaryCache) return championSummaryCache;
  try {
    const res = await fetch(`${CD_BASE}/v1/champion-summary.json`);
    if (res.ok) {
      const data = await res.json();
      championSummaryCache = new Map();
      for (const champ of data) {
        if (champ.id > 0) {
          championSummaryCache.set(champ.name.toLowerCase(), champ);
          championSummaryCache.set(champ.alias.toLowerCase(), champ);
        }
      }
      return championSummaryCache;
    }
  } catch (err) {
    console.warn('[LoL Bridge] Could not fetch CommunityDragon summary:', err.message);
  }
  return null;
}

/**
 * Fetch details for a specific champion to get their skins
 */
async function getChampionDetail(champId) {
  if (championDetailCache.has(champId)) return championDetailCache.get(champId);
  try {
    const res = await fetch(`${CD_BASE}/v1/champions/${champId}.json`);
    if (res.ok) {
      const data = await res.json();
      championDetailCache.set(champId, data);
      return data;
    }
  } catch (err) {
    console.warn(`[LoL Bridge] Could not fetch details for champ ${champId}:`, err.message);
  }
  return null;
}

/**
 * Resolve skin details (name, centered splash, tile) for a given champion and skin ID
 */
async function resolveSkinInfo(championName, skinId = 0) {
  const summary = await getChampionSummary();
  const champ = summary?.get(championName.toLowerCase());
  
  const defaultRes = {
    skinName: championName,
    splashCenteredUrl: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`,
    splashUrl: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`,
    squareImg: `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${championName}.png`,
    champion: {
      id: champ?.id ?? 0,
      name: championName,
      alias: champ?.alias ?? championName,
      squareImg: `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${championName}.png`,
    }
  };

  if (!champ) return defaultRes;

  const detail = await getChampionDetail(champ.id);
  if (!detail || !detail.skins) return defaultRes;

  // Search skin by ID or skin num
  let matchedSkin = detail.skins.find((s) => s.id === skinId || s.id === (champ.id * 1000 + skinId));
  if (!matchedSkin && typeof skinId === 'number' && skinId > 0 && skinId < detail.skins.length) {
    matchedSkin = detail.skins[skinId];
  }
  if (!matchedSkin) {
    matchedSkin = detail.skins[0];
  }

  return {
    skinName: matchedSkin.name === 'default' ? champ.name : matchedSkin.name,
    splashCenteredUrl: toCommunityDragonUrl(matchedSkin.splashPath) || defaultRes.splashCenteredUrl,
    splashUrl: toCommunityDragonUrl(matchedSkin.uncenteredSplashPath) || defaultRes.splashUrl,
    squareImg: toCommunityDragonUrl(matchedSkin.tilePath) || defaultRes.squareImg,
    champion: {
      id: champ.id,
      name: champ.name,
      alias: champ.alias,
      squareImg: toCommunityDragonUrl(matchedSkin.tilePath) || defaultRes.squareImg,
    }
  };
}

/**
 * Query Riot In-Game API at 127.0.0.1:2999
 */
function fetchRiotAllGameData() {
  return new Promise((resolve, reject) => {
    const req = https.get(RIOT_API_URL, { agent: httpsAgent, timeout: 1200 }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// ---------------------------------------------------------
// Realistic Mock Data for Simulation Mode (when game is closed)
// ---------------------------------------------------------
let mockClock = 845; // 14:05 in game
setInterval(() => {
  mockClock += 1;
}, 1000);

function getMockGameData() {
  const blueGold = 24500 + Math.floor(mockClock * 18);
  const redGold = 23800 + Math.floor(mockClock * 16);

  return {
    gameTime: mockClock,
    playbackSpeed: 1,
    gameVersion: '14.24.1',
    gameStatus: 2, // 2 = Running
    scoreboard: {
      gameTime: mockClock,
      bestOf: 3,
      teams: [
        {
          id: 100,
          team: 1,
          name: 'T1',
          tag: 'T1',
          score: 1,
          kills: 9,
          deaths: 4,
          towers: 3,
          dragons: 2,
          barons: 0,
          grubs: 3,
          heralds: 1,
          atakhans: 0,
          gold: blueGold,
          dragonTypes: ['Hextech', 'Infernal'],
        },
        {
          id: 200,
          team: 2,
          name: 'Gen.G',
          tag: 'GEN',
          score: 0,
          kills: 4,
          deaths: 9,
          towers: 1,
          dragons: 1,
          barons: 0,
          grubs: 3,
          heralds: 0,
          atakhans: 0,
          gold: redGold,
          dragonTypes: ['Cloud'],
        }
      ]
    },
    scoreboardBottom: {
      teams: [
        {
          id: 100,
          players: [
            {
              name: 'T1 Zeus',
              playerName: 'Zeus',
              displayName: 'Zeus',
              champion: { id: 266, name: 'Aatrox', alias: 'Aatrox', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Aatrox.png' },
              level: 11,
              kda: { kills: 2, deaths: 1, assists: 3 },
              cs: 142,
              gold: 5800,
              isDead: false,
              respawnTimer: 0,
              role: 'TOP',
              stats: [{ itemPrice: 3300, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3074.png' }]
            },
            {
              name: 'T1 Oner',
              playerName: 'Oner',
              displayName: 'Oner',
              champion: { id: 64, name: 'Lee Sin', alias: 'LeeSin', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/LeeSin.png' },
              level: 10,
              kda: { kills: 3, deaths: 1, assists: 4 },
              cs: 110,
              gold: 5200,
              isDead: false,
              respawnTimer: 0,
              role: 'JUNGLE',
              stats: [{ itemPrice: 3078, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3078.png' }]
            },
            {
              name: 'T1 Faker',
              playerName: 'Faker',
              displayName: 'Faker',
              champion: { id: 103, name: 'Ahri', alias: 'Ahri', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Ahri.png' },
              level: 11,
              kda: { kills: 3, deaths: 0, assists: 3 },
              cs: 156,
              gold: 6100,
              isDead: false,
              respawnTimer: 0,
              role: 'MIDDLE',
              stats: [{ itemPrice: 3200, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/6655.png' }]
            },
            {
              name: 'T1 Gumayusi',
              playerName: 'Gumayusi',
              displayName: 'Gumayusi',
              champion: { id: 145, name: "Kai'Sa", alias: 'Kaisa', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Kaisa.png' },
              level: 10,
              kda: { kills: 1, deaths: 1, assists: 4 },
              cs: 165,
              gold: 5400,
              isDead: false,
              respawnTimer: 0,
              role: 'BOTTOM',
              stats: [{ itemPrice: 3000, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3124.png' }]
            },
            {
              name: 'T1 Keria',
              playerName: 'Keria',
              displayName: 'Keria',
              champion: { id: 111, name: 'Nautilus', alias: 'Nautilus', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Nautilus.png' },
              level: 8,
              kda: { kills: 0, deaths: 1, assists: 6 },
              cs: 24,
              gold: 2800,
              isDead: false,
              respawnTimer: 0,
              role: 'SUPPORT',
              stats: [{ itemPrice: 400, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3865.png' }]
            }
          ]
        },
        {
          id: 200,
          players: [
            {
              name: 'GEN Kiin',
              playerName: 'Kiin',
              displayName: 'Kiin',
              champion: { id: 164, name: 'Camille', alias: 'Camille', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Camille.png' },
              level: 11,
              kda: { kills: 1, deaths: 2, assists: 1 },
              cs: 135,
              gold: 5200,
              isDead: false,
              respawnTimer: 0,
              role: 'TOP',
              stats: [{ itemPrice: 3333, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3078.png' }]
            },
            {
              name: 'GEN Canyon',
              playerName: 'Canyon',
              displayName: 'Canyon',
              champion: { id: 76, name: 'Nidalee', alias: 'Nidalee', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Nidalee.png' },
              level: 10,
              kda: { kills: 2, deaths: 2, assists: 2 },
              cs: 105,
              gold: 4900,
              isDead: false,
              respawnTimer: 0,
              role: 'JUNGLE',
              stats: [{ itemPrice: 3200, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/6655.png' }]
            },
            {
              name: 'GEN Chovy',
              playerName: 'Chovy',
              displayName: 'Chovy',
              champion: { id: 268, name: 'Azir', alias: 'Azir', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Azir.png' },
              level: 11,
              kda: { kills: 1, deaths: 1, assists: 1 },
              cs: 168,
              gold: 5900,
              isDead: false,
              respawnTimer: 0,
              role: 'MIDDLE',
              stats: [{ itemPrice: 3000, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3115.png' }]
            },
            {
              name: 'GEN Peyz',
              playerName: 'Peyz',
              displayName: 'Peyz',
              champion: { id: 110, name: 'Varus', alias: 'Varus', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Varus.png' },
              level: 10,
              kda: { kills: 0, deaths: 2, assists: 2 },
              cs: 150,
              gold: 5100,
              isDead: false,
              respawnTimer: 0,
              role: 'BOTTOM',
              stats: [{ itemPrice: 3200, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3124.png' }]
            },
            {
              name: 'GEN Lehends',
              playerName: 'Lehends',
              displayName: 'Lehends',
              champion: { id: 89, name: 'Leona', alias: 'Leona', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Leona.png' },
              level: 8,
              kda: { kills: 0, deaths: 2, assists: 3 },
              cs: 20,
              gold: 2700,
              isDead: false,
              respawnTimer: 0,
              role: 'SUPPORT',
              stats: [{ itemPrice: 400, count: 1, iconAsset: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/3865.png' }]
            }
          ]
        }
      ]
    },
    skinDisplay: {
      teams: [
        {
          team: 1,
          players: [
            {
              name: 'T1 Zeus',
              playerName: 'Zeus',
              displayName: 'Zeus',
              skinName: 'Prestige DRX Aatrox',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/aatrox/skins/skin30/images/aatrox_splash_centered_30.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aatrox_30.jpg',
              champion: { id: 266, name: 'Aatrox', alias: 'Aatrox', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Aatrox.png' }
            },
            {
              name: 'T1 Oner',
              playerName: 'Oner',
              displayName: 'Oner',
              skinName: 'T1 Lee Sin',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/leesin/skins/skin39/images/leesin_splash_centered_39.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/LeeSin_39.jpg',
              champion: { id: 64, name: 'Lee Sin', alias: 'LeeSin', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/LeeSin.png' }
            },
            {
              name: 'T1 Faker',
              playerName: 'Faker',
              displayName: 'Faker',
              skinName: 'Immortalized Legend Ahri',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/ahri/skins/skin85/images/ahri_splash_centered_85.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_85.jpg',
              champion: { id: 103, name: 'Ahri', alias: 'Ahri', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Ahri.png' }
            },
            {
              name: 'T1 Gumayusi',
              playerName: 'Gumayusi',
              displayName: 'Gumayusi',
              skinName: 'Lagoon Dragon KaiSa',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/kaisa/skins/skin27/images/kaisa_splash_centered_27.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kaisa_27.jpg',
              champion: { id: 145, name: "Kai'Sa", alias: 'Kaisa', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Kaisa.png' }
            },
            {
              name: 'T1 Keria',
              playerName: 'Keria',
              displayName: 'Keria',
              skinName: 'Astronaut Nautilus',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/nautilus/skins/skin03/images/nautilus_splash_centered_3.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nautilus_3.jpg',
              champion: { id: 111, name: 'Nautilus', alias: 'Nautilus', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Nautilus.png' }
            }
          ]
        },
        {
          team: 2,
          players: [
            {
              name: 'GEN Kiin',
              playerName: 'Kiin',
              displayName: 'Kiin',
              skinName: 'Arcana Camille',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/camille/skins/skin11/images/camille_splash_centered_11.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Camille_11.jpg',
              champion: { id: 164, name: 'Camille', alias: 'Camille', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Camille.png' }
            },
            {
              name: 'GEN Canyon',
              playerName: 'Canyon',
              displayName: 'Canyon',
              skinName: 'DWG Nidalee',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/nidalee/skins/skin11/images/nidalee_splash_centered_11.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nidalee_11.jpg',
              champion: { id: 76, name: 'Nidalee', alias: 'Nidalee', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Nidalee.png' }
            },
            {
              name: 'GEN Chovy',
              playerName: 'Chovy',
              displayName: 'Chovy',
              skinName: 'Worlds 2022 Azir',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/azir/skins/skin14/images/azir_splash_centered_14.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Azir_14.jpg',
              champion: { id: 268, name: 'Azir', alias: 'Azir', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Azir.png' }
            },
            {
              name: 'GEN Peyz',
              playerName: 'Peyz',
              displayName: 'Peyz',
              skinName: 'PROJECT: Varus',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/varus/skins/skin16/images/varus_splash_centered_16.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Varus_16.jpg',
              champion: { id: 110, name: 'Varus', alias: 'Varus', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Varus.png' }
            },
            {
              name: 'GEN Lehends',
              playerName: 'Lehends',
              displayName: 'Lehends',
              skinName: 'Solar Eclipse Leona',
              splashCenteredUrl: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/leona/skins/skin08/images/leona_splash_centered_8.jpg',
              splashUrl: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Leona_8.jpg',
              champion: { id: 89, name: 'Leona', alias: 'Leona', squareImg: 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/Leona.png' }
            }
          ]
        }
      ]
    }
  };
}

// ---------------------------------------------------------
// Convert Riot In-Game Raw API to HUD-ready Data
// ---------------------------------------------------------
async function formatRiotData(raw) {
  const gameTime = Math.floor(raw.gameData?.gameTime || 0);
  const allPlayers = raw.allPlayers || [];
  const events = raw.events?.Events || [];

  const bluePlayersRaw = allPlayers.filter((p) => p.team === 'ORDER');
  const redPlayersRaw = allPlayers.filter((p) => p.team === 'CHAOS');

  // Count events
  let blueKills = 0;
  let redKills = 0;
  let blueTowers = 0;
  let redTowers = 0;
  let blueDragons = [];
  let redDragons = [];
  let blueBarons = 0;
  let redBarons = 0;

  let lastBaronKill = null;
  let lastElderKill = null;

  for (const ev of events) {
    if (ev.EventName === 'ChampionKill') {
      const killer = allPlayers.find((p) => p.summonerName === ev.KillerName);
      if (killer?.team === 'ORDER') blueKills++;
      else if (killer?.team === 'CHAOS') redKills++;
    } else if (ev.EventName === 'TurretKilled') {
      const killer = allPlayers.find((p) => p.summonerName === ev.KillerName);
      if (killer?.team === 'ORDER') blueTowers++;
      else if (killer?.team === 'CHAOS') redTowers++;
    } else if (ev.EventName === 'DragonKill') {
      const killer = allPlayers.find((p) => p.summonerName === ev.KillerName);
      const dType = ev.DragonType || 'Elemental';
      if (killer?.team === 'ORDER') {
        blueDragons.push(dType);
        if (dType === 'Elder') lastElderKill = { team: 'ORDER', time: ev.EventTime };
      } else {
        redDragons.push(dType);
        if (dType === 'Elder') lastElderKill = { team: 'CHAOS', time: ev.EventTime };
      }
    } else if (ev.EventName === 'BaronKill') {
      const killer = allPlayers.find((p) => p.summonerName === ev.KillerName);
      if (killer?.team === 'ORDER') {
        blueBarons++;
        lastBaronKill = { team: 'ORDER', time: ev.EventTime };
      } else {
        redBarons++;
        lastBaronKill = { team: 'CHAOS', time: ev.EventTime };
      }
    }
  }

  // Format players and calculate gold
  async function transformPlayers(playersRaw) {
    const players = [];
    const skinPlayers = [];
    let totalGold = 0;

    for (const p of playersRaw) {
      let playerGold = p.currentGold || 0;
      const items = (p.items || []).map((it) => {
        playerGold += (it.price || 0) * (it.count || 1);
        return {
          iconAsset: `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/${it.itemID}.png`,
          itemPrice: it.price || 0,
          count: it.count || 1,
          name: it.displayName,
          id: it.itemID
        };
      });
      totalGold += playerGold;

      const skinInfo = await resolveSkinInfo(p.championName, p.skinID);

      players.push({
        name: p.summonerName,
        playerName: p.summonerName,
        displayName: p.summonerName,
        champion: {
          name: p.championName,
          alias: p.championName,
          squareImg: skinInfo.squareImg
        },
        level: p.level,
        kda: {
          kills: p.scores?.kills || 0,
          deaths: p.scores?.deaths || 0,
          assists: p.scores?.assists || 0
        },
        cs: p.scores?.creepScore || 0,
        gold: playerGold,
        isDead: !!p.isDead,
        respawnTimer: Math.ceil(p.respawnTimer || 0),
        role: p.position || '',
        items: items,
        stats: items
      });

      skinPlayers.push({
        name: p.summonerName,
        playerName: p.summonerName,
        displayName: p.summonerName,
        skinName: skinInfo.skinName,
        splashCenteredUrl: skinInfo.splashCenteredUrl,
        splashUrl: skinInfo.splashUrl,
        champion: {
          name: p.championName,
          squareImg: skinInfo.squareImg
        }
      });
    }

    return { players, skinPlayers, totalGold };
  }

  const blueData = await transformPlayers(bluePlayersRaw);
  const redData = await transformPlayers(redPlayersRaw);

  // Power plays calculation
  let blueBaronPP = undefined;
  let redBaronPP = undefined;
  if (lastBaronKill && gameTime - lastBaronKill.time < 180) {
    const remaining = 180 - (gameTime - lastBaronKill.time);
    const goldDiff = blueData.totalGold - redData.totalGold;
    if (lastBaronKill.team === 'ORDER') {
      blueBaronPP = { timeEnd: gameTime + remaining, gold: Math.round(goldDiff) };
    } else {
      redBaronPP = { timeEnd: gameTime + remaining, gold: Math.round(-goldDiff) };
    }
  }

  let blueElderPP = undefined;
  let redElderPP = undefined;
  if (lastElderKill && gameTime - lastElderKill.time < 150) {
    const remaining = 150 - (gameTime - lastElderKill.time);
    if (lastElderKill.team === 'ORDER') {
      blueElderPP = { timeEnd: gameTime + remaining };
    } else {
      redElderPP = { timeEnd: gameTime + remaining };
    }
  }

  return {
    gameTime,
    playbackSpeed: 1,
    gameVersion: '14.24.1',
    gameStatus: 2, // Running
    scoreboard: {
      gameTime,
      bestOf: 3,
      teams: [
        {
          id: 100,
          team: 1,
          name: 'Blue Team',
          tag: 'BLUE',
          score: 0,
          kills: blueKills,
          deaths: redKills,
          towers: blueTowers,
          dragons: blueDragons.length,
          barons: blueBarons,
          gold: blueData.totalGold,
          dragonTypes: blueDragons,
          baronPowerPlay: blueBaronPP,
          dragonPowerPlay: blueElderPP
        },
        {
          id: 200,
          team: 2,
          name: 'Red Team',
          tag: 'RED',
          score: 0,
          kills: redKills,
          deaths: blueKills,
          towers: redTowers,
          dragons: redDragons.length,
          barons: redBarons,
          gold: redData.totalGold,
          dragonTypes: redDragons,
          baronPowerPlay: redBaronPP,
          dragonPowerPlay: redElderPP
        }
      ]
    },
    scoreboardBottom: {
      teams: [
        { id: 100, players: blueData.players },
        { id: 200, players: redData.players }
      ]
    },
    skinDisplay: {
      teams: [
        { team: 1, players: blueData.skinPlayers },
        { team: 2, players: redData.skinPlayers }
      ]
    }
  };
}

// ---------------------------------------------------------
// HTTP Server & WebSocket Server
// ---------------------------------------------------------
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '';

  // Current Season Icon endpoint
  if (url.startsWith('/api/season/current/icon')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(null));
    return;
  }

  // Health check endpoint
  if (url.startsWith('/api/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: Date.now() }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({}));
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  if (pathname === '/ws/in' || pathname === '/ws/pre') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

let isLiveMatch = false;
let latestBroadcastState = getMockGameData();

wss.on('connection', (ws, req) => {
  console.log(`[LoL Bridge] HUD connected via ${req.url}`);

  // 1. Send gameStatus handshake (GameState 2 = Running)
  ws.send(
    JSON.stringify({
      type: 'gameStatus',
      gameState: 2,
      isTestingEnvironment: false
    })
  );

  // 2. Send initial state immediately
  ws.send(
    JSON.stringify({
      type: 'ingame-state-update',
      state: latestBroadcastState,
      events: []
    })
  );

  ws.on('message', (message) => {
    const text = message.toString();
    if (text === 'KeepAlive') {
      ws.send('KeepAlive');
    }
  });

  ws.on('close', () => {
    console.log('[LoL Bridge] HUD disconnected');
  });
});

function broadcastState(state) {
  latestBroadcastState = state;
  const payload = JSON.stringify({
    type: 'ingame-state-update',
    state,
    events: []
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// ---------------------------------------------------------
// Main Polling Loop
// ---------------------------------------------------------
async function tick() {
  try {
    const riotData = await fetchRiotAllGameData();
    if (!isLiveMatch) {
      console.log('>>> [LoL Bridge] Connected to LIVE League of Legends Client! <<<');
      isLiveMatch = true;
    }
    const liveState = await formatRiotData(riotData);
    broadcastState(liveState);
  } catch (err) {
    if (isLiveMatch) {
      console.log('[LoL Bridge] League match ended. Switching back to Preview / Mock mode.');
      isLiveMatch = false;
    }
    // Fallback: Send Simulation Mode Data
    broadcastState(getMockGameData());
  }
}

setInterval(tick, 500);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[LoL Bridge Error] Cổng ${PORT} hiện đang bị chiếm bởi một ứng dụng khác (ví dụ: League Broadcast đang bật)!`);
    console.error(`-> Hãy TẮT League Broadcast trước khi chạy server này, hoặc đổi cổng.`);
  } else {
    console.error('[LoL Bridge Error]:', err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log('===============================================================');
  console.log(`[LoL Bridge] WebSocket & API server running on port ${PORT}`);
  console.log(`[LoL Bridge] Ingame route: ws://localhost:${PORT}/ws/in`);
  console.log(`[LoL Bridge] Auto-detecting League Client at 127.0.0.1:2999...`);
  console.log('===============================================================');
});

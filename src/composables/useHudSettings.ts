import { ref, watch } from 'vue';

export interface HudSettings {
  skinDisplayEnabled: boolean;
  skinDisplayTeam: 'both' | 'order' | 'chaos';
  skinDisplayDuration: number;
  scoreboardBottom: boolean;
  baronTimer: boolean;
  dragonTimer: boolean;
  goldGraph: boolean;
  compactTeamfight: boolean;
  smiteReaction: boolean;
  killFeed: boolean;
}

const STORAGE_KEY = 'lol_hud_control_settings';
const CHANNEL_NAME = 'lol_hud_sync_channel';

const defaultSettings: HudSettings = {
  skinDisplayEnabled: true,
  skinDisplayTeam: 'both',
  skinDisplayDuration: 3500,
  scoreboardBottom: true,
  baronTimer: true,
  dragonTimer: true,
  goldGraph: true,
  compactTeamfight: true,
  smiteReaction: true,
  killFeed: true,
};

function loadLocalSettings(): HudSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch {}
  return { ...defaultSettings };
}

export const hudSettings = ref<HudSettings>(loadLocalSettings());

const CLIENT_ID = Math.random().toString(36).substring(2) + Date.now();
let isReceivingUpdate = false;

// 1. Fetch server state immediately on load (vital for OBS Browser Source)
async function fetchServerSettings() {
  try {
    const res = await fetch('/api/hud-control');
    if (res.ok) {
      const data = await res.json();
      isReceivingUpdate = true;
      hudSettings.value = { ...hudSettings.value, ...data };
      setTimeout(() => {
        isReceivingUpdate = false;
      }, 50);
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  fetchServerSettings();
  // Poll every 1s as a fallback for OBS CEF
  setInterval(fetchServerSettings, 1000);
}

// 2. Vite WebSocket listener (instant update on both Chrome & OBS)
if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
  (import.meta as any).hot.on('hud-control:update', (data: any) => {
    isReceivingUpdate = true;
    hudSettings.value = { ...hudSettings.value, ...data };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hudSettings.value));
    } catch {}
    setTimeout(() => {
      isReceivingUpdate = false;
    }, 50);
  });
}

// 3. BroadcastChannel (for standard tabs)
let channel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    if (event.data?.senderId === CLIENT_ID) return;
    if (event.data?.type === 'UPDATE_SETTINGS' && event.data.payload) {
      isReceivingUpdate = true;
      hudSettings.value = { ...hudSettings.value, ...event.data.payload };
      setTimeout(() => {
        isReceivingUpdate = false;
      }, 50);
    }
  };
}

// 4. Save & push updates to server when user changes settings in Control page
async function pushSettingsToServer(newVal: HudSettings) {
  try {
    await fetch('/api/hud-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVal),
    });
  } catch {}
}

watch(
  hudSettings,
  (newVal) => {
    if (isReceivingUpdate) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
    } catch {}

    // Push to server so OBS receives it instantly
    pushSettingsToServer(newVal);

    if (channel) {
      channel.postMessage({
        type: 'UPDATE_SETTINGS',
        senderId: CLIENT_ID,
        payload: JSON.parse(JSON.stringify(newVal)),
      });
    }
  },
  { deep: true },
);

export function useHudSettings() {
  function toggleSkinDisplay() {
    hudSettings.value.skinDisplayEnabled = !hudSettings.value.skinDisplayEnabled;
  }

  function setSkinDisplay(enabled: boolean) {
    hudSettings.value.skinDisplayEnabled = enabled;
  }

  function setSkinTeam(team: 'both' | 'order' | 'chaos') {
    hudSettings.value.skinDisplayTeam = team;
  }

  function toggleSetting(key: keyof HudSettings) {
    if (typeof hudSettings.value[key] === 'boolean') {
      (hudSettings.value[key] as boolean) = !hudSettings.value[key];
    }
  }

  return {
    settings: hudSettings,
    toggleSkinDisplay,
    setSkinDisplay,
    setSkinTeam,
    toggleSetting,
  };
}

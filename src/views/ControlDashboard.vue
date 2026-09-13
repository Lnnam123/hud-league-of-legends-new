<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHudSettings, type HudSettings } from '@/composables/useHudSettings'
import { useIngameSelector, useIsInGame } from '@/composables/useIngame'

const { settings, toggleSkinDisplay, setSkinDisplay, setSkinTeam, toggleSetting } = useHudSettings()

const scoreboard = useIngameSelector((s) => s.gameData.scoreboard)
const isInGame = useIsInGame()

const blueTeamName = computed(() => scoreboard.value?.teams[0]?.teamName || scoreboard.value?.teams[0]?.teamTag || 'T1')
const redTeamName = computed(() => scoreboard.value?.teams[1]?.teamName || scoreboard.value?.teams[1]?.teamTag || 'GEN')
const blueScore = computed(() => scoreboard.value?.teams[0]?.seriesScore?.wins ?? 0)
const redScore = computed(() => scoreboard.value?.teams[1]?.seriesScore?.wins ?? 0)

const searchQuery = ref('')
const activeTab = ref('in-game')

interface ControlCard {
  id: string
  label: string
  key?: keyof HudSettings
  isSkin?: boolean
}

// Grid cards matching the League Broadcast In Game panel
const controlCards: ControlCard[] = [
  { id: 'teamfightNoDamage', label: 'Teamfight No Damage', key: 'compactTeamfight' },
  { id: 'fullGoldGraph', label: 'Full Gold Graph', key: 'goldGraph' },
  { id: 'runes', label: 'Runes' },
  { id: 'damageGraph', label: 'Damage Graph' },
  { id: 'globalScoreboard', label: 'Global Scoreboard' },
  { id: 'patchNumber', label: 'Patch Number' },
  { id: 'championTabs', label: 'Champion Tabs' },
  { id: 'inhibitorTimer', label: 'Inhibitor Timer' },
  { id: 'teamfightDamage', label: 'Teamfight Damage', key: 'compactTeamfight' },
  { id: 'bottomScoreboard', label: 'Bottom Scoreboard', key: 'scoreboardBottom' },
  { id: 'baronTimer', label: 'Baron Timer', key: 'baronTimer' },
  { id: 'dragonTimer', label: 'Dragon Timer', key: 'dragonTimer' },
  { id: 'sideinfoExp', label: 'Sideinfo Exp' },
  { id: 'sideinfoGold', label: 'Sideinfo Gold' },
  { id: 'sideinfoDamage', label: 'Sideinfo Damage' },
  { id: 'sideinfoCreepscore', label: 'Sideinfo Creepscore' },
  // Highlighted:
  { id: 'sideinfoSkin', label: 'Sideinfo Skin', isSkin: true },
  { id: 'twitchPrediction', label: 'Twitch Prediction' },
  { id: 'twitchPoll', label: 'Twitch Poll' },
  { id: 'twitchChatVote', label: 'Twitch Chat Vote' },
  { id: 'sideinfoRoleQuest', label: 'Sideinfo Role Quest' },
  { id: 'sideinfoTowerPlates', label: 'Sideinfo Tower Plates' },
  { id: 'damageSplit', label: 'Damage Split' },
  { id: 'goldEfficiency', label: 'Gold Efficiency' },
]

const filteredCards = computed(() => {
  if (!searchQuery.value.trim()) return controlCards
  const q = searchQuery.value.toLowerCase()
  return controlCards.filter((c) => c.label.toLowerCase().includes(q))
})

function deactivateAll() {
  setSkinDisplay(false)
  settings.value.scoreboardBottom = false
  settings.value.baronTimer = false
  settings.value.dragonTimer = false
  settings.value.goldGraph = false
  settings.value.compactTeamfight = false
}

function activateDefaults() {
  setSkinDisplay(true)
  settings.value.scoreboardBottom = true
  settings.value.baronTimer = true
  settings.value.dragonTimer = true
  settings.value.goldGraph = true
}

function openOverlay() {
  window.open('/', '_blank')
}

function isCardActive(card: ControlCard): boolean {
  if (card.isSkin) return settings.value.skinDisplayEnabled
  if (card.key) return !!settings.value[card.key]
  return false
}

function handleCardClick(card: ControlCard) {
  if (card.isSkin) {
    toggleSkinDisplay()
  } else if (card.key) {
    toggleSetting(card.key)
  }
}
</script>

<template>
  <div class="control-container">
    <!-- Top Global Header -->
    <header class="top-nav">
      <div class="nav-left">
        <div class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <span class="brand-title">HUD Controller</span>
          <span class="brand-badge">Pro Unlocked</span>
        </div>
      </div>

      <!-- Match summary badge -->
      <div class="match-info">
        <span class="status-pill" :class="isInGame ? 'live' : 'standby'">
          {{ isInGame ? 'IN GAME' : 'STANDBY' }}
        </span>
        <span class="match-teams">
          <strong>{{ blueTeamName }}</strong> {{ blueScore }} : {{ redScore }} <strong>{{ redTeamName }}</strong>
        </span>
        <span class="match-meta">Game 1 / Best of 5 · Fearless draft</span>
      </div>

      <div class="nav-right">
        <button class="action-btn link-btn" @click="openOverlay" title="Mở trang HUD để phát sóng">
          <span>📺 Mở HUD Overlay</span>
        </button>
        <div class="ready-badge">
          <span class="dot"></span>
          Ready
        </div>
      </div>
    </header>

    <!-- Main Workspace Layout -->
    <div class="workspace">
      <!-- Left Sidebar (mimics League Broadcast) -->
      <aside class="sidebar">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Search..." />
        </div>

        <div class="sidebar-section">
          <div class="section-title">SETUP</div>
          <div class="nav-item">
            <span class="item-icon">👥</span> Teams and Players
          </div>
          <div class="nav-item">
            <span class="item-icon">🏆</span> Tournaments
          </div>
          <div class="nav-item">
            <span class="item-icon">🎨</span> Style Editor
          </div>
        </div>

        <div class="sidebar-section">
          <div class="section-title">BROADCAST</div>
          <div class="nav-item">
            <span class="item-icon">📋</span> Current Match
          </div>
          <div class="nav-item active">
            <span class="item-icon">🎮</span> In Game
          </div>
          <div class="nav-item">
            <span class="item-icon">📊</span> Post Game
          </div>
        </div>

        <div class="sidebar-section">
          <div class="section-title">TOOLS</div>
          <div class="nav-item">
            <span class="item-icon">🎥</span> Cinematics
          </div>
          <div class="nav-item">
            <span class="item-icon">👾</span> Twitch
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="content-area">
        <!-- Subheader with Tabs & Actions -->
        <div class="sub-header">
          <div class="tabs">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'match' }"
              @click="activeTab = 'match'"
            >
              MATCH SETUP
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'in-game' }"
              @click="activeTab = 'in-game'"
            >
              IN GAME
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'post' }"
              @click="activeTab = 'post'"
            >
              POST GAME
            </button>
          </div>

          <div class="actions">
            <button class="btn-secondary" @click="activateDefaults">
              Default All
            </button>
            <button class="btn-danger" @click="deactivateAll">
              Deactivate All
            </button>
          </div>
        </div>

        <!-- Spotlight Skin Display Panel -->
        <div class="skin-spotlight-card" :class="{ 'is-active': settings.skinDisplayEnabled }">
          <div class="spotlight-left">
            <div class="spotlight-icon">
              <span v-if="settings.skinDisplayEnabled">✨</span>
              <span v-else>🔒</span>
            </div>
            <div class="spotlight-text">
              <div class="spotlight-title">
                Sideinfo Skin (Skin Display)
                <span class="live-pill" :class="settings.skinDisplayEnabled ? 'on' : 'off'">
                  {{ settings.skinDisplayEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT' }}
                </span>
              </div>
              <p class="spotlight-desc">
                Tự động kết nối trực tiếp với Liên Minh Huyền Thoại & CommunityDragon để hiển thị bảng Splash Art trang phục hai bên màn hình.
              </p>
            </div>
          </div>

          <div class="spotlight-controls">
            <div class="team-filter">
              <span class="filter-label">Hiển thị cho:</span>
              <div class="filter-buttons">
                <button
                  class="filter-btn"
                  :class="{ active: settings.skinDisplayTeam === 'both' }"
                  @click="setSkinTeam('both')"
                >
                  Cả 2 Đội
                </button>
                <button
                  class="filter-btn blue"
                  :class="{ active: settings.skinDisplayTeam === 'order' }"
                  @click="setSkinTeam('order')"
                >
                  Đội Xanh
                </button>
                <button
                  class="filter-btn red"
                  :class="{ active: settings.skinDisplayTeam === 'chaos' }"
                  @click="setSkinTeam('chaos')"
                >
                  Đội Đỏ
                </button>
              </div>
            </div>

            <button
              class="toggle-main-btn"
              :class="settings.skinDisplayEnabled ? 'btn-active' : 'btn-inactive'"
              @click="toggleSkinDisplay"
            >
              {{ settings.skinDisplayEnabled ? '✓ ĐANG BẬT (CLICK ĐỂ TẮT)' : '⚡ BẬT SKIN DISPLAY NGAY' }}
            </button>
          </div>
        </div>

        <!-- Spotlight Compact Teamfight Panel -->
        <div class="skin-spotlight-card" :class="{ 'is-active': settings.compactTeamfight }">
          <div class="spotlight-left">
            <div class="spotlight-icon">
              <span>⚔️</span>
            </div>
            <div class="spotlight-text">
              <div class="spotlight-title">
                Teamfight Damage (Bảng Chiêu Cuối & 10 Tướng)
                <span class="live-pill" :class="settings.compactTeamfight ? 'on' : 'off'">
                  {{ settings.compactTeamfight ? 'ĐANG BẬT' : 'ĐANG TẮT' }}
                </span>
              </div>
              <p class="spotlight-desc">
                Hiển thị bảng chiêu cuối tròn (R), phép bổ trợ (D/F), cấp độ, thanh máu & năng lượng của cả 10 tướng ở cạnh dưới màn hình.
              </p>
            </div>
          </div>

          <div class="spotlight-controls">
            <button
              class="toggle-main-btn"
              :class="settings.compactTeamfight ? 'btn-active' : 'btn-inactive'"
              @click="toggleSetting('compactTeamfight')"
            >
              {{ settings.compactTeamfight ? '✓ ĐANG BẬT (CLICK ĐỂ TẮT)' : '⚡ BẬT BẢNG 10 TƯỚNG NGAY' }}
            </button>
          </div>
        </div>

        <!-- Feature Toggle Grid (Identical to Screenshot) -->
        <div class="grid-section">
          <div class="grid-header">
            <span>BẢNG ĐIỀU KHIỂN TÍNH NĂNG TRONG TRẬN</span>
            <span class="hint">Click vào thẻ bất kỳ để BẬT / TẮT ngay trên màn hình OBS</span>
          </div>

          <div class="cards-grid">
            <div
              v-for="card in filteredCards"
              :key="card.id"
              class="hud-card"
              :class="{
                active: isCardActive(card),
                'skin-card': card.isSkin
              }"
              @click="handleCardClick(card)"
            >
              <div class="card-content">
                <div class="card-title">{{ card.label }}</div>
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="4" y1="21" x2="4" y2="14" />
                    <line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" />
                    <line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                </div>
              </div>
              <div class="card-status-bar">
                <span class="status-indicator"></span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.control-container {
  min-height: 100vh;
  width: 100vw;
  background-color: #0d1117;
  color: #e6edf3;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

/* Top Navigation Bar */
.top-nav {
  height: 52px;
  background-color: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon {
  color: #a371f7;
  display: flex;
  align-items: center;
}

.brand-title {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.02em;
}

.brand-badge {
  background: rgba(163, 113, 247, 0.2);
  color: #d2a8ff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid rgba(163, 113, 247, 0.3);
}

.match-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  background: #0d1117;
  padding: 4px 16px;
  border-radius: 6px;
  border: 1px solid #21262d;
}

.status-pill {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-pill.standby {
  background: rgba(210, 153, 34, 0.2);
  color: #e3b341;
}

.status-pill.live {
  background: rgba(46, 160, 67, 0.2);
  color: #3fb950;
}

.match-teams {
  color: #f0f6fc;
}

.match-meta {
  color: #8b949e;
  font-size: 11px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #30363d;
  color: #fff;
}

.ready-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(46, 160, 67, 0.15);
  color: #3fb950;
  border: 1px solid rgba(46, 160, 67, 0.3);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
}

.ready-badge .dot {
  width: 6px;
  height: 6px;
  background: #3fb950;
  border-radius: 50%;
  box-shadow: 0 0 6px #3fb950;
}

/* Workspace layout */
.workspace {
  display: flex;
  flex: 1;
  height: calc(100vh - 52px);
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 230px;
  background: #161b22;
  border-right: 1px solid #30363d;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #8b949e;
}

.search-box input {
  width: 100%;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 6px 10px 6px 30px;
  font-size: 12px;
  color: #c9d1d9;
  outline: none;
}

.search-box input:focus {
  border-color: #58a6ff;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #8b949e;
  padding: 4px 8px;
  letter-spacing: 0.05em;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  font-size: 13px;
  color: #8b949e;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.nav-item:hover {
  background: #21262d;
  color: #c9d1d9;
}

.nav-item.active {
  background: #5c54d4;
  color: #ffffff;
  font-weight: 600;
}

/* Content Area */
.content-area {
  flex: 1;
  background: #0d1117;
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Sub-header */
.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tabs {
  display: flex;
  background: #161b22;
  border-radius: 6px;
  padding: 3px;
  border: 1px solid #30363d;
}

.tab-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #5c54d4;
  color: #ffffff;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger {
  background: rgba(248, 81, 73, 0.15);
  border: 1px solid rgba(248, 81, 73, 0.3);
  color: #f85149;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover {
  background: rgba(248, 81, 73, 0.25);
}

/* Spotlight Card for Skin Display */
.skin-spotlight-card {
  background: #161b22;
  border: 2px solid #30363d;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.25s;
}

.skin-spotlight-card.is-active {
  background: linear-gradient(135deg, rgba(92, 84, 212, 0.2) 0%, rgba(22, 27, 34, 0.95) 100%);
  border-color: #5c54d4;
  box-shadow: 0 4px 20px rgba(92, 84, 212, 0.15);
}

.spotlight-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.spotlight-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #21262d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spotlight-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  min-width: 76px;
  text-align: center;
  display: inline-block;
}

.live-pill.on {
  background: #238636;
  color: #fff;
}

.live-pill.off {
  background: #484f58;
  color: #c9d1d9;
}

.spotlight-desc {
  font-size: 12px;
  color: #8b949e;
  margin-top: 4px;
  max-width: 520px;
}

.spotlight-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.team-filter {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.filter-label {
  font-size: 11px;
  color: #8b949e;
}

.filter-buttons {
  display: flex;
  gap: 4px;
  background: #0d1117;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid #30363d;
}

.filter-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  color: #8b949e;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.filter-btn.active {
  background: #30363d;
  color: #ffffff;
  font-weight: 600;
}

.filter-btn.active.blue {
  background: #1f6feb;
}

.filter-btn.active.red {
  background: #da3633;
}

.toggle-main-btn {
  min-width: 260px;
  height: 40px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, box-shadow 0.15s, filter 0.15s;
}

.toggle-main-btn.btn-active {
  background: #238636;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(35, 134, 54, 0.4);
}

.toggle-main-btn.btn-inactive {
  background: #5c54d4;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(92, 84, 212, 0.4);
}

.toggle-main-btn:hover {
  filter: brightness(1.1);
}

/* Grid Section */
.grid-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #8b949e;
}

.grid-header .hint {
  font-weight: 400;
  font-size: 11px;
  color: #6e7681;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.hud-card {
  height: 90px;
  background: #161b22;
  border: 2px solid #30363d;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  position: relative;
  overflow: hidden;
}

.hud-card:hover {
  background: #21262d;
  border-color: #58a6ff;
}

.hud-card.active {
  background: #5c54d4;
  border-color: #7b73e8;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(92, 84, 212, 0.25);
}

.hud-card.skin-card.active {
  background: #5c54d4;
  border-color: #ffffff;
  box-shadow: 0 0 16px rgba(92, 84, 212, 0.5);
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
}

.hud-card:not(.active) .card-title {
  color: #c9d1d9;
}

.hud-card.active .card-title {
  color: #ffffff;
}

.card-icon {
  color: rgba(255, 255, 255, 0.4);
}

.hud-card.active .card-icon {
  color: #ffffff;
}

.card-status-bar {
  display: flex;
  align-items: center;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #484f58;
}

.hud-card.active .status-indicator {
  background: #3fb950;
  box-shadow: 0 0 6px #3fb950;
}
</style>

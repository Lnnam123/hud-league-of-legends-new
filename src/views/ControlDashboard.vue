<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useHudSettings, type HudSettings, type FeedEventType } from '@/composables/useHudSettings'
import { useIngameSelector, useIsInGame } from '@/composables/useIngame'

const { settings, toggleSkinDisplay, setSkinDisplay, setSkinTeam, toggleSetting, triggerTestKill, triggerTestFeed } = useHudSettings()

const scoreboard = useIngameSelector((s) => s.gameData.scoreboard)
const isInGame = useIsInGame()

const blueTeamName = computed(() => scoreboard.value?.teams[0]?.teamName || scoreboard.value?.teams[0]?.teamTag || 'T1')
const redTeamName = computed(() => scoreboard.value?.teams[1]?.teamName || scoreboard.value?.teams[1]?.teamTag || 'GEN')
const blueScore = computed(() => scoreboard.value?.teams[0]?.seriesScore?.wins ?? 0)
const redScore = computed(() => scoreboard.value?.teams[1]?.seriesScore?.wins ?? 0)

interface DeckButton {
  id: string
  label: string
  subLabel: string
  key?: keyof HudSettings
  isSkin?: boolean
  isRunes?: boolean
  isKillFeed?: boolean
  isNameSwitch?: boolean
}

// Only the real functional HUD features
const functionalButtons: DeckButton[] = [
  {
    id: 'compactTeamfight',
    label: 'Teamfight Damage',
    subLabel: 'Bảng Giao Tranh',
    key: 'compactTeamfight',
  },
  {
    id: 'scoreboardBottom',
    label: 'Bottom Scoreboard',
    subLabel: 'Bảng Người Chơi',
    key: 'scoreboardBottom',
  },
  {
    id: 'scoreboardShowChampionNames',
    label: 'Scoreboard Names',
    subLabel: 'Tên Tuyển Thủ / Tướng',
    key: 'scoreboardShowChampionNames',
    isNameSwitch: true,
  },
  {
    id: 'teamRunes',
    label: 'Team Runes',
    subLabel: 'Bảng Ngọc Bổ Trợ',
    isRunes: true,
  },
  {
    id: 'sideinfoSkin',
    label: 'Sideinfo Skin',
    subLabel: 'Skin Display',
    isSkin: true,
  },
  {
    id: 'fullGoldGraph',
    label: 'Full Gold Graph',
    subLabel: 'Biểu Đồ Vàng',
    key: 'goldGraph',
  },
  {
    id: 'baronTimer',
    label: 'Baron Timer',
    subLabel: 'Đồng Hồ Baron',
    key: 'baronTimer',
  },
  {
    id: 'dragonTimer',
    label: 'Dragon Timer',
    subLabel: 'Đồng Hồ Rồng',
    key: 'dragonTimer',
  },
  {
    id: 'smiteReaction',
    label: 'Smite Reaction',
    subLabel: 'Hiệu Ứng Trừng Phạt',
    key: 'smiteReaction',
  },
  {
    id: 'killFeed',
    label: 'Kill Feed',
    subLabel: 'Thông Báo Hạ Gục',
    key: 'killFeed',
    isKillFeed: true,
  },
]

function isBtnActive(btn: DeckButton): boolean {
  if (btn.isSkin) return settings.value.skinDisplayEnabled
  if (btn.isRunes) return settings.value.teamRunesEnabled
  if (btn.isNameSwitch) return settings.value.scoreboardShowChampionNames
  if (btn.key) return !!settings.value[btn.key]
  return false
}

function getBtnSubLabel(btn: DeckButton): string {
  if (btn.isNameSwitch) {
    return settings.value.scoreboardShowChampionNames ? 'Hiện Tên Tướng' : 'Hiện Tên Tuyển Thủ'
  }
  return btn.subLabel
}

function handleBtnClick(btn: DeckButton) {
  triggerHaptic()
  if (btn.isSkin) {
    toggleSkinDisplay()
  } else if (btn.isRunes) {
    toggleTeamRunes()
  } else if (btn.key) {
    toggleSetting(btn.key)
  }
}

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(25) } catch {}
  }
}

const showMobileModal = ref(false)
const serverInfo = ref<{ ip: string; port: number; controlUrl: string } | null>(null)
const copied = ref(false)

const isMobileDevice = computed(() => {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
})

const mobileUrl = computed(() => {
  if (serverInfo.value?.controlUrl) return serverInfo.value.controlUrl
  if (typeof window !== 'undefined') {
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? (serverInfo.value?.ip || window.location.hostname)
      : window.location.hostname
    return `${window.location.protocol}//${host}:${window.location.port || 5173}/control`
  }
  return ''
})

async function fetchServerInfo() {
  try {
    const res = await fetch('/api/server-info')
    if (res.ok) {
      serverInfo.value = await res.json()
    }
  } catch {}
}

onMounted(() => {
  fetchServerInfo()
})

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(mobileUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    const input = document.createElement('input')
    input.value = mobileUrl.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

function toggleTeamRunes() {
  settings.value.teamRunesEnabled = !settings.value.teamRunesEnabled
}

function setRunesTeam(team: 'order' | 'chaos') {
  settings.value.teamRunesTeam = team
  settings.value.teamRunesEnabled = true
}

let lastFeedTestTeam: 'order' | 'chaos' = 'chaos'

function triggerFeedTest(type: FeedEventType, team?: 'order' | 'chaos') {
  settings.value.killFeed = true
  const chosenTeam = team || (lastFeedTestTeam === 'order' ? 'chaos' : 'order')
  lastFeedTestTeam = chosenTeam
  triggerTestFeed(type, chosenTeam)
}

function triggerKillTest(team: 'order' | 'chaos') {
  triggerFeedTest('kill', team)
}

function deactivateAll() {
  setSkinDisplay(false)
  settings.value.teamRunesEnabled = false
  settings.value.scoreboardBottom = false
  settings.value.scoreboardShowChampionNames = false
  settings.value.baronTimer = false
  settings.value.dragonTimer = false
  settings.value.goldGraph = false
  settings.value.compactTeamfight = false
  settings.value.smiteReaction = false
  settings.value.killFeed = false
}

function activateDefaults() {
  setSkinDisplay(false)
  settings.value.teamRunesEnabled = false
  settings.value.scoreboardBottom = true
  settings.value.scoreboardShowChampionNames = false
  settings.value.baronTimer = true
  settings.value.dragonTimer = true
  settings.value.goldGraph = true
  settings.value.compactTeamfight = false
  settings.value.smiteReaction = true
  settings.value.killFeed = true
}

function openOverlay() {
  window.open('/', '_blank')
}
</script>

<template>
  <div class="deck-page">
    <!-- Clean Minimalist Header -->
    <header class="deck-header">
      <div class="header-left">
        <span class="app-tag">HUD CONTROL</span>
        <div class="match-pill">
          <span class="status-dot" :class="isInGame ? 'live' : 'standby'"></span>
          <span class="status-text">{{ isInGame ? 'IN GAME' : 'STANDBY' }}</span>
          <span class="match-score">
            <strong>{{ blueTeamName }}</strong> {{ blueScore }} : {{ redScore }} <strong>{{ redTeamName }}</strong>
          </span>
        </div>
      </div>

      <div class="header-right">
        <button class="action-pill mobile-btn" @click="showMobileModal = true">
          📱 Điều Khiển Điện Thoại
        </button>
        <button class="action-pill default" @click="activateDefaults">
          Default All
        </button>
        <button class="action-pill danger" @click="deactivateAll">
          Deactivate All
        </button>
        <button class="action-pill primary" @click="openOverlay">
          Mở Overlay ↗
        </button>
      </div>
    </header>

    <!-- Main Buttons Grid -->
    <main class="deck-main">
      <div v-if="isMobileDevice" class="mobile-status-banner">
        <span class="mobile-pulse"></span>
        <span>Chế độ điều khiển điện thoại (Pocket Stream Deck)</span>
      </div>

      <div class="deck-grid">
        <div
          v-for="btn in functionalButtons"
          :key="btn.id"
          class="deck-card"
          :class="{ active: isBtnActive(btn) }"
          @click="handleBtnClick(btn)"
        >
          <div class="card-text-wrap">
            <span class="card-label">{{ btn.label }}</span>
            <span class="card-sub">{{ getBtnSubLabel(btn) }}</span>
          </div>

          <!-- Quick switcher if it's the Scoreboard Names card -->
          <div v-if="btn.isNameSwitch" class="team-subpills" @click.stop>
            <button
              class="team-pill"
              :class="{ active: !settings.scoreboardShowChampionNames }"
              @click="settings.scoreboardShowChampionNames = false"
            >
              Player
            </button>
            <button
              class="team-pill blue"
              :class="{ active: settings.scoreboardShowChampionNames }"
              @click="settings.scoreboardShowChampionNames = true"
            >
              Tướng
            </button>
          </div>

          <!-- Quick team switcher if it's the Skin Display card -->
          <div v-if="btn.isSkin" class="team-subpills" @click.stop>
            <button
              class="team-pill"
              :class="{ active: settings.skinDisplayTeam === 'both' }"
              @click="setSkinTeam('both')"
            >
              All
            </button>
            <button
              class="team-pill blue"
              :class="{ active: settings.skinDisplayTeam === 'order' }"
              @click="setSkinTeam('order')"
            >
              Xanh
            </button>
            <button
              class="team-pill red"
              :class="{ active: settings.skinDisplayTeam === 'chaos' }"
              @click="setSkinTeam('chaos')"
            >
              Đỏ
            </button>
          </div>

          <!-- Quick team switcher if it's the Team Runes card -->
          <div v-if="btn.isRunes" class="team-subpills" @click.stop>
            <button
              class="team-pill blue"
              :class="{ active: settings.teamRunesTeam === 'order' }"
              @click="setRunesTeam('order')"
            >
              Xanh
            </button>
            <button
              class="team-pill red"
              :class="{ active: settings.teamRunesTeam === 'chaos' }"
              @click="setRunesTeam('chaos')"
            >
              Đỏ
            </button>
          </div>

          <!-- Quick test trigger if it's the Kill Feed card -->
          <div v-if="btn.isKillFeed" class="feed-subpills" @click.stop>
            <div class="feed-row">
              <button
                class="feed-btn blue"
                title="Hạ gục (Đội Xanh)"
                @click="triggerKillTest('order')"
              >
                ⚔ Xanh
              </button>
              <button
                class="feed-btn red"
                title="Hạ gục (Đội Đỏ)"
                @click="triggerKillTest('chaos')"
              >
                ⚔ Đỏ
              </button>
            </div>
            <div class="feed-row objectives">
              <button class="feed-btn obj" title="Ăn Rồng" @click="triggerFeedTest('dragon')">🐉 Rồng</button>
              <button class="feed-btn obj" title="Ăn Sứ Giả Khe Nứt" @click="triggerFeedTest('herald')">👁 Sứ Giả</button>
              <button class="feed-btn obj" title="Ăn Baron" @click="triggerFeedTest('baron')">👾 Baron</button>
              <button class="feed-btn obj" title="Hạ Trụ" @click="triggerFeedTest('tower')">🏰 Trụ</button>
            </div>
          </div>

          <!-- Bottom micro icon / key indicator -->
          <div class="card-footer">
            <svg class="key-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="8" cy="15" r="4" />
              <line x1="10.85" y1="12.15" x2="19" y2="4" />
              <line x1="18" y1="5" x2="20" y2="7" />
              <line x1="15" y1="8" x2="17" y2="10" />
            </svg>
          </div>
        </div>
      </div>
    </main>

    <!-- Mobile Connect Modal -->
    <Transition name="fade">
      <div v-if="showMobileModal" class="modal-overlay" @click.self="showMobileModal = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="modal-title-box">
              <span class="modal-icon-badge">📱</span>
              <div>
                <h3 class="modal-title">Điều Khiển Bằng Điện Thoại</h3>
                <p class="modal-subtitle">Biến smartphone thành bàn phím Stream Deck điều khiển HUD</p>
              </div>
            </div>
            <button class="modal-close-btn" @click="showMobileModal = false">✕</button>
          </div>

          <div class="modal-body">
            <div class="qr-card">
              <div class="qr-wrapper">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileUrl)}&margin=8`"
                  alt="QR Code điều khiển điện thoại"
                  class="qr-img"
                />
              </div>
              <p class="qr-caption">Quét mã bằng Camera điện thoại để mở ngay</p>
            </div>

            <div class="url-section">
              <label class="url-label">Hoặc mở trình duyệt trên điện thoại truy cập:</label>
              <div class="url-row">
                <input type="text" readonly :value="mobileUrl" class="url-input" />
                <button class="copy-action-btn" :class="{ copied }" @click="copyUrl">
                  {{ copied ? 'Đã Chép ✓' : 'Sao Chép' }}
                </button>
              </div>
            </div>

            <div class="instructions-card">
              <div class="inst-item">
                <span class="inst-num">1</span>
                <span>Điện thoại và máy tính cần kết nối vào <strong>cùng mạng Wi-Fi</strong>.</span>
              </div>
              <div class="inst-item">
                <span class="inst-num">2</span>
                <span>Quét mã QR hoặc truy cập đường link trên bằng Safari hoặc Chrome.</span>
              </div>
              <div class="inst-item">
                <span class="inst-num">3</span>
                <span>Mọi nút bấm trên điện thoại sẽ thay đổi HUD hiển thị trên OBS ngay lập tức!</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="action-pill primary close-pill" @click="showMobileModal = false">
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.deck-page {
  min-height: 100vh;
  background-color: #17191d;
  color: #8c939d;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
  user-select: none;
  box-sizing: border-box;
}

/* Header */
.deck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  background-color: #1b1d22;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-tag {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #e2e8f0;
}

.match-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.35);
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-dot.live {
  background-color: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

.status-dot.standby {
  background-color: #64748b;
}

.status-text {
  font-weight: 700;
  font-size: 11px;
  color: #cbd5e1;
}

.match-score {
  color: #94a3b8;
  margin-left: 4px;
}

.match-score strong {
  color: #f1f5f9;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-pill {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: #22252b;
  color: #94a3b8;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-pill:hover {
  background-color: #2c3038;
  color: #f1f5f9;
}

.action-pill.danger {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.2);
  background-color: rgba(239, 68, 68, 0.08);
}

.action-pill.danger:hover {
  background-color: rgba(239, 68, 68, 0.18);
}

.action-pill.primary {
  background-color: #4f46a8;
  border-color: #6358c7;
  color: #ffffff;
}

.action-pill.primary:hover {
  background-color: #5c52c0;
}

/* Main Area */
.deck-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  box-sizing: border-box;
}

.deck-grid {
  display: grid;
  grid-template-columns: repeat(4, 156px);
  grid-auto-rows: minmax(124px, auto);
  gap: 18px;
  justify-content: center;
}

@media (max-width: 760px) {
  .deck-grid {
    grid-template-columns: repeat(2, 156px);
  }
}

/* Square Deck Button (Matches Screenshot) */
.deck-card {
  background-color: #1f2227;
  border: 1px solid #282b32;
  border-radius: 18px;
  padding: 12px 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: all 0.16s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
}

.deck-card:hover {
  background-color: #262930;
  border-color: #383c44;
  transform: translateY(-2px);
}

.deck-card:active {
  transform: scale(0.96);
}

/* ACTIVE STATE (The Purple Indigo in screenshot) */
.deck-card.active {
  background-color: #4f46a8;
  border-color: #6a5fd6;
  color: #ffffff;
  box-shadow: 0 6px 20px rgba(79, 70, 168, 0.45);
}

.deck-card.active:hover {
  background-color: #584fba;
  border-color: #796ee2;
}

.card-text-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 100%;
}

.card-label {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.25;
  color: #8c939d;
  transition: color 0.15s ease;
}

.deck-card.active .card-label {
  color: #ffffff;
  font-weight: 700;
}

.card-sub {
  font-size: 11px;
  color: #5d636e;
  transition: color 0.15s ease;
}

.deck-card.active .card-sub {
  color: #c7c3f5;
}

.card-footer {
  margin-top: 6px;
  opacity: 0.4;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deck-card.active .card-footer {
  opacity: 0.8;
  color: #d1cff7;
}

/* Micro team selector for Skin Display */
.team-subpills {
  display: flex;
  gap: 3px;
  margin-top: 6px;
  background: rgba(0, 0, 0, 0.35);
  padding: 2px 4px;
  border-radius: 6px;
}

.team-pill {
  background: transparent;
  border: none;
  font-size: 9.5px;
  font-weight: 700;
  color: #8c939d;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.deck-card.active .team-pill {
  color: #c7c3f5;
}

.team-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.team-pill.active {
  background: #ffffff;
  color: #1e1b4b;
}

.deck-card.active .team-pill.active {
  background: #ffffff;
  color: #4338ca;
}

.team-pill.blue.active {
  background: #3b82f6;
  color: #ffffff;
}

.team-pill.red.active {
  background: #ef4444;
  color: #ffffff;
}

/* Feed Objective Quick Test Controls */
.feed-subpills {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  width: 100%;
  padding: 0 2px;
  box-sizing: border-box;
}

.feed-row {
  display: flex;
  gap: 3px;
  justify-content: center;
}

.feed-row.objectives {
  flex-wrap: wrap;
}

.feed-btn {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  color: #c7c3f5;
  padding: 2px 5px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.feed-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.03);
}

.feed-btn.blue {
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.35);
}
.feed-btn.blue:hover {
  background: rgba(59, 130, 246, 0.25);
  color: #ffffff;
}

.feed-btn.red {
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.35);
}
.feed-btn.red:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #ffffff;
}

.feed-btn.obj {
  font-size: 8px;
  padding: 1.5px 3.5px;
}

/* Mobile Button in Header */
.action-pill.mobile-btn {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(99, 102, 241, 0.2));
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.action-pill.mobile-btn:hover {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.3), rgba(99, 102, 241, 0.35));
  border-color: #38bdf8;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
}

/* Mobile status banner */
.mobile-status-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #38bdf8;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 16px;
  width: 100%;
  max-width: 360px;
}

.mobile-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  box-sizing: border-box;
}

.modal-dialog {
  background: #181b20;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(79, 70, 168, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.94) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.modal-title-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon-badge {
  font-size: 24px;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
}

.modal-subtitle {
  margin: 2px 0 0 0;
  font-size: 11px;
  color: #94a3b8;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.15s;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qr-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qr-wrapper {
  background: #ffffff;
  padding: 12px;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-img {
  width: 180px;
  height: 180px;
  display: block;
}

.qr-caption {
  font-size: 12px;
  font-weight: 600;
  color: #38bdf8;
  margin: 0;
}

.url-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.url-label {
  font-size: 11.5px;
  color: #94a3b8;
}

.url-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.url-input {
  flex: 1;
  background: #111317;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #e2e8f0;
  font-family: monospace;
  outline: none;
}

.copy-action-btn {
  background: #333842;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.copy-action-btn:hover {
  background: #474f5d;
}

.copy-action-btn.copied {
  background: #16a34a;
  border-color: #22c55e;
}

.instructions-card {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inst-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 11.5px;
  color: #cbd5e1;
  line-height: 1.4;
}

.inst-num {
  background: #4f46a8;
  color: #ffffff;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  justify-content: flex-end;
}

.close-pill {
  width: 100%;
  text-align: center;
  padding: 10px;
  font-size: 13px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile Responsive Optimization */
@media (max-width: 768px) {
  .deck-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px 16px;
  }

  .header-left {
    justify-content: space-between;
    width: 100%;
  }

  .header-right {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    width: 100%;
  }

  .action-pill {
    padding: 8px 10px;
    font-size: 11px;
    text-align: center;
    justify-content: center;
  }

  .deck-main {
    padding: 16px 12px;
    flex-direction: column;
    justify-content: flex-start;
  }

  .deck-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    width: 100%;
    max-width: 400px;
  }

  .deck-card {
    min-height: 110px;
    padding: 12px 6px;
    border-radius: 14px;
    -webkit-tap-highlight-color: transparent;
  }

  .card-label {
    font-size: 12.5px;
  }

  .card-sub {
    font-size: 10px;
  }

  .team-pill {
    padding: 4px 6px;
    font-size: 10px;
  }
}
</style>

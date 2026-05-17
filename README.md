# League Broadcast Demo

A minimal Vue 3 broadcast overlay built with [`@bluebottle_gg/league-broadcast-client`](https://github.com/BlueBottleGG/leaguebroadcast-js-client). It connects to a running **LeagueBroadcast** server and renders broadcast-ready graphics on a transparent 1920×1080 canvas — designed to be layered over game footage in OBS, vMix, or any streaming tool.

Use this as a starting point for building your own broadcast overlays — add components, swap out styles, and extend to your heart's content.

## What's included

| Component | Description |
|---|---|
| **Scoreboard** | Two-row broadcast bar (top center): team logos, names, kills, gold, towers, grubs, dragons, game timer, and a gold-difference progress bar |
| **Gold Graph** | SVG gold-difference chart (bottom center) with blue/red filled regions |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ 
- A running [LeagueBroadcast](https://github.com/BlueBottleGG/LeagueBroadcast) server (default port `58869`)

## Quick start

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). The demo will automatically try to connect to `localhost:58869`.

### Changing the server address

Edit `src/client.ts` and update `defaultClientConfig`:

```ts
export const defaultClientConfig: LeagueBroadcastClientConfig = {
  host: "192.168.1.42", // your server IP
  port: 58869,
  autoConnect: false,
};
```

## Project structure

```
src/
├── main.ts                       # App bootstrap & client setup
├── client.ts                     # Client instance & injection key
├── App.vue                       # Transparent 1920×1080 overlay canvas
├── composables/
│   └── useIngame.ts              # Vue composables wrapping the client's reactive API
└── components/
    ├── Scoreboard.vue            # Two-row broadcast scoreboard (top center)
    ├── GoldGraph.vue             # SVG gold-difference chart (bottom center)
    ├── ConnectionStatus.vue      # WebSocket + game state indicator (utility)
    └── EventLog.vue              # Live game event feed (utility)
```

> **Tip:** `ConnectionStatus` and `EventLog` are included as utility examples for debugging.
> Import them into `App.vue` if you need connection diagnostics during development.

## Key patterns

### Accessing the client

The `LeagueBroadcastClient` instance is provided at the app root via Vue's `provide`/`inject`. Use `useClient()` to grab it in any component:

```ts
import { useClient } from "@/client";
const client = useClient();
```

### Reactive selectors

The `useIngameSelector` composable bridges the library's framework-agnostic reactive store with Vue refs. Only re-renders when your selected value changes:

```ts
import { useIngameSelector } from "@/composables/useIngame";

// Only updates when kills change, not on every state push
const blueKills = useIngameSelector(
  (s) => s.gameData.scoreboard?.teams[0]?.kills ?? 0
);
```

### Listening to events

```ts
const client = useClient();

client.onIngameEvents({
  onObjectiveEvent: (e) => console.log("Objective:", e.type),
  onKillFeedEvent: (e) => console.log("Kill:", e.killer, "→", e.victim),
});
```

## Building for production

```bash
npm run build
```

Output lands in `dist/`. Serve it with any static file server.

## License

MIT

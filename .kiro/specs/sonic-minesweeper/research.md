# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary

- **Feature**: `sonic-minesweeper`
- **Discovery Scope**: New Feature (Greenfield SPA)
- **Key Findings**:
  - iOS Safari requires `AudioContext.resume()` to be called synchronously within a user-gesture handler; the "Tap to Start" button (Req 1.3) is the designated trigger. A module-level singleton for `AudioContext` prevents re-creation across React re-renders and satisfies Req 14.6.
  - Pointer Events (`pointerdown` / `pointerup`) provide cross-platform gesture normalization superior to Touch Events for tap-vs-long-press disambiguation. A 300–500ms dead zone is required between the tap threshold (< 300ms) and the long-press activation threshold (≥ 500ms) to prevent accidental wrong-tap penalties.
  - A four-layer Layered SPA architecture (Presentation → Application → Domain → Infrastructure) maps cleanly to the game's bounded scope and explicit prohibition on external state management and audio libraries.

## Research Log

### Web Audio API — iOS Safari Constraints

- **Context**: iOS Safari suspends `AudioContext` by default; audio playback fails silently unless resumed inside a user-gesture handler.
- **Sources Consulted**: MDN Web Audio API, WebKit bug tracker, Safari Web Audio API release notes for Safari 15+
- **Findings**:
  - `new AudioContext()` starts in `"suspended"` state on iOS; must call `ctx.resume()` in a `click` / `touchend` / `pointerup` handler.
  - Only one user-gesture resumption is needed per page lifetime; subsequent calls are no-ops.
  - Safari 15+ supports `OscillatorNode`, `GainNode`, `linearRampToValueAtTime`, and scheduled `.stop(time)` — all required synthesis primitives are available.
  - Creating multiple `AudioContext` instances triggers a warning and may be silently capped by the browser; a singleton is mandatory.
- **Implications**: `AudioService.initialize()` creates and resumes `AudioContext` exactly once, called from the "Tap to Start" handler. `useAudio` exposes `audioSupported: boolean` to allow `StartScreen` to render a warning when the API is unavailable.

### Gesture Disambiguation — Tap vs Long Press

- **Context**: The game requires tap (< 300ms) and long-press (≥ 500ms) to be mutually exclusive on the same cell element. A wrong tap costs the player significant time (−30s to −70s depending on difficulty), so false positives are very costly.
- **Sources Consulted**: MDN Pointer Events spec, Apple HIG touch guidelines, W3C Touch Events Level 2
- **Findings**:
  - Pointer Events (`pointerdown`, `pointerup`, `pointercancel`, `pointerleave`) work across touch, mouse, and stylus without separate handling.
  - CSS `touch-action: none` on the board container disables browser scroll/zoom/tap-delay for covered elements without JS `preventDefault()` overhead on every event.
  - `preventDefault()` on `touchstart` (or `pointerdown` with `touch-action: none`) prevents the 300ms tap delay on older browsers.
  - The dead zone 300–500ms must cancel silently; no action should fire in this range.
- **Implications**: `useLongPress` tracks `pointerdown` timestamp, sets a 500ms `setTimeout` for long-press activation, and on `pointerup` checks elapsed time: < 300ms → tap, 300–500ms → cancel (no action), ≥ 500ms already activated → long-press-complete.

### requestAnimationFrame Timer Accuracy

- **Context**: Req 14.4 requires ±16ms timer accuracy; Req 7.2 requires per-frame `deltaTime` decrement.
- **Sources Consulted**: MDN `requestAnimationFrame`, MDN `DOMHighResTimeStamp`
- **Findings**:
  - rAF callback receives a `DOMHighResTimeStamp` with sub-millisecond precision.
  - Delta = `(currentTs - prevTs) / 1000` in seconds gives frame-accurate elapsed time.
  - rAF is automatically paused when the browser tab is hidden (via Page Visibility API), meaning the timer naturally pauses without extra handling.
  - On tab resume, the first delta may be very large (seconds); clamping `deltaTime` to a max of `0.1s` prevents time jumps.
- **Implications**: `useTimer` stores `prevTimestamp` in a `useRef` (not state), computes `deltaTime` per frame, clamps to 0.1s, and dispatches `TICK` with `deltaTime`. The loop is started/stopped based on `phase === 'playing'`.

### TailwindCSS v4 Configuration

- **Context**: Steering specifies TailwindCSS v4 with `@import "tailwindcss"` and `@theme` block syntax.
- **Sources Consulted**: TailwindCSS v4 official docs, `@tailwindcss/vite` npm package
- **Findings**:
  - TailwindCSS v4 uses a CSS-first config: no `tailwind.config.js` needed for basic usage.
  - Vite integration uses `@tailwindcss/vite` plugin (replaces the PostCSS plugin approach of v3).
  - Custom theme tokens (colors, spacing, animations) are defined in `@theme { }` block inside the CSS entry file.
  - Dark mode works with `prefers-color-scheme` by adding `dark` variant classes with the `@media (prefers-color-scheme: dark)` pattern or TailwindCSS's built-in `dark:` prefix.
  - `@apply` is still supported for component-level styles.
- **Implications**: `vite.config.ts` imports and registers `@tailwindcss/vite`. `src/styles/app.css` begins with `@import "tailwindcss"` followed by `@theme { }` block for game-specific custom tokens (cell colors, animation keyframes).

### React 19 Compiler — Auto-Memoization

- **Context**: React 19 ships with an optional React Compiler that automatically memoizes components and values, potentially eliminating the need for manual `React.memo`, `useMemo`, and `useCallback`.
- **Sources Consulted**: React 19 release notes, React Compiler documentation
- **Findings**:
  - React Compiler (Babel/SWC plugin) analyses component render functions and inserts automatic memoization, delivering ~30–60% reduction in unnecessary re-renders.
  - When enabled, manual `React.memo` on `Cell` becomes redundant.
  - The compiler is opt-in: it must be added as a Vite/Babel plugin (`babel-plugin-react-compiler`). If not configured, standard React 19 without the compiler behaves identically to React 18 regarding manual memoization.
  - The project steering specifies React 19 but does not mandate the compiler plugin.
- **Implications**: The design specifies `React.memo` on `Cell` as the baseline strategy (works with or without the compiler). If the React Compiler is added to the build, the `React.memo` wrapper is harmless and can be removed as a clean-up step. Document this as an optimization note rather than a hard requirement.

### State Management — useReducer + Context Performance

- **Context**: The game dispatches `TICK` at ~60fps (every 16ms). With 256 cells (16×16 board), naive Context re-renders would cause 15,360+ renders/second, breaking the 60fps target (Req 14.3).
- **Findings**:
  - `React.memo` with a custom `areEqual` comparator prevents Cell re-renders when only `remainingTime` changes (which happens every TICK).
  - Splitting Context into `GameConfigContext` (stable config) and `GameStateContext` (live state) reduces re-subscriptions, but adds API surface. For this game's bounded scope, a single `GameContext` with aggressive `React.memo` on `Cell` is sufficient.
  - `useMemo` for derived state (e.g., adjacent mine counts) prevents per-render recalculation.
  - `useCallback` on event handlers passed to `Cell` prevents referential equality changes that break `React.memo`.
- **Implications**: `Cell` is wrapped in `React.memo` with custom `areEqual` comparing `cell.state`, `isExploring`, and `visualAssist`. Local press-progress state (for the 500ms progress ring animation) lives in `Cell`-local `useState`, not the global store.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Layered SPA | Presentation → Application → Domain → Infrastructure | Clear top-down dependencies, easy to test each layer independently | Not ideal for very large codebases | Best fit for bounded game scope |
| Flux / Redux | Action → Reducer → Store → View | Predictable state, time-travel debugging | External library prohibited; overkill for single-page game | Rejected |
| Clean Architecture | Core domain fully isolated from frameworks | Maximum testability, framework-agnostic | Significant boilerplate; adds complexity without benefit at this scale | Rejected |
| Monolithic Component | All logic in `App.tsx` | Fastest prototype | Untestable, unmaintainable at 14-requirement scope | Rejected |

**Selected**: Layered SPA. The game maps cleanly to four layers with single-direction dependencies.

## Design Decisions

### Decision: AudioService as Module-Level Singleton

- **Context**: `AudioContext` must be a single instance per application (browser constraint + Req 14.6). React component lifecycle (unmount/remount) must not recreate it.
- **Alternatives Considered**:
  1. Store `AudioContext` in React Context — recreated on tree remount; violates single-instance constraint.
  2. Module-level singleton (lazy-initialized) — persistent across React lifecycle, lifecycle-independent.
- **Selected Approach**: `AudioService` is a module-level singleton object with lazy `AudioContext` initialization. `useAudio` hook provides the React integration layer.
- **Rationale**: Guarantees single `AudioContext` instance, avoids Safari "too many contexts" warning, and prevents audio glitches during React re-renders or StrictMode double-invoking effects.
- **Trade-offs**: Audio state (currently playing / stopped) is not reactive React state. `isAudioPlaying` is synchronized back into `GameState` via `dispatch({ type: 'SET_AUDIO_PLAYING', playing })`.
- **Follow-up**: Verify `AudioContext.close()` on page unload via `beforeunload` event.

### Decision: Separate `Mine[]` Array from `Cell[][]` Grid

- **Context**: Audio distance calculations iterate over all mines; UI renders cells. Embedding mine data in cells would require O(n²) scan to collect all mines per audio calculation.
- **Alternatives Considered**:
  1. Embed mine data in `Cell` objects — clean data locality but O(n²) scan for audio.
  2. Separate `mines: Mine[]` flat array alongside `cells: Cell[][]` — O(mineCount) for audio, O(1) for cell access by [row][col].
- **Selected Approach**: `GameState` holds both `cells: ReadonlyArray<ReadonlyArray<Cell>>` and `mines: ReadonlyArray<Mine>`. `Cell.hasMine` and `Cell.mineId` cross-reference mines.
- **Rationale**: Audio runs every rAF frame during exploration; O(mineCount) iteration (6–40 items) is efficient. Cell rendering is indexed by [row][col] for O(1) access.
- **Trade-offs**: `BoardGenerator` must populate both consistently. `mineId` in `Cell` enables O(1) mine lookup when needed.

### Decision: Gesture Dead Zone (300–500ms)

- **Context**: Tap < 300ms; long-press activates at ≥ 500ms. The range 300–500ms is ambiguous.
- **Alternatives Considered**:
  1. Treat 300–500ms as tap → risks accidental mine identification (wrong tap penalty: −30s to −70s).
  2. Cancel silently in 300–500ms → no false positives; user learns the interaction model.
- **Selected Approach**: Cancel silently; hide progress ring if pointer released before 500ms.
- **Rationale**: Wrong-tap penalties are very costly. The progress ring provides clear feedback. The dead zone trains the user to either tap quickly or hold fully.
- **Trade-offs**: Some users may feel confused initially; mitigated by the onboarding description on the Start Screen.

### Decision: React.memo on Cell with Local Press State

- **Context**: `TICK` fires at 60fps, updating `remainingTime`. Without memoization, all 256 cells re-render every frame.
- **Alternatives Considered**:
  1. No memoization — simple but causes 15,360+ renders/second.
  2. `React.memo` with global press state — press state in `GameState` adds TICK-frequency re-renders for the active cell.
  3. `React.memo` with local press state — press progress (`0.0–1.0` over 500ms) lives in `Cell`-local `useState`; global store only receives terminal actions.
- **Selected Approach**: Option 3. `React.memo(Cell, areEqual)` where `areEqual` compares `cell.state`, `isExploring`, `visualAssist`, and callback references. `pressProgress` lives in `Cell`-local state.
- **Rationale**: TICK events only change `remainingTime` and `score` — neither is a `Cell` prop. Cell re-renders only on actual cell state changes (flagging, wrong tap), which are infrequent.
- **Trade-offs**: Press animation is not globally observable. Acceptable: press state is purely visual and transient.

### Decision: Score Computed Incrementally in Reducer (Not in ScoreCalculator at End)

- **Context**: Req 10.8 requires real-time score display during gameplay. Req 10.1–10.5 define per-action score mutations.
- **Alternatives Considered**:
  1. Compute full score only at game end — cannot show real-time score during play.
  2. Track `baseScore`, `wrongDeduction`, `streakCount`, `streakHistory` in GameState; compute display score on every render.
  3. Track a running `score` field in GameState updated on each action.
- **Selected Approach**: Track `baseScore` (from correct taps) and `wrongDeduction` (from wrong taps) as incremental counters in `GameState`. Display score = `baseScore - wrongDeduction`. At game end, `ScoreCalculator` computes final score including time bonus, streak bonus, and game-over 50% penalty.
- **Rationale**: Display score is always current; final score calculation is pure and testable.

## Risks & Mitigations

- **iOS Safari AudioContext resumption failure** → `AudioService.initialize()` wrapped in try/catch; sets `supported = false` flag. UI degrades to visual-only play with a warning.
- **React re-render performance on 16×16 board at 60fps** → `React.memo` on `Cell` with custom `areEqual`; `useCallback` on handlers. Monitored via integration performance test.
- **Touch event conflict with browser scroll on Advanced board** → CSS `touch-action: none` on board container; `preventDefault()` in `useLongPress` `onPointerDown`.
- **localStorage unavailability (private browsing, quota exceeded)** → `StorageService` wraps all calls in try/catch; gracefully returns empty arrays and `false`.
- **Large deltaTime on tab resume** → `useTimer` clamps `deltaTime` to max 0.1s per frame to prevent sudden large time deductions.
- **Simultaneous multi-touch on board** → `useLongPress` tracks a single `pointerId`; additional `pointerdown` events with different IDs are ignored.
- **Frequency semitone separation violation** → `FrequencyCalculator` validates minimum 5.9% separation post-shuffle; if violated, re-shuffles (bounded retry loop).

## References

- MDN Web Audio API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- MDN AudioContext.resume() — https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume
- MDN Pointer Events — https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- MDN requestAnimationFrame — https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
- TailwindCSS v4 — https://tailwindcss.com/docs
- React useReducer — https://react.dev/reference/react/useReducer
- React.memo — https://react.dev/reference/react/memo
- Apple HIG Touch Targets — https://developer.apple.com/design/human-interface-guidelines/buttons

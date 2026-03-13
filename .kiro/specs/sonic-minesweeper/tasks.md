# Implementation Plan

- [x] 1. Project Bootstrap & Build Configuration
- [x] 1.1 Configure Vite + React 19 + TypeScript + TailwindCSS v4 build toolchain
  - Initialize Vite project with React 19 and strict TypeScript (`strict: true`, no `any` types)
  - Integrate TailwindCSS v4 via `@tailwindcss/vite` plugin; set up `app.css` with `@import "tailwindcss"` and `@theme` block for dark mode and custom color tokens
  - Configure Vite `build.target` for Chrome 90+, Safari 15+, Firefox 90+, Samsung Internet 15+
  - Verify production gzip bundle stays under the 200 KB limit via `vite-bundle-visualizer` or equivalent
  - _Requirements: 14.1, 14.5_

- [x] 1.2 Define shared game type system and difficulty configuration constants
  - Declare all discriminated union types and interfaces for the domain: `Difficulty`, `GamePhase`, `GameOverReason`, `CellState`, `DifficultyConfig`, `Mine`, `Cell`, `CellPosition`, `HighScore`, `MineGain`, `ScoreBreakdown`, `BoardData`, `GameState`, and `GameAction`
  - Define the three `DIFFICULTY_PRESETS` constant entries (Beginner 8×8/6 mines/120s, Intermediate 12×12/20 mines/240s, Advanced 16×16/40 mines/420s) with all cost and radius values
  - _Requirements: 1.5_

- [x] 2. Domain Layer — Core Pure Functions
- [x] 2.1 (P) Implement frequency assignment with log-scale formula and guaranteed minimum separation
  - Compute the array `frequency[i] = 220 × 2^(i / mineCount × 3)` for `i = 0…mineCount−1`, covering the 220 Hz–1760 Hz (A3–A6) range
  - Fisher-Yates shuffle the array; verify that every pair of adjacent frequencies in sorted order differs by ≥ 5.9%; retry shuffle up to 10 times if the separation constraint is violated
  - Return an immutable array of `mineCount` frequencies
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 2.2 (P) Implement Euclidean distance attenuation for per-mine gain computation
  - Accept the pressed cell position, the full mine array, and the difficulty's detection radius
  - Compute `d = √((x1−x2)² + (y1−y2)²)` for each mine; apply `gain = 0.3 × (1 − d/detectionRadius)²` for mines where `d ≤ radius`, zero otherwise; cap individual gain at 0.3
  - Return only in-range mines as a `ReadonlyArray<MineGain>`; return empty array when no mines are in range
  - _Requirements: 3.1, 3.2, 3.7_

- [x] 2.3 (P) Implement score computation for win and game-over outcomes
  - Win path: base score (`correctCount × 200`) minus deductions (`wrongCount × 100`), plus time bonus (`remainingTime × 10`), plus streak bonus (`Σ N×(N+1)/2×50` for each streak length `N` in `streakHistory`)
  - Game-over path: `floor((correctCount × 200 − wrongCount × 100) × 0.5)`, no time or streak bonuses
  - Expose the full `ScoreBreakdown` breakdown for modal display; all individual components kept separate in the returned object
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 3. Domain — Board Generation
  - Randomly place exactly `config.mineCount` mines on the grid such that no two share the same `(row, col)` coordinate; use a shuffle-based approach on the full cell index space
  - Initialize all cells in the `hidden` state; cross-reference each mine into the corresponding cell (`hasMine: true`, `mineId` set)
  - Delegate frequency assignment to the `FrequencyCalculator` and attach each frequency to its corresponding mine
  - _Requirements: 2.1, 2.2_

- [x] 4. Infrastructure — Storage Service
  - Implement localStorage read/write for top-5 high scores per difficulty using keys `sonic-minesweeper-scores-{difficulty}`; `saveHighScore` inserts, sorts descending, trims to 5, and returns the updated array
  - Implement the one-time earphone recommendation flag using key `sonic-minesweeper-earphone-shown`
  - Wrap every localStorage call in try/catch; `getHighScores` returns `[]` and `getEarphoneShown` returns `false` on any error so the game always degrades gracefully
  - _Requirements: 1.4, 9.5, 10.7_

- [x] 5. Infrastructure — Web Audio API Service
- [x] 5.1 Implement the AudioContext singleton with exploration playback
  - Manage a single module-level `AudioContext` instance; `initialize()` creates and resumes it on first call and is a no-op thereafter (satisfies iOS Safari user-gesture requirement)
  - `startExploration(mineGains)` creates one `OscillatorNode` + `GainNode` per in-range mine, routed through a master `GainNode`; ramp master gain from 0 to 1 over 0.05 s (fade-in)
  - `stopExploration()` ramps master gain to 0 over 0.3 s then stops all active oscillators at `ctx.currentTime + 0.3`
  - Guard every playback call with a `ctx.state !== 'running'` check and call `ctx.resume()` if needed (iOS Safari visibility-change edge case)
  - _Requirements: 3.3, 3.4, 3.5, 3.7, 4.6, 14.2, 14.6_

- [x] 5.2 Implement all game-event sounds using Web Audio API synthesis
  - Correct-tap "ding-dong-dang": three sequential sine tones with rising pitch, each ~0.15 s
  - Wrong-tap "buzz": short-duration sawtooth or triangle burst, ~0.2 s
  - Game-over arpeggio: play each mine frequency sequentially at `ctx.currentTime + i × 0.1`, each 0.08 s, totaling ~2 s across all frequencies
  - Victory fanfare: start all mine-frequency oscillators simultaneously for ~1 s, then fade out
  - Expose `playUrgentBeep()` for the ≤ 5s urgent-alert beep
  - All synthesis uses `OscillatorNode` + `GainNode` only; no external audio libraries
  - _Requirements: 3.6, 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 6. Game State Machine
- [x] 6.1 Implement initial state shape and game-start actions
  - Define `GameState` with all fields (`phase`, `difficulty`, `cells`, `mines`, `remainingTime`, `wrongCount`, `baseScore`, `wrongDeduction`, `streakCount`, `streakHistory`, `flaggedCount`, `gameOverReason`, `isAudioPlaying`, `visualAssist`, `pendingTimePenalty`)
  - `START_GAME` action: accepts `DifficultyConfig` and `BoardData`; initializes timer to `timeBudget` and sets phase to `'playing'`
  - `RESET` action returns state to `idle` phase; `SELECT_DIFFICULTY` stores the chosen difficulty for the next `START_GAME`
  - Set up `GameContext` and provider wrapping the app; expose `state` and `dispatch` to the component tree
  - _Requirements: 1.1, 1.2, 1.3, 7.1_

- [x] 6.2 Implement cell interaction reducer actions (TAP_CELL and LONG_PRESS_COMPLETE)
  - `TAP_CELL` on a mine cell: set `cell.state = 'flagged'`, increment `flaggedCount` and `streakCount`, update `baseScore`; check win condition (all mines flagged)
  - `TAP_CELL` on a non-mine cell: set `cell.state = 'wrong'`, increment `wrongCount`, reset `streakCount` (append to `streakHistory`), deduct `wrongTapCost`, set `pendingTimePenalty`; trigger `GAME_OVER` with `reason: 'wrong-count'` when `wrongCount >= 3`
  - `TAP_CELL` is a no-op when `cell.state !== 'hidden'` (flagged cells ignored)
  - `LONG_PRESS_COMPLETE`: always deduct `listenCost` from `remainingTime` and set `pendingTimePenalty`; additionally flag the cell if it contains a mine (same logic as correct `TAP_CELL`)
  - `CLEAR_TIME_PENALTY` clears `pendingTimePenalty` after the Header animation completes
  - _Requirements: 5.5, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.1, 10.2, 10.4, 10.5_

- [x] 6.3 Implement TICK, WIN, GAME_OVER, and score display actions
  - `TICK`: decrement `remainingTime` by `deltaTime`; if result ≤ 0 dispatch `GAME_OVER` with `reason: 'time'` in the same reducer pass
  - `WIN`: set phase to `'win'`; `GAME_OVER`: set phase to `'game-over'` with the given reason; both halt further `TICK` processing via `phase` check
  - `SET_AUDIO_PLAYING` toggles `isAudioPlaying` for the animated speaker icon
  - `TOGGLE_VISUAL_ASSIST` flips the `visualAssist` boolean for accessibility mode
  - Display score at `baseScore − wrongDeduction` in real-time, updated on every relevant action
  - _Requirements: 7.2, 7.5, 7.6, 8.1, 9.1, 10.8_

- [x] 7. Application Hooks
- [x] 7.1 (P) Implement gesture disambiguation hook (tap vs long-press)
  - On `pointerdown`, start a 500 ms timer; cancel default browser behavior with `e.preventDefault()` to suppress scroll and apply `touch-action: none` on the target element
  - Before 300 ms: release fires `onTap` callback; 300–500 ms dead zone: release cancels silently (no action, no penalty)
  - At 500 ms threshold: `onLongPressActivate` fires; subsequent release fires `onLongPressRelease`
  - Track only the first active `pointerId`; ignore additional `pointerdown` events for multi-touch; `pointerleave` and `pointercancel` both clean up the press timer without dispatching
  - _Requirements: 5.1, 5.5, 5.6, 12.5, 12.6_

- [x] 7.2 (P) Implement requestAnimationFrame countdown timer hook
  - Start a rAF loop when `phase === 'playing'`; compute `deltaTime = (currentTs − prevTs) / 1000` seconds per frame; clamp to max 0.1 s to handle tab-resume spikes
  - Dispatch `{ type: 'TICK', deltaTime }` via `GameContext.dispatch` on every frame
  - Cancel the rAF loop when `phase` changes away from `'playing'` or on component cleanup
  - _Requirements: 7.1, 7.2, 14.4_

- [x] 7.3 (P) Implement audio bridge hook connecting AudioService to the React tree
  - Wrap each `AudioService` method in stable callback references; `startExploration` dispatches `SET_AUDIO_PLAYING(true)`, `stopExploration` schedules `SET_AUDIO_PLAYING(false)` after the 0.3 s fade-out
  - Expose `audioSupported` boolean; when `false`, all callbacks are no-ops and the UI can display a warning
  - Provide convenience wrappers for `playCorrectTap`, `playWrongTap`, `playGameOver`, `playVictory`, and `playUrgentBeep`
  - _Requirements: 3.3, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 11.2_

- [x] 8. Start Screen
  - Render the game title, brief description, and three difficulty-selection cards each showing: board size, mine count, detection radius, time budget, listen cost, and wrong-tap cost
  - Highlight the selected difficulty card; enable the "Tap to Start" button only after a difficulty is selected
  - On "Tap to Start": call `AudioService.initialize()` (creates and resumes `AudioContext` within the user gesture), call `BoardGenerator.generate()`, then dispatch `START_GAME`
  - Display the one-time earphone recommendation via `StorageService.getEarphoneShown()`; mark it shown on first display
  - Show a warning message if `audioSupported === false`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 9. Game HUD — Header & Bottom Bar
- [x] 9.1 (P) Build the fixed header status bar
  - Display remaining time to one decimal place (e.g., "87.3s"); apply red color and blinking CSS animation when `remainingTime ≤ 10`; blink the time progress bar when `remainingTime ≤ 5`
  - Render three life-heart icons; flash the relevant heart with a CSS animation on each wrong tap (`wrongCount` increment)
  - Show current score (`baseScore − wrongDeduction`) updated on every action; display mine progress counter as "🎯 flaggedCount/mineCount"
  - Animate a speaker icon with a vibration CSS effect when `isAudioPlaying === true`
  - Render a floating penalty text (e.g., "−3s") in red that animates upward and fades out when `pendingTimePenalty` is set; dispatch `CLEAR_TIME_PENALTY` after the animation completes
  - _Requirements: 4.5, 7.3, 7.4, 7.5, 10.8, 11.1, 11.2_

- [x] 9.2 (P) Build the bottom action bar
  - "New Game" button dispatches `RESET` then immediately `START_GAME` with the current difficulty and freshly generated board data
  - "Change Difficulty" button dispatches `RESET` only, returning to the `idle` phase and the `StartScreen`
  - Bar is visible during `playing`, `game-over`, and `win` phases
  - _Requirements: 11.6_

- [x] 10. Cell Component & Sound Wave Animation
- [x] 10.1 Build the cell component with visual states and gesture capture
  - Wrap with `React.memo` using a custom equality check comparing `cell.state`, `isExploring`, `visualAssist`, `adjacentMineCount`, and callback references; prevents re-renders during every `TICK`
  - Maintain local `pressProgress` (0.0–1.0) animated over 500 ms; render as a CSS circular progress ring around the cell — not in global `GameState`
  - Render visual states: `hidden` (neutral), `flagged` (mine icon + green checkmark + pulse CSS animation), `wrong` (red × icon + shake CSS animation)
  - When `visualAssist` is true and the cell is flagged, display the adjacent mine count in large text; map volume level to a color-gradient CSS class on the cell background during long-press exploration
  - Enforce minimum 44×44 px rendered size; apply `touch-action: none` to prevent browser scroll/zoom during interaction
  - Wire keyboard events: `Enter` → `onTap`, `Space` → long-press activation via `useLongPress`; support arrow-key focus traversal
  - When `disabled` (cell is flagged or `phase !== 'playing'`), ignore all pointer and keyboard events
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.6, 11.3, 11.4, 12.1, 12.5, 12.6, 13.1, 13.2, 13.3_

- [x] 10.2 (P) Build the sound wave ripple animation component
  - Render CSS-animated concentric rings that expand outward to `detectionRadius × cellSizePx` pixels
  - Map `volumeLevel` (0–1) to CSS `filter: saturate()` on the ring color; zero volume produces desaturated rings, full volume produces fully saturated rings
  - Render as a positioned child of the active cell; show only while exploration audio is active
  - _Requirements: 5.3, 5.4_

- [x] 11. Board Component
- [x] 11.1 Build the responsive CSS grid container with difficulty-aware scaling
  - Use CSS Grid with computed cell pixel sizes derived from `DifficultyConfig` (rows, cols)
  - Beginner (8×8): cells fill the available screen width; no scroll needed
  - Intermediate (12×12): horizontal fit with minimal vertical overflow permitted
  - Apply `touch-action: none` on the board container to prevent browser scroll/zoom during cell interactions
  - Compute `adjacentMineCount` for each cell in the Board when `visualAssist === true`; pass as props to Cell (not stored in `GameState`)
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [x] 11.2 Add pinch-to-zoom and pan support for the Advanced (16×16) board
  - Apply a CSS `transform: scale(zoom) translate(panX, panY)` matrix on the board wrapper using pointer-event tracking for pinch and drag gestures
  - Constrain zoom to a sensible min/max range; clamp pan so the board cannot be dragged fully off-screen
  - _Requirements: 12.4_

- [x] 11.3 Render the detection-radius overlay and "No mines in range" indicator
  - When the most recent exploration returned an empty `MineGain[]` array, render a semi-transparent circular overlay on the board centered on the explored cell with radius `detectionRadius × cellSizePx`
  - Show a "No mines in range" tooltip adjacent to the explored cell
  - _Requirements: 3.6, 11.5_

- [x] 12. Result Modal
- [x] 12.1 Build the win result display with score breakdown and confetti
  - Display the full `ScoreBreakdown` as labeled rows: base score, time bonus, streak bonus, wrong-tap deduction, and total
  - If the total score exceeds the stored high score for the current difficulty, highlight "New Best!" using `StorageService.saveHighScore()` and mark the achievement visually
  - Render a CSS `@keyframes` confetti animation without any external library
  - Play victory fanfare via `useAudio.playVictory()` when the modal mounts
  - Provide "Retry" (RESET + START_GAME with same difficulty), "Change Difficulty" (RESET), and "Main Menu" (RESET) buttons
  - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x] 12.2 Build the game-over result display with sequential mine reveal
  - On mount, sequentially reveal each mine position at 0.1-second intervals using a `useEffect`-driven interval; play the game-over arpeggio via `useAudio.playGameOver(frequencies)` in sync
  - Apply a dimming overlay on the board during and after the reveal sequence
  - Display the result cause ("Time exhausted" or "Three wrong guesses"), the final score (50% of base points, no bonuses), and all wrong-tap cells highlighted with a red × marker
  - Provide the same three action buttons as the win modal
  - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 13. Accessibility — Keyboard Navigation & Dark Mode
- [x] 13.1 (P) Implement full keyboard navigation across the game board
  - Enable arrow-key (up/down/left/right) focus movement between cells using `tabIndex` and `onKeyDown` on each cell
  - Map `Enter` to the tap action and `Space` (hold) to long-press activation; `Space` release ends the long-press
  - Ensure focus remains visible with a clear CSS focus ring that does not interfere with game visuals
  - _Requirements: 13.3_

- [x] 13.2 (P) Configure dark mode theming and system preference integration
  - Use the TailwindCSS v4 `@theme` block and `prefers-color-scheme` media query to define dark-mode color tokens; all components use semantic color tokens rather than hard-coded values
  - Add the visual-assist toggle control to the UI (e.g., in the header or bottom bar); dispatching `TOGGLE_VISUAL_ASSIST` enables adjacent-mine-count display and color-gradient intensity mapping on cells
  - _Requirements: 13.4_

- [x] 14. Performance Optimization & Validation
  - Confirm that `Cell` with `React.memo` + custom `areEqual` does not re-render unchanged cells during `TICK` dispatches; use React DevTools profiler to verify zero cell re-renders per tick on the 16×16 board
  - Measure time from `pointerdown` to first oscillator `start()` call using `performance.mark`; must be < 50 ms on target devices
  - Run `vite build` and verify the gzip output is < 200 KB; adjust code splitting or remove any inadvertent dependencies if over budget
  - Validate rAF timer accuracy: run 10 seconds of `TICK` dispatches and confirm total accumulated `deltaTime` stays within ±16 ms per frame on average
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 15. Testing
- [x] 15.1 Write unit tests for all domain logic modules
  - `FrequencyCalculator`: verify frequency count equals `mineCount`, all values in [220, 1760], adjacent sorted frequencies differ by ≥ 5.9%
  - `AttenuationCalculator`: verify gain formula at `d=0`, `d=radius`, `d>radius`; empty result when no mines in range; all returned gains ≤ 0.3
  - `ScoreCalculator.computeWin()`: streak bonus formula, time bonus, correct deductions; `computeGameOver()`: 50% base only
  - `BoardGenerator.generate()`: exactly `mineCount` mines, no duplicate positions, all cells `hidden`, `cells[mine.row][mine.col].hasMine === true`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 15.2 Write integration tests for game state machine flows
  - Full win flow: `START_GAME` → correct `TAP_CELL` for all mines → `WIN` with correct `ScoreBreakdown` total
  - Game-over via time: `TICK` until `remainingTime ≤ 0` → `GAME_OVER` with `reason: 'time'`
  - Game-over via wrong count: three `TAP_CELL` on non-mine cells → `GAME_OVER` with `reason: 'wrong-count'`
  - `LONG_PRESS_COMPLETE` on mine cell: deducts `listenCost` AND flags the cell in a single action
  - `StorageService`: save + retrieve high scores; top-5 cap enforced; graceful no-op when localStorage unavailable
  - _Requirements: 5.7, 6.4, 7.6, 8.1, 9.1, 10.7_

- [x]* 15.3 Write E2E UI interaction tests
  - Difficulty selection → "Tap to Start" → board renders with correct grid dimensions
  - Long-press cell: progress ring visible; ripple animation shown after 500 ms; timer decrements after release
  - Tap mine: flagged state rendered, score increments, win triggered on last mine
  - Tap non-mine: wrong marker shown, heart decrements, game-over after third wrong tap
  - Result modal: correct score breakdown displayed; "Retry" re-initializes the board
  - _Requirements: 1.1, 1.3, 5.2, 6.1, 6.2, 6.3, 8.5, 9.4_

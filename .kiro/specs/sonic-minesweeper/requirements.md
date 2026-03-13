# Requirements Document

## Introduction

Sonic Minesweeper is a mobile-first web game where players locate hidden mines on a grid using only sound cues. Each mine emits a unique frequency; long-pressing a cell plays the superimposed sounds of nearby mines attenuated by distance. Players tap to identify (flag) a mine. Real-time countdown time is the sole resource — every exploration and every wrong guess costs time. The dual game-over conditions (time exhaustion or three wrong taps) and the score system reward precise, efficient play.

## Requirements

### Requirement 1: Game Initialization & Difficulty Selection

**Objective:** As a player, I want to choose a difficulty level and start a new game, so that I can adjust the challenge to my skill level and trigger the audio context with a deliberate interaction.

#### Acceptance Criteria

1. The Sonic Minesweeper shall display a start screen with the game title, a brief description, three difficulty selection cards (Beginner, Intermediate, Advanced), and a "Tap to Start" button.
2. When the player selects a difficulty card, the Sonic Minesweeper shall highlight the selected difficulty and show its board size, mine count, detection radius, time budget, listen cost, and wrong-tap cost.
3. When the player taps the "Tap to Start" button, the Sonic Minesweeper shall create and resume an AudioContext before transitioning to the gameplay screen.
4. When the game is started for the first time in a session, the Sonic Minesweeper shall display a one-time recommendation to use earphones.
5. The Sonic Minesweeper shall support three difficulty levels with the following parameters:
   - Beginner: 8×8 board, 6 mines, detection radius 6.0, 120s budget, listen cost −3s, wrong-tap cost −30s
   - Intermediate: 12×12 board, 20 mines, detection radius 5.0, 240s budget, listen cost −4s, wrong-tap cost −50s
   - Advanced: 16×16 board, 40 mines, detection radius 4.0, 420s budget, listen cost −5s, wrong-tap cost −70s

---

### Requirement 2: Board & Mine Generation

**Objective:** As a player, I want the mine layout to be randomly generated each game, so that every session presents a fresh challenge.

#### Acceptance Criteria

1. When a new game starts, the Sonic Minesweeper shall randomly place the configured number of mines on the board such that no two mines occupy the same cell.
2. The Sonic Minesweeper shall initialize all cells in the `hidden` state at game start.
3. The Sonic Minesweeper shall assign each mine a unique frequency drawn from the range 220 Hz – 1760 Hz (A3–A6) using the formula `frequency = 220 × 2^(i / mineCount × 3)` where i = 0 … mineCount − 1.
4. When frequencies are assigned, the Sonic Minesweeper shall shuffle the frequency array randomly before assigning to mines so that each game produces a different sound combination.
5. The Sonic Minesweeper shall guarantee a minimum semitone separation (≥ 5.9%) between any two adjacent frequencies in the assigned set.

---

### Requirement 3: Audio System — Distance Attenuation & Playback

**Objective:** As a player, I want to hear mine sounds that fade with distance from the cell I'm pressing, so that I can infer the relative position and proximity of nearby mines.

#### Acceptance Criteria

1. When calculating sound for a pressed cell, the Sonic Minesweeper shall compute the Euclidean distance `d = √((x1−x2)² + (y1−y2)²)` between the pressed cell and each mine.
2. The Sonic Minesweeper shall apply the attenuation formula `gain = 0.3 × (1 − d / maxRadius)²` for mines within the detection radius, and `gain = 0` for mines beyond the detection radius.
3. While a long-press is active, the Sonic Minesweeper shall simultaneously play one OscillatorNode per in-range mine, each routed through its individual GainNode, all merged into a single AudioContext destination.
4. When a long-press begins, the Sonic Minesweeper shall apply a 0.05s fade-in to the combined output.
5. When a long-press ends, the Sonic Minesweeper shall apply a 0.3s fade-out before stopping all oscillators for that press.
6. If no mines fall within the detection radius of the pressed cell, the Sonic Minesweeper shall play no sound and display a "No mines in range" visual indicator.
7. The Sonic Minesweeper shall limit maxGain to 0.3 per oscillator so that the combined gain of all superimposed sounds does not exceed 1.0.

---

### Requirement 4: Audio System — Event Sounds

**Objective:** As a player, I want distinct audio feedback for game events (correct guess, wrong guess, game over, victory), so that outcomes are immediately perceivable through sound.

#### Acceptance Criteria

1. When the player correctly identifies a mine (tap on a mine cell), the Sonic Minesweeper shall play a "ding-dong-dang" success sound.
2. When the player incorrectly taps a non-mine cell, the Sonic Minesweeper shall play a "buzz/wrong" sound.
3. When a game over condition is triggered, the Sonic Minesweeper shall play an explosion sound of approximately 2 seconds duration.
4. When the player wins, the Sonic Minesweeper shall play a victory fanfare using a chord of all mine frequencies lasting approximately 1 second.
5. When remaining time falls to 5 seconds or below, the Sonic Minesweeper shall blink the time progress bar.
6. The Sonic Minesweeper shall implement all sounds using Web Audio API (OscillatorNode, GainNode) without external audio libraries.

---

### Requirement 5: Core Interaction — Long Press (Exploration)

**Objective:** As a player, I want to long-press a cell to hear nearby mine sounds, so that I can gather information about mine positions at the cost of time.

#### Acceptance Criteria

1. When a touch or pointer event on a cell is held for ≥ 500ms, the Sonic Minesweeper shall begin audio playback for mines within the detection radius of that cell.
2. While a long-press is in progress, the Sonic Minesweeper shall display a circular progress ring around the cell that fills over 500ms to signal the activation threshold.
3. While audio is playing from a long-press, the Sonic Minesweeper shall display concentric ripple wave animations emanating outward to the detection radius.
4. When the long-press sound volume is non-zero, the Sonic Minesweeper shall represent the total volume level through the color saturation of the ripple waves (louder = more saturated).
5. When a long-press is completed (after ≥ 500ms hold), the Sonic Minesweeper shall deduct the difficulty-specific listen cost from the remaining time.
6. When a long-press ends (finger/pointer released), the Sonic Minesweeper shall stop the exploration sound with a 0.3s fade-out.
7. When long-press and release a `hidden` square containing a mine, Sonic Minesweeper will switch that square to a `flag` state, displaying a flag/mine icon with a green checkmark and a blinking animation.

---

### Requirement 6: Core Interaction — Tap (Mine Identification)

**Objective:** As a player, I want to tap a cell to identify it as a mine, so that I can mark correct guesses without time penalty and face meaningful consequences for wrong guesses.

#### Acceptance Criteria

1. When a tap event (pointer contact < 300ms) occurs on a `hidden` cell containing a mine, the Sonic Minesweeper shall transition that cell to the `flagged` state and display a flag/mine icon with a green checkmark and pulse animation.
2. When a tap event occurs on a `hidden` cell that does not contain a mine, the Sonic Minesweeper shall display a red × with a shake animation on that cell and deduct the difficulty-specific wrong-tap cost from the remaining time.
3. When a wrong tap occurs, the Sonic Minesweeper shall increment the wrong-tap counter by 1 and visually flash the corresponding life heart indicator.
4. When a wrong tap results in the wrong-tap counter reaching 3, the Sonic Minesweeper shall immediately trigger game over.
5. A correct tap shall not deduct any time from the remaining time.
6. If a cell is in the `flagged` state, the Sonic Minesweeper shall not respond to tap interactions on that cell.

---

### Requirement 7: Time System

**Objective:** As a player, I want a real-time countdown timer that decrements continuously and on specific actions, so that time pressure creates a strategic resource management challenge.

#### Acceptance Criteria

1. When a new game starts, the Sonic Minesweeper shall initialize the timer to the difficulty-specific time budget and begin decrementing in real-time using `requestAnimationFrame`.
2. While the game is active, the Sonic Minesweeper shall decrement the timer by `deltaTime` each frame, with an accuracy of ±16ms.
3. The Sonic Minesweeper shall display the remaining time to one decimal place (e.g., "87.3s") in the fixed header bar.
4. When remaining time drops to 10 seconds or below, the Sonic Minesweeper shall render the timer in red with a blinking animation.
5. When a time-cost action occurs (listen or wrong tap), the Sonic Minesweeper shall display a floating text indicator (e.g., "−3s") in red that animates upward and fades out next to the timer.
6. When remaining time reaches 0, the Sonic Minesweeper shall immediately trigger game over.

---

### Requirement 8: Game Over

**Objective:** As a player, I want clear game-over feedback when I run out of time or make too many wrong guesses, so that I understand why the game ended and can see all mine locations.

#### Acceptance Criteria

1. When a game-over condition is met (time ≤ 0 or wrong count ≥ 3), the Sonic Minesweeper shall immediately halt all gameplay input and begin the game-over sequence.
2. When game over is triggered, the Sonic Minesweeper shall reveal all mine positions sequentially at 0.1-second intervals with a visual highlight.
3. When game over is triggered, the Sonic Minesweeper shall play the mines' frequencies as a sequential arpeggio during the reveal sequence.
4. When game over is triggered, the Sonic Minesweeper shall darken the game board with a dimming overlay effect.
5. When game over is triggered, the Sonic Minesweeper shall display a result modal showing the cause (time exhausted or three wrong guesses), the final score at 50% of earned base points (no bonuses applied), and options to retry, change difficulty, or return to the main menu.
6. While displaying game-over state, the Sonic Minesweeper shall highlight all wrong-tap cells with a red × marker.

---

### Requirement 9: Win Condition

**Objective:** As a player, I want the game to immediately recognize and celebrate when I've correctly identified all mines, so that I get rewarding feedback for completing the challenge.

#### Acceptance Criteria

1. When the player correctly taps the last remaining unflagged mine and no wrong-tap count has reached 3 and remaining time is > 0, the Sonic Minesweeper shall immediately trigger the win sequence.
2. When the win sequence is triggered, the Sonic Minesweeper shall play the victory fanfare (all-frequency chord, ~1 second).
3. When the win sequence is triggered, the Sonic Minesweeper shall display a CSS-based confetti animation without external libraries.
4. When the win sequence is triggered, the Sonic Minesweeper shall display a result modal showing the final score breakdown (base score, time bonus, streak bonus, wrong-tap deductions) and the total score.
5. If the final score exceeds a stored high score for the current difficulty, the Sonic Minesweeper shall highlight the new high score achievement in the result modal.

---

### Requirement 10: Scoring System

**Objective:** As a player, I want a score that rewards speed, accuracy, and consistency, so that I have a meaningful progression metric and reason to replay.

#### Acceptance Criteria

1. The Sonic Minesweeper shall award +200 base points for each correctly identified mine.
2. The Sonic Minesweeper shall deduct −100 points for each wrong tap.
3. The Sonic Minesweeper shall award a time bonus equal to `remainingTime (seconds) × 10` points upon victory.
4. The Sonic Minesweeper shall award a streak bonus of `N × (N+1) / 2 × 50` points for N consecutive correct taps without any wrong tap in between.
5. When a wrong tap occurs, the Sonic Minesweeper shall reset the consecutive correct-tap streak counter to 0.
6. If the game ends in game over, the Sonic Minesweeper shall calculate the final score as 50% of the accumulated base points with no time bonus and no streak bonus.
7. The Sonic Minesweeper shall persist the top 5 high scores per difficulty level in localStorage.
8. The Sonic Minesweeper shall display the current score in the fixed header bar updated in real-time during gameplay.

---

### Requirement 11: Visual Feedback & UI

**Objective:** As a player, I want clear visual indicators for all game events and states, so that game information is immediately perceivable without relying solely on audio.

#### Acceptance Criteria

1. The Sonic Minesweeper shall display a fixed header bar containing: remaining time, life hearts (3 max), current score, and mine progress counter (e.g., "🎯 2/6").
2. When audio playback is active, the Sonic Minesweeper shall animate a speaker icon with a vibration effect in the header.
3. When a cell transitions to `flagged`, the Sonic Minesweeper shall display a flag/mine icon and a green checkmark with a pulse animation on that cell.
4. When a cell is incorrectly tapped (wrong guess), the Sonic Minesweeper shall display a red × icon and play a shake animation on that cell.
5. When a long-press produces no nearby mines, the Sonic Minesweeper shall display a semi-transparent circle overlay on the board representing the detection radius and show a "No mines in range" tooltip.
6. The Sonic Minesweeper shall display a bottom bar with "New Game" and "Change Difficulty" buttons at all times during gameplay.

---

### Requirement 12: Mobile UX & Responsive Layout

**Objective:** As a mobile player, I want the game to be fully playable on a touchscreen with no accidental interactions, so that the touch-based gesture system works reliably across device sizes.

#### Acceptance Criteria

1. The Sonic Minesweeper shall render all cells at a minimum touch target size of 44×44px (Apple HIG standard).
2. When the difficulty is Beginner (8×8), the Sonic Minesweeper shall scale the board to fill the screen width without requiring scroll.
3. When the difficulty is Intermediate (12×12), the Sonic Minesweeper shall fit the board horizontally with minimal vertical scroll.
4. When the difficulty is Advanced (16×16), the Sonic Minesweeper shall support pinch-to-zoom and panning via CSS transform.
5. The Sonic Minesweeper shall prevent default browser touch behaviors (scroll, zoom) during long-press and tap interactions on the game board.
6. The Sonic Minesweeper shall distinguish between a tap (< 300ms contact) and a long-press (≥ 500ms contact) and route each to the correct action without triggering both.

---

### Requirement 13: Accessibility

**Objective:** As a player with visual or motor limitations, I want alternative input and display modes, so that the game is playable beyond purely audio-visual defaults.

#### Acceptance Criteria

1. Where the visual-assist mode is enabled, the Sonic Minesweeper shall display the count of adjacent mines numerically on each revealed/open cell in large text.
2. Where the visual-assist mode is enabled, the Sonic Minesweeper shall represent sound intensity as a color gradient on cells during long-press exploration.
3. The Sonic Minesweeper shall support keyboard navigation: arrow keys to move focus between cells, Enter to tap (identify), and Space to initiate/hold long-press (explore).
4. The Sonic Minesweeper shall respect the system `prefers-color-scheme` media query and render in dark mode when the system preference is dark.

---

### Requirement 14: Performance & Technical Constraints

**Objective:** As a player, I want a fast-loading, smooth-running game, so that the experience is not degraded by latency or frame rate issues.

#### Acceptance Criteria

1. The Sonic Minesweeper shall have an initial bundle size of less than 200KB (gzip compressed).
2. When a cell interaction triggers audio playback, the Sonic Minesweeper shall begin sound output within 50ms of the interaction event.
3. The Sonic Minesweeper shall maintain a rendering frame rate of 60fps for the 16×16 board on supported devices.
4. The Sonic Minesweeper shall implement the real-time timer using `requestAnimationFrame` with an accuracy of ±16ms per frame.
5. The Sonic Minesweeper shall be compatible with Chrome 90+, Safari 15+, Firefox 90+, and Samsung Internet 15+.
6. The Sonic Minesweeper shall manage the AudioContext as a single application-wide instance, transitioning it from Suspended to Running state on first user interaction.

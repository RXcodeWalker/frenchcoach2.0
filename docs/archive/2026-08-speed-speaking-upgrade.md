> **ARCHIVED — NOT AUTHORITATIVE.** A checkbox plan for a `coming-soon` feature, with no
> inbound references from source. See `docs/archive/README.md`.

# Speed Speaking 2.0 Upgrade Plan

Improve the "Speed Speaking" minigame to be more engaging, educational, and polished.

## 1. Content & Difficulty
- [x] **Expand Question Pool**: Pull questions from `scenarios/*.json` and `raw/questions.json`. (Integrated Emoji Questions and Minigame pool).
- [ ] **Category Selection**: Allow users to pick topics (e.g., "Food", "Travel", "Random").
- [x] **Adaptive Difficulty**: If a user is too fast, jump to "Hard" earlier; if they struggle, stay in "Easy".

## 2. Visual Experience
- [x] **Intense Speed FX**: 
  - [x] Motion blur on text transitions.
  - [x] Screen shake on mistakes (enhanced).
  - [x] Background glow changes color based on streak (0-4: Blue, 5-9: Purple, 10+: Gold/Fire).
- [x] **Combo Popups**: "Great!", "Amazing!", "Unstoppable!" text animations on milestones.
- [ ] **Progress Bar**: A more "racing" style progress bar or a lap counter.

## 3. Gameplay Mechanics (Power-ups)
- [x] **Streak Milestones**:
  - [x] **Streak 5**: +5 seconds.
  - [x] **Streak 10**: "Overdrive" - Double XP active (Actually 3x XP).
  - [x] **Streak 15**: "Time Freeze" - Timer pauses for 5 seconds.
  - [x] **Streak 20**: "Shield" - Next mistake doesn't break the streak.

## 4. Audio & Voice
- [ ] **Sound Effects**: Add pings for success and buzzes for failures.
- [x] **TTS Support**: When skipping or failing, the app speaks the correct French phrase.
- [ ] **Better Recognition**: Show words in the target phrase turning green as they are recognized in the transcript.

## 5. Post-Game Analysis
- [ ] **Detailed Stats**: Words per minute (WPM), most difficult phrase, streak history.
- [ ] **Review Mode**: List all phrases from the session; tap to hear TTS and practice again.

## Implementation Steps

### Phase 1: Logic & Content (Quick Wins)
1. Refactor `SpeedSpeaking.tsx` to use a wider question pool.
2. Implement TTS on Skip.
3. Add "Time Added" visual feedback.

### Phase 2: Visual Polish
1. Add "Overdrive" background effects.
2. Implement Word Highlighting (Real-time).
3. Add Combo Popups.

### Phase 3: Advanced Mechanics
1. Implement Power-ups (Shield, Time Freeze).
2. Add sound effects (Web Audio API).
3. Build the Post-Game Review screen.

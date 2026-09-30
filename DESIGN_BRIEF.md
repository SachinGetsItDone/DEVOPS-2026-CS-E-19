# Design Brief — Prepline

**Status:** Phase 1 complete (understanding). Phases 2–3 in progress.
**Author note:** Written while the write-tooling gate was intermittently unavailable; kept as the single source of truth for the front-end direction.

---

## 1. What this project is

**Prepline** is an AI mock-interview and group-discussion (GD) practice engine. A candidate supplies a résumé and a target job description, then sits a live voice interview: the app captures their microphone, transcribes their answers, generates the next question adaptively, scores every turn, and produces a detailed report on both *what* they said and *how* they said it.

The name appears in `server/package.json` (`"name": "prepline-server"`, `"description": "Prepline interview engine - Express API + WebSocket"`) and throughout `ANTIGRAVITY_SITE_ANALYSIS.md`.

Two halves that must feel like one product:

- **The instrument** — interview room, scoring, behavioral diagnostics, ATS scoring. Serious, precise, high-stakes.
- **The game layer** — XP, leagues, streaks, gems, hearts, achievements, leaderboard. Motivating, social, light.

The tension between those two is the central design problem. A candidate is *nervous* while using the instrument and *competitive* while using the game layer. The design must not be flip about the first or solemn about the second.

## 2. Who it is for

- **Primary:** engineering students and early-career job-seekers in India preparing for placement interviews and campus group discussions. Likely on a mid-range Android phone or a shared laptop, often at night, often with limited time.
- **Secondary:** career-switchers and anyone doing repeated interview reps.
- **Tertiary:** the evaluating team itself — this is a college project with a weekly progress report and a CI pipeline, so the UI is also evidence of engineering quality.

Assumption: the primary user is *time-poor and anxious*. That argues for fast first paint, no dead ends, no blank screens, and copy that never blames them.

## 3. Core features (shipped, verified in code)

| Feature | What it does | Where |
|---|---|---|
| Résumé ingest | Upload PDF/DOCX or paste text; parsed to plain text | `POST /api/resume/parse` |
| JD analysis | Extracts role requirements from a job description | `POST /api/jd/analyze` |
| ATS scorer | Scores a résumé against a JD across five components, with matched/missing keywords and language analysis | `POST /api/ats/calculate`, `AtsCalculator.jsx` |
| Interview session | Creates a session: role, résumé, JD, difficulty → first question | `POST /api/interviews` |
| Live turn loop | Audio or text turn → transcript, evaluation, next question, XP | `POST /api/interview/turn`, `WS /ws/interview` |
| Behavioral diagnostics | Filler-word frequency, repeated words, pacing, grammar issues, delivery notes | report payload from `server/src/services/behavioral.js` |
| Report | Overall score, summary, strengths, weaknesses, roadmap, comparison vs the previous attempt | `POST`/`GET /api/interviews/:id/report` |
| Progression | XP, weekly XP, streak, gems, hearts, league, achievements | `GET /api/user/progress` |
| Leaderboard | Ranked users by XP with league tiers | `GET /api/leaderboard?limit=` |
| Auth | Email/password with JWT | `POST /api/auth/{register,login}`, `GET /api/auth/me` |

**Aspirational, not shipped:** the GD (group discussion) feature is designed in `System_design/gd-feature-system-design.md` but has no route or page. The README describes a FastAPI backend that no longer exists. Treat both as roadmap, not spec.

## 4. Data the UI actually has

Real response fields available to display (verified against the Express routes):

- **Interview create** → `interview_id, role, first_question, engine, sts_model, sts_latency_ms, sts_audio_base64`
- **Turn** → `user_transcript, evaluation, response_text, turn_number, xp_earned, sts_*`
- **Report** → `overall_score, summary, strengths[], weaknesses[], roadmap, behavioral_metrics{filler_words{total_count, frequency_per_100_words, breakdown}, repeated_words, delivery_and_pacing{pace_assessment, avg_words_per_turn, notes}, grammar_issues, real_interview_tips}, comparison{has_previous, score_delta, filler_delta, improvements, persistent_issues, message}, xp_earned`
- **Progress** → `xp, weekly_xp, streak, gems, hearts, league, achievements, interviews_completed, avatar, theme`
- **Leaderboard** → `user_id, name, xp, weekly_xp, streak, league`
- **ATS** → `ATS_score, component_scores{formatting, keywords, content, skill_validation, ats_compatibility}, matched_keywords[], missing_keywords[], language_analysis{weak_verbs, buzzwords, grammar_improvements}, strengths, critical_issues, suggestions, score_delta`

Assumption: `sts_*` fields are NVIDIA speech-to-speech artifacts. The opening question's synthesized audio (`sts_audio_base64`) is currently fetched and discarded by the client.

## 5. Tone

**Serious instrument, confident coach.** Technical and precise about the candidate's performance — real numbers with units, no euphemism — but never cold and never scolding. The voice of a good interviewer who wants you to pass.

Not: playful-startup, luxury, corporate-neutral, or gamified-casual. The XP layer is allowed to be warm; the scoring layer must be exact.

**Design metaphor already present in the codebase:** `--amber: #e8a33d; /* spotlight amber — the interviewer's light */` (`client/src/index.css:9`). This is the strongest existing idea in the project and the direction to build on.

## 6. Existing visual system (evidence, not intention)

From `client/src/index.css`:

- **Ground:** `--bg #0f1014`, `--surface #171922`, `--surface-high #1e2130`, `--border #2a2e3a`
- **Ink:** `--text #ece9e2`, `--text-muted #8b8fa8`
- **Accent:** amber `#e8a33d` (hover `#c4892a`, ghost `rgba(232,163,61,.08)`)
- **Reserved semantic:** `--live #4fd1c5` teal, *for recording/live states only*
- **Danger:** `#e0665a`
- **Easing:** `--ease-spring cubic-bezier(0.16,1,0.3,1)`, `--ease-bounce (0.34,1.56,0.64,1)`, `--ease-out-expo (0.19,1,0.22,1)`
- **Type:** `--font-display 'Fraunces', serif` · `--font-body 'Inter'` · `--font-mono 'JetBrains Mono'`
- **Radius:** `14px` / `8px`
- Global `:focus-visible` ring at `outline: 2px solid var(--accent)`, offset 2px
## 8. Phase 2: Design Skills Loaded & Rule Synthesis

Every design and UI skill present in the workspace (`.agents/skills/` and `.claude/skills/`) was reviewed:
- `taste-skill` / `design-taste-frontend`: Anti-slop frontend principles; design read inference; strict prohibition against generic AI defaults (no Inter + purple mesh, no symmetrical 3-card monotony). Dials set: `DESIGN_VARIANCE: 8`, `MOTION_INTENSITY: 7`, `VISUAL_DENSITY: 5`.
- `frontend-design`: Subject-grounded design. Personality through typography. The hero must open with the subject's authentic vernacular (acoustic telemetry + live interview booth). Line lengths under 80 characters.
- `motion-theory` (Jakub Krehel + Emil Kowalski + Jhey Tompkins): Restraint and purpose. High-frequency elements (inputs, keyboard actions) animate instantly or under 150ms; modal transitions and card spotlights use spring dynamics (`cubic-bezier(0.16, 1, 0.3, 1)`). Absolute respect for `prefers-reduced-motion`.
- `bento-layout-skill`: Asymmetrical 12-column grid layout with varied column spans (8+4, 4+4+4, 6+6), micro-telemetry widgets, and graceful 1-column mobile collapse.
- `soft-skill` (high-end-visual-design): Double-bezel "doppelrand" containment (outer hairline shell + inner core highlight `inset 0 1px 1px rgba(255,255,255,0.12)`), nested circular icon wrappers, macro-whitespace (`py-20` to `py-32`).
- `shadcn` / accessible primitives: Strict keyboard navigation, aria live regions for speech transcripts, custom-themed dialog modals with backdrop blur.
- `playwright-cli`: Autonomous verification loop with multi-viewport screenshots (Desktop 1440x900, Mobile 375x667).

### Conflict Resolution Matrix
1. **Minimalist Monochrome vs. Spotlight Amber**: Minimalist-ui suggests pure black/white editorial. Resolved in favor of **Spotlight Amber** (`#f59e0b`) + **Acoustic Vox Teal** (`#10b981`), because Prepline's brand metaphor is the interviewer's focused spotlight and live audio capture.
2. **Heavy 3D WebGL vs. Ultra-Fast Placement Candidate Access**: Heavy multi-megabyte 3D models can slow down candidates on modest devices. Resolved by crafting a high-performance procedural WebGL/Canvas audio wavefield and reactive particle system with instant fallback, maintaining 60 FPS without multi-megabyte GLTF assets.

---

## 9. Phase 3: Research & Selected Design Direction

### 9.1 Reference Sites & Analysis
1. **Hume AI (Empathic Voice Interface)**:
   - *Key Takeaway*: Fluid audio wavefield responding to vocal inflection. OLED black base with luminous cyan and amber waveforms. Clean cockpit status counters.
2. **Linear.app**:
   - *Key Takeaway*: Surgical craft, micro-borders (`rgba(255,255,255,0.08)`), keyboard-first speed, subtle radial spotlights tracking pointer coordinates.
3. **ElevenLabs**:
   - *Key Takeaway*: Waveform audio players, model latency gauges, clean segmented tabs, instant tactile feedback.
4. **Vercel / Next.js**:
   - *Key Takeaway*: High typographic hierarchy, dark-mode contrast, sharp Bento grids with nested technical widgets.
5. **Awwwards SOTD (Sonoric / Audio Visualizer showcases)**:
   - *Key Takeaway*: Sound-wave geometry, coordinate crosshairs, interactive physics ripples, double-bezel framed telemetry.

### 9.2 Design System Specification
- **Color Tokens**:
  - Background (OLED Abyss): `--bg: #090a0f`
  - Elevation 1 (Card Shell): `--surface: #11131b`
  - Elevation 2 (Raised Widget): `--surface-high: #171b26`
  - Subtle Hairline: `--border: rgba(255, 255, 255, 0.08)`
  - Elevated Border: `--border-high: rgba(255, 255, 255, 0.16)`
  - Primary Spotlight: `--amber: #f59e0b` (glow `rgba(245, 158, 11, 0.22)`)
  - Live Audio / Vox Cadence: `--live: #10b981` (glow `rgba(16, 185, 129, 0.25)`)
  - Diagnostic Alert: `--danger: #f43f5e`
  - Primary Text: `--text: #f8fafc`
  - Muted Text: `--text-muted: #94a3b8`
- **Typography Pair**:
  - Headline & Display: **Fraunces** (700 / 600, serif, distinctive editorial authority)
  - Interface & Body: **Plus Jakarta Sans** (400 / 500 / 600, modern geometric grotesk, replacing Inter)
  - Telemetry & Numbers: **JetBrains Mono** (tabular numerals, precision telemetry)
- **Grid & Layout**:
  - Asymmetric 12-column Bento Grid on Desktop (`max-w-7xl`, `gap-6`)
  - Responsive collapse: 1-column stack below `768px` with touch-friendly 44px tap targets
  - Double-bezel card structure on all interactive modules
- **Motion**:
  - Custom spring easing: `cubic-bezier(0.16, 1, 0.3, 1)`
  - Pointer-following spotlight glow
  - Audio-reactive frequency visualizer
  - Zero motion when `prefers-reduced-motion: reduce`

### 9.3 Complete Page & Route Map
1. **Home (`/`)**: Hero with interactive acoustic wavefield canvas, real-time waveform preview, Bento feature matrix, Candidate vs. Cohort practice tracks, post-interview analytics teaser, and polished footer.
2. **Pre-Interview Modal / Drawer**: Role selector, resume parser trigger, JD input, difficulty slider, and audio mic permission test.
3. **Live Interview Room (`/interview`)**: Active interviewer HUD, question prompt with voice synthesis badge, live microphone audio stream with real-time frequency visualizer, real-time transcript log, turn counter, and instant finish evaluation.
4. **Diagnostic Dossier / Report (`/report/:interviewId`)**: Overall score gauge, competency breakdown bars, speech cadence & filler word behavioral diagnostics, actionable improvement roadmap, and comparison vs. prior attempts.
5. **ATS Keyword Calculator (`/ats`)**: Resume upload, JD match score, matched and missing skills pill matrix, action verb analysis, and critical formatting warnings.
6. **Cohort Leaderboard (`/leaderboard`)**: Tiered league rankings (Bronze to Diamond), XP progression, streak tracking, and user profile card.
7. **Authentication (`/login`, `/register`)**: High-craft login & register forms with seamless offline demo fallbacks.
8. **Navigation & Global Frame**: Floating glass navbar with live session indicator, auth user pill, and responsive navigation drawer.
9. **Error & 404 States**: High-aesthetic 404 page and React Error Boundary preventing any white-screen crash.


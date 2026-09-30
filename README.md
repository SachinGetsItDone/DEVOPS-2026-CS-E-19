# AI Mock-Interview & GD Practice Engine

This repository combines a front-end interview experience with a backend-ready AI interview workflow. The app includes a React + Vite home screen and interview room from the `riya` branch, while also preserving the expanded FastAPI + AI architecture from `main`.

## Overview

- Frontend: React + Vite with a Home page and Interview Room experience
- Backend: Python / FastAPI for interview orchestration and report generation
- Data: MongoDB for interview state and Postgres + pgvector for RAG knowledge
- AI: DeepSeek-based scoring, question generation, JD analysis, and report synthesis
- Speech: optional NVIDIA speech-to-speech layer with honest fallback behavior

## Quick start

### Frontend (`client/`)

```bash
cd client
npm install
npm run dev    # Local development server at http://localhost:5173
npm run build  # Production build with chunk splitting
```

The frontend features:
- **Interactive Three.js 3D Acoustic Waveform & Resonance Field**: Spatial acoustic diaphragm particle physics with hardware throttling and `prefers-reduced-motion` fallback.
- **Antigravity Dual-Track Morphing Showcase**: Exact Google Antigravity aesthetic with clean canvas micro-dots, dynamic code bracket `{ }` morphing on Developer hover, and 6-ring flower constellation morphing on Organization hover.
- **Asymmetric 12-Column Bento Grid**: Live acoustic cadence telemetry, VU meter, semantic resume × JD matching, and placement league HUD.
- **ATS Keyword & Format Scorer**: Five-component breakdown (formatting, keywords, content, skill validation, ATS compatibility), keyword matrix, and bullet-point optimizer.
- **Speech-Ready Interview Room & Evaluated Dossier**: Real-time microphone audio capture, dynamic turn exchange, behavioral speech pacing analysis, and pentagonal competency radar.

### Backend

```bash
cd server
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m uvicorn main:app --reload --port 8000
```

### Full stack workflow

```bash
# Databases
# Postgres + pgvector / MongoDB
# Use docker compose up -d, or configure .env values in server/

# Seed vector knowledge
cd server
.venv/Scripts/python -m db.seed_domain_knowledge
```

## Where the UI and ML pieces connect

The UI is designed to be wired to backend APIs later, while still working standalone in the browser:

- `src/context/InterviewSessionContext.jsx` is the place where resume + JD data should be posted to the backend instead of only being stored in `sessionStorage`.
- `src/pages/InterviewRoom.jsx` contains the transcript and recording flow where the live speech-to-text and AI question-generation calls would be plugged in.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + react-router |
| Backend | Node |
| App data | MongoDB (Motor) |
| RAG | Postgres + pgvector |
| Reasoning | DeepSeek (`openai` SDK, JSON mode) |
| Speech | NVIDIA STS abstraction with offline fallback |

## End-to-end flow

1. Open the app and provide a resume + job description.
2. Start an interview session from the Home page.
3. The interview room captures the transcript and question flow.
4. The backend can later analyze the interview, score answers, and generate a final report.

## Configuration

Copy the environment templates before running backend services:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Key variables include:

- `DEEPSEEK_API_KEY`
- `NVIDIA_API_KEY`
- `DATABASE_URL`
- `MONGO_URI` / `MONGO_DB`
- `VITE_GOOGLE_CLIENT_ID`

## Project layout

```text
project-/
├── client/            React + Vite frontend
├── server/            FastAPI backend
├── src/               Root-level React app used by this branch
├── docker-compose.yml postgres + mongo configuration
├── package.json       frontend dependencies and scripts
├── vite.config.js    Vite config
├── index.html         app entry html
├── README.md          project overview
└── .gitignore         repo ignore rules
```

## Notes

- This merge keeps both the frontend workflow from the `riya` branch and the more complete backend architecture from `main`.
- The full AI pipeline should be treated as a later integration step, while the current UI remains usable as a front-end prototype.
- MongoDB and Postgres must be configured for the backend features to run end-to-end.


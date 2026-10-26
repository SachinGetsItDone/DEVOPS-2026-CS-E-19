# Prepline — AI-Powered Mock Interview Platform

An end-to-end full-stack MERN application that helps engineering students prepare for technical and behavioral interviews with real-time feedback, ATS resume analysis, and performance tracking.

---

## Live Deployment

- **Backend API:** [https://devops-2026-cs-e-19.onrender.com](https://devops-2026-cs-e-19.onrender.com/)
  - **API Root (`/`):** Accessing the root URL returns a JSON health confirmation confirming the Mock Interview Engine API is active:
    ```json
    {"message":"Mock Interview Engine API is running","engine":"DeepSeek LLM + NVIDIA STS with offline fallbacks","version":"3.0.0-mern"}
    ```
  - **Prometheus Metrics Endpoint (`/metrics`):** Accessing `https://devops-2026-cs-e-19.onrender.com/metrics` returns standard Prometheus-compatible plain-text metrics (`mock_interview_api_up 1`) used by Prometheus and Grafana for uptime monitoring.
  - *Note on Render Free Tier:* Services spin down after 15 minutes of inactivity; the initial request may take 30–50 seconds while the instance wakes up.

---

## Tech Stack (MERN)

- **Frontend:** React 18, Vite, React Router 6, Canvas audio visualizers, CSS Design System
- **Backend:** Node.js, Express, WebSockets (`ws`)
- **Database:** MongoDB 7 with Mongoose ORM
- **Speech & Audio:** Web Speech API (browser-native speech synthesis & speech recognition)
- **AI & Evaluation:** OpenAI / DeepSeek API (JSON structured output mode)

---

## Key Features

1. **AI Voice Mock Interview Room:**
   - Microphone input with real-time cadence and waveform visualization.
   - Browser-native speech synthesis that reads questions aloud.
   - Dynamic, context-aware follow-up questions tailored to your resume and the target job description.

2. **ATS Resume & JD Analyzer:**
   - Evaluates resume formatting, keyword density, passive voice, and STAR-method alignment.
   - Surfaces missing skills against specific job requirements.

3. **Performance Report & Dossier:**
   - Generates a scorecard with technical accuracy, clarity, and pacing metrics.
   - Provides improvement roadmaps and actionable feedback.

4. **User Progress & Leaderboard:**
   - Tracks completed interview sessions, XP points, and ranking leagues.

---

## Quick Start

### 1. Ensure MongoDB is Running
Ensure MongoDB is running locally (e.g., via MongoDB Community Server on port `27017`) or point `MONGO_URI` in `server/.env` to your MongoDB instance.

### 2. Start the Express Backend
```bash
cd server
npm install
cp .env.example .env
npm run dev
```
The backend starts on `http://localhost:8000`.

### 3. Start the React Frontend
```bash
cd client
npm install
npm run dev
```
The frontend starts on `http://localhost:5173`.

---

## Running Tests

```bash
cd server
npm test
```

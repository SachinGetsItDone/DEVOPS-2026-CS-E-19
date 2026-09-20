import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { InterviewSessionProvider } from './context/InterviewSessionContext.jsx'
import { GameProvider } from './context/GameContext.jsx'
import Home from './pages/Home.jsx'
import InterviewRoom from './pages/InterviewRoom.jsx'
import Report from './pages/Report.jsx'
import Leaderboard from './pages/Leaderboard.jsx'

export default function App() {
  return (
    <GameProvider>
      <InterviewSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/interview" element={<InterviewRoom />} />
            <Route path="/report/:interviewId" element={<Report />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
        </BrowserRouter>
      </InterviewSessionProvider>
    </GameProvider>
  )
}

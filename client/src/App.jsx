import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { InterviewSessionProvider } from './context/InterviewSessionContext.jsx'
import { GameProvider } from './context/GameContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import RouteChange from './components/RouteChange.jsx'
import Home from './pages/Home.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import InterviewRoom from './pages/InterviewRoom.jsx'
import Report from './pages/Report.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import History from './pages/History.jsx'
import AtsCalculator from './pages/AtsCalculator.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <InterviewSessionProvider>
          <BrowserRouter>
            <RouteChange />
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <OfflineBanner />
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/ats" element={<AtsCalculator />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/interview" element={<InterviewRoom />} />
                <Route path="/report/:interviewId" element={<Report />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/history" element={<History />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </InterviewSessionProvider>
      </GameProvider>
    </AuthProvider>
  )
}

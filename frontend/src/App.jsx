import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import CopingPage from './pages/CopingPage'
import Dashboard from './pages/Dashboard'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import InputPage from './pages/InputPage'
import Navbar from './components/Navbar'

function App() {
  const location = useLocation()

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            border: '1px solid rgba(13, 138, 131, 0.28)',
            borderRadius: '12px',
            color: '#1B2E36',
          },
        }}
      />
      <div className="equilibrium-theme pb-6">
        <Navbar />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/input" element={<InputPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/coping" element={<CopingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    </>
  )
}

export default App

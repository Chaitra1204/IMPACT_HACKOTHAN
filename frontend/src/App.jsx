import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import CopingPage from './pages/CopingPage'
import Dashboard from './pages/Dashboard'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import InputPage from './pages/InputPage'

function App() {
  const location = useLocation()

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            border: '1px solid rgba(3, 105, 161, 0.2)',
            borderRadius: '12px',
            color: '#1E293B',
          },
        }}
      />
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
    </>
  )
}

export default App

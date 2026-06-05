import { useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import '../styles/fab.css'

const MemberLayout = () => {
  const [showFAB, setShowFAB] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="member-layout">
      <Outlet />
      <BottomNav />

      {showFAB && (
        <div className="fab-overlay" onClick={() => setShowFAB(false)} />
      )}

      <div className="fab-container">
        {showFAB && (
          <div className="fab-menu">
            <button className="fab-menu-item" onClick={() => { setShowFAB(false); navigate('/ai-coach') }}>
              <span className="fab-menu-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="7" cy="4" r="2"/>
                  <path d="M3 12c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
                  <path d="M10 6l1.5-1.5M11.5 6L10 4.5"/>
                </svg>
              </span>
              Coach IA
            </button>
            <button className="fab-menu-item" onClick={() => { setShowFAB(false); navigate('/messages') }}>
              <span className="fab-menu-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2h10a1 1 0 011 1v6a1 1 0 01-1 1H5l-3 2.5V3a1 1 0 011-1z"/>
                </svg>
              </span>
              Mon Coach
            </button>
          </div>
        )}
        <button
          className={`fab-btn${showFAB ? ' open' : ''}`}
          onClick={() => setShowFAB(prev => !prev)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 3V5a1 1 0 011-1z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default MemberLayout

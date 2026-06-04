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
              <span className="fab-menu-icon">✦</span>
              Coach IA
            </button>
            <button className="fab-menu-item" onClick={() => { setShowFAB(false); navigate('/messages') }}>
              <span className="fab-menu-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M12 7c0 3-2.5 5.5-5.5 5.5H2l1.5-1.5A5.5 5.5 0 117 1.5"/>
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
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M16 9c0 4-3.1 7-7 7H2l1.8-1.8A7 7 0 119 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default MemberLayout

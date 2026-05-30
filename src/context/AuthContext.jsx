import { createContext, useContext, useState } from 'react'

const MOCK_USERS = [
  { id: 1, email: 'coach@onair.fr', password: 'coach123', role: 'coach', name: 'Thomas' },
  { id: 2, email: 'membre@onair.fr', password: 'membre123', role: 'member', name: 'Léo' },
  { id: 3, email: 'sarah@onair.fr', password: 'sarah123', role: 'member', name: 'Sarah' },
  { id: 4, email: 'marcus@onair.fr', password: 'marcus123', role: 'member', name: 'Marcus' },
]

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('onair_user')
    return stored ? JSON.parse(stored) : null
  })

  function login(email, password) {
    const found = MOCK_USERS.find(u => u.email === email && u.password === password)
    if (found) {
      const { password: _, ...safeUser } = found
      setUser(safeUser)
      localStorage.setItem('onair_user', JSON.stringify(safeUser))
      return { success: true, user: safeUser }
    }
    return { success: false }
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('onair_user')
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

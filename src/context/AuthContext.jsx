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
    try {
      const saved = localStorage.getItem('onair_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
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

  function register(firstName, email, password) {
    const newUser = { id: Date.now(), email, name: firstName, role: 'member' }
    setUser(newUser)
    localStorage.setItem('onair_user', JSON.stringify(newUser))
    return { success: true, user: newUser }
  }

  return <AuthContext.Provider value={{ user, login, logout, register }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const MOCK_USERS = [
  { id: 1, email: 'coach@onair.fr',  password: 'coach123',  role: 'coach',  name: 'Thomas' },
  { id: 2, email: 'membre@onair.fr', password: 'membre123', role: 'member', name: 'Léo'    },
  { id: 3, email: 'sarah@onair.fr',  password: 'sarah123',  role: 'member', name: 'Sarah'  },
  { id: 4, email: 'marcus@onair.fr', password: 'marcus123', role: 'member', name: 'Marcus' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('onair_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('onair_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('onair_user')
    }
  }, [user])

  function login(email, password) {
    const found = MOCK_USERS.find(u => u.email === email && u.password === password)
    if (found) {
      const userData = { id: found.id, email: found.email, role: found.role, name: found.name }
      setUser(userData)
      localStorage.setItem('onair_user', JSON.stringify(userData))
      return { success: true, role: found.role }
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

  function updateUserProfile(profile) {
    setUser(prev => {
      const updated = { ...prev, ...profile }
      localStorage.setItem('onair_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

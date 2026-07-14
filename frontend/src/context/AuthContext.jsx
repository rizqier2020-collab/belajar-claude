import { createContext, useContext, useEffect, useState } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('jfp_user')
    const token = localStorage.getItem('jfp_token')
    if (stored && token) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    // Backend memakai OAuth2PasswordRequestForm: field username=email.
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const { data } = await client.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    localStorage.setItem('jfp_token', data.access_token)
    localStorage.setItem('jfp_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('jfp_token')
    localStorage.removeItem('jfp_user')
    setUser(null)
  }

  const isApprover = user && ['manager', 'director', 'admin'].includes(user.role)
  const isAdmin = user && user.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isApprover, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

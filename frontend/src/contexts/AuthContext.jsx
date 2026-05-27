import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const login = useCallback(async (usuario, senha) => {
    const { data } = await api.post('/login', { usuario, senha })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify({ id: data.usuario_id, nome: data.nome }))
    setUser({ id: data.usuario_id, nome: data.nome })
    return data
  }, [])

  const cadastrar = useCallback(async (payload) => {
    const { data } = await api.post('/cadastrar', payload)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify({ id: data.usuario_id, nome: data.nome }))
    setUser({ id: data.usuario_id, nome: data.nome })
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, cadastrar, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

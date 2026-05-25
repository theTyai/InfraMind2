// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from '../utils/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [idToken, setIdToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true)
          setIdToken(token)
        } catch {
          setIdToken(null)
        }
      } else {
        setIdToken(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const signup = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(cred.user, { displayName })
    }
    return cred
  }

  const logout = () => signOut(auth)

  const getFreshToken = async () => {
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true)
        setIdToken(token)
        return token
      } catch {
        return null
      }
    }
    return null
  }

  const appUser = user
    ? { name: user.displayName || user.email?.split('@')[0], email: user.email, uid: user.uid }
    : null

  return (
    <AuthContext.Provider value={{ user, appUser, idToken, loading, login, signup, logout, getFreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}

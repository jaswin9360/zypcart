import { createContext, useState } from 'react'

export const AuthContext = createContext()



export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user')) || null
  )
  
  const [price_total, setPrice_total] = useState(JSON.parse(localStorage.getItem('price_total')) || 0);

  const updatePrice = (newPrice) => {
    localStorage.setItem('price_total', JSON.stringify(newPrice));
    setPrice_total(newPrice);
  };

  const logout = () => {
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, price_total , updatePrice}}>
      {children}
    </AuthContext.Provider>
  )
}

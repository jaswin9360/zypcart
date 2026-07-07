import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/context/AuthContext';
import Login from './components/pages/Login';
import Register from './components/pages/Register';
import Products from './components/pages/Products';
import Cart from './components/pages/Cart';
import Checkout from './components/pages/Checkout';
import Profile from './components/pages/Profile';
import Orders from "./components/pages/orders"
import Test from "./components/pages/test"
import ProtectedRoute from './components/Navbar/ProtectedRoute';
import Coupon from './components/pages/coupon';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Login />} />
          <Route path='/login' element={<Login />} />
          <Route path='/products' element={<Products />} />
          <Route path='/register' element={<Register />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/orders' element={<Orders />} />
          <Route path='/checkout' element={<Checkout />} />
          <Route path='/coupon' element={<Coupon/>} />
          <Route path='/test' element={<Test/>} />
          <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
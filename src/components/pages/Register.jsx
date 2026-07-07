import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import './register.css'
import API from '../api/axios'
import { AuthContext } from '../context/AuthContext'

function Register() {

  const navigate = useNavigate()

  const { setUser } = useContext(AuthContext)

  const [role, setRole] = useState('buyer')

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: role
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRole = (selectedRole) => {

    setRole(selectedRole)

    setFormData({
      ...formData,
      role: selectedRole
    })
  }

  const handleSubmit = async (e) => {

    e.preventDefault()

    try {

      const { data } = await API.post(
        '/auth/register',
        formData
      )

      localStorage.setItem(
        'user',
        JSON.stringify(data)
      )

      setUser(data)

      navigate('/profile')

    } catch (error) {

      alert(
        error.response?.data?.message ||
        'Registration Failed'
      )
    }
  }

  return (

    <div className='container'>

      <form onSubmit={handleSubmit}>

        {/* SELECTOR */}

        <div className='role-toggle'>

          <button
            type='button'
            className={
              role === 'buyer'
                ? 'active-role'
                : ''
            }
            onClick={() => handleRole('buyer')}
          >
            Buyer
          </button>

          <button
            type='button'
            className={
              role === 'seller'
                ? 'active-role'
                : ''
            }
            onClick={() => handleRole('seller')}
          >
            Seller
          </button>

        </div>

        <h2>Register</h2>

        <input
          type='text'
          name='username'
          placeholder='Username'
          onChange={handleChange}
        />

        <input
          type='text'
          name='name'
          placeholder='Full Name'
          onChange={handleChange}
        />

        <input
          type='email'
          name='email'
          placeholder='Email'
          onChange={handleChange}
        />

        <input
          type='password'
          name='password'
          placeholder='Password'
          onChange={handleChange}
        />

        <button className='register-btn'>
          Register
        </button>

      </form>

    </div>
  )
}

export default Register
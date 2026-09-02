import { useEffect, useState, useContext, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import API from '../api/axios'
import './login.css'
import { AuthContext } from '../context/AuthContext'

import {
  initializeAuth
} from "@uauth-jk/server";

const auth = initializeAuth({
  apiUrl:
    "https://tst-server-90.onrender.com/api",

  apiKey:
    "pk_live_4d70d6eef765c5645dfa79a276e883338dd39fdf9c42d0b4",

  authUrl:
    "https://user-auth.lovestoblog.com/"
});

import {
  FaGoogle,
  FaFacebookF,
  FaGithub,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaPhoneAlt,
  FaTimes,
  FaKey
} from 'react-icons/fa'

function Login() {
  const navigate = useNavigate()
  const { setUser } = useContext(AuthContext)

  const [role, setRole] = useState('buyer')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })

  // Forgot Password / OTP States
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sendMethod, setSendMethod] = useState('sms')
  const [loading, setLoading] = useState(false)
  const [retrievedPassword, setRetrievedPassword] = useState('')
  const [showPasswordSuccessModal, setShowPasswordSuccessModal] = useState(false)
  const hasProcessed = useRef(false)

  // Helper function to handle changing roles cleanly
  const handleRoleChange = (newRole) => {
    setRole(newRole)
    localStorage.setItem('role', newRole) // Immediately update localStorage
  }

  // GitHub Auth Loop Setup
  const sendGithubCodeToBackend = async (code) => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    try {
      // FIX 1: Always grab the absolute freshest role from localStorage right when sending
      const currentRole = localStorage.getItem('role') || 'buyer'
      console.log('Sending role to GitHub Auth Backend:', currentRole)

      const { data } = await API.post('/auth/github', { code, role: currentRole })
      localStorage.setItem('user', JSON.stringify(data))
      setUser(data)
      navigate('/login', { replace: true })
      navigate('/profile')
    } catch (error) {
      console.error(error)
      alert(error.response?.data?.message || 'GitHub Authentication Failed')
      hasProcessed.current = false;
    }
  }

  // FIX 2: Prevent the main window from processing the code if the popup is supposed to handle it.
  // This hook should ideally only trigger if it's acting as the main redirection page.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    if (code) {
      sendGithubCodeToBackend(code)
    }
  }, [navigate]) // Removed 'role' dependency to stop unneeded triggers during toggle

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const loginData = { ...formData, role }
      const { data } = await API.post('/auth/login', loginData)
      localStorage.setItem('user', JSON.stringify(data))
      setUser(data)
      navigate('/profile')
    } catch (error) {
      alert(error.response?.data?.message || 'Login Failed')
    }
  }

  // STEP 1: Request the 6-Digit OTP Token
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await API.post('/auth/forgot_password', { phone, method: sendMethod })
      alert(data.message || 'Verification OTP sent!')
      setShowForgotModal(false)
      setShowOtpModal(true)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send verification message')
    } finally {
      setLoading(false)
    }
  }

  // STEP 2: Verify the OTP
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await API.post('/auth/verify_otp_send_password', { phone, otp, method: sendMethod })
      setRetrievedPassword(data.password)
      setShowOtpModal(false)
      setShowPasswordSuccessModal(true)
      setOtp('')
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid or Expired OTP Code.')
    } finally {
      setLoading(false)
    }
  }

  // OAuth Providers Handlers
  const handleGoogleSuccess = (tokenResponse) => {
    const sendGoogleToken = async () => {
      try {
        const { data } = await API.post('/auth/google', { token: tokenResponse.access_token, role })
        localStorage.setItem('user', JSON.stringify(data))
        setUser(data)
        navigate('/profile')
      } catch (error) { alert('Google Login Failed') }
    }
    sendGoogleToken()
  }
  const loginWithGoogle = useGoogleLogin({ onSuccess: handleGoogleSuccess, onError: () => alert('Google Login Failed') })

  const loginWithFacebook = () => {
    if (!window.FB) return alert('Facebook SDK loading...')
    window.FB.login((response) => {
      if (response.authResponse) {
        const sendFacebookToken = async () => {
          try {
            const { data } = await API.post('/auth/facebook', { token: response.authResponse.accessToken, role })
            localStorage.setItem('user', JSON.stringify(data))
            setUser(data)
            navigate('/profile')
          } catch (error) { alert('Facebook Login Failed') }
        }
        sendFacebookToken()
      }
    }, { scope: 'public_profile,email' })
  }

  const loginWithGithub = () => {
    // FIX 3: Explicitly sync the local state to localStorage before opening the window
    localStorage.setItem('role', role)

    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
    const redirectUri = window.location.origin + '/login'
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`
    const width = 500, height = 650
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2
    const popup = window.open(githubAuthUrl, 'GitHub Login', `width=${width},height=${height},top=${top},left=${left},toolbar=no`)

    const checkPopupInterval = setInterval(() => {
      if (!popup || popup.closed) { clearInterval(checkPopupInterval); return; }
      try {
        if (popup.location.pathname === '/login' && popup.location.search.includes('code=')) {
          const urlParams = new URLSearchParams(popup.location.search)
          const code = urlParams.get('code')
          clearInterval(checkPopupInterval)
          popup.close()
          if (code) { sendGithubCodeToBackend(code) }
        }
      } catch (e) { }
    }, 500)
  }

  const loginWithuauth = async () => {

    try {

      setLoading(true);

      const result =
        await auth.signInWithPopup();
        const data = result.user
      console.log(result.user)
      localStorage.setItem('user', JSON.stringify(data))
      setUser(data)
      navigate('/profile')


    } catch (error) {

      alert(
        error.message
      );

    } finally {

      setLoading(false);

    }

  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="role-toggle">
            {/* FIX 4: Use the wrapper handler for changing roles */}
            <button type="button" className={role === 'buyer' ? 'active-role' : ''} onClick={() => handleRoleChange('buyer')}>Buyer</button>
            <button type="button" className={role === 'seller' ? 'active-role' : ''} onClick={() => handleRoleChange('seller')}>Seller</button>
          </div>
          <h1>Login</h1>
          <form className="login-form" onSubmit={(e) => { handleSubmit(e) }}>
            <div className="input-box">
              <FaEnvelope className="input-icon" />
              <input type="email" name="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="input-box">
              <FaLock className="input-icon" />
              <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} required />
              <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <button type="submit" className="login-btn">Login</button>

            <div className="bottom-links">
              <Link to="/register">Create New Account</Link>
              <span className="forgot-link" onClick={() => setShowForgotModal(true)}>Forgot Password?</span>
            </div>
          </form>
        </div>

        <div className="login-right">
          <button className="social-btn" onClick={() => loginWithuauth()}><img width="40px" height="37px" src="uauth.png" className="google" /> <span>Continue with uauth</span></button>
          <button className="social-btn" onClick={() => loginWithGoogle()}><FaGoogle className="google" /> <span>Continue with Google</span></button>
          <button className="social-btn" onClick={() => loginWithFacebook()}><FaFacebookF className="facebook" /> <span>Continue with Facebook</span></button>
          <button className="social-btn" onClick={() => loginWithGithub()}><FaGithub className="github" /> <span>Continue with GitHub</span></button>
        </div>
      </div>

      {/* MODAL 1: REQUEST OTP FIELD */}
      {showForgotModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal" onClick={() => setShowForgotModal(false)}><FaTimes /></button>
            <h2>Reset Password</h2>
            <p>Enter your international registered phone number.</p>

            <form onSubmit={handleForgotPasswordSubmit}>
              <div className="input-box">
                <FaPhoneAlt className="input-icon" />
                <input
                  type="tel"
                  placeholder="e.g. +91936059XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="method-selector">
                <label>
                  <input type="radio" value="sms" checked={sendMethod === 'sms'} onChange={() => setSendMethod('sms')} />
                  Send via SMS
                </label>
                <label>
                  <input type="radio" value="whatsapp" checked={sendMethod === 'whatsapp'} onChange={() => setSendMethod('whatsapp')} />
                  Send via WhatsApp
                </label>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Get Verification OTP'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ENTER OTP & AUTO-VERIFY FIELD */}
      {showOtpModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal" onClick={() => setShowOtpModal(false)}><FaTimes /></button>
            <h2>Enter Security OTP</h2>
            <p>A 6-digit verification code was dispatched to <b>{phone}</b>.</p>

            <form onSubmit={handleVerifyOtpSubmit}>
              <div className="input-box">
                <FaKey className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Verifying Account...' : 'Verify & Send New Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPasswordSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-modal" onClick={() => {
              setShowPasswordSuccessModal(false)
              setPhone('')
              setRetrievedPassword('')
            }}><FaTimes /></button>

            <h2>Password Recovered</h2>
            <p>Your verification succeeded! Here is the password registered to your account:</p>

            <div className="password-display-box" style={{
              background: '#f4f6f9',
              padding: '15px',
              borderRadius: '8px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              letterSpacing: '1px',
              color: '#333',
              margin: '20px 0',
              border: '1px dashed #007bff'
            }}>
              {retrievedPassword}
            </div>

            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              A copy of this password has also been text messaged to your phone.
            </p>

            <button type="button" className="login-btn" onClick={() => {
              setShowPasswordSuccessModal(false)
              setPhone('')
              setRetrievedPassword('')
            }}>
              Back to Login
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
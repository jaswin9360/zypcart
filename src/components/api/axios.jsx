import axios from 'axios'

const API = axios.create({
  baseURL: 'https://zypcart-user-backend.onrender.com/api'
})

export default API
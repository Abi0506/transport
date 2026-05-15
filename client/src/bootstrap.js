import axios from 'axios'

const basePath = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')
// Prefer an explicit API base set at build time: VITE_API_BASE
const apiBase = import.meta.env.VITE_API_BASE || basePath || ''

axios.defaults.baseURL = apiBase
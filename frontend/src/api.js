// All calls to the AskDB backend go through here.

// Empty in development (Vite proxies /api). On Vercel, set VITE_API_URL to the backend's address.
const BASE_URL = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'askdb_token'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be unavailable (private mode); the user just has to sign in again next time.
  }
}

// App.jsx registers a function here so an expired token sends the user back to the login page.
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(BASE_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError("Can't reach the AskDB server. Is the backend running?", 0)
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(data?.detail ?? `Request failed (${res.status})`, res.status)
  }
  return data
}

export const api = {
  register: (email, password) => request('/api/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/api/auth/me'),
  health: () => request('/api/health'),

  listConnections: () => request('/api/connections'),
  testConnection: (details) => request('/api/connections/test', { method: 'POST', body: details }),
  createConnection: (details) => request('/api/connections', { method: 'POST', body: details }),
  deleteConnection: (id) => request(`/api/connections/${id}`, { method: 'DELETE' }),

  getSchema: (id, signal) => request(`/api/connections/${id}/schema`, { signal }),
  ask: (id, question, signal) => request(`/api/connections/${id}/ask`, { method: 'POST', body: { question }, signal }),
  getHistory: (id) => request(`/api/connections/${id}/history`),
  clearHistory: (id) => request(`/api/connections/${id}/history`, { method: 'DELETE' }),
  runQuery: (id, sql, signal) => request(`/api/connections/${id}/query`, { method: 'POST', body: { sql }, signal }),
}

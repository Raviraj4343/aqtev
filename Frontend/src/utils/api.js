import { Capacitor, CapacitorHttp } from '@capacitor/core'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/
const DEFAULT_DEV_API_BASE = 'http://localhost:8000/api/v1'
const DEFAULT_PROD_API_BASE = 'https://fitcek.onrender.com/api/v1'
const ANDROID_EMULATOR_HOST = '10.0.2.2'

const isNativeRuntime = () => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

const isAndroidRuntime = () => {
  try {
    return Capacitor.getPlatform() === 'android'
  } catch {
    return false
  }
}

const toAndroidReachableHost = (value) => {
  if (!value || !isAndroidRuntime()) return value

  try {
    const url = new URL(value)
    if (LOCAL_HOSTS.has(url.hostname)) {
      url.hostname = ANDROID_EMULATOR_HOST
      return url.toString().replace(/\/+$/, '')
    }
    return value
  } catch {
    return value
  }
}

const normalizeApiBase = (value) => {
  if (!value) return ''
  const raw = String(value).trim().replace(/\/+$/, '')
  if (!raw) return ''

  try {
    const url = new URL(raw)
    const pathname = url.pathname.replace(/\/+$/, '')
    const normalizedPath = pathname && pathname !== '/' ? pathname : '/api/v1'
    url.pathname = normalizedPath.endsWith('/api/v1') ? normalizedPath : `${normalizedPath}/api/v1`
    return url.toString().replace(/\/+$/, '')
  } catch {
    return raw
  }
}

const resolveApiBase = () => {
  const explicit = normalizeApiBase(import.meta.env.VITE_API_BASE)
  if (explicit) return toAndroidReachableHost(explicit)

  const devBase = normalizeApiBase(import.meta.env.VITE_API_BASE_DEV)
  const prodBase = normalizeApiBase(import.meta.env.VITE_API_BASE_PROD)
  const nativeBase = normalizeApiBase(import.meta.env.VITE_API_BASE_NATIVE || import.meta.env.VITE_API_BASE_ANDROID)

  if (isNativeRuntime()) {
    return toAndroidReachableHost(nativeBase || prodBase || normalizeApiBase(DEFAULT_PROD_API_BASE))
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = LOCAL_HOSTS.has(host) || IPV4_PATTERN.test(host)
    if (isLocalHost) return devBase || normalizeApiBase(DEFAULT_DEV_API_BASE)
  }

  return prodBase || normalizeApiBase(DEFAULT_PROD_API_BASE)
}

const API_BASE = resolveApiBase()
const REQUEST_TIMEOUT_MS = 65000
const MEMO_TTL_MS = 2 * 60 * 1000
const NATIVE_RETRY_DELAYS_MS = [1800, 4000]
const NATIVE_WARMUP_TTL_MS = 90 * 1000
const ACCESS_TOKEN_KEY = 'fitcek_access'
const REMEMBERED_USER_KEY = 'fitcek_remembered_user'
const REMEMBERED_AUTH_KEY = 'fitcek_remembered_auth'
const memoCache = new Map()
let nativeWarmupPromise = null
let nativeWarmupAt = 0

const memoGet = (key) => {
  const entry = memoCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > MEMO_TTL_MS) {
    memoCache.delete(key)
    return null
  }
  return entry.value
}

const memoSet = (key, value) => {
  memoCache.set(key, { ts: Date.now(), value })
}

const getApiOrigin = () => {
  try {
    return new URL(getApiBase()).origin
  } catch {
    return ''
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const parseDataPayload = (value) => {
  if (value == null) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  if (typeof value === 'object') return value
  return null
}

const createHttpError = (status, data) => {
  const err = new Error(data?.message || `Request failed${status ? ` (${status})` : ''}`)
  err.status = status
  err.payload = data
  return err
}

const getHealthUrl = (apiBase) => {
  try {
    const url = new URL(apiBase)
    return `${url.origin}/health`
  } catch {
    return '/health'
  }
}

const ensureNativeBackendWarm = async (apiBase) => {
  if (!isNativeRuntime()) return
  if (Date.now() - nativeWarmupAt < NATIVE_WARMUP_TTL_MS) return
  if (nativeWarmupPromise) return nativeWarmupPromise

  nativeWarmupPromise = (async () => {
    try {
      await CapacitorHttp.request({
        url: getHealthUrl(apiBase),
        method: 'GET',
        connectTimeout: REQUEST_TIMEOUT_MS,
        readTimeout: REQUEST_TIMEOUT_MS,
      })
    } catch {
      // Ignore warmup errors; actual request still runs with retries.
    } finally {
      nativeWarmupAt = Date.now()
      nativeWarmupPromise = null
    }
  })()

  return nativeWarmupPromise
}

function getApiBase(){
  if (API_BASE) return API_BASE

  throw new Error('Frontend API is not configured. Set VITE_API_BASE, or VITE_API_BASE_DEV + VITE_API_BASE_PROD.')
}

export function resolveMediaUrl(value){
  if (!value) return value

  const raw = String(value).trim()
  if (!raw) return raw

  if (/^https:\/\/res\.cloudinary\.com\//i.test(raw)) return raw

  const apiOrigin = getApiOrigin()

  if (raw.startsWith('/')) {
    return apiOrigin ? `${apiOrigin}${raw}` : raw
  }

  try {
    const parsed = new URL(raw)
    const isLocalAssetHost = ['localhost', '127.0.0.1'].includes(parsed.hostname)

    if (isLocalAssetHost && apiOrigin) {
      return `${apiOrigin}${parsed.pathname}${parsed.search || ''}`
    }

    return raw
  } catch {
    return apiOrigin ? `${apiOrigin}/${raw.replace(/^\/+/, '')}` : raw
  }
}

export function normalizeUser(user){
  if (!user || typeof user !== 'object') return user
  return {
    ...user,
    avatarUrl: resolveMediaUrl(user.avatarUrl)
  }
}

async function request(path, { method = 'GET', body, token, headers = {} } = {}){
  const apiBase = getApiBase()
  const url = `${apiBase}${path}`

  if (
    typeof window !== 'undefined' &&
    !isNativeRuntime() &&
    window.location.protocol === 'https:' &&
    /^http:\/\//i.test(apiBase)
  ) {
    throw new Error('Blocked insecure API URL over HTTP from an HTTPS page. Use an HTTPS API URL in production.')
  }

  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    credentials: 'include'
  }
  // If no explicit token provided, try reading a saved access token from storage.
  if (!token) {
    try{ token = readToken() || token }catch{}
  }
  if (body) init.body = JSON.stringify(body)
  if (token) init.headers['Authorization'] = `Bearer ${token}`

  // Warmup is useful before read-heavy GETs on sleepy hosts, but it adds latency
  // to auth writes (e.g., login). Skip for non-GET requests.
  if (method === 'GET') {
    await ensureNativeBackendWarm(apiBase)
  }

  const runNativeRequest = async () => {
    try {
      const res = await CapacitorHttp.request({
        url,
        method,
        headers: init.headers,
        data: body,
        connectTimeout: REQUEST_TIMEOUT_MS,
        readTimeout: REQUEST_TIMEOUT_MS,
      })
      const data = parseDataPayload(res?.data)
      if (!res || res.status < 200 || res.status >= 300) {
        throw createHttpError(res?.status || 0, data)
      }
      return data
    } catch (err) {
      if (typeof err?.status === 'number') throw err
      const nativeCause = String(err?.message || err?.error || err || '').trim()
      throw createHttpError(0, {
        message: `Network error: unable to reach API at ${apiBase}. Check device internet and API URL. If you use Render free tier, first request can take up to ~50s.${nativeCause ? ` Native detail: ${nativeCause}` : ''}`
      })
    }
  }

  const runWebRequest = async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      const data = await res.json().catch(()=>null)
      if (!res.ok) throw createHttpError(res.status, data)
      return data
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const runRequest = async () => (isNativeRuntime() ? runNativeRequest() : runWebRequest())

  const runWithRetry = async () => {
    try {
      return await runRequest()
    } catch (err) {
      if (!isNativeRuntime() || Number(err?.status) !== 0) throw err
      for (const wait of NATIVE_RETRY_DELAYS_MS) {
        await sleep(wait)
        try {
          return await runRequest()
        } catch (retryErr) {
          if (Number(retryErr?.status) !== 0) throw retryErr
          err = retryErr
        }
      }
      throw err
    }
  }

  try {
    return await runWithRetry()
  } catch (err) {
    if (method === 'GET' && [408, 429, 502, 503, 504].includes(Number(err?.status))) {
      await sleep(1200)
      return runRequest()
    }
    if (err?.name === 'AbortError') {
      const timeoutError = new Error('Request timed out. Server may be waking up. Please try again in a few seconds.')
      timeoutError.status = 408
      throw timeoutError
    }
    if (err instanceof TypeError) {
      const networkError = new Error(`Network error: unable to reach API at ${apiBase}. Check device internet, API URL, and Android emulator host mapping (10.0.2.2 for local backend).`)
      networkError.status = 0
      networkError.cause = err
      throw networkError
    }
    throw err
  }
}

// Auth
export function signup(payload){
  return request('/auth/signup', { method: 'POST', body: payload })
}

export function verifyEmail(token){
  return request(`/auth/verify-email?token=${encodeURIComponent(token)}`)
}

export function verifyCode(email, code){
  return request('/auth/verify-code', { method: 'POST', body: { email, code } })
}

export function resendVerification(email){
  return request('/auth/resend-verification', { method: 'POST', body: { email } })
}

// Password reset
export function forgotPassword(email){
  return request('/auth/forgot-password', { method: 'POST', body: { email } })
}

export function resetPassword(token, password){
  // backend expects `token` and `newPassword` fields
  return request('/auth/reset-password', { method: 'POST', body: { token, newPassword: password } })
}

export function login({ email, password }){
  return request('/auth/login', { method: 'POST', body: { email, password } })
}

export function logout(){
  return request('/auth/logout', { method: 'POST' })
}

export function refreshToken(){
  return request('/auth/refresh-token', { method: 'POST' })
}

export function getMe(token){
  return request('/auth/me', { method: 'GET', token }).then((res) => ({
    ...res,
    data: normalizeUser(res?.data)
  }))
}

// User / Profile
export function getProfile(){
  return request('/user/profile').then((res) => ({
    ...res,
    data: normalizeUser(res?.data)
  }))
}

export function uploadAvatar(file){
  const apiBase = getApiBase()
  const form = new FormData()
  form.append('avatar', file)
  const token = readToken()
  const headers = {}

  if (token) headers.Authorization = `Bearer ${token}`

  return fetch(`${apiBase}/user/profile/avatar`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers
  }).then(async res => {
    const data = await res.json().catch(()=>null)
    if(!res.ok){
      const err = new Error(data?.message || 'Upload failed')
      err.status = res.status
      err.payload = data
      throw err
    }
    return {
      ...data,
      data: normalizeUser(data?.data)
    }
  })
}

export function setupProfile(payload){
  return request('/user/profile', { method: 'POST', body: payload }).then((res) => ({
    ...res,
    data: normalizeUser(res?.data)
  }))
}

export function updateProfile(payload){
  return request('/user/profile', { method: 'PUT', body: payload }).then((res) => ({
    ...res,
    data: normalizeUser(res?.data)
  }))
}

export function getHealthStats(){
  return request('/user/stats')
}

// Daily Logs
export function getTodayLog(){
  return request('/dailyLog/today')
}

export function getHistoryLogs(){
  return request('/dailyLog/history')
}

export function createOrUpdateDailyLog(payload){
  return request('/dailyLog', { method: 'POST', body: payload })
}

export function getLogByDate(date){
  return request(`/dailyLog/${encodeURIComponent(date)}`)
}

export function updateMealSection(date, payload){
  return request(`/dailyLog/${encodeURIComponent(date)}/meal`, { method: 'PATCH', body: payload })
}

export function updateVitals(date, payload){
  return request(`/dailyLog/${encodeURIComponent(date)}/vitals`, { method: 'PATCH', body: payload })
}

// Weight logs
export function logWeight(payload){
  return request('/weightLog', { method: 'POST', body: payload })
}

export function getWeightHistory(query = {}){
  const qs = new URLSearchParams(query).toString()
  return request(`/weightLog/history${qs ? `?${qs}` : ''}`)
}

export function getWeeklyWeightSummary(){
  return request('/weightLog/weekly-summary')
}

export function deleteWeightLog(date){
  return request(`/weightLog/${encodeURIComponent(date)}`, { method: 'DELETE' })
}

// Food
export function searchFoods(q){
  return request(`/food/search?q=${encodeURIComponent(q)}`)
}

export function getFoodCategories(){
  const key = 'food:categories'
  const cached = memoGet(key)
  if (cached) return Promise.resolve(cached)
  return request('/food/categories').then((res) => {
    memoSet(key, res)
    return res
  })
}

export function getAllFoods(query = {}){
  const cacheKey = `food:all:${JSON.stringify(query || {})}`
  const cached = memoGet(cacheKey)
  if (cached) return Promise.resolve(cached)
  const qs = new URLSearchParams(query).toString()
  return request(`/food${qs ? `?${qs}` : ''}`).then((res) => {
    memoSet(cacheKey, res)
    return res
  })
}

export function getFoodById(id){
  return request(`/food/${encodeURIComponent(id)}`)
}

export function getBoostFoods({ nutrient, diet, limit = 6 }){
  const query = new URLSearchParams({ nutrient, limit: String(limit) })
  if (diet) query.set('diet', diet)
  return request(`/food/boost?${query.toString()}`)
}

// Insights
export function getTodayInsight(){
  return request('/insight/today')
}

export function getWeeklySummary(){
  return request('/insight/summary')
}

export function getGuideActionPlan(payload = {}){
  return request('/insight/action-plan', { method: 'POST', body: payload })
}

export function getGuideLiveSuggestion(payload = {}){
  const body = payload || {}
  const shouldFallback = (status) => [404, 429, 502, 503, 504].includes(Number(status))
  const latestPrompt = String(body?.prompt || '').trim()
  const knownGoal = body?.goal ? String(body.goal).replace(/_/g, ' ') : ''
  const knownDiet = body?.dietPreference ? String(body.dietPreference).replace(/_/g, '-') : ''
  const knownActivity = body?.activityLevel ? String(body.activityLevel).replace(/_/g, ' ') : ''
  const knownWeight = Number.isFinite(Number(body?.weightKg)) ? `${Number(body.weightKg)} kg` : ''
  const historyText = Array.isArray(body?.history)
    ? body.history
        .slice(-8)
        .map((item) => `${item?.role === 'assistant' ? 'Coach' : 'User'}: ${String(item?.content || '').trim()}`)
        .filter(Boolean)
        .join(' | ')
    : ''

  const buildConversationalFallback = (reason = 'conversation-fallback') => {
    const pick = (list = []) => list[Math.floor(Math.random() * list.length)] || ''
    const concisePrompt = latestPrompt || 'Can you guide me based on today?'
    const knownProfileLine = [knownGoal ? `goal: ${knownGoal}` : '', knownDiet ? `diet: ${knownDiet}` : '', knownActivity ? `activity: ${knownActivity}` : '', knownWeight ? `weight: ${knownWeight}` : '']
      .filter(Boolean)
      .join(', ')

    const promptLower = concisePrompt.toLowerCase()
    const budgetMatch = promptLower.match(/(?:rs\.?|inr)?\s*(\d{2,5})/i)
    const budget = budgetMatch ? Number(budgetMatch[1]) : null
    const wantsProtein = /protein|high protein|muscle|gain|lean/.test(promptLower)
    const wantsWeightLoss = /fat loss|weight loss|lose weight|cut/.test(promptLower)
    const wantsMeal = /meal|breakfast|lunch|dinner|snack|food|eat/.test(promptLower)

    let coreReply = pick([
      'Try a balanced plate: 1 protein source, 1 fiber-rich carb, and vegetables.',
      'Keep it simple: protein first, then smart carbs, then veggies for volume.',
      'A good default: high-protein base + moderate carbs + plenty of vegetables.'
    ])
    if (wantsProtein && budget && budget <= 80) {
      coreReply = pick([
        'Best budget protein picks: eggs, roasted chana, curd, milk, and paneer in small portions.',
        'For low budget protein, go with eggs, chana, curd, milk, or small paneer servings.',
        'Cheap high-protein options: eggs, curd, roasted chana, milk, and paneer.'
      ])
    } else if (wantsProtein) {
      coreReply = pick([
        'Focus on protein anchors each meal: eggs/paneer/tofu/chicken with dal or curd.',
        'Build each meal around protein: eggs, paneer, tofu, chicken, dal, or curd.',
        'Prioritize protein at every meal: egg/paneer/tofu/chicken plus dal/curd.'
      ])
    } else if (wantsWeightLoss) {
      coreReply = pick([
        'For fat loss, keep meals light-volume and protein-forward; avoid liquid calories and fried snacks.',
        'For weight loss, cut liquid calories and fried items, and keep protein high.',
        'Fat-loss rule: protein-heavy meals, controlled portions, minimal sugary/fried extras.'
      ])
    } else if (wantsMeal) {
      coreReply = pick([
        'Use a simple meal rule: half veggies, quarter protein, quarter carbs.',
        'Easy plate method: 50% veggies, 25% protein, 25% carbs.',
        'Keep meals balanced with veggie-heavy plates plus a clear protein source.'
      ])
    }

    const optionLine = budget
      ? pick([
          `Within Rs ${budget}, choose one: 2 eggs + banana, curd + roasted chana, or paneer + cucumber.`,
          `Budget Rs ${budget} ideas: egg + banana, curd + chana, or paneer + salad.`,
          `Under Rs ${budget}: eggs, curd-chana combo, or paneer with cucumber works well.`
        ])
      : pick([
          'Quick options: egg/paneer/tofu bowl, dal-chawal with salad, or curd-chana snack.',
          'Simple picks: dal + rice + salad, protein bowl, or curd with roasted chana.',
          'Try one now: protein bowl, dal meal, or curd-chana snack.'
        ])

    const reply = [
      coreReply,
      optionLine,
      knownProfileLine
        ? pick([
            `Using your profile context (${knownProfileLine}).`,
            `Personalized with your profile (${knownProfileLine}).`,
            `Tailored from your saved profile (${knownProfileLine}).`
          ])
        : pick([
            'I can personalize more once profile details are set.',
            'Add profile details for sharper recommendations.',
            'Set profile data to get even more precise suggestions.'
          ])
    ].join('\n')

    return {
      success: true,
      data: {
        reply,
        source: reason
      }
    }
  }

  return request('/insight/live-suggestion', { method: 'POST', body })
    .catch(async (err) => {
      if (!shouldFallback(err?.status)) throw err

      // Backward compatibility: some deployed backends may still use camelCase route.
      if (Number(err?.status) === 404) {
        try {
          return await request('/insight/liveSuggestion', { method: 'POST', body })
        } catch (legacyErr) {
          if (!shouldFallback(legacyErr?.status)) throw legacyErr
        }
      }

      // Last-resort compatibility: keep chat conversational, not rigid action-plan output.
      return buildConversationalFallback('conversation-fallback')
    })
}

// Simple local token helpers (optional — backend uses cookies)
export function saveToken(token, remember = true){
  if (!token) return
  try{
    if (remember) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token)
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  }catch{}
}

export function readToken(){
  try{
    const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    if (sessionToken) return sessionToken
  }catch{}
  try{ return localStorage.getItem(ACCESS_TOKEN_KEY) }catch{ return null }
}

export function clearToken(){
  try{ sessionStorage.removeItem(ACCESS_TOKEN_KEY) }catch{}
  try{ localStorage.removeItem(ACCESS_TOKEN_KEY) }catch{}
}

function toRememberedUser(user){
  if (!user || typeof user !== 'object') return null
  const email = String(user.email || '').trim()
  if (!email) return null

  const name = String(user.name || '').trim()
  const avatarUrl = user.avatarUrl ? resolveMediaUrl(user.avatarUrl) : null

  return {
    email,
    ...(name ? { name } : {}),
    ...(avatarUrl ? { avatarUrl } : {})
  }
}

export function saveRememberedUser(user){
  const remembered = toRememberedUser(user)
  if (!remembered) return
  try{ localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(remembered)) }catch{}
}

export function readRememberedUser(){
  try{
    const raw = localStorage.getItem(REMEMBERED_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return toRememberedUser(parsed)
  }catch{
    return null
  }
}

export function clearRememberedUser(){
  try{ localStorage.removeItem(REMEMBERED_USER_KEY) }catch{}
}

function toRememberedAuth(value){
  if (!value || typeof value !== 'object') return null
  const email = String(value.email || '').trim()
  const password = String(value.password || '')
  if (!email || !password) return null
  return { email, password }
}

export function saveRememberedCredentials(value){
  const normalized = toRememberedAuth(value)
  if (!normalized) return
  try{ localStorage.setItem(REMEMBERED_AUTH_KEY, JSON.stringify(normalized)) }catch{}
}

export function readRememberedCredentials(){
  try{
    const raw = localStorage.getItem(REMEMBERED_AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return toRememberedAuth(parsed)
  }catch{
    return null
  }
}

export function clearRememberedCredentials(){
  try{ localStorage.removeItem(REMEMBERED_AUTH_KEY) }catch{}
}

export default {
  request,
  // auth
  signup,
  verifyEmail,
  verifyCode,
  resendVerification,
  forgotPassword,
  resetPassword,
  login,
  logout,
  refreshToken,
  getMe,
  // user
  getProfile,
  setupProfile,
  updateProfile,
  getHealthStats,
  // daily
  getTodayLog,
  getHistoryLogs,
  createOrUpdateDailyLog,
  getLogByDate,
  updateMealSection,
  updateVitals,
  // weight
  logWeight,
  getWeightHistory,
  getWeeklyWeightSummary,
  deleteWeightLog,
  // food
  searchFoods,
  getFoodCategories,
  getAllFoods,
  getFoodById,
  getBoostFoods,
  // insight
  getTodayInsight,
  getWeeklySummary,
  getGuideActionPlan,
  getGuideLiveSuggestion,
  // tokens
  saveToken,
  readToken,
  clearToken,
  saveRememberedUser,
  readRememberedUser,
  clearRememberedUser,
  saveRememberedCredentials,
  readRememberedCredentials,
  clearRememberedCredentials,
}

import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './contexts/AuthContext'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const Auth = lazy(() => import('./pages/Auth'))
const Landing = lazy(() => import('./pages/Landing'))
const SignIn = lazy(() => import('./pages/SignIn'))
const Signup = lazy(() => import('./pages/Signup'))
const DesignSystem = lazy(() => import('./pages/DesignSystem'))
const Forgot = lazy(() => import('./pages/Forgot'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const DailyLog = lazy(() => import('./pages/DailyLog'))
const Trend = lazy(() => import('./pages/Weight'))
const Foods = lazy(() => import('./pages/Foods'))
const Insights = lazy(() => import('./pages/Insights'))
const Guide = lazy(() => import('./pages/Guide'))
const GuestNutritionCheck = lazy(() => import('./pages/GuestNutritionCheck'))
const Community = lazy(() => import('./pages/Community'))

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  return children
}

function RouteLoader(){
  return (
    <div className="content-area" role="status" aria-live="polite">
      <div className="card" style={{ maxWidth: 420, margin: '28px auto' }}>
        Loading...
      </div>
    </div>
  )
}

function withAuth(element){
  return <RequireAuth>{element}</RequireAuth>
}

export default function App(){
  return (
    <Layout>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/guest-nutrition-check" element={<GuestNutritionCheck />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/dashboard" element={withAuth(<Dashboard />)} />
          <Route path="/daily" element={withAuth(<DailyLog />)} />
          <Route path="/trend" element={withAuth(<Trend />)} />
          <Route path="/weight" element={withAuth(<Navigate to="/trend" replace />)} />
          <Route path="/foods" element={withAuth(<Foods />)} />
          <Route path="/insights" element={withAuth(<Insights />)} />
          <Route path="/guide" element={withAuth(<Guide />)} />
          <Route path="/community" element={withAuth(<Community />)} />
          <Route path="/posts" element={withAuth(<Community />)} />
          <Route path="/profile" element={withAuth(<Profile />)} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/design" element={<DesignSystem />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

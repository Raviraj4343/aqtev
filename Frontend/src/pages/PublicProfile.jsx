import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import api from '../utils/api'

const prettify = (value = '') => String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

export default function PublicProfile(){
  const { userId = '' } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      setError('Invalid profile link.')
      return
    }

    setLoading(true)
    setError('')
    api.getPublicProfile(userId)
      .then((res) => setProfile(res?.data || null))
      .catch((err) => setError(String(err?.payload?.message || err?.message || 'Unable to load this profile.')))
      .finally(() => setLoading(false))
  }, [userId])

  const basics = useMemo(() => {
    if (!profile) return []
    return [
      { label: 'Goal', value: prettify(profile.goal || 'maintain') },
      { label: 'Activity', value: prettify(profile.activityLevel || 'moderate') },
      { label: 'Diet', value: prettify(profile.dietPreference || 'mixed') }
    ]
  }, [profile])

  return (
    <div className="page public-profile-page">
      <section className="public-profile-head">
        <span className="dashboard-eyebrow">Community Member</span>
        <h1>Profile</h1>
      </section>

      {loading ? (
        <Card><p className="muted">Loading profile...</p></Card>
      ) : error ? (
        <Card><p>{error}</p></Card>
      ) : profile ? (
        <Card className="public-profile-card">
          <div className="public-profile-main">
            <div className="community-avatar public-profile-avatar">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{(profile.name || 'U').charAt(0).toUpperCase()}</span>}
            </div>
            <div>
              <h2>{profile.name || 'Community member'}</h2>
              <p className="muted">Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}</p>
            </div>
          </div>

          <div className="public-profile-grid">
            {basics.map((item) => (
              <div className="public-profile-stat" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          {/* <p className="muted public-profile-note">Only basic community details are visible here.</p> */}
          <Link to="/community" className="btn-ghost public-profile-back-link">Back to community</Link>
        </Card>
      ) : (
        <Card><p className="muted">Profile not found.</p></Card>
      )}
    </div>
  )
}

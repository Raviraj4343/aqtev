import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import ConfirmationModal from '../components/ConfirmationModal'
import * as api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

const GENDERS = ['male', 'female', 'other']
const GOALS = ['weight_loss', 'muscle_gain', 'maintain']
const ACTIVITY = ['sedentary', 'light', 'moderate', 'active']
const DIETS = ['veg', 'non_veg', 'mixed']

const EMPTY_FORM = {
  name: '',
  age: '',
  gender: 'male',
  heightCm: '',
  weightKg: '',
  bodyFatPercent: '',
  goal: 'maintain',
  activityLevel: 'moderate',
  dietPreference: 'mixed'
}

const prettify = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const hasPremiumAccess = (user) => {
  if (!user) return false
  if (user.role === 'super_admin') return true
  if (user.subscriptionStatus !== 'active') return false
  if (!user.subscriptionExpiresAt) return true
  return new Date(user.subscriptionExpiresAt).getTime() > Date.now()
}

const loadRazorpayScript = () => new Promise((resolve) => {
  if (typeof window === 'undefined') return resolve(false)
  if (window.Razorpay) return resolve(true)

  const existing = document.querySelector('script[data-razorpay-checkout="true"]')
  if (existing) {
    existing.addEventListener('load', () => resolve(true), { once: true })
    existing.addEventListener('error', () => resolve(false), { once: true })
    return
  }

  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.async = true
  script.dataset.razorpayCheckout = 'true'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

export default function Profile(){
  const { user, refresh } = useAuth() || {}
  const { search } = useLocation()
  const { language, setLanguage, t } = useLanguage()
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [status, setStatus] = useState('')
  const [pendingSavePayload, setPendingSavePayload] = useState(null)
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState('')
  const [purchasingPlanId, setPurchasingPlanId] = useState('')

  const isSuperAdmin = user?.role === 'super_admin'
  const isPremium = hasPremiumAccess(user)
  const premiumRequired = new URLSearchParams(search).get('premium') === 'required'

  useEffect(() => {
    if (!user) return

    setAvatarPreview(user.avatarUrl || null)
    setForm({
      name: user.name ?? '',
      age: user.age ?? '',
      gender: user.gender ?? 'male',
      heightCm: user.heightCm ?? '',
      weightKg: user.weightKg ?? '',
      bodyFatPercent: user.bodyFatPercent ?? '',
      goal: user.goal ?? 'maintain',
      activityLevel: user.activityLevel ?? 'moderate',
      dietPreference: user.dietPreference ?? 'mixed'
    })
    setIsEditing(!user.profileCompleted)
  }, [user])

  useEffect(() => {
    if (!user) return

    setPlansLoading(true)
    setPlansError('')
    api.getSubscriptionPlans({})
      .then((res) => {
        const list = Array.isArray(res?.data?.plans) ? res.data.plans : []
        setPlans(list.filter((plan) => plan?.isActive))
      })
      .catch((err) => {
        setPlans([])
        setPlansError(String(err?.payload?.message || err?.message || 'Unable to load subscription plans.'))
      })
      .finally(() => setPlansLoading(false))
  }, [user?._id])

  const validate = (values) => {
    const e = {}
    if (!values.name?.trim() || values.name.trim().length < 2) e.name = t('profile.validation.name')
    if (!values.age || values.age < 10 || values.age > 120) e.age = t('profile.validation.age')
    if (!GENDERS.includes(values.gender)) e.gender = t('profile.validation.gender')
    if (!values.heightCm || values.heightCm < 50 || values.heightCm > 300) e.heightCm = t('profile.validation.height')
    if (!values.weightKg || values.weightKg < 10 || values.weightKg > 500) e.weightKg = t('profile.validation.weight')
    if (values.bodyFatPercent !== '' && (values.bodyFatPercent < 1 || values.bodyFatPercent > 70)) e.bodyFatPercent = t('profile.validation.bodyFat')
    if (!GOALS.includes(values.goal)) e.goal = t('profile.validation.goal')
    if (!ACTIVITY.includes(values.activityLevel)) e.activityLevel = t('profile.validation.activity')
    if (!DIETS.includes(values.dietPreference)) e.dietPreference = t('profile.validation.diet')
    return e
  }

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setStatus('')
  }

  const resetFormFromUser = () => {
    if (!user) return
    setForm({
      name: user.name ?? '',
      age: user.age ?? '',
      gender: user.gender ?? 'male',
      heightCm: user.heightCm ?? '',
      weightKg: user.weightKg ?? '',
      bodyFatPercent: user.bodyFatPercent ?? '',
      goal: user.goal ?? 'maintain',
      activityLevel: user.activityLevel ?? 'moderate',
      dietPreference: user.dietPreference ?? 'mixed'
    })
    setErrors({})
  }

  const performSave = async (payload) => {
    setSaving(true)
    setStatus('')
    try {
      if (user?.profileCompleted) await api.updateProfile(payload)
      else await api.setupProfile(payload)
      await refresh()
      setIsEditing(false)
      setStatus(t('profile.status.profileSaved'))
    } catch (err) {
      setStatus(err?.payload?.message || err.message || t('profile.status.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const values = { ...form }
    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const payload = {
      name: values.name.trim(),
      age: Number(values.age),
      gender: values.gender,
      heightCm: Number(values.heightCm),
      weightKg: Number(values.weightKg),
      bodyFatPercent: values.bodyFatPercent === '' ? undefined : Number(values.bodyFatPercent),
      goal: values.goal,
      activityLevel: values.activityLevel,
      dietPreference: values.dietPreference
    }

    setPendingSavePayload(payload)
  }

  const handleAvatarUpload = async (fileToUpload = avatarFile) => {
    if (!fileToUpload) {
      setStatus(t('profile.status.chooseImage'))
      return
    }

    setUploading(true)
    setStatus('')
    try {
      await api.uploadAvatar(fileToUpload)
      await refresh()
      setAvatarFile(null)
      setStatus(t('profile.status.avatarUploaded'))
    } catch (err) {
      setStatus(err?.payload?.message || err.message || t('profile.status.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarChange = (file) => {
    if (!file) return
    setAvatarFile(file)
    setStatus('')
    try {
      setAvatarPreview(URL.createObjectURL(file))
    } catch (e) {}
    void handleAvatarUpload(file)
  }

  const handleCancelEdit = () => {
    resetFormFromUser()
    setIsEditing(false)
    setStatus('')
  }

  const handleLanguageToggle = () => {
    setLanguage(language === 'en' ? 'hi' : 'en')
  }

  const handleBuyPlan = async (plan) => {
    if (!plan?._id) return
    if (purchasingPlanId) return

    setPurchasingPlanId(plan._id)
    setStatus('')

    try {
      const hasScript = await loadRazorpayScript()
      if (!hasScript || !window.Razorpay) {
        throw new Error('Razorpay checkout script failed to load.')
      }

      const orderRes = await api.createSubscriptionOrder(plan._id)
      const order = orderRes?.data?.order
      const razorpayKeyId = orderRes?.data?.razorpayKeyId

      if (!order?.id || !razorpayKeyId) {
        throw new Error('Unable to initialize payment right now.')
      }

      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: razorpayKeyId,
          amount: order.amount,
          currency: order.currency,
          name: 'FitCek Premium',
          description: `${plan.name} (${plan.durationDays} days)`,
          order_id: order.id,
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: '#027e9a',
          },
          handler: async (response) => {
            try {
              await api.verifySubscriptionPayment({
                planId: plan._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
              await refresh()
              setStatus('Premium subscription activated successfully.')
              resolve(true)
            } catch (error) {
              reject(error)
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled.'))
          }
        })

        checkout.open()
      })
    } catch (err) {
      setStatus(String(err?.payload?.message || err?.message || 'Payment was not completed.'))
    } finally {
      setPurchasingPlanId('')
    }
  }

  const profileSummary = [
    { label: t('profile.goal'), value: t(`profile.goalOptions.${user?.goal || form.goal}`, {}, prettify(user?.goal || form.goal)) },
    { label: t('profile.activity'), value: t(`profile.activityOptions.${user?.activityLevel || form.activityLevel}`, {}, prettify(user?.activityLevel || form.activityLevel)) },
    { label: t('profile.diet'), value: t(`profile.dietOptions.${user?.dietPreference || form.dietPreference}`, {}, prettify(user?.dietPreference || form.dietPreference)) }
  ]

  const showEditableForm = isEditing || !user?.profileCompleted

  return (
    <>
      <div className="page profile-page">
        <div className="page-top profile-top">
          <div>
            <h1>{t('profile.title')}</h1>
            <p className="muted">
              {user?.profileCompleted
                ? t('profile.subtitleCompleted')
                : t('profile.subtitlePending')}
            </p>
          </div>
        </div>

        <div className="card profile-card profile-shell">
          <section className="profile-hero">
            <div className="profile-hero-head">
              {user?.profileCompleted && !isEditing ? (
                <Button onClick={() => { setIsEditing(true); setStatus('') }} className="profile-edit-trigger">
                  {t('profile.edit')}
                </Button>
              ) : <span aria-hidden="true" />}
            </div>

            <div className="profile-avatar-wrap">
              <div className="profile-avatar-stack">
                <div className="profile-avatar">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={t('profile.avatarAlt', { name: user?.name || 'User' })} className="profile-avatar-image" />
                  ) : (
                    <span className="profile-avatar-fallback" aria-hidden="true">
                      {(user?.name || form.name || 'U').trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <label htmlFor="avatar" className="profile-avatar-camera" title={t('profile.chooseImage')} aria-label={t('profile.chooseImage')}>
                  <input id="avatar" className="profile-file-input" type="file" accept="image/*" onChange={(e) => handleAvatarChange(e.target.files?.[0])} disabled={uploading} />
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                    <path d="M9 4.5a1 1 0 0 1 .84-.46h4.32a1 1 0 0 1 .84.46l.86 1.3h2.14a2.5 2.5 0 0 1 2.5 2.5v8.2a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 16.5V8.3A2.5 2.5 0 0 1 6 5.8h2.14zm3 3.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4m0 2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4" fill="currentColor" />
                  </svg>
                </label>
              </div>

              <div className="profile-avatar-copy">
                <h2>{user?.name || form.name || t('profile.yourProfile')}</h2>
                <p>{user?.email || t('profile.addDetailsHint')}</p>
              </div>
            </div>

            <div className="profile-summary-grid">
              {profileSummary.map((item) => (
                <div key={item.label} className="profile-summary-card">
                  <span className="profile-summary-label">{item.label}</span>
                  <strong className="profile-summary-value">{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          {status ? <div className="profile-status">{status}</div> : null}

          {showEditableForm ? (
            <form className="profile-form profile-form-panel" onSubmit={handleSubmit} noValidate>
            <Input
              id="profile-name"
              label={t('profile.name')}
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <div className="error-text">{errors.name}</div>}

            <Input
              id="profile-age"
              label={t('profile.age')}
              type="number"
              value={form.age}
              onChange={(e) => handleChange('age', e.target.value === '' ? '' : Number(e.target.value))}
              className={errors.age ? 'error' : ''}
            />
            {errors.age && <div className="error-text">{errors.age}</div>}

            <label className="field-label">{t('profile.gender')}</label>
            <select value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} className={errors.gender ? 'error-select' : ''}>
              {GENDERS.map((gender) => <option key={gender} value={gender}>{t(`profile.genderOptions.${gender}`, {}, prettify(gender))}</option>)}
            </select>
            {errors.gender && <div className="error-text">{errors.gender}</div>}

            <Input
              id="profile-height"
              label={t('profile.height')}
              type="number"
              value={form.heightCm}
              onChange={(e) => handleChange('heightCm', e.target.value === '' ? '' : Number(e.target.value))}
              className={errors.heightCm ? 'error' : ''}
            />
            {errors.heightCm && <div className="error-text">{errors.heightCm}</div>}

            <Input
              id="profile-weight"
              label={t('profile.weight')}
              type="number"
              value={form.weightKg}
              onChange={(e) => handleChange('weightKg', e.target.value === '' ? '' : Number(e.target.value))}
              className={errors.weightKg ? 'error' : ''}
            />
            {errors.weightKg && <div className="error-text">{errors.weightKg}</div>}

            <Input
              id="profile-body-fat"
              label={t('profile.bodyFat')}
              type="number"
              value={form.bodyFatPercent}
              onChange={(e) => handleChange('bodyFatPercent', e.target.value === '' ? '' : Number(e.target.value))}
              className={errors.bodyFatPercent ? 'error' : ''}
            />
            {errors.bodyFatPercent && <div className="error-text">{errors.bodyFatPercent}</div>}

            <label className="field-label">{t('profile.goal')}</label>
            <select value={form.goal} onChange={(e) => handleChange('goal', e.target.value)} className={errors.goal ? 'error-select' : ''}>
              {GOALS.map((goal) => <option key={goal} value={goal}>{t(`profile.goalOptions.${goal}`, {}, prettify(goal))}</option>)}
            </select>
            {errors.goal && <div className="error-text">{errors.goal}</div>}

            <label className="field-label">{t('profile.activityLevel')}</label>
            <select value={form.activityLevel} onChange={(e) => handleChange('activityLevel', e.target.value)} className={errors.activityLevel ? 'error-select' : ''}>
              {ACTIVITY.map((activity) => <option key={activity} value={activity}>{t(`profile.activityOptions.${activity}`, {}, prettify(activity))}</option>)}
            </select>
            {errors.activityLevel && <div className="error-text">{errors.activityLevel}</div>}

            <label className="field-label">{t('profile.dietPreference')}</label>
            <select value={form.dietPreference} onChange={(e) => handleChange('dietPreference', e.target.value)} className={errors.dietPreference ? 'error-select' : ''}>
              {DIETS.map((diet) => <option key={diet} value={diet}>{t(`profile.dietOptions.${diet}`, {}, prettify(diet))}</option>)}
            </select>
            {errors.dietPreference && <div className="error-text">{errors.dietPreference}</div>}

            <div className="profile-form-actions">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? `${t('common.save')}...` : user?.profileCompleted ? t('profile.saveChanges') : t('profile.saveProfile')}
              </Button>
              {user?.profileCompleted ? (
                <Button type="button" variant="ghost" className="profile-cancel-btn" onClick={handleCancelEdit}>
                  {t('common.cancel')}
                </Button>
              ) : null}
            </div>
            </form>
          ) : (
            <section className="profile-overview">
              <div className="profile-overview-grid">
                <div className="profile-detail-card">
                  <span className="profile-detail-label">{t('profile.fullName')}</span>
                  <strong>{user?.name}</strong>
                </div>
                <div className="profile-detail-card">
                  <span className="profile-detail-label">{t('profile.email')}</span>
                  <strong>{user?.email}</strong>
                </div>
                <div className="profile-detail-card">
                  <span className="profile-detail-label">{t('profile.age')}</span>
                  <strong>{user?.age || t('common.notSet')}</strong>
                </div>
                <div className="profile-detail-card">
                  <span className="profile-detail-label">{t('profile.gender')}</span>
                  <strong>{user?.gender ? t(`profile.genderOptions.${user.gender}`, {}, prettify(user.gender)) : t('common.notSet')}</strong>
                </div>
                <div className="profile-detail-card">
                  <span className="profile-detail-label">{t('profile.heightShort')}</span>
                  <strong>{user?.heightCm ? `${user.heightCm} cm` : t('common.notSet')}</strong>
                </div>
                <div className="profile-detail-card">
                  <span className="profile-detail-label">{t('profile.weightShort')}</span>
                  <strong>{user?.weightKg ? `${user.weightKg} kg` : t('common.notSet')}</strong>
                </div>
              </div>
            </section>
          )}

          <section className="profile-subscription-section">
            <div className="profile-subscription-head">
              <div>
                <h3>Premium Subscription</h3>
                <p className="muted">Guide and Trends are unlocked for premium members.</p>
              </div>
            </div>

            {isSuperAdmin ? (
              <div className="profile-subscription-current">
                <strong>Super-admin account</strong>
                <span>Use the dedicated Admin Console for plan and revenue management.</span>
                <Link to="/admin" className="btn-primary profile-admin-link">Open Admin Console</Link>
              </div>
            ) : null}

            {premiumRequired && !isPremium && !isSuperAdmin ? (
              <div className="profile-premium-alert">Premium subscription is required to access Guide and Trends.</div>
            ) : null}

            {!isSuperAdmin ? (
              <div className="profile-subscription-current">
                <strong>{isPremium ? 'Premium active' : 'Free plan'}</strong>
                <span>
                  {isPremium
                    ? `Plan: ${user?.subscriptionPlanName || 'Premium'}${user?.subscriptionExpiresAt ? ` | Expires: ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}` : ''}`
                    : 'Upgrade to access Guide and Trends.'}
                </span>
              </div>
            ) : null}

            {!isSuperAdmin && plansLoading ? <p className="muted">Loading plans...</p> : null}
            {!isSuperAdmin && plansError ? <p className="muted">{plansError}</p> : null}

            {!isSuperAdmin && !plansLoading && plans.length ? (
              <div className="profile-plan-grid">
                {plans.map((plan) => {
                  const amount = Number(plan?.amountPaise || 0) / 100
                  return (
                    <article className="profile-plan-card" key={plan._id}>
                      <h4>{plan.name}</h4>
                      <p className="muted">{plan.description || 'Premium access plan'}</p>
                      <strong>{`INR ${amount.toFixed(2)}`}</strong>
                      <span>{`${plan.durationDays} day${plan.durationDays === 1 ? '' : 's'}`}</span>
                      <Button
                        type="button"
                        disabled={Boolean(purchasingPlanId)}
                        onClick={() => handleBuyPlan(plan)}
                      >
                        {purchasingPlanId === plan._id ? 'Processing...' : 'Buy plan'}
                      </Button>
                    </article>
                  )
                })}
              </div>
            ) : null}

            {!isSuperAdmin && !plansLoading && !plans.length ? <p className="muted">No subscription plans are available yet.</p> : null}
          </section>

          <div className="profile-language-footer">
            <span className="profile-language-footer-label">{t('profile.languagePreference')}</span>
            <button
              type="button"
              className={`profile-language-switch ${language === 'hi' ? 'is-hindi' : 'is-english'}`}
              onClick={handleLanguageToggle}
              aria-label={t('profile.languagePreference')}
            >
              <span className="profile-language-switch-track" aria-hidden="true">
                <span className="profile-language-switch-thumb" />
              </span>
              <span className="profile-language-switch-text">{language === 'en' ? t('common.english') : t('common.hindi')}</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={Boolean(pendingSavePayload)}
        eyebrow={user?.profileCompleted ? t('profile.reviewChanges') : t('profile.completeProfile')}
        title={user?.profileCompleted ? t('profile.saveUpdatesTitle') : t('profile.saveProfileTitle')}
        description={
          user?.profileCompleted
            ? t('profile.saveUpdatesDescription')
            : t('profile.saveProfileDescription')
        }
        confirmLabel={saving ? `${t('common.save')}...` : user?.profileCompleted ? t('profile.saveChanges') : t('profile.saveProfile')}
        cancelLabel={t('profile.keepEditing')}
        confirmDisabled={saving}
        cancelDisabled={saving}
        onClose={() => {
          if (saving) return
          setPendingSavePayload(null)
        }}
        onConfirm={async () => {
          if (!pendingSavePayload || saving) return
          const payload = pendingSavePayload
          setPendingSavePayload(null)
          await performSave(payload)
        }}
      />
    </>
  )
}

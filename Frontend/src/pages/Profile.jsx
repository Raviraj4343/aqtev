import React, { useState, useEffect } from 'react'
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

export default function Profile(){
  const { user, refresh } = useAuth() || {}
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

  const handleAvatarChange = (file) => {
    if (!file) return
    setAvatarFile(file)
    setStatus('')
    try {
      setAvatarPreview(URL.createObjectURL(file))
    } catch (e) {}
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      setStatus(t('profile.status.chooseImage'))
      return
    }

    setUploading(true)
    setStatus('')
    try {
      await api.uploadAvatar(avatarFile)
      await refresh()
      setAvatarFile(null)
      setStatus(t('profile.status.avatarUploaded'))
    } catch (err) {
      setStatus(err?.payload?.message || err.message || t('profile.status.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleCancelEdit = () => {
    resetFormFromUser()
    setIsEditing(false)
    setStatus('')
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
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={t('profile.avatarAlt', { name: user?.name || 'User' })} className="profile-avatar-image" />
                ) : (
                  <span className="profile-avatar-fallback" aria-hidden="true">
                    {(user?.name || form.name || 'U').trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="profile-avatar-actions">
                <div className="profile-avatar-head">
                  <div className="profile-avatar-copy">
                    <h2>{user?.name || form.name || t('profile.yourProfile')}</h2>
                    <p>{user?.email || t('profile.addDetailsHint')}</p>
                  </div>
                  {user?.profileCompleted && !isEditing ? (
                    <Button onClick={() => { setIsEditing(true); setStatus('') }} className="profile-edit-trigger">
                      {t('profile.edit')}
                    </Button>
                  ) : null}
                </div>

                <div className="profile-upload-row">
                  <label htmlFor="avatar" className="profile-file-label">{t('profile.chooseImage')}</label>
                  <input id="avatar" className="profile-file-input" type="file" accept="image/*" onChange={(e) => handleAvatarChange(e.target.files?.[0])} />
                  <span className="profile-file-name">{avatarFile ? avatarFile.name : t('profile.imageHint')}</span>
                </div>

                <div className="profile-upload-actions">
                  <Button onClick={handleAvatarUpload} disabled={uploading || !avatarFile}>
                    {uploading ? t('profile.uploading') : t('profile.uploadAvatar')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="profile-language-panel">
              <label className="field-label profile-language-label">{t('profile.languagePreference')}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">{t('common.english')}</option>
                <option value="hi">{t('common.hindi')}</option>
              </select>
              <div className="profile-language-hint">{t('profile.languageHint')}</div>
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

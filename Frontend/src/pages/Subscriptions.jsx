import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import * as api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import appLogo from '../logo/app_logo.png'

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

export default function Subscriptions(){
  const { user, refresh } = useAuth() || {}
  const { search } = useLocation()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [status, setStatus] = useState('')
  const [processingPlanId, setProcessingPlanId] = useState('')

  const premiumRequired = new URLSearchParams(search).get('required') === '1'
  const isPremium = hasPremiumAccess(user)

  useEffect(() => {
    let mounted = true

    api.getSubscriptionPlans()
      .then((res) => {
        if (!mounted) return
        const list = Array.isArray(res?.data?.plans) ? res.data.plans : []
        setPlans(list.filter((plan) => plan?.isActive))
      })
      .catch((err) => {
        if (!mounted) return
        setPlans([])
        setStatus(String(err?.payload?.message || err?.message || 'Unable to load subscription plans.'))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true

    api.getMySubscriptionPayments()
      .then((res) => {
        if (!mounted) return
        const list = Array.isArray(res?.data?.payments) ? res.data.payments : []
        setPayments(list)
      })
      .catch(() => {
        if (!mounted) return
        setPayments([])
      })
      .finally(() => {
        if (mounted) setHistoryLoading(false)
      })

    return () => { mounted = false }
  }, [])

  const sortedPlans = useMemo(() => (
    [...plans].sort((a, b) => Number(a?.amountPaise || 0) - Number(b?.amountPaise || 0))
  ), [plans])

  const handleBuyPlan = async (plan) => {
    if (!plan?._id || processingPlanId) return

    setProcessingPlanId(plan._id)
    setStatus('')

    try {
      const hasScript = await loadRazorpayScript()
      if (!hasScript || !window.Razorpay) throw new Error('Payment gateway could not be loaded.')

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
          image: appLogo,
          description: `${plan.name} (${plan.durationDays} days)`,
          order_id: order.id,
          method: {
            upi: true,
            card: true,
            netbanking: true,
            wallet: true,
            paylater: true,
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: 'Pay via UPI',
                  instruments: [{ method: 'upi' }],
                },
              },
              sequence: ['block.upi'],
              preferences: {
                show_default_blocks: true,
              },
            },
          },
          prefill: {
            name: user?.name,
            email: user?.email
          },
          theme: { color: '#027e9a' },
          handler: async (response) => {
            try {
              await api.verifySubscriptionPayment({
                planId: plan._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
              await refresh()
              const historyRes = await api.getMySubscriptionPayments()
              const list = Array.isArray(historyRes?.data?.payments) ? historyRes.data.payments : []
              setPayments(list)
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
      setProcessingPlanId('')
    }
  }

  return (
    <div className="page subscriptions-page">
      <section className="card subscriptions-hero">
        <div>
          <span className="dashboard-eyebrow">Premium Access</span>
          <h1>Subscriptions</h1>
          <p className="muted">Choose a plan to unlock Guide and Trends with a secure checkout.</p>
        </div>
      </section>

      {premiumRequired && !isPremium ? (
        <div className="profile-premium-alert">Premium is required to access Guide and Trends.</div>
      ) : null}

      {status ? <div className="profile-status">{status}</div> : null}

      <section className="subscriptions-current card">
        {user?.role === 'super_admin' ? (
          <p className="muted">Super-admin has premium access by default. Manage plans from the <Link to="/admin" className="community-profile-link">Admin Console</Link>.</p>
        ) : isPremium ? (
          <div className="subscriptions-active">
            <strong>Premium Active</strong>
            <span>{`Plan: ${user?.subscriptionPlanName || 'Premium'}${user?.subscriptionExpiresAt ? ` · Expires: ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}` : ''}`}</span>
          </div>
        ) : (
          <div className="subscriptions-active">
            <strong>Free Plan</strong>
            <span>Upgrade to unlock premium insights and trends.</span>
          </div>
        )}
        <p className="muted" style={{ marginTop: 10 }}>
          If UPI is not visible in checkout, your Razorpay account mode or payment-method settings may be limiting it. You can still pay via card, netbanking, wallet, or pay later.
        </p>
      </section>

      <section className="subscriptions-grid">
        {loading ? (
          <Card><p className="muted">Loading plans...</p></Card>
        ) : sortedPlans.length ? sortedPlans.map((plan) => {
          const amountInr = Number(plan?.amountPaise || 0) / 100
          const isProcessing = processingPlanId === plan._id

          return (
            <Card key={plan._id} className="subscriptions-plan-card">
              <div className="subscriptions-plan-head">
                <h3>{plan.name}</h3>
                <strong>{`INR ${amountInr.toFixed(2)}`}</strong>
              </div>
              <p className="muted">{plan.description || 'Premium access plan.'}</p>
              <span className="subscriptions-duration">{`${plan.durationDays} day${plan.durationDays === 1 ? '' : 's'} access`}</span>
              <Button
                type="button"
                disabled={Boolean(processingPlanId) || user?.role === 'super_admin'}
                onClick={() => handleBuyPlan(plan)}
              >
                {isProcessing ? 'Processing...' : 'Buy plan'}
              </Button>
            </Card>
          )
        }) : (
          <Card><p className="muted">No active subscription plans are available right now.</p></Card>
        )}
      </section>

      <section className="card subscriptions-history-card">
        <div className="subscriptions-history-head">
          <div>
            <h3>Billing History</h3>
            <p className="muted">Your successful subscription payments.</p>
          </div>
        </div>

        {historyLoading ? (
          <p className="muted">Loading billing history...</p>
        ) : payments.length ? (
          <div className="subscriptions-history-list">
            {payments.map((entry) => {
              const amountInr = (Number(entry?.amountPaise || 0) / 100).toFixed(2)
              const paidDate = entry?.paidAt ? new Date(entry.paidAt).toLocaleString() : '-'
              const planName = entry?.plan?.name || 'Premium Plan'

              return (
                <article className="subscriptions-history-item" key={entry._id}>
                  <div>
                    <strong>{planName}</strong>
                    <span>{paidDate}</span>
                  </div>
                  <div>
                    <strong>{`INR ${amountInr}`}</strong>
                    <span>{entry?.razorpayPaymentId ? `Payment ID: ${entry.razorpayPaymentId}` : 'Payment completed'}</span>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="muted">No successful payments yet.</p>
        )}
      </section>
    </div>
  )
}

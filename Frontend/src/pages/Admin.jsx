import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import ConfirmationModal from '../components/ConfirmationModal'
import * as api from '../utils/api'

const EMPTY_PLAN = {
  name: '',
  description: '',
  amountInr: '',
  durationDays: ''
}

export default function Admin(){
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [loadingRevenue, setLoadingRevenue] = useState(true)
  const [revenue, setRevenue] = useState(null)
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState('')
  const [busyPlanId, setBusyPlanId] = useState('')
  const [pendingPlanAction, setPendingPlanAction] = useState(null)
  const [createForm, setCreateForm] = useState(EMPTY_PLAN)
  const [editForm, setEditForm] = useState(EMPTY_PLAN)

  const loadPlans = async () => {
    setLoadingPlans(true)
    try {
      const res = await api.getSubscriptionPlans({ includeInactive: 1 })
      setPlans(Array.isArray(res?.data?.plans) ? res.data.plans : [])
    } catch (err) {
      setPlans([])
      setStatus(String(err?.payload?.message || err?.message || 'Unable to load subscription plans.'))
    } finally {
      setLoadingPlans(false)
    }
  }

  const loadRevenue = async () => {
    setLoadingRevenue(true)
    try {
      const res = await api.getRevenueSummary()
      setRevenue(res?.data || null)
    } catch (err) {
      setRevenue(null)
      setStatus(String(err?.payload?.message || err?.message || 'Unable to load revenue summary.'))
    } finally {
      setLoadingRevenue(false)
    }
  }

  useEffect(() => {
    loadPlans()
    loadRevenue()
  }, [])

  const recentPayments = useMemo(() => (
    Array.isArray(revenue?.recentPayments) ? revenue.recentPayments : []
  ), [revenue])

  const handleCreatePlan = async (event) => {
    event.preventDefault()
    if (creating) return

    setCreating(true)
    setStatus('')

    try {
      await api.createSubscriptionPlan({
        name: createForm.name,
        description: createForm.description,
        amountInr: Number(createForm.amountInr),
        durationDays: Number(createForm.durationDays)
      })
      setCreateForm(EMPTY_PLAN)
      await Promise.all([loadPlans(), loadRevenue()])
      setStatus('Plan created successfully.')
    } catch (err) {
      setStatus(String(err?.payload?.message || err?.message || 'Unable to create plan.'))
    } finally {
      setCreating(false)
    }
  }

  const startEditing = (plan) => {
    setEditingPlanId(plan?._id || '')
    setEditForm({
      name: plan?.name || '',
      description: plan?.description || '',
      amountInr: Number(plan?.amountPaise || 0) / 100,
      durationDays: plan?.durationDays || ''
    })
  }

  const saveEditing = async (planId) => {
    if (!planId || busyPlanId) return

    setBusyPlanId(planId)
    setStatus('')

    try {
      await api.updateSubscriptionPlan(planId, {
        name: editForm.name,
        description: editForm.description,
        amountInr: Number(editForm.amountInr),
        durationDays: Number(editForm.durationDays)
      })
      setEditingPlanId('')
      await loadPlans()
      setStatus('Plan updated successfully.')
    } catch (err) {
      setStatus(String(err?.payload?.message || err?.message || 'Unable to update plan.'))
    } finally {
      setBusyPlanId('')
    }
  }

  const togglePlanStatus = async (plan) => {
    if (!plan?._id || busyPlanId) return
    setPendingPlanAction({ type: 'status', plan })
  }

  const removePlan = async (plan) => {
    if (!plan?._id || busyPlanId) return
    setPendingPlanAction({ type: 'delete', plan })
  }

  const confirmPlanAction = async () => {
    if (!pendingPlanAction?.plan?._id || busyPlanId) return

    const { plan, type } = pendingPlanAction
    setBusyPlanId(plan._id)
    setStatus('')

    try {
      if (type === 'delete') {
        await api.deleteSubscriptionPlan(plan._id)
        await Promise.all([loadPlans(), loadRevenue()])
        setStatus('Plan delete request processed successfully.')
      } else {
        await api.setSubscriptionPlanStatus(plan._id, !plan.isActive)
        await loadPlans()
        setStatus(plan.isActive ? 'Plan deactivated.' : 'Plan activated.')
      }
      setPendingPlanAction(null)
    } catch (err) {
      setStatus(String(err?.payload?.message || err?.message || 'Unable to process this plan action.'))
    } finally {
      setBusyPlanId('')
    }
  }

  return (
    <div className="page admin-page">
      <section className="card admin-hero">
        <div>
          <span className="dashboard-eyebrow">Super Admin</span>
          <h1>Admin Console</h1>
          <p className="muted">Manage plans, monitor revenue, and reconcile subscription operations.</p>
        </div>
      </section>

      {status ? <div className="profile-status">{status}</div> : null}

      <div className="admin-grid">
        <Card className="admin-card">
          <h3>Create Subscription Plan</h3>
          <form className="admin-plan-form" onSubmit={handleCreatePlan}>
            <Input
              id="admin-plan-name"
              label="Plan name"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              id="admin-plan-description"
              label="Description"
              value={createForm.description}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <Input
              id="admin-plan-amount"
              label="Amount (INR)"
              type="number"
              value={createForm.amountInr}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, amountInr: event.target.value }))}
            />
            <Input
              id="admin-plan-duration"
              label="Duration (days)"
              type="number"
              value={createForm.durationDays}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, durationDays: event.target.value }))}
            />
            <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create plan'}</Button>
          </form>
        </Card>

        <Card className="admin-card">
          <h3>Revenue Collection</h3>
          <div className="admin-revenue-block">
            <strong>{loadingRevenue ? '-' : `INR ${(Number(revenue?.totalPaidPaise || 0) / 100).toFixed(2)}`}</strong>
            <span>{loadingRevenue ? '-' : `${Number(revenue?.paidTransactions || 0)} successful payments`}</span>
          </div>
          <Button type="button" variant="ghost" onClick={loadRevenue} disabled={loadingRevenue}>
            {loadingRevenue ? 'Refreshing...' : 'Refresh revenue'}
          </Button>
        </Card>
      </div>

      <Card className="admin-card">
        <h3>Plans</h3>
        {loadingPlans ? <p className="muted">Loading plans...</p> : null}

        {!loadingPlans && !plans.length ? (
          <p className="muted">No plans found.</p>
        ) : null}

        {!loadingPlans && plans.length ? (
          <div className="admin-plan-list">
            {plans.map((plan) => {
              const isEditing = editingPlanId === plan._id
              const isBusy = busyPlanId === plan._id

              return (
                <article className="admin-plan-item" key={plan._id}>
                  {isEditing ? (
                    <div className="admin-plan-edit-grid">
                      <Input
                        id={`edit-name-${plan._id}`}
                        label="Name"
                        value={editForm.name}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                      />
                      <Input
                        id={`edit-description-${plan._id}`}
                        label="Description"
                        value={editForm.description}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                      />
                      <Input
                        id={`edit-amount-${plan._id}`}
                        label="Amount (INR)"
                        type="number"
                        value={editForm.amountInr}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, amountInr: event.target.value }))}
                      />
                      <Input
                        id={`edit-duration-${plan._id}`}
                        label="Duration (days)"
                        type="number"
                        value={editForm.durationDays}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, durationDays: event.target.value }))}
                      />
                    </div>
                  ) : (
                    <div>
                      <h4>{plan.name}</h4>
                      <p className="muted">{plan.description || 'No description provided.'}</p>
                      <div className="admin-plan-meta">
                        <span>{`INR ${(Number(plan.amountPaise || 0) / 100).toFixed(2)}`}</span>
                        <span>{`${plan.durationDays} day${plan.durationDays === 1 ? '' : 's'}`}</span>
                        <span>{plan.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  )}

                  <div className="admin-plan-actions">
                    {isEditing ? (
                      <>
                        <Button type="button" disabled={isBusy} onClick={() => saveEditing(plan._id)}>
                          {isBusy ? 'Saving...' : 'Save'}
                        </Button>
                        <Button type="button" variant="ghost" disabled={isBusy} onClick={() => setEditingPlanId('')}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="ghost" disabled={isBusy} onClick={() => startEditing(plan)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" disabled={isBusy} onClick={() => togglePlanStatus(plan)}>
                          {plan.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button type="button" variant="ghost" disabled={isBusy} onClick={() => removePlan(plan)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </Card>

      <Card className="admin-card">
        <h3>Recent Paid Transactions</h3>
        {!recentPayments.length ? (
          <p className="muted">No paid transactions yet.</p>
        ) : (
          <div className="admin-payment-list">
            {recentPayments.map((entry) => (
              <div className="admin-payment-item" key={entry._id}>
                <strong>{entry?.user?.name || entry?.user?.email || 'User'}</strong>
                <span>{entry?.plan?.name || 'Plan'}</span>
                <span>{`INR ${(Number(entry?.amountPaise || 0) / 100).toFixed(2)}`}</span>
                <span>{entry?.paidAt ? new Date(entry.paidAt).toLocaleString() : '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmationModal
        open={Boolean(pendingPlanAction)}
        tone={pendingPlanAction?.type === 'delete' ? 'danger' : 'default'}
        eyebrow="Super Admin"
        title={
          pendingPlanAction?.type === 'delete'
            ? 'Delete plan?'
            : pendingPlanAction?.plan?.isActive
              ? 'Deactivate plan?'
              : 'Activate plan?'
        }
        description={
          pendingPlanAction?.type === 'delete'
            ? `Delete plan "${pendingPlanAction?.plan?.name || 'this plan'}"? If payments exist, the plan will be deactivated instead.`
            : pendingPlanAction?.plan?.isActive
              ? 'This plan will no longer be available for new purchases.'
              : 'This plan will become available for new purchases.'
        }
        confirmLabel={
          busyPlanId
            ? 'Processing...'
            : pendingPlanAction?.type === 'delete'
              ? 'Delete plan'
              : pendingPlanAction?.plan?.isActive
                ? 'Deactivate'
                : 'Activate'
        }
        cancelLabel="Cancel"
        confirmDisabled={Boolean(busyPlanId)}
        cancelDisabled={Boolean(busyPlanId)}
        details={pendingPlanAction?.plan ? [
          { label: 'Plan', value: pendingPlanAction.plan.name || 'Subscription plan' },
          { label: 'Amount', value: `INR ${(Number(pendingPlanAction.plan.amountPaise || 0) / 100).toFixed(2)}` },
          { label: 'Duration', value: `${pendingPlanAction.plan.durationDays} day${pendingPlanAction.plan.durationDays === 1 ? '' : 's'}` }
        ] : []}
        onClose={() => {
          if (busyPlanId) return
          setPendingPlanAction(null)
        }}
        onConfirm={confirmPlanAction}
      />
    </div>
  )
}

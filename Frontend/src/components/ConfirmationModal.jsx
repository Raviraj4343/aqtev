import React, { useEffect } from 'react'
import Button from './ui/Button'

export default function ConfirmationModal({
  open = false,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  confirmDisabled = false,
  cancelDisabled = false,
  tone = 'default',
  eyebrow,
  details = [],
  children = null
}) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="confirm-modal-backdrop" onClick={() => onClose?.()} aria-hidden="true">
      <div
        className={`confirm-modal ${tone === 'danger' ? 'danger' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="confirm-modal-close"
          aria-label="Close confirmation dialog"
          onClick={() => onClose?.()}
        >x</button>

        <div className="confirm-modal-head">
          {eyebrow ? <span className="confirm-modal-eyebrow">{eyebrow}</span> : null}
          <h3 id="confirm-modal-title">{title}</h3>
          {description ? <p className="muted">{description}</p> : null}
        </div>

        {details.length ? (
          <div className="confirm-modal-body">
            <div className="confirm-modal-grid">
              {details.map((detail) => (
                <div key={detail.label} className="confirm-modal-card">
                  <span>{detail.label}</span>
                  <p>{detail.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {children ? <div className="confirm-modal-body">{children}</div> : null}

        <div className="confirm-modal-actions">
          <Button
            type="button"
            variant="ghost"
            className="confirm-modal-cancel"
            onClick={() => onClose?.()}
            disabled={cancelDisabled}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="confirm-modal-confirm"
            onClick={() => onConfirm?.()}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

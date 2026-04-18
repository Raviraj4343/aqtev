import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import ConfirmationModal from '../components/ConfirmationModal'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

function Icon({ name, className = '', filled = false }) {
  const commonProps = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true'
  }

  switch (name) {
    case 'heart':
      return filled ? (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7.2-4.8-9.5-8.4C.5 9.6 2.1 5.7 5.8 4.7c2-.5 4.2.1 5.6 1.7 1.4-1.6 3.6-2.2 5.6-1.7 3.7 1 5.3 4.9 3.3 7.9C19.2 16.2 12 21 12 21z" />
        </svg>
      ) : (
        <svg {...commonProps}><path d="M20.8 8.3c0 5.5-8.8 11.9-8.8 11.9S3.2 13.8 3.2 8.3A5.1 5.1 0 0 1 12 5a5.1 5.1 0 0 1 8.8 3.3z" /></svg>
      )
    case 'comment':
      return <svg {...commonProps}><path d="M20 15.2a3 3 0 0 1-3 3H9l-5 3v-3.1a3 3 0 0 1-2-2.9V6.8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z" /></svg>
    case 'trash':
      return <svg {...commonProps}><path d="M3 6h18" /><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" /><path d="M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
    case 'eye':
      return <svg {...commonProps}><path d="M2.5 12s3.7-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.7 6.5-9.5 6.5S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></svg>
    case 'chevron-left':
      return <svg {...commonProps}><path d="m15 6-6 6 6 6" /></svg>
    case 'chevron-right':
      return <svg {...commonProps}><path d="m9 6 6 6-6 6" /></svg>
    case 'close':
      return <svg {...commonProps}><path d="m6 6 12 12" /><path d="m18 6-12 12" /></svg>
    case 'image':
      return <svg {...commonProps}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 15-4.3-4.3a2 2 0 0 0-2.8 0L7 18" /></svg>
    case 'plus':
      return <svg {...commonProps}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
    default:
      return null
  }
}

const formatCount = (value = 0, label) => `${value} ${label}${value === 1 ? '' : 's'}`

const formatRelativeDate = (value) => {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

const getAuthorBadge = (author = {}) => {
  if (String(author?.role || '') === 'super_admin') return 'Moderator'
  return '    Community member'
}

function PostComposer({ onCreate, loading, currentUser, onClose }){
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files]
  )

  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews])

  const submit = async (event) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (trimmedTitle.length < 3) {
      setError('Please enter a stronger title.')
      return
    }

    if (trimmedDescription.length < 10) {
      setError('Please add a little more detail to your post.')
      return
    }

    setError('')
    const created = await onCreate({
      title: trimmedTitle,
      description: trimmedDescription,
      images: files
    }).catch((err) => {
      setError(String(err?.payload?.message || err?.message || 'Unable to publish the post right now.'))
      return null
    })

    if (!created) return

    setTitle('')
    setDescription('')
    setFiles([])
    onClose?.()
  }

  return (
    <Card className="community-composer-card">
      <div className="community-section-head community-section-head-inline">
        <div>
          <span className="dashboard-eyebrow">Health Community</span>
          <h2>Create a post</h2>
          <p className="muted">Share updates, wins, and useful health insights with the community.</p>
        </div>
        <button type="button" className="community-action-btn" onClick={onClose}>Close</button>
      </div>

      <form className="community-composer" onSubmit={submit}>
        <div className="community-composer-author">
          <div className="community-avatar">
            {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" /> : <span>{(currentUser?.name || 'U').charAt(0).toUpperCase()}</span>}
          </div>
          <div>
            <strong>{currentUser?.name || 'Your profile'}</strong>
            <p className="muted">Write a clear, helpful update.</p>
          </div>
        </div>

        <Input
          id="community-post-title"
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          maxLength={120}
        />

        <label className="community-textarea-field" htmlFor="community-post-description">
          <span>Description</span>
          <textarea
            id="community-post-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Share what you're working on, what helped, or what advice you're looking for."
            rows={5}
            maxLength={3000}
          />
        </label>

        <label className="community-upload-field" htmlFor="community-post-images">
          <span>Images</span>
          <small>Upload up to 4 images. PNG, JPG, and WEBP work best.</small>
          <input
            id="community-post-images"
            type="file"
            multiple
            accept="image/*"
            onChange={(event) => {
              const nextFiles = Array.from(event.target.files || []).slice(0, 4)
              setFiles(nextFiles)
              setError('')
            }}
          />
        </label>

        {previews.length ? (
          <div className="community-preview-grid">
            {previews.map((item) => (
              <div className="community-preview-tile" key={`${item.file.name}-${item.file.size}`}>
                <img src={item.url} alt={item.file.name} />
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="community-inline-error">{error}</p> : null}

        <div className="community-composer-actions">
          <span className="muted">Keep it helpful, respectful, and relevant to health, food, training, recovery, or wellness.</span>
          <div className="community-composer-actions-right">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Publishing...' : 'Publish post'}</Button>
          </div>
        </div>
      </form>
    </Card>
  )
}

function PostCard({ post, onLike, onComment, onDelete, onOpenImage, onAuthorProfileClick, currentUserId, canModeratePosts }){
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const submitComment = async (event) => {
    event.preventDefault()
    const trimmed = comment.trim()
    if (!trimmed) return

    setSubmittingComment(true)
    try {
      await onComment(post._id, trimmed)
      setComment('')
    } finally {
      setSubmittingComment(false)
    }
  }

  const isOwnPost = String(post.author?._id || '') === String(currentUserId || '')
  const canDeletePost = canModeratePosts || isOwnPost

  useEffect(() => {
    setActiveImageIndex(0)
  }, [post?._id])

  const imageCount = Array.isArray(post.images) ? post.images.length : 0

  const showPrevInlineImage = () => {
    if (imageCount < 2) return
    setActiveImageIndex((prev) => (prev - 1 + imageCount) % imageCount)
  }

  const showNextInlineImage = () => {
    if (imageCount < 2) return
    setActiveImageIndex((prev) => (prev + 1) % imageCount)
  }

  return (
    <Card className="community-post-card">
      <article className="community-post">
        <div className="community-post-header">
          <button
            type="button"
            className="community-author-button is-clickable"
            onClick={() => onAuthorProfileClick(post.author?._id)}
            aria-label="Open profile"
          >
            <div className="community-avatar">
              {post.author?.avatarUrl ? <img src={post.author.avatarUrl} alt="" /> : <span>{(post.author?.name || 'U').charAt(0).toUpperCase()}</span>}
            </div>
            <div>
              <strong>{post.author?.name || 'Community member'}</strong>
              <span>{getAuthorBadge(post.author) || 'Health community member'}</span>
            </div>
          </button>
          <div className="community-post-date">{formatRelativeDate(post.createdAt)}</div>
        </div>

        <div className="community-post-copy">
          <h3>{post.title}</h3>
          <p>{post.description}</p>
        </div>

        {post.images?.length ? (
          <>
            <div className="community-media-grid">
              {post.images.map((image, index) => (
                <button
                  type="button"
                  className="community-media-tile"
                  key={`${post._id}-image-${index}`}
                  onClick={() => onOpenImage(post, index)}
                  aria-label={`Open image ${index + 1} from ${post.title}`}
                >
                  <img src={image.url} alt={`${post.title} ${index + 1}`} />
                  <span className="community-media-overlay">
                    <Icon name="image" className="community-icon" />
                    View image
                  </span>
                </button>
              ))}
            </div>

            <div className="community-media-carousel" role="group" aria-label="Post images carousel">
              <div className="community-media-track" style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}>
                {post.images.map((image, index) => (
                  <button
                    type="button"
                    className="community-media-slide"
                    key={`${post._id}-mobile-image-${index}`}
                    onClick={() => onOpenImage(post, index)}
                    aria-label={`Open image ${index + 1} from ${post.title}`}
                  >
                    <img src={image.url} alt={`${post.title} ${index + 1}`} />
                  </button>
                ))}
              </div>

              {imageCount > 1 ? (
                <>
                  <button
                    type="button"
                    className="community-carousel-nav prev"
                    onClick={showPrevInlineImage}
                    aria-label="Previous image"
                  >
                    <Icon name="chevron-left" className="community-icon" />
                  </button>
                  <button
                    type="button"
                    className="community-carousel-nav next"
                    onClick={showNextInlineImage}
                    aria-label="Next image"
                  >
                    <Icon name="chevron-right" className="community-icon" />
                  </button>
                  <span className="community-carousel-index">{activeImageIndex + 1}/{imageCount}</span>
                </>
              ) : null}
            </div>
          </>
        ) : null}

        <div className="community-post-stats">
          <button
            type="button"
            className={`community-post-stat-btn ${post.likedByMe ? 'active' : ''}`}
            onClick={() => onLike(post._id)}
            aria-label={post.likedByMe ? 'Unlike post' : 'Like post'}
          >
            <Icon name="heart" className="community-icon" filled={Boolean(post.likedByMe)} />
            {formatCount(post.likeCount || 0, 'like')}
          </button>
          <button
            type="button"
            className="community-post-stat-btn"
            onClick={() => document.getElementById(`community-comment-${post._id}`)?.focus()}
            aria-label="Comment on post"
          >
            <Icon name="comment" className="community-icon" />
            {formatCount(post.commentCount || 0, 'comment')}
          </button>
          <span><Icon name="eye" className="community-icon" /> {formatCount(post.viewsCount || 0, 'view')}</span>
        </div>

        <div className="community-post-actions">
          {canDeletePost ? (
            <button type="button" className="community-action-btn community-action-btn-danger" onClick={() => onDelete(post._id)}>
              <Icon name="trash" className="community-icon" />
              Delete
            </button>
          ) : null}
          {isOwnPost ? <span className="community-owned-tag">Your post</span> : null}
        </div>

        <div className="community-comments">
          {post.comments?.length ? post.comments.map((entry) => (
            <div className="community-comment" key={entry._id}>
              <button
                type="button"
                className="community-comment-author is-clickable"
                onClick={() => onAuthorProfileClick(entry.author?._id)}
                aria-label="Open profile"
              >
                <div className="community-avatar small">
                  {entry.author?.avatarUrl ? <img src={entry.author.avatarUrl} alt="" /> : <span>{(entry.author?.name || 'U').charAt(0).toUpperCase()}</span>}
                </div>
                <strong>{entry.author?.name || 'Member'}</strong>
              </button>
              <p>{entry.text}</p>
            </div>
          )) : (
            <p className="muted">No comments yet.</p>
          )}
        </div>

        <form className="community-comment-form" onSubmit={submitComment}>
          <input
            id={`community-comment-${post._id}`}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a comment"
            maxLength={800}
          />
          <Button type="submit" disabled={submittingComment}>{submittingComment ? 'Posting...' : 'Post comment'}</Button>
        </form>
      </article>
    </Card>
  )
}

export default function Community(){
  const { user } = useAuth() || {}
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const viewedRef = useRef(new Set())
  const [isComposerOpen, setComposerOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [pendingDeletePost, setPendingDeletePost] = useState(null)
  const [deletingPostId, setDeletingPostId] = useState('')
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const canModeratePosts = user?.role === 'super_admin'

  const closeLightbox = () => setLightbox(null)

  const openLightbox = (post, startIndex = 0) => {
    const images = Array.isArray(post?.images) ? post.images.filter((item) => item?.url) : []
    if (!images.length) return
    const safeIndex = Math.min(Math.max(startIndex, 0), images.length - 1)
    setLightbox({
      postId: post?._id,
      title: post?.title || 'Post image',
      images,
      index: safeIndex
    })
  }

  const showPrevImage = () => {
    setLightbox((current) => {
      if (!current || !current.images.length) return current
      const nextIndex = (current.index - 1 + current.images.length) % current.images.length
      return { ...current, index: nextIndex }
    })
  }

  const showNextImage = () => {
    setLightbox((current) => {
      if (!current || !current.images.length) return current
      const nextIndex = (current.index + 1) % current.images.length
      return { ...current, index: nextIndex }
    })
  }

  const refreshPosts = async () => {
    if (!user) {
      setPosts([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.getPosts()
      setPosts(Array.isArray(res?.data) ? res.data : [])
    } catch (err) {
      setError(String(err?.payload?.message || err?.message || 'Unable to load community posts right now.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshPosts()
  }, [user])

  useEffect(() => {
    const pending = posts
      .filter((post) => post?._id && !viewedRef.current.has(post._id))
      .slice(0, 8)

    pending.forEach((post) => {
      viewedRef.current.add(post._id)
      api.recordPostView(post._id)
        .then(() => {})
        .catch(() => {})
    })
  }, [posts])

  useEffect(() => {
    if (!lightbox) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeLightbox()
      if (event.key === 'ArrowLeft') showPrevImage()
      if (event.key === 'ArrowRight') showNextImage()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [lightbox])

  const updateSinglePost = (nextPost) => {
    if (!nextPost?._id) return
    setPosts((current) => current.map((item) => (item._id === nextPost._id ? nextPost : item)))
  }

  const createPost = async (payload) => {
    setSubmitting(true)
    try {
      const res = await api.createPost(payload)
      const created = res?.data
      if (created?._id) {
        viewedRef.current.add(created._id)
        setPosts((current) => [created, ...current])
      }
      return created
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (postId) => {
    const res = await api.togglePostLike(postId)
    updateSinglePost(res?.data)
  }

  const handleComment = async (postId, text) => {
    const res = await api.addPostComment(postId, text)
    updateSinglePost(res?.data)
  }

  const handleDelete = async (postId) => {
    const target = posts.find((item) => item._id === postId)
    if (!target) return
    setDeleteConfirmationText('')
    setPendingDeletePost(target)
  }

  const confirmDeletePost = async () => {
    if (!pendingDeletePost?._id || deletingPostId) return

    setDeletingPostId(pendingDeletePost._id)
    try {
      await api.deletePost(pendingDeletePost._id)
      setPosts((current) => current.filter((item) => item._id !== pendingDeletePost._id))
      setPendingDeletePost(null)
      setDeleteConfirmationText('')
    } catch (err) {
      setError(String(err?.payload?.message || err?.message || 'Unable to delete this post right now.'))
    } finally {
      setDeletingPostId('')
    }
  }

  return (
    <div className="page community-page">
      <section className="community-feed-head">
        <span className="dashboard-eyebrow">Community Feed</span>
        <h1>Community Posts</h1>
      </section>

      {error ? <Card className="community-error-card"><p>{error}</p></Card> : null}

      {loading ? (
        <Card><p className="muted">Loading posts...</p></Card>
      ) : posts.length ? posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          onLike={handleLike}
          onComment={handleComment}
          onDelete={handleDelete}
          onOpenImage={openLightbox}
          onAuthorProfileClick={(userId) => {
            if (!userId) return
            navigate(`/profile/${encodeURIComponent(userId)}`)
          }}
          currentUserId={user?._id}
          canModeratePosts={canModeratePosts}
        />
      )) : (
        <Card>
          <p className="muted">No posts yet. Tap + to share the first update.</p>
        </Card>
      )}

      <button
        type="button"
        className="community-fab"
        aria-label={isComposerOpen ? 'Close post editor' : 'Create post'}
        onClick={() => setComposerOpen((prev) => !prev)}
      >
        <Icon name={isComposerOpen ? 'close' : 'plus'} className="community-icon" />
      </button>

      {isComposerOpen ? (
        <div className="community-compose-modal" onClick={() => setComposerOpen(false)}>
          <div className="community-compose-panel" onClick={(event) => event.stopPropagation()}>
            <PostComposer
              onCreate={createPost}
              loading={submitting}
              currentUser={user}
              onClose={() => setComposerOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {lightbox ? (
        <div className="community-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={closeLightbox}>
          <div className="community-lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="community-lightbox-close" onClick={closeLightbox} aria-label="Close image viewer">
              <Icon name="close" className="community-icon" />
            </button>

            <div className="community-lightbox-stage">
              <button
                type="button"
                className="community-lightbox-nav prev"
                onClick={showPrevImage}
                aria-label="Previous image"
              >
                <Icon name="chevron-left" className="community-icon" />
              </button>

              <img
                src={lightbox.images[lightbox.index]?.url}
                alt={`${lightbox.title} ${lightbox.index + 1}`}
                className="community-lightbox-image"
              />

              <button
                type="button"
                className="community-lightbox-nav next"
                onClick={showNextImage}
                aria-label="Next image"
              >
                <Icon name="chevron-right" className="community-icon" />
              </button>
            </div>

            <div className="community-lightbox-foot">
              <strong>{lightbox.title}</strong>
              <span>{lightbox.index + 1} / {lightbox.images.length}</span>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        open={Boolean(pendingDeletePost)}
        tone="danger"
        eyebrow={canModeratePosts ? 'Super Admin' : 'Confirm action'}
        title="Delete post permanently?"
        description="This action removes the post, images, and comments from the community feed. Type DELETE to continue."
        confirmLabel={deletingPostId ? 'Deleting...' : 'Delete post'}
        cancelLabel="Cancel"
        confirmDisabled={Boolean(deletingPostId) || deleteConfirmationText.trim() !== 'DELETE'}
        cancelDisabled={Boolean(deletingPostId)}
        details={pendingDeletePost ? [
          { label: 'Author', value: pendingDeletePost?.author?.name || 'Community member' },
          { label: 'Title', value: pendingDeletePost?.title || 'Untitled post' },
          { label: 'Created', value: pendingDeletePost?.createdAt ? new Date(pendingDeletePost.createdAt).toLocaleString() : 'Unknown' }
        ] : []}
        onClose={() => {
          if (deletingPostId) return
          setPendingDeletePost(null)
          setDeleteConfirmationText('')
        }}
        onConfirm={confirmDeletePost}
      >
        <label className="community-delete-confirm-field" htmlFor="community-delete-confirm-input">
          <span>Type DELETE to confirm</span>
          <input
            id="community-delete-confirm-input"
            value={deleteConfirmationText}
            onChange={(event) => setDeleteConfirmationText(event.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </label>
      </ConfirmationModal>
    </div>
  )
}

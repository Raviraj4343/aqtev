import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

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
  const labels = [author.goal, author.activityLevel, author.dietPreference]
    .filter(Boolean)
    .map((item) => String(item).replace(/_/g, ' '))
  return labels.join(' • ')
}

function PostComposer({ onCreate, loading, currentUser }){
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
  }

  return (
    <Card className="community-composer-card">
      <div className="community-section-head">
        <div>
          <span className="dashboard-eyebrow">Health Community</span>
          <h2>Share a professional update</h2>
          <p className="muted">Post health wins, routines, questions, or progress updates with images and discussion.</p>
        </div>
      </div>

      <form className="community-composer" onSubmit={submit}>
        <div className="community-composer-author">
          <div className="community-avatar">
            {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" /> : <span>{(currentUser?.name || 'U').charAt(0).toUpperCase()}</span>}
          </div>
          <div>
            <strong>{currentUser?.name || 'Your profile'}</strong>
            <p className="muted">Create a thoughtful health-related post for the community feed.</p>
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
          <Button type="submit" disabled={loading}>{loading ? 'Publishing...' : 'Publish post'}</Button>
        </div>
      </form>
    </Card>
  )
}

function PostCard({ post, onLike, onComment, onAuthorClick, currentUserId }){
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

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

  return (
    <Card className="community-post-card">
      <article className="community-post">
        <div className="community-post-header">
          <button type="button" className="community-author-button" onClick={() => onAuthorClick(post.author?._id)}>
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
          <div className="community-media-grid">
            {post.images.map((image, index) => (
              <div className="community-media-tile" key={`${post._id}-image-${index}`}>
                <img src={image.url} alt={`${post.title} ${index + 1}`} />
              </div>
            ))}
          </div>
        ) : null}

        <div className="community-post-stats">
          <span>{formatCount(post.likeCount || 0, 'like')}</span>
          <span>{formatCount(post.commentCount || 0, 'comment')}</span>
          <span>{formatCount(post.viewsCount || 0, 'view')}</span>
        </div>

        <div className="community-post-actions">
          <button type="button" className={`community-action-btn ${post.likedByMe ? 'active' : ''}`} onClick={() => onLike(post._id)}>
            {post.likedByMe ? 'Liked' : 'Like'}
          </button>
          <button type="button" className="community-action-btn" onClick={() => document.getElementById(`community-comment-${post._id}`)?.focus()}>
            Comment
          </button>
          {String(post.author?._id || '') === String(currentUserId || '') ? <span className="community-owned-tag">Your post</span> : null}
        </div>

        <div className="community-comments">
          {post.comments?.length ? post.comments.map((entry) => (
            <div className="community-comment" key={entry._id}>
              <button type="button" className="community-comment-author" onClick={() => onAuthorClick(entry.author?._id)}>
                <div className="community-avatar small">
                  {entry.author?.avatarUrl ? <img src={entry.author.avatarUrl} alt="" /> : <span>{(entry.author?.name || 'U').charAt(0).toUpperCase()}</span>}
                </div>
                <strong>{entry.author?.name || 'Member'}</strong>
              </button>
              <p>{entry.text}</p>
            </div>
          )) : (
            <p className="muted">No comments yet. Start a constructive discussion.</p>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const viewedRef = useRef(new Set())
  const authorFilter = searchParams.get('author') || ''

  const refreshPosts = async (authorId = authorFilter) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getPosts(authorId ? { author: authorId } : {})
      setPosts(Array.isArray(res?.data) ? res.data : [])
    } catch (err) {
      setError(String(err?.payload?.message || err?.message || 'Unable to load community posts right now.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshPosts(authorFilter)
  }, [authorFilter])

  useEffect(() => {
    const pending = posts.filter((post) => post?._id && !viewedRef.current.has(post._id))
    pending.forEach((post) => {
      viewedRef.current.add(post._id)
      api.recordPostView(post._id)
        .then((res) => {
          const updated = res?.data
          if (!updated?._id) return
          setPosts((current) => current.map((item) => (item._id === updated._id ? updated : item)))
        })
        .catch(() => {})
    })
  }, [posts])

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
        if (!authorFilter || authorFilter === String(created.author?._id || '')) {
          setPosts((current) => [created, ...current])
        }
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

  const clearAuthorFilter = () => {
    setSearchParams({})
  }

  const activeAuthor = posts.find((post) => String(post.author?._id || '') === authorFilter)?.author || null

  return (
    <div className="page community-page">
      <section className="community-hero card">
        <div>
          <span className="dashboard-eyebrow">Community Feed</span>
          <h1>Health posts and peer discussion</h1>
          <p className="muted">A polished space for members to share routines, recovery updates, food ideas, questions, and progress with images, likes, comments, and visibility.</p>
        </div>
        <div className="community-hero-meta">
          <div>
            <strong>{posts.length}</strong>
            <span>Visible posts</span>
          </div>
          <div>
            <strong>{posts.reduce((sum, post) => sum + Number(post.commentCount || 0), 0)}</strong>
            <span>Total comments</span>
          </div>
          <div>
            <strong>{posts.reduce((sum, post) => sum + Number(post.likeCount || 0), 0)}</strong>
            <span>Total likes</span>
          </div>
        </div>
      </section>

      <div className="community-layout">
        <div className="community-main">
          <PostComposer onCreate={createPost} loading={submitting} currentUser={user} />

          {authorFilter ? (
            <Card className="community-filter-card">
              <div className="community-filter-row">
                <div>
                  <strong>Filtered by author</strong>
                  <p className="muted">Showing posts from {activeAuthor?.name || 'this member'}.</p>
                </div>
                <Button variant="ghost" onClick={clearAuthorFilter}>Show all posts</Button>
              </div>
            </Card>
          ) : null}

          {error ? <Card className="community-error-card"><p>{error}</p></Card> : null}

          {loading ? (
            <Card><p className="muted">Loading community posts...</p></Card>
          ) : posts.length ? posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
              onAuthorClick={(authorId) => authorId && setSearchParams({ author: authorId })}
              currentUserId={user?._id}
            />
          )) : (
            <Card>
              <p className="muted">No community posts are live yet. Publish the first update to set the tone.</p>
            </Card>
          )}
        </div>

        <aside className="community-side">
          <Card className="community-side-card">
            <h3>Professional posting guide</h3>
            <div className="community-side-list">
              <div>
                <strong>Keep it health-related</strong>
                <p>Training, food, recovery, sleep, motivation, and questions all fit well here.</p>
              </div>
              <div>
                <strong>Add context</strong>
                <p>Clear titles and useful descriptions help other members respond thoughtfully.</p>
              </div>
              <div>
                <strong>Use visuals wisely</strong>
                <p>Progress snapshots, meals, charts, and workout setups make updates easier to follow.</p>
              </div>
            </div>
          </Card>

          <Card className="community-side-card">
            <h3>Your profile</h3>
            <div className="community-profile-inline">
              <div className="community-avatar">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{(user?.name || 'U').charAt(0).toUpperCase()}</span>}
              </div>
              <div>
                <Link to="/profile" className="community-profile-link">{user?.name || 'Open profile'}</Link>
                <p className="muted">Your profile photo and name are shown on every post and comment.</p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

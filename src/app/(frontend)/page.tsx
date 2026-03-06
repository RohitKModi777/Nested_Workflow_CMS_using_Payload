import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import './styles.css'

export const metadata = {
  title: 'Workflow CMS — Dynamic Approval Engine',
  description:
    'A fully dynamic, reusable multi-stage approval workflow engine built inside Payload CMS v3 with TypeScript, MongoDB, and custom React admin components.',
}

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  // Fetch live stats
  const [blogsResult, contractsResult, workflowsResult, instancesResult, usersResult] =
    await Promise.all([
      payload.find({ collection: 'blogs', limit: 0 }),
      payload.find({ collection: 'contracts', limit: 0 }),
      payload.find({ collection: 'workflows', limit: 0 }),
      payload.find({ collection: 'workflow-instances', limit: 0 }),
      payload.find({ collection: 'users', limit: 0 }),
    ])

  // Fetch recent blogs
  const recentBlogs = await payload.find({
    collection: 'blogs',
    limit: 4,
    sort: '-createdAt',
    depth: 1,
  })

  const stats = [
    { label: 'Workflows', value: workflowsResult.totalDocs, icon: '🔄', color: '#6366f1' },
    { label: 'Active Instances', value: instancesResult.totalDocs, icon: '⚡', color: '#f59e0b' },
    { label: 'Blog Posts', value: blogsResult.totalDocs, icon: '📝', color: '#10b981' },
    { label: 'Contracts', value: contractsResult.totalDocs, icon: '📄', color: '#3b82f6' },
    { label: 'Team Members', value: usersResult.totalDocs, icon: '👥', color: '#ec4899' },
  ]

  const features = [
    {
      icon: '🔄',
      title: 'Dynamic Workflow Engine',
      desc: 'Multi-stage approval flows that auto-trigger on document save via the afterChange hook. Zero hardcoding — configurations live in the DB.',
      color: '#6366f1',
    },
    {
      icon: '🌿',
      title: 'Conditional Branching',
      desc: 'Steps can have conditions like amount > 10000. Our safe parser (no eval) evaluates them — non-matching steps are auto-skipped.',
      color: '#10b981',
    },
    {
      icon: '🔐',
      title: 'Role-Based Access',
      desc: 'Admin, Manager, Editor, Reviewer — each role has fine-grained access. Only the right person can approve their assigned step.',
      color: '#f59e0b',
    },
    {
      icon: '📋',
      title: 'Immutable Audit Logs',
      desc: 'Every action is recorded in WorkflowLogs with double-protection — access.update and access.delete are always blocked.',
      color: '#ef4444',
    },
    {
      icon: '⚠️',
      title: 'SLA & Auto-Escalation',
      desc: 'Each step has an SLA in hours. A background job checks every 15 minutes and auto-escalates overdue steps.',
      color: '#f97316',
    },
    {
      icon: '🔌',
      title: 'Plugin Architecture',
      desc: 'workflowPlugin(options) is a Payload Plugin — dynamically hooks into any collection. Drop it in any project without changing collections.',
      color: '#8b5cf6',
    },
  ]

  const adminUrl = payloadConfig.routes?.admin ?? '/admin'

  return (
    <div className="page">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-logo">
            <span className="logo-icon">⚙️</span>
            <span className="logo-text">Workflow<strong>CMS</strong></span>
          </span>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#stats">Stats</a>
            <a href="#docs">Docs</a>
            {user ? (
              <a className="nav-cta" href={adminUrl}>Dashboard →</a>
            ) : (
              <a className="nav-cta" href={`${adminUrl}/login`}>Sign In →</a>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="badge-dot" />
            Built with Payload CMS v3 · TypeScript · MongoDB
          </div>
          <h1 className="hero-title">
            Dynamic Multi-Stage
            <br />
            <span className="gradient-text">Workflow Engine</span>
          </h1>
          <p className="hero-sub">
            A fully reusable approval system that auto-triggers on document saves, evaluates
            conditions, enforces SLAs, and logs every action — all without hardcoding a single
            collection name.
          </p>
          <div className="hero-actions">
            {user ? (
              <>
                <a className="btn-primary" href={adminUrl}>
                  Open Dashboard →
                </a>
                <a className="btn-ghost" href={`${adminUrl}/collections/workflows`}>
                  Manage Workflows
                </a>
                <a className="btn-ghost" style={{ color: '#f59e0b' }} href={`/signup`}>
                  Create User
                </a>
                <a className="btn-ghost" style={{ color: '#ef4444' }} href={`${adminUrl}/logout`}>
                  Logout
                </a>
              </>
            ) : (
              <>
                <a className="btn-primary" href={`${adminUrl}/login`}>
                  Get Started →
                </a>
                <a
                  className="btn-ghost"
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </>
            )}
          </div>

          {/* Flow diagram */}
          <div className="flow-diagram">
            {['Document Saved', 'Engine Triggered', 'Conditions Checked', 'Assignee Notified', 'Step Actioned', 'Audit Logged'].map(
              (step, i) => (
                <React.Fragment key={step}>
                  <div className="flow-step">
                    <div className="flow-num">{i + 1}</div>
                    <span>{step}</span>
                  </div>
                  {i < 5 && <div className="flow-arrow">→</div>}
                </React.Fragment>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── Live Stats ───────────────────────────────────────────────── */}
      <section className="stats-section" id="stats">
        <div className="section-inner">
          <div className="section-badge">Live System Stats</div>
          <h2 className="section-title">What's Running Right Now</h2>
          <div className="stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.color + '22', color: s.color }}>
                  {s.icon}
                </div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="features-section" id="features">
        <div className="section-inner">
          <div className="section-badge">Core Capabilities</div>
          <h2 className="section-title">Everything You Need in a Workflow Engine</h2>
          <p className="section-sub">
            Built from scratch in TypeScript — no third-party workflow libraries. Full control, full
            transparency.
          </p>
          <div className="features-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div
                  className="feature-icon"
                  style={{ background: f.color + '18', color: f.color }}
                >
                  {f.icon}
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sample Workflows ─────────────────────────────────────────── */}
      <section className="workflows-section">
        <div className="section-inner">
          <div className="section-badge">Demo Workflows</div>
          <h2 className="section-title">Two Sample Flows Ready to Run</h2>
          <div className="workflow-cards">
            {/* Blog Review */}
            <div className="workflow-card">
              <div className="wf-header">
                <span className="wf-icon">📝</span>
                <div>
                  <div className="wf-name">Blog Review Flow</div>
                  <div className="wf-target">blogs collection</div>
                </div>
                <span className="wf-badge active">Active</span>
              </div>
              <div className="wf-steps">
                <div className="wf-step">
                  <div className="step-dot blue" />
                  <div>
                    <div className="step-label">Editor Review</div>
                    <div className="step-meta">Role: Editor · SLA: 24h · Type: Review</div>
                  </div>
                </div>
                <div className="step-connector" />
                <div className="wf-step">
                  <div className="step-dot purple" />
                  <div>
                    <div className="step-label">Manager Approval</div>
                    <div className="step-meta">Role: Manager · SLA: 12h · Type: Approval</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Approval */}
            <div className="workflow-card">
              <div className="wf-header">
                <span className="wf-icon">📄</span>
                <div>
                  <div className="wf-name">Contract Approval Flow</div>
                  <div className="wf-target">contracts collection</div>
                </div>
                <span className="wf-badge orange">3 Steps</span>
              </div>
              <div className="wf-steps">
                <div className="wf-step">
                  <div className="step-dot green" />
                  <div>
                    <div className="step-label">Reviewer Check</div>
                    <div className="step-meta">Role: Reviewer · SLA: 48h</div>
                  </div>
                </div>
                <div className="step-connector" />
                <div className="wf-step">
                  <div className="step-dot amber" />
                  <div>
                    <div className="step-label">High-Value Sign-off</div>
                    <div className="step-meta">
                      Role: Manager · Condition:{' '}
                      <code className="condition-code">amount {'>'} 10000</code>
                    </div>
                  </div>
                </div>
                <div className="step-connector" />
                <div className="wf-step">
                  <div className="step-dot red" />
                  <div>
                    <div className="step-label">Final Admin Approval</div>
                    <div className="step-meta">Role: Admin · SLA: 12h</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Recent Blogs ─────────────────────────────────────────────── */}
      {recentBlogs.totalDocs > 0 && (
        <section className="blogs-section">
          <div className="section-inner">
            <div className="section-badge">Latest Content</div>
            <h2 className="section-title">Recent Blog Posts</h2>
            <div className="blogs-grid">
              {recentBlogs.docs.map((blog: any) => (
                <div key={blog.id} className="blog-card">
                  <div
                    className="blog-status-bar"
                    data-status={blog.status}
                    style={{
                      background:
                        blog.status === 'published'
                          ? '#10b981'
                          : blog.status === 'under-review'
                            ? '#f59e0b'
                            : blog.status === 'rejected'
                              ? '#ef4444'
                              : '#6366f1',
                    }}
                  />
                  <div className="blog-content">
                    <div className="blog-meta">
                      <span
                        className="blog-badge"
                        style={{
                          background:
                            blog.status === 'published'
                              ? '#10b98118'
                              : blog.status === 'under-review'
                                ? '#f59e0b18'
                                : '#6366f118',
                          color:
                            blog.status === 'published'
                              ? '#10b981'
                              : blog.status === 'under-review'
                                ? '#f59e0b'
                                : '#6366f1',
                        }}
                      >
                        {blog.status ?? 'draft'}
                      </span>
                      <span className="blog-date">
                        {new Date(blog.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <h3 className="blog-title">{blog.title}</h3>
                    {blog.excerpt && <p className="blog-excerpt">{blog.excerpt}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── API Reference ─────────────────────────────────────────────── */}
      <section className="api-section" id="docs">
        <div className="section-inner">
          <div className="section-badge">REST API</div>
          <h2 className="section-title">Three Endpoints. Full Control.</h2>
          <div className="api-cards">
            <div className="api-card">
              <div className="api-method post">POST</div>
              <div className="api-path">/api/workflows/trigger</div>
              <div className="api-desc">Manually trigger or restart a workflow on any document</div>
              <pre className="api-code">{`{
  "collectionSlug": "blogs",
  "documentId": "64f3a..."
}`}</pre>
            </div>
            <div className="api-card">
              <div className="api-method get">GET</div>
              <div className="api-path">/api/workflows/status/:docId</div>
              <div className="api-desc">Full workflow state: steps, current step, logs</div>
              <pre className="api-code">{`?collection=blogs`}</pre>
            </div>
            <div className="api-card">
              <div className="api-method post">POST</div>
              <div className="api-path">/api/workflows/action</div>
              <div className="api-desc">Approve, reject, or comment on the active step</div>
              <pre className="api-code">{`{
  "instanceId": "64f3b...",
  "action": "approved",
  "comment": "Looks great!"
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo Credentials ─────────────────────────────────────────── */}
      <section className="creds-section">
        <div className="section-inner">
          <div className="section-badge">Try It Out</div>
          <h2 className="section-title">Demo Credentials & Users</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            Payload CMS natively handles user authentication and role management.
            To create a new user or modify roles, <a href={`/signup`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>click here to create a User</a>.
            To log out, use the <a href={`${adminUrl}/logout`} style={{ color: 'var(--accent-red)', textDecoration: 'underline' }}>Logout route</a> or click your avatar bottom-left in the admin sidebar.
          </p>
          <div className="creds-grid">
            {[
              { role: 'Admin', email: 'admin@demo.com', pass: 'Admin1234!', color: '#6366f1', icon: '👑' },
              { role: 'Manager', email: 'manager@demo.com', pass: 'Manager1234!', color: '#f59e0b', icon: '🏢' },
              { role: 'Editor', email: 'editor@demo.com', pass: 'Editor1234!', color: '#10b981', icon: '✏️' },
              { role: 'Reviewer', email: 'reviewer@demo.com', pass: 'Review1234!', color: '#3b82f6', icon: '🔍' },
            ].map((c) => (
              <div key={c.role} className="cred-card">
                <div className="cred-icon" style={{ background: c.color + '22', color: c.color }}>
                  {c.icon}
                </div>
                <div className="cred-role" style={{ color: c.color }}>{c.role}</div>
                <div className="cred-detail">
                  <span className="cred-key">Email</span>
                  <code className="cred-val">{c.email}</code>
                </div>
                <div className="cred-detail">
                  <span className="cred-key">Password</span>
                  <code className="cred-val">{c.pass}</code>
                </div>
                <a className="cred-btn" href={`${adminUrl}/login`} style={{ background: c.color }}>
                  Login as {c.role}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-glow" />
        <div className="section-inner cta-inner">
          <h2 className="cta-title">Ready to Manage Workflows?</h2>
          <p className="cta-sub">
            {user
              ? `Welcome back, ${user.email}. Your dashboard is ready.`
              : 'Log in to the admin panel to create workflows, view instances, and manage approvals.'}
          </p>
          <div className="cta-actions">
            <a className="btn-primary large" href={user ? adminUrl : `${adminUrl}/login`}>
              {user ? 'Open Dashboard →' : 'Go to Admin Panel →'}
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="logo-icon">⚙️</span>
            <span>
              <strong>WorkflowCMS</strong> — Built with Payload v3, Next.js, MongoDB
            </span>
          </div>
          <div className="footer-links">
            <a href={adminUrl}>Admin Panel</a>
            <a href={`${adminUrl}/collections/workflows`}>Workflows</a>
            <a href="https://payloadcms.com/docs" target="_blank" rel="noopener noreferrer">
              Payload Docs
            </a>
          </div>
          <div className="footer-copy">© 2026 Workflow CMS. MIT License.</div>
        </div>
      </footer>
    </div>
  )
}

'use client'

import React, { useState } from 'react'

export default function SignupPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const name = formData.get('name')
        const email = formData.get('email')
        const password = formData.get('password')
        const role = formData.get('role')

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    roles: [role],
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.errors?.[0]?.message || data.message || 'Failed to register')
            }

            setSuccess(true)

            // Auto login
            await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            // Redirect to admin panel dashboard
            window.location.href = '/admin'

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#020617', color: '#f8fafc', padding: '40px 20px', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#0f172a', padding: '32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <h1 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', textAlign: 'center' }}>Create Account</h1>

                {success ? (
                    <div style={{ padding: '16px', background: '#10b98122', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', textAlign: 'center' }}>
                        Account created successfully! Redirecting...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {error && <div style={{ color: '#ef4444', background: '#ef444422', padding: '12px', borderRadius: '6px', border: '1px solid #ef4444', fontSize: '0.9rem' }}>{error}</div>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="name" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Full Name</label>
                            <input required type="text" id="name" name="name" placeholder="John Doe" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: 'white' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="email" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Email Address</label>
                            <input required type="email" id="email" name="email" placeholder="john@example.com" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: 'white' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="password" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Password</label>
                            <input required minLength={8} type="password" id="password" name="password" placeholder="••••••••" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: 'white' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="role" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Select Role</label>
                            <select required id="role" name="role" defaultValue="reviewer" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: 'white' }}>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="editor">Editor</option>
                                <option value="reviewer">Reviewer</option>
                            </select>
                        </div>

                        <button disabled={loading} type="submit" style={{ marginTop: '8px', padding: '12px', borderRadius: '6px', border: 'none', background: '#6366f1', color: 'white', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Creating...' : 'Sign Up'}
                        </button>
                        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.9rem' }}>
                            <a href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back to Home</a>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

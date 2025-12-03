import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getClasses, getCharacter, patchCharacter } from '../api/client'

function ClassesPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [classes, setClasses] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [status, setStatus] = useState('Loading…')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!id) return
            ;(async () => {
            try {
                setStatus('Loading…')
                setError('')
                const [cls, char] = await Promise.all([getClasses(), getCharacter(id)])
                setClasses(Array.isArray(cls) ? cls : [])
                setSelectedId(char?.classId ?? null)
                setStatus(cls.length === 0 ? 'No classes found.' : '')
            } catch (e) {
                console.error(e)
                setError(e.message || 'Failed to load classes')
                setStatus('')
            }
        })()
    }, [id])

    async function handleSave() {
        if (!id) return
        if (!selectedId) {
            alert('Bitte zuerst eine Klasse auswählen.')
            return
        }
        try {
            setSaving(true)
            await patchCharacter(id, { classId: selectedId })
            navigate(`/characters/${id}`)
        } catch (e) {
            console.error(e)
            setError(e.message || 'Failed to save class')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '16px',
                }}
            >
                <h2 style={{ margin: 0, fontSize: '20px' }}>Choose Class</h2>
                <Link to={`/characters/${id}`} style={{ fontSize: '13px', color: '#a5b4fc' }}>
                    Cancel
                </Link>
            </div>

            {status && (
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
                    {status}
                </div>
            )}
            {error && (
                <div style={{ fontSize: '13px', color: '#f97373', marginBottom: '8px' }}>
                    {error}
                </div>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    marginBottom: '16px',
                }}
            >
                {classes.map((c) => {
                    const isSelected = c.id === selectedId
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedId(c.id)}
                            style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                border: isSelected
                                    ? '1px solid rgba(129,140,248,0.9)'
                                    : '1px solid rgba(30,64,175,0.4)',
                                background: isSelected ? '#1e293b' : '#020617',
                                color: '#e5e7eb',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{c.name}</div>
                            {c.description && (
                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                    {c.description}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            <button
                type="button"
                onClick={handleSave}
                disabled={saving || !selectedId}
                style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    border: 'none',
                    background: saving || !selectedId ? '#111827' : '#4f46e5',
                    color: '#e5e7eb',
                    fontSize: '14px',
                    cursor: saving || !selectedId ? 'not-allowed' : 'pointer',
                }}
            >
                {saving ? 'Saving…' : 'Save'}
            </button>
        </div>
    )
}

export default ClassesPage

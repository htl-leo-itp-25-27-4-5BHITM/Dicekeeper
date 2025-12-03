import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getBackgrounds, getCharacter, patchCharacter } from '../api/client'

function BackgroundPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [backgrounds, setBackgrounds] = useState([])
    const [selected, setSelected] = useState(null) // full object
    const [status, setStatus] = useState('Loading…')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!id) return
            ;(async () => {
            try {
                setStatus('Loading…')
                setError('')
                const [bgs, char] = await Promise.all([
                    getBackgrounds(),
                    getCharacter(id),
                ])
                const list = Array.isArray(bgs) ? bgs : []
                setBackgrounds(list)
                setStatus(list.length === 0 ? 'No backgrounds found.' : '')

                const current =
                    char?.backgroundId != null
                        ? list.find((b) => b.id === char.backgroundId) || null
                        : null
                setSelected(current)
            } catch (e) {
                console.error(e)
                setError(e.message || 'Failed to load backgrounds')
                setStatus('')
            }
        })()
    }, [id])

    async function handleSave() {
        if (!id) return
        if (!selected) {
            alert('Bitte zuerst einen Background auswählen.')
            return
        }
        try {
            setSaving(true)
            await patchCharacter(id, { backgroundId: selected.id })
            navigate(`/characters/${id}`)
        } catch (e) {
            console.error(e)
            setError(e.message || 'Failed to save background')
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
                <h2 style={{ margin: 0, fontSize: '20px' }}>Choose Background</h2>
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
                    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
                    gap: '16px',
                }}
            >
                <div
                    style={{
                        maxHeight: '340px',
                        overflowY: 'auto',
                        paddingRight: '4px',
                    }}
                >
                    {backgrounds.map((b) => {
                        const isSelected = selected?.id === b.id
                        return (
                            <button
                                key={b.id}
                                type="button"
                                onClick={() => setSelected(b)}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 10px',
                                    borderRadius: '10px',
                                    border: isSelected
                                        ? '1px solid rgba(129,140,248,0.9)'
                                        : '1px solid rgba(30,64,175,0.4)',
                                    background: isSelected ? '#1e293b' : '#020617',
                                    color: '#e5e7eb',
                                    cursor: 'pointer',
                                    marginBottom: '8px',
                                }}
                            >
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{b.name}</div>
                                {b.feat && (
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Feat: {b.feat}
                                    </div>
                                )}
                                {b.skills && (
                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Skills: {b.skills}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>

                <div>
                    {selected ? (
                        <div>
                            <h3 style={{ marginTop: 0, fontSize: '18px' }}>{selected.name}</h3>
                            {selected.description && (
                                <p style={{ fontSize: '13px', color: '#cbd5f5', whiteSpace: 'pre-wrap' }}>
                                    {selected.description}
                                </p>
                            )}
                            <hr style={{ borderColor: 'rgba(148,163,184,0.4)' }} />
                            <div style={{ fontSize: '13px', color: '#e5e7eb' }}>
                                {selected.ability_scores && (
                                    <p>
                                        <strong>Ability Scores:</strong> {selected.ability_scores}
                                    </p>
                                )}
                                {selected.feat && (
                                    <p>
                                        <strong>Feat:</strong> {selected.feat}
                                    </p>
                                )}
                                {selected.skills && (
                                    <p>
                                        <strong>Skill Proficiencies:</strong> {selected.skills}
                                    </p>
                                )}
                                {selected.tool_proficiencies && (
                                    <p>
                                        <strong>Tool Proficiencies:</strong> {selected.tool_proficiencies}
                                    </p>
                                )}
                                {selected.equipment && (
                                    <p>
                                        <strong>Equipment:</strong> {selected.equipment}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                            Select a background on the left to see details.
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '16px' }}>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !selected}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '999px',
                        border: 'none',
                        background: saving || !selected ? '#111827' : '#4f46e5',
                        color: '#e5e7eb',
                        fontSize: '14px',
                        cursor: saving || !selected ? 'not-allowed' : 'pointer',
                    }}
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    )
}

export default BackgroundPage

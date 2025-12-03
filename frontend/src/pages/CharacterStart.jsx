import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
    getCharacter,
    patchCharacter,
    getClassById,
    getBackgroundById,
    getAllAbilities,
    getCharacterAbilityScores,
    saveCharacterAbilityScore,
} from '../api/client'

function CharacterStart() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [character, setCharacter] = useState(null)

    const [name, setName] = useState('')
    const [info, setInfo] = useState('')
    const [clazz, setClazz] = useState(null)
    const [background, setBackground] = useState(null)

    const [totalBudget, setTotalBudget] = useState(27)
    const [abilities, setAbilities] = useState([]) // {id, name, description, value}

    const usedPoints = useMemo(
        () =>
            abilities.reduce(
                (sum, a) => sum + Math.max(0, Math.floor(Number(a.value) || 0)),
                0,
            ),
        [abilities],
    )
    const remaining = totalBudget - usedPoints

    useEffect(() => {
        if (!id) return
            ;(async () => {
            try {
                setLoading(true)
                setError('')

                // base character
                const c = await getCharacter(id)
                setCharacter(c)
                setName(c.name || '')
                setInfo(c.info || '')

                // load class / background names if set
                if (c.classId) {
                    getClassById(c.classId)
                        .then(setClazz)
                        .catch((e) => console.error('Failed to load class', e))
                } else {
                    setClazz(null)
                }

                if (c.backgroundId) {
                    getBackgroundById(c.backgroundId)
                        .then(setBackground)
                        .catch((e) => console.error('Failed to load background', e))
                } else {
                    setBackground(null)
                }

                // abilities + scores
                const [allAbilities, scores] = await Promise.all([
                    getAllAbilities(),
                    getCharacterAbilityScores(id),
                ])

                const byId = new Map(
                    (Array.isArray(scores) ? scores : []).map((s) => [
                        s.abilityId,
                        s.score,
                    ]),
                )

                setAbilities(
                    (Array.isArray(allAbilities) ? allAbilities : []).map((a) => ({
                        id: a.id,
                        name: a.name,
                        description: a.description,
                        value: byId.get(a.id) ?? 0,
                    })),
                )
            } catch (e) {
                console.error(e)
                setError(e.message || 'Failed to load character')
            } finally {
                setLoading(false)
            }
        })()
    }, [id])

    async function handleNameBlur() {
        if (!id) return
        try {
            await patchCharacter(id, { name: name.trim() })
        } catch (e) {
            console.error(e)
            setError(`Failed to save name: ${e.message}`)
        }
    }

    async function handleInfoBlur() {
        if (!id) return
        try {
            await patchCharacter(id, { info: info.trim() })
        } catch (e) {
            console.error(e)
            setError(`Failed to save info: ${e.message}`)
        }
    }

    function normalizeAbilities(list, total, changedId) {
        const totalBudgetLocal = Math.max(0, Math.floor(Number(total) || 0))
        let normalized = list.map((a) => ({
            ...a,
            value: Math.max(0, Math.floor(Number(a.value) || 0)),
        }))

        const used = normalized.reduce((sum, a) => sum + a.value, 0)
        if (used <= totalBudgetLocal || changedId == null) {
            return normalized
        }

        const diff = used - totalBudgetLocal
        normalized = normalized.map((a) => {
            if (a.id === changedId) {
                return { ...a, value: Math.max(0, a.value - diff) }
            }
            return a
        })

        return normalized
    }

    function updateAbility(changedId, newRawValue) {
        setAbilities((prev) => {
            let updated = prev.map((a) =>
                a.id === changedId ? { ...a, value: newRawValue } : a,
            )
            updated = normalizeAbilities(updated, totalBudget, changedId)

            const changed = updated.find((a) => a.id === changedId)
            if (id && changed) {
                // fire and forget
                saveCharacterAbilityScore(id, changedId, changed.value).catch((e) =>
                    console.error('Failed to save ability score', e),
                )
            }
            return updated
        })
    }

    function handleDec(abilityId) {
        updateAbility(abilityId, (prevValue) => {
            const v = Math.max(0, Math.floor(Number(prevValue) || 0))
            return v - 1
        })
    }

    function handleInc(abilityId) {
        if (remaining <= 0) return
        updateAbility(abilityId, (prevValue) => {
            const v = Math.max(0, Math.floor(Number(prevValue) || 0))
            return v + 1
        })
    }

    function handleInputChange(abilityId, raw) {
        updateAbility(abilityId, raw)
    }

    function handleBudgetChange(e) {
        const raw = e.target.value
        const v = Math.max(0, Math.floor(Number(raw) || 0))
        setTotalBudget(v)
    }

    if (!id) {
        return <div>No character id in URL.</div>
    }

    if (loading) {
        return <div>Loading character…</div>
    }

    return (
        <div>
            {error && (
                <div style={{ color: '#f97373', fontSize: '13px', marginBottom: '10px' }}>
                    {error}
                </div>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
                    gap: '24px',
                    marginBottom: '28px',
                }}
            >
                <div>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>
                        Character #{id}
                    </h2>

                    <div style={{ marginBottom: '10px' }}>
                        <label
                            htmlFor="name"
                            style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}
                        >
                            Name
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={handleNameBlur}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur()
                                }}
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(148,163,184,0.5)',
                                    background: 'rgba(15,23,42,0.9)',
                                    color: '#e5e7eb',
                                    fontSize: '14px',
                                }}
                                placeholder="Enter name"
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label
                            htmlFor="info"
                            style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}
                        >
                            Info
                        </label>
                        <textarea
                            id="info"
                            value={info}
                            onChange={(e) => setInfo(e.target.value)}
                            onBlur={handleInfoBlur}
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(148,163,184,0.5)',
                                background: 'rgba(15,23,42,0.9)',
                                color: '#e5e7eb',
                                fontSize: '14px',
                                resize: 'vertical',
                            }}
                            placeholder="Enter your character's info"
                        />
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <div style={{ marginBottom: '6px', fontSize: '13px' }}>Class</div>
                        <button
                            type="button"
                            onClick={() => navigate(`/characters/${id}/classes`)}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '999px',
                                border: '1px dashed rgba(148,163,184,0.6)',
                                background: 'rgba(15,23,42,0.7)',
                                color: '#e5e7eb',
                                fontSize: '14px',
                                textAlign: 'left',
                                cursor: 'pointer',
                            }}
                        >
                            {clazz?.name || character?.classId ? (
                                <>
                                    <strong>{clazz?.name ?? `Class #${character.classId}`}</strong>
                                </>
                            ) : (
                                'Select class…'
                            )}
                        </button>

                        <div style={{ marginTop: '12px' }}>
                            <div style={{ marginBottom: '6px', fontSize: '13px' }}>Background</div>
                            <button
                                type="button"
                                onClick={() => navigate(`/characters/${id}/background`)}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '999px',
                                    border: '1px dashed rgba(148,163,184,0.6)',
                                    background: 'rgba(15,23,42,0.7)',
                                    color: '#e5e7eb',
                                    fontSize: '14px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                }}
                            >
                                {background?.name || character?.backgroundId ? (
                                    <>
                                        <strong>
                                            {background?.name ?? `Background #${character.backgroundId}`}
                                        </strong>
                                    </>
                                ) : (
                                    'Select background…'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '18px' }}>
                        Ability Scores
                    </h3>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '8px',
                            fontSize: '13px',
                        }}
                    >
                        <label htmlFor="totalBudgetAbility">Total points:</label>
                        <input
                            type="number"
                            id="totalBudgetAbility"
                            min={0}
                            value={totalBudget}
                            onChange={handleBudgetChange}
                            style={{
                                width: '70px',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                border: '1px solid rgba(148,163,184,0.7)',
                                background: '#020617',
                                color: '#e5e7eb',
                            }}
                        />
                        <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
              Used: {usedPoints} · Remaining:{' '}
                            <span style={{ color: remaining < 0 ? '#f97373' : '#bbf7d0' }}>
                {remaining}
              </span>
            </span>
                    </div>

                    <div
                        style={{
                            maxHeight: '320px',
                            overflowY: 'auto',
                            paddingRight: '4px',
                            marginTop: '8px',
                        }}
                    >
                        {abilities.map((a) => {
                            const value = Math.max(0, Math.floor(Number(a.value) || 0))
                            return (
                                <div
                                    key={a.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: '12px',
                                        padding: '8px 0',
                                        borderBottom: '1px solid rgba(30, 64, 175, 0.4)',
                                    }}
                                >
                                    <div style={{ flex: '1 1 auto' }}>
                                        <div
                                            style={{
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                marginBottom: '3px',
                                            }}
                                        >
                                            {a.name}
                                        </div>
                                        {a.description && (
                                            <div
                                                style={{
                                                    fontSize: '12px',
                                                    color: '#9ca3af',
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            >
                                                {a.description}
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleDec(a.id)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '999px',
                                                border: 'none',
                                                background: '#1f2937',
                                                color: '#e5e7eb',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min={0}
                                            value={Number.isNaN(value) ? 0 : value}
                                            onChange={(e) => handleInputChange(a.id, e.target.value)}
                                            style={{
                                                width: '52px',
                                                padding: '4px 6px',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(148,163,184,0.7)',
                                                background: '#020617',
                                                color: '#e5e7eb',
                                                textAlign: 'center',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleInc(a.id)}
                                            disabled={remaining <= 0}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '999px',
                                                border: 'none',
                                                background:
                                                    remaining <= 0 ? '#111827' : '#4f46e5',
                                                color: '#e5e7eb',
                                                cursor: remaining <= 0 ? 'not-allowed' : 'pointer',
                                                opacity: remaining <= 0 ? 0.5 : 1,
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div style={{ fontSize: '12px', color: '#64748b' }}>
                <Link to="/characters" style={{ color: '#a5b4fc' }}>
                    ← Back to list
                </Link>
            </div>
        </div>
    )
}

export default CharacterStart

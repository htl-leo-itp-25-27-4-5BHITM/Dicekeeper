import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCharacters, createInitialCharacter } from '../api/client'

function CharacterList() {
    const [characters, setCharacters] = useState([])
    const [status, setStatus] = useState('Loading...')
    const [isError, setIsError] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const navigate = useNavigate()

    async function loadCharacters() {
        setStatus('Loading...')
        setIsError(false)

        try {
            const data = await getCharacters()
            if (!Array.isArray(data)) {
                throw new Error('Unexpected response from server')
            }
            setCharacters(data)
            setStatus(data.length === 0 ? 'No characters yet — create one!' : '')
        } catch (err) {
            console.error(err)
            setStatus(`Failed to load characters: ${err.message}`)
            setIsError(true)
        }
    }

    useEffect(() => {
        loadCharacters()
    }, [])

    async function handleCreate() {
        setIsCreating(true)
        setStatus('Creating character...')
        setIsError(false)

        try {
            const created = await createInitialCharacter()
            const id = created?.id
            await loadCharacters()
            if (id != null) {
                navigate(`/characters/${id}`)
            } else {
                setStatus('Character created.')
            }
        } catch (err) {
            console.error(err)
            setStatus(`Failed to create character: ${err.message}`)
            setIsError(true)
        } finally {
            setIsCreating(false)
        }
    }

    const statusStyle = {
        fontSize: '13px',
        marginBottom: '12px',
        color: isError ? '#f97373' : '#98a2b3',
    }

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                }}
            >
                <h2 style={{ margin: 0, fontSize: '22px' }}>Your Characters</h2>
                <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: isCreating ? 'default' : 'pointer',
                        background: isCreating ? '#334155' : '#4f46e5',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 500,
                        boxShadow: '0 10px 20px rgba(79,70,229,0.35)',
                        opacity: isCreating ? 0.8 : 1,
                    }}
                >
                    {isCreating ? 'Creating…' : 'Create new'}
                </button>
            </div>

            {status && <div style={statusStyle}>{status}</div>}

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {characters.map((ch) => (
                    <li
                        key={ch.id}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 0',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                        }}
                    >
                        <button
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                margin: 0,
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: '#e5e7eb',
                                fontSize: '15px',
                                fontWeight: 500,
                            }}
                            onClick={() => {
                                if (ch.id != null) {
                                    navigate(`/characters/${ch.id}`)
                                }
                            }}
                        >
                            {ch.name || `Character ${ch.id ?? ''}`}
                        </button>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '12px' }}>
                            id: {ch.id ?? '—'}
                            {ch.level ? ` · lvl ${ch.level}` : ''}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default CharacterList

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


    return (
        <div className="container">
                <h1 style={{textAlign: 'center'}}>Your Characters</h1>

                <div className="actions">
                    <button
                        className="createBtn"
                        onClick={handleCreate}
                        disabled={isCreating}
                        style={{position: 'relative', left: '38vw'}}
                    >
                        {isCreating ? 'Creating…' : 'Create new'}
                    </button>
                </div>

                {status && (
                    <div className={isError ? 'error' : 'muted'}>
                        {status}
                    </div>
                )}

                <ul>
                    {characters.map((ch) => (
                        <li key={ch.id}>
                            <button
                                className="linklike"
                                onClick={() => {
                                    if (ch.id != null) {
                                        navigate(`/characters/${ch.id}`)
                                    }
                                }}
                            >
                                {ch.name || `Character ${ch.id ?? ''}`}
                            </button>

                            <span className="muted">
                            id: {ch.id ?? '—'}
                                {ch.level ? ` · lvl ${ch.level}` : ''}
                        </span>
                        </li>
                    ))}
                </ul>
            </div>
    )

}

export default CharacterList

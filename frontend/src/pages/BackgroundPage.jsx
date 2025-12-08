import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBackgrounds, getCharacter, patchCharacter } from '../api/client'

// Bring in the CSS for the background page.  This stylesheet defines
// #backgroundPage, .containerBackground, .backgroundBtn and other
// selectors used below so that the page aligns with the reference HTML.
import '../styles/background.css'

/**
 * The background selection page.  This component mirrors the markup
 * found in character-creation/background.html from the resources
 * folder: a simple page showing a single background with a toggle to
 * reveal details and a save button.
 */
function BackgroundPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [backgrounds, setBackgrounds] = useState([])
    const [selected, setSelected] = useState(null) // the background currently displayed
    const [status, setStatus] = useState('Loading…')
    const [error, setError] = useState('')
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Load all backgrounds and the current character.  Preselect the
    // character's existing background if set, otherwise use the first
    // background returned by the API.
    useEffect(() => {
        if (!id) return
        ;(async () => {
            try {
                setStatus('Loading…')
                setError('')
                const [bgs, char] = await Promise.all([getBackgrounds(), getCharacter(id)])
                const list = Array.isArray(bgs) ? bgs : []
                setBackgrounds(list)
                // Choose the character's background if available
                let current = null
                if (char?.backgroundId != null) {
                    current = list.find((b) => b.id === char.backgroundId) || null
                }
                // Fallback to the first item
                if (!current && list.length > 0) {
                    current = list[0]
                }
                setSelected(current)
                setStatus(list.length === 0 ? 'No backgrounds found.' : '')
            } catch (e) {
                console.error(e)
                setError(e.message || 'Failed to load backgrounds')
                setStatus('')
            }
        })()
    }, [id])

    // Toggle the detail view
    function handleToggle() {
        setOpen((prev) => !prev)
    }

    // Persist selected background and return to character page
    async function handleSave() {
        if (!id || !selected) return
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
        <div id="backgroundPage">
            <div className="containerBackground">
                {/* Display errors or status */}
                {status && (
                    <div
                        style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}
                    >
                        {status}
                    </div>
                )}
                {error && (
                    <div
                        style={{ fontSize: '13px', color: '#f97373', marginBottom: '8px' }}
                    >
                        {error}
                    </div>
                )}
                {/* Title */}
                <h1 id="bg-title">{selected ? selected.name : 'Loading…'}</h1>
                <div className="subtitleBackground">Player’s Handbook</div>
                {/* Top info bar with feat/skills and toggle */}
                <div className="topInfoBackground">
                    <div>
                        <strong>Feat:</strong>{' '}
                        <span id="bg-feat">{selected?.feat || ''}</span>
                    </div>
                    <div>
                        <strong>Skills:</strong>{' '}
                        <span id="bg-skills">{selected?.skills || ''}</span>
                    </div>
                    <button className="backgroundBtn" onClick={handleToggle}>
                        {open ? '–' : '+'}
                    </button>
                </div>
                {/* Detail output area */}
                <div id="output">
                    {open && selected && (
                        <div id="descriptionBackground">
                            <div className="contentBackground">
                                {selected.description}
                            </div>
                            <hr className="backgroundHR" />
                            <div className="detailsBackground">
                                {selected.ability_scores && (
                                    <p>
                                        <strong>Ability Scores:</strong>{' '}
                                        {selected.ability_scores}
                                    </p>
                                )}
                                {selected.feat && (
                                    <p>
                                        <strong>Feat:</strong>{' '}
                                        {selected.feat}
                                    </p>
                                )}
                                {selected.skills && (
                                    <p>
                                        <strong>Skill Proficiencies:</strong>{' '}
                                        {selected.skills}
                                    </p>
                                )}
                                {selected.tool_proficiencies && (
                                    <p>
                                        <strong>Tool Proficiencies:</strong>{' '}
                                        {selected.tool_proficiencies}
                                    </p>
                                )}
                                {selected.equipment && (
                                    <p>
                                        <strong>Equipment:</strong>{' '}
                                        {selected.equipment}
                                    </p>
                                )}
                            </div>
                            <button
                                id="saveBtn"
                                className="saveBackgroundBtn"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default BackgroundPage
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// API helpers
import {
    getCharacter,
    patchCharacter,
    getClassById,
    getBackgroundById,
    getAllAbilities,
    getCharacterAbilityScores,
    saveCharacterAbilityScore,
} from '../api/client'

// Bring in the stylesheet that defines all the classes and IDs used by
// the original HTML. Without importing this file the markup below
// would not be styled correctly.  The base.css corresponds to
// resources/character-creation/style.css.
import '../styles/base.css'

// Import the static assets used on the start page.  Vite will process
// these imports and make the images available at runtime.
import accountImg from '../images/account-template.png'
import crossImg from '../images/cross.png'
import plusImg from '../images/plus.png'

/**
 * The start page for editing a character.  This component mirrors
 * the structure of the reference start.html provided in the resources
 * folder.  IDs and class names are preserved so that the imported CSS
 * applies correctly.
 */
function CharacterStart() {
    const { id } = useParams()
    const navigate = useNavigate()

    // page state
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [character, setCharacter] = useState(null)

    // character fields
    const [name, setName] = useState('')
    const [info, setInfo] = useState('')
    const [clazz, setClazz] = useState(null)
    const [background, setBackground] = useState(null)

    // ability scores
    const [totalBudget, setTotalBudget] = useState(27)
    const [abilities, setAbilities] = useState([])

    // compute derived values
    const usedPoints = useMemo(
        () =>
            abilities.reduce(
                (sum, a) => sum + Math.max(0, Math.floor(Number(a.value) || 0)),
                0,
            ),
        [abilities],
    )
    const remaining = totalBudget - usedPoints

    // fetch character and related data
    useEffect(() => {
        if (!id) return
        ;(async () => {
            try {
                setLoading(true)
                setError('')

                // load the base character
                const c = await getCharacter(id)
                setCharacter(c)
                setName(c.name || '')
                setInfo(c.info || '')

                // fetch class and background names if defined
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

                // load all abilities and the current character ability scores
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

    // save name on blur
    async function handleNameBlur() {
        if (!id) return
        try {
            await patchCharacter(id, { name: name.trim() })
        } catch (e) {
            console.error(e)
            setError(`Failed to save name: ${e.message}`)
        }
    }

    // save info on blur
    async function handleInfoBlur() {
        if (!id) return
        try {
            await patchCharacter(id, { info: info.trim() })
        } catch (e) {
            console.error(e)
            setError(`Failed to save info: ${e.message}`)
        }
    }

    // clear class selection
    async function clearClass() {
        if (!id) return
        try {
            await patchCharacter(id, { classId: null })
            setClazz(null)
        } catch (e) {
            console.error(e)
            setError(`Failed to clear class: ${e.message}`)
        }
    }

    // clear background selection
    async function clearBackgroundSelection() {
        if (!id) return
        try {
            await patchCharacter(id, { backgroundId: null })
            setBackground(null)
        } catch (e) {
            console.error(e)
            setError(`Failed to clear background: ${e.message}`)
        }
    }

    // ensure ability values are integers and within the total budget
    function normalizeAbilities(list, total, changedId) {
        const totalBudgetLocal = Math.max(0, Math.floor(Number(total) || 0))
        let normalized = list.map((a) => ({
            ...a,
            value: Math.max(0, Math.floor(Number(a.value) || 0)),
        }))
        const used = normalized.reduce((sum, a) => sum + a.value, 0)
        if (used <= totalBudgetLocal || changedId == null) return normalized
        const diff = used - totalBudgetLocal
        return normalized.map((a) => {
            if (a.id === changedId) {
                return { ...a, value: Math.max(0, a.value - diff) }
            }
            return a
        })
    }

    // update an ability value and persist it via the API
    function updateAbility(changedId, newRawValue) {
        setAbilities((prev) => {
            let updated = prev.map((a) =>
                a.id === changedId ? { ...a, value: newRawValue } : a,
            )
            updated = normalizeAbilities(updated, totalBudget, changedId)
            const changed = updated.find((a) => a.id === changedId)
            if (id && changed) {
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
        // Without an id there is no context for the page
        return <div>No character id in URL.</div>
    }

    if (loading) {
        return <div>Loading character…</div>
    }

    return (
        <div id="landingPage">
            {/* display error if present */}
            {error && (
                <div
                    style={{ color: '#f97373', fontSize: '13px', marginBottom: '10px' }}
                >
                    {error}
                </div>
            )}

            {/* Upper section: avatar and character fields */}
            <div id="upperBox">
                <div id="imgDiv">
                    <div id="imgBox">
                        <img id="accImg" src={accountImg} alt="account" />
                    </div>
                </div>
                <div>
                    <div id="charakterDetails">
                        {/* Name row */}
                        <div id="row1">
                            <p className="text_white">Name</p>
                            <div className="box_round">
                                <input
                                    id="nameInput"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onBlur={handleNameBlur}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur()
                                    }}
                                    placeholder="Enter Name"
                                />
                                {name && (
                                    <img
                                        id="clearName"
                                        className="clearIcon"
                                        src={crossImg}
                                        alt="clear"
                                        onClick={() => {
                                            setName('')
                                            // persist empty name
                                            handleNameBlur()
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                        {/* Class row */}
                        <div id="row2">
                            <p className="text_white">Class</p>
                            <div className="box_round">
                                <div
                                    className="nextPage class"
                                    onClick={() => navigate(`/characters/${id}/classes`)}
                                >
                                    {clazz?.name ? (
                                        <span>{clazz.name}</span>
                                    ) : (
                                        <img
                                            src={plusImg}
                                            className="plus"
                                            alt="select class"
                                        />
                                    )}
                                </div>
                                {clazz && (
                                    <img
                                        id="clearClass"
                                        className="clearIcon"
                                        src={crossImg}
                                        alt="clear class"
                                        onClick={clearClass}
                                    />
                                )}
                            </div>
                        </div>
                        {/* Background row */}
                        <div id="row3">
                            <p className="text_white">Background</p>
                            <div className="box_round">
                                <div
                                    className="nextPage background"
                                    onClick={() => navigate(`/characters/${id}/background`)}
                                >
                                    {background?.name ? (
                                        <span>{background.name}</span>
                                    ) : (
                                        <img
                                            src={plusImg}
                                            className="plus"
                                            alt="select background"
                                        />
                                    )}
                                </div>
                                {background && (
                                    <img
                                        id="clearBackground"
                                        className="clearIcon"
                                        src={crossImg}
                                        alt="clear background"
                                        onClick={clearBackgroundSelection}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Info input */}
                    <div id="charakterInfos">
                        <p id="infoHeadline">Info</p>
                        <div>
                            <input
                                type="text"
                                placeholder="Enter your Charakters Info"
                                id="charakterInfoInput"
                                value={info}
                                onChange={(e) => setInfo(e.target.value)}
                                onBlur={handleInfoBlur}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Ability scores section */}
            <div className="containerAbility">
                <h1 id="attrHeadliner">Attribute — Punkte vergeben</h1>
                <div className="topAbility">
                    <div className="budgetAbility">
                        <label htmlFor="totalBudgetAbility">Gesamtpunkte:</label>
                        <input
                            type="number"
                            id="totalBudgetAbility"
                            min={0}
                            value={totalBudget}
                            onChange={handleBudgetChange}
                        />
                    </div>
                    <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.6)' }}>
                        Verwende die +/- Knöpfe oder trage eine Zahl ein.
                    </div>
                </div>
                <div className="summaryAbility">
                    <div>
                        Verwendet: <span id="usedAbility">{usedPoints}</span>
                    </div>
                    <div>
                        Verbleibend: <span id="remainingAbility">{remaining}</span>
                    </div>
                </div>
                <div id="attributesAbility">
                    {abilities.map((a) => {
                        const value = Math.max(0, Math.floor(Number(a.value) || 0))
                        return (
                            <div key={a.id} className="rowAbility">
                                <div>
                                    <div className="attrNameAbility">{a.name}</div>
                                    {a.description && (
                                        <span className="attrDescAbility">{a.description}</span>
                                    )}
                                </div>
                                <div className="controlsAbility">
                                    <button type="button" onClick={() => handleDec(a.id)}>
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        min={0}
                                        value={Number.isNaN(value) ? 0 : value}
                                        onChange={(e) =>
                                            handleInputChange(a.id, e.target.value)
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleInc(a.id)}
                                        disabled={remaining <= 0}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="footerAbility">
                    Attribute: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma.
                </div>
            </div>
        </div>
    )
}

export default CharacterStart
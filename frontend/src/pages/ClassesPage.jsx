import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClasses, getCharacter, patchCharacter } from '../api/client'

// Import the stylesheet matching the original classes.html.  It defines
// the .app, .slider-wrap, .thumb, .detail, .nav-btn and other classes
// used below so that the markup aligns with the provided CSS.
import '../styles/classes.css'

/**
 * The classes page presents a slider of all available classes.  When
 * a class is selected a detail view slides down with a description
 * and a save button.  This component mirrors the structure of
 * character-creation/classes.html from the resources folder.
 */
function ClassesPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [classesList, setClassesList] = useState([])
    const [selected, setSelected] = useState(null)
    const [status, setStatus] = useState('Loading…')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    // Load all classes and determine currently selected class for the character
    useEffect(() => {
        if (!id) return
        ;(async () => {
            try {
                setStatus('Loading…')
                setError('')
                const [cls, char] = await Promise.all([getClasses(), getCharacter(id)])
                const list = Array.isArray(cls) ? cls : []
                setClassesList(list)
                // preselect class if character already has one
                const initial = list.find((c) => c.id === (char?.classId ?? null)) || null
                setSelected(initial)
                setStatus(list.length === 0 ? 'No classes found.' : '')
            } catch (e) {
                console.error(e)
                setError(e.message || 'Failed to load classes')
                setStatus('')
            }
        })()
    }, [id])

    // Rotate the list to the left (move last element to the front)
    function handlePrev() {
        setClassesList((prev) => {
            if (prev.length === 0) return prev
            const arr = [...prev]
            const last = arr.pop()
            if (last) arr.unshift(last)
            return arr
        })
    }

    // Rotate the list to the right (move first element to the end)
    function handleNext() {
        setClassesList((prev) => {
            if (prev.length === 0) return prev
            const arr = [...prev]
            const first = arr.shift()
            if (first) arr.push(first)
            return arr
        })
    }

    // Persist the selected class and navigate back to the character page
    async function handleSave() {
        if (!id || !selected) return
        try {
            setSaving(true)
            await patchCharacter(id, { classId: selected.id })
            navigate(`/characters/${id}`)
        } catch (e) {
            console.error(e)
            setError(e.message || 'Failed to save class')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="app">
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
            {/* Slider section */}
            <section className="slider-wrap" aria-label="Bild-Slider">
                <button
                    className="nav-btn nav-left"
                    aria-label="Vorheriges"
                    onClick={handlePrev}
                >
                    ◀
                </button>
                <div className="slider">
                    {classesList.map((c) => {
                        const isSelected = selected?.id === c.id
                        // Resolve image at build time.  new URL(...) with
                        // import.meta.url tells Vite to include the file in
                        // the output bundle.
                        let imgSrc
                        try {
                            imgSrc = new URL(`../images/${c.name}.png`, import.meta.url).href
                        } catch (e) {
                            imgSrc = ''
                        }
                        return (
                            <button
                                key={c.id}
                                className={`thumb${isSelected ? ' active-thumb' : ''}`}
                                onClick={() => setSelected(c)}
                                aria-label={c.name}
                            >
                                <img src={imgSrc} alt={c.name} />
                                <div className="label">{c.name}</div>
                            </button>
                        )
                    })}
                </div>
                <button
                    className="nav-btn nav-right"
                    aria-label="Nächstes"
                    onClick={handleNext}
                >
                    ▶
                </button>
            </section>
            {/* Detail section */}
            <section
                className={`detail${selected ? ' active' : ''}`}
                id="detail"
            >
                {selected && (
                    <div className="hero">
                        {/* Display selected class image */}
                        {(() => {
                            let src = ''
                            try {
                                src = new URL(`../images/${selected.name}.png`, import.meta.url)
                                    .href
                            } catch (e) {
                                src = ''
                            }
                            return <img src={src} alt={selected.name} />
                        })()}
                        <div className="meta">
                            <h2 id="detailTitle">{selected.name}</h2>
                            <p id="detailText">{selected.description}</p>
                        </div>
                        <button className="back" id="backBtn" onClick={handleSave}>
                            {saving ? 'Saving…' : 'Speichern'}
                        </button>
                    </div>
                )}
            </section>
        </div>
    )
}

export default ClassesPage
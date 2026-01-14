async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        const message = text || res.statusText || 'Request failed'
        throw new Error(message)
    }
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
        return res.json()
    }
    return res.text()
}

// ---- Characters ----

export async function getCharacters() {
    const res = await fetch('/api/character/all')
    return handleResponse(res)
}

export async function createInitialCharacter() {
    const res = await fetch('/api/character/createInitialCharacter', {
        method: 'POST',
    })
    return handleResponse(res)
}

export async function getCharacter(id) {
    const res = await fetch(`/api/character/${id}`)
    return handleResponse(res)
}

export async function patchCharacter(id, data) {
    const res = await fetch(`/api/character/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    return handleResponse(res)
}

// ---- Ability scores ----

export async function getAllAbilities() {
    const res = await fetch('/api/ability/all')
    return handleResponse(res)
}

export async function getCharacterAbilityScores(id) {
    const res = await fetch(`/api/character/${id}/getAbilityScores`)
    return handleResponse(res)
}

export async function saveCharacterAbilityScore(characterId, abilityId, score) {
    const res = await fetch(
        `/api/character-ability/${characterId}/${abilityId}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: Number(score) || 0 }),
        },
    )
    return handleResponse(res)
}

// ---- Classes ----

export async function getClasses() {
    const res = await fetch('/api/classes')
    return handleResponse(res)
}

export async function getClassById(id) {
    const res = await fetch(`/api/classes/${id}`)
    return handleResponse(res)
}

// ---- Backgrounds ----

export async function getBackgrounds() {
    const res = await fetch('/api/background/all')
    return handleResponse(res)
}

export async function getBackgroundById(id) {
    const res = await fetch(`/api/background/${id}`)
    return handleResponse(res)
}

import React from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import CharacterList from './components/CharacterList'
import CharacterStart from './pages/CharacterStart'
import ClassesPage from './pages/ClassesPage'
import BackgroundPage from './pages/BackgroundPage'

function Shell({ children }) {
    return (
        <div>
            <div>
                <header>
                    <nav style={{ fontSize: '13px' }}>
                        <Link
                            to="/characters"
                            style={{ color: '#a5b4fc', textDecoration: 'none' }}
                        >
                        </Link>
                    </nav>
                </header>

                {children}
            </div>
        </div>
    )
}

function App() {
    return (
        <Shell>
            <Routes>
                <Route path="/" element={<Navigate to="/characters" replace />} />
                <Route path="/characters" element={<CharacterList />} />
                <Route path="/characters/:id" element={<CharacterStart />} />
                <Route path="/characters/:id/classes" element={<ClassesPage />} />
                <Route path="/characters/:id/background" element={<BackgroundPage />} />
                <Route path="*" element={<Navigate to="/characters" replace />} />
            </Routes>
        </Shell>
    )
}

export default App

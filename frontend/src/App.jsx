import React from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import CharacterList from './components/CharacterList'
import CharacterStart from './pages/CharacterStart'
import ClassesPage from './pages/ClassesPage'
import BackgroundPage from './pages/BackgroundPage'

function Shell({ children }) {
    return (
        <div
            style={{
                minHeight: '100vh',
                margin: 0,
                padding: '32px',
                background: '#0b1020',
                color: '#f5f5f5',
                fontFamily:
                    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
        >
            <div
                style={{
                    maxWidth: '960px',
                    margin: '0 auto',
                    background: 'rgba(10, 15, 35, 0.9)',
                    borderRadius: '16px',
                    padding: '24px 28px 32px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
            >
                <header
                    style={{
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '16px',
                    }}
                >
                    <div>
                        <h1 style={{ fontSize: '26px', margin: 0 }}>Dicekeeper</h1>
                        <p style={{ marginTop: '6px', color: '#98a2b3', fontSize: '13px' }}>
                            React frontend talking to your existing Quarkus API.
                        </p>
                    </div>
                    <nav style={{ fontSize: '13px' }}>
                        <Link
                            to="/characters"
                            style={{ color: '#a5b4fc', textDecoration: 'none' }}
                        >
                            Characters
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

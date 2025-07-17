import React from 'react'
import { Routes, Route } from 'react-router-dom'
import App from './App'
import LibraryPage from './pages/LibraryPage'
import ObjectEditorPage from './pages/ObjectEditorPage'
const SceneEditor: React.FC = () => <App />

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<LibraryPage />} />
      <Route path="/scenes/new" element={<SceneEditor />} />
      <Route path="/scenes/:id/edit" element={<SceneEditor />} />
      <Route path="/objects/new" element={<ObjectEditorPage />} />
      <Route path="/objects/:id/edit" element={<ObjectEditorPage />} />
    </Routes>
  )
}

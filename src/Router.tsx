import React from 'react'
import { Routes, Route } from 'react-router-dom'
import App from './App'

const LibraryPage: React.FC = () => <div>Library Page</div>
const SceneEditor: React.FC = () => <App />
const ObjectEditorPage: React.FC = () => <div>Object Editor Page</div>

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

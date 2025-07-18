import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LibraryPage from '../pages/LibraryPage'
import ObjectEditorPage from '../pages/ObjectEditorPage'
import SceneEditorPage from '../pages/SceneEditorPage'

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<LibraryPage />} />
      <Route path="/scenes/new" element={<SceneEditorPage />} />
      <Route path="/scenes/:id/edit" element={<SceneEditorPage />} />
      <Route path="/objects/new" element={<ObjectEditorPage />} />
      <Route path="/objects/:id/edit" element={<ObjectEditorPage />} />
    </Routes>
  )
}

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import App from './App'
import MainLayout from './layouts/MainLayout'
import LibraryPage from './pages/LibraryPage'
const SceneEditor: React.FC = () => <App />
const ObjectEditorPage: React.FC = () => (
  <MainLayout>
    <div>Object Editor Page</div>
  </MainLayout>
)

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

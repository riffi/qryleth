import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'

/**
 * Компонент маршрутизации приложения.
 *
 * Задачи и особенности:
 * - Использует ленивую загрузку (React.lazy) для страниц, чтобы сократить размер начального бандла.
 *   Это особенно важно для тяжёлых страниц редактора сцены/объекта, где подключаются three.js и R3F.
 * - Оборачивает роуты в <Suspense>, чтобы показывать лёгкий фолбэк во время подгрузки чанков.
 * - Такое разделение уменьшает предупреждения Vite/Rollup о больших чанках и ускоряет TTI.
 */
const LibraryPage = lazy(() => import('../pages/LibraryPage'))
const ObjectEditorPage = lazy(() => import('../pages/ObjectEditorPage'))
const SceneEditorPage = lazy(() => import('../pages/SceneEditorPage'))
const InstancedMeshTestPage = lazy(() => import('../pages/InstancedMeshTestPage'))

export default function Router() {
  return (
    <Suspense fallback={<div />}> 
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/scenes/new" element={<SceneEditorPage />} />
        <Route path="/scenes/:id/edit" element={<SceneEditorPage />} />
        <Route path="/objects/new" element={<ObjectEditorPage />} />
        <Route path="/objects/:id/edit" element={<ObjectEditorPage />} />
        <Route path="/test/instanced-mesh" element={<InstancedMeshTestPage />} />
      </Routes>
    </Suspense>
  )
}

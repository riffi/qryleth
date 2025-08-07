import React from 'react'
import { InstancedMeshDemo } from '@/shared/r3f/optimization/InstancedMeshDemo'

/**
 * Тестовая страница для демонстрации работы Instanced Mesh
 * с составными объектами
 */
const InstancedMeshTestPage: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <InstancedMeshDemo />
    </div>
  )
}

export default InstancedMeshTestPage

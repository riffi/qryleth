import React from 'react'
import { InstancedMeshDemo } from '@/shared/r3f/optimization/InstancedMeshDemo'

/**
 * Тестовая страница для демонстрации работы Instanced Mesh
 * с составными объектами.
 *
 * Важно: избегаем `width: 100vw`, т.к. при наличии вертикальной полосы прокрутки
 * это может приводить к появлению горизонтального скролла (100vw включает ширину скроллбара).
 * Вместо этого используем ширину в 100% доступной области и высоту экрана `100dvh`.
 */
const InstancedMeshTestPage: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100dvh' }}>
      <InstancedMeshDemo />
    </div>
  )
}

export default InstancedMeshTestPage

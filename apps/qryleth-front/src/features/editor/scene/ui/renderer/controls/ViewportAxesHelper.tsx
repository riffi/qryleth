import React from 'react'
import { GizmoHelper, GizmoViewport } from '@react-three/drei'

/**
 * ViewportAxesHelper — компактный экранный индикатор направлений осей X/Y/Z.
 *
 * Назначение:
 * - Показывает ориентацию мировых осей относительно текущей камеры.
 * - Фиксированно закреплён в углу экрана (не зависит от позиции камеры),
 *   но синхронно поворачивается вместе с ней.
 * - Использует GizmoHelper/GizmoViewport из @react-three/drei для лёгкой интеграции.
 */
export const ViewportAxesHelper: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
  // Держим компонент смонтированным, а видимость переключаем у контейнера,
  // чтобы не триггерить пересоздание внутренних CanvasTexture.
  return (
    <group visible={visible}>
      <GizmoHelper alignment="bottom-right" margin={[48, 48]} renderPriority={1000}>
        <GizmoViewport axisColors={["#ff6b6b", "#51cf66", "#339af0"]} labelColor="#ffffff" />
      </GizmoHelper>
    </group>
  )
}

export default ViewportAxesHelper

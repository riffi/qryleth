import React from 'react'
/** Свойства компонента GridHelper */
interface GridHelperProps {
  /** Показывать ли сетку */
  visible: boolean
}

export const GridHelper: React.FC<GridHelperProps> = ({ visible }) => {
  if (!visible) return null

  return (
    <gridHelper
      args={[100, 100, 0x444444, 0x888888]}
      position={[0, 0.01, 0]}
    />
  )
}


import React from 'react'
import {useGridVisible} from "../../../features/scene/model/sceneStore.ts";

export const GridHelper: React.FC = () => {
  const gridVisible = useGridVisible()

  if (!gridVisible) return null

  return (
    <gridHelper
      args={[100, 100, 0x444444, 0x888888]}
      position={[0, 0.01, 0]}
    />
  )
}

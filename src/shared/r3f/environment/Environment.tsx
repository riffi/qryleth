import React from 'react'
import { GridHelper } from './GridHelper'

/** Свойства окружения сцены */
interface EnvironmentProps {
  /** Флаг отображения сетки */
  gridVisible: boolean
}

export const Environment: React.FC<EnvironmentProps> = ({ gridVisible }) => {
  return (
    <>
      <GridHelper visible={gridVisible} />
    </>
  )
}

import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Grid } from '@react-three/drei'
import {Vector3} from "three/src/math/Vector3";

/** Свойства компонента `GridHelper` */
interface GridHelperProps {
  /** Показывать ли сетку */
  visible: boolean
  /**
   * Включить режим «сеткой вокруг камеры».
   * При включении сетка будет смещаться по XZ так, чтобы оставаться вокруг текущего положения камеры.
   * Это визуально создаёт эффект бесконечной сетки без необходимости увеличивать её размер.
   */
  gridAroundCamera?: boolean
  /** Общий размер сетки (по умолчанию 100). Используется и для шага привязки. */
  size?: number
  /** Количество делений сетки (по умолчанию 100). */
  divisions?: number
  /** Цвет основных линий сетки. */
  color1?: THREE.ColorRepresentation
  /** Цвет второстепенных линий сетки. */
  color2?: THREE.ColorRepresentation
}

/**
 * Компонент вспомогательной сетки для сцены.
 * - В обычном режиме отображает статичную сетку в центре сцены на уровне Y ≈ 0.
 * - В режиме `gridAroundCamera` смещает сетку по XZ за камерой, создавая эффект «бесконечной» сетки.
 */
export const GridHelper: React.FC<GridHelperProps> = ({
  visible,
  size = 100,
  divisions = 100,
  color1 = 0x444444,
  color2 = 0x888888,
}) => {


  // Предвычисляем шаг сетки (размер одной клетки)
  const cellSize = useMemo(() => (divisions > 0 ? size / divisions : 1), [size, divisions])


  if (!visible) return null

  return (
      <group renderOrder={-1}>
      <Grid
          cellColor={color1}
          sectionColor={color2}
          args={[size, size]}
          cellSize={cellSize}
          cellThickness={0.5}
          sectionSize={10}
          sectionThickness={1}
          fadeDistance={size * 5}
          fadeStrength={5}
          infiniteGrid={true}
      />
      </group>
  )
}

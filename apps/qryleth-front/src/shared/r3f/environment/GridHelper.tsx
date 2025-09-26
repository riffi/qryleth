import React, { useEffect, useMemo, useRef } from 'react'
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
  /**
   * Ссылка на экземпляр drei Grid для тонкой настройки материала после монтирования.
   * Тип any, т.к. drei не экспортирует точный тип материалов для Grid.
   */
  const gridRef = useRef<any>(null)

  // Предвычисляем шаг сетки (размер одной клетки)
  const cellSize = useMemo(() => (divisions > 0 ? size / divisions : 1), [size, divisions])
  /**
   * Избавляемся от «драки» (z-fighting) с ландшафтом:
   * - Чуть приподнимаем сетку над плоскостью Y=0 (epsilon по Y)
   * - Включаем polygonOffset и отключаем запись в depth (depthWrite=false),
   *   чтобы сетка не мерцала и не перебивалась полигонами земли при копланарности.
   *   depthTest оставляем включённым, чтобы сетка не просвечивала через объекты над ней.
   */
  useEffect(() => {
    const material = gridRef.current?.material
    if (material) {
      try {
        material.depthWrite = false
        material.depthTest = true
        material.polygonOffset = true
        material.polygonOffsetFactor = -1
        material.polygonOffsetUnits = -1
        material.needsUpdate = true
      } catch {}
    }
  }, [])

  return (
    <group /* небольшой подъём сетки во избежание z-fighting */ position={[0, 0.001, 0]} visible={visible}>
      <Grid
        ref={gridRef}
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

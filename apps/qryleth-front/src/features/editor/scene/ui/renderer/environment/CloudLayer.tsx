import React, { useMemo, useRef } from 'react'
import { Cloud, Clouds } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Vector3, Group } from 'three'


/**
 * Компонент слоя облаков.
 * Задача: сделать так, чтобы облако медленно и плавно
 * дрейфовало в случайном направлении по плоскости XZ.
 *
 * Детали реализации:
 * - При монтировании выбирается случайное направление (единичный вектор по XZ).
 * - На каждом кадре к позиции облака добавляется небольшой сдвиг
 *   пропорционально прошедшему времени кадра (dt), что обеспечивает плавность.
 * - Высота (ось Y) остается постоянной, чтобы облако «плыло» по небу без подъема/падения.
 */
export const CloudLayer: React.FC = () => {
  // Ссылка на объект облака для прямого обновления позиции в кадре
  const cloudRef = useRef<Group | null>(null)

  // Случайное направление движения по плоскости XZ (нормализованный вектор)
  // Комментарий: вычисляется один раз при монтировании, затем неизменен
  const driftDirection = useMemo<Vector3>(() => {
    const angle = Math.random() * Math.PI * 2
    return new Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize()
  }, [])

  // Базовая скорость дрейфа (единицы сцены в секунду). Подобрана как «медленно».
  const DRIFT_SPEED =1

 /**
   * Анимационный цикл кадра.
   * Плавно смещает облако по направлению driftDirection с малой скоростью.
   * Используем dt (дельта-время между кадрами) для стабильного перемещения
   * независимо от частоты кадров.
   */
  useFrame((_, dt) => {
    const obj = cloudRef.current
    if (!obj) return
    obj.position.x += driftDirection.x * DRIFT_SPEED * dt
    obj.position.z += driftDirection.z * DRIFT_SPEED * dt
  })

  return (
    <Clouds>
      <Cloud
        // ref нужен для обновления позиции на каждом кадре
        ref={cloudRef as any}
        seed={2}
        segments={10}
        bounds={[20, 15, 30]}
        position={[90, 140, 90]}
        rotation={[0, -1, 1]}
        volume={350}
        opacity={0.2}
        color="white"
        // speed/growth оставляем 0, чтобы форма облака не пульсировала
        speed={0.2}
        growth={0.5}
      />
    </Clouds>
  )
}

import React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GfxObject } from '@/entities/object'
import { ObjectRendererR3F } from '@/features/object-editor/lib/offscreen-renderer/ObjectRendererR3F'

export interface HoverInteractivePreviewProps {
  /** Объект для рендеринга в интерактивном превью */
  gfxObject: GfxObject
}

/**
 * Автоподстройка камеры под габариты объекта с последующим мягким вращением вокруг центра.
 * Камера выставляется так, чтобы весь объект гарантированно попадал в кадр, затем
 * выполняется плавное вращение по окружности вокруг вертикальной оси (Y) с постоянной угловой скоростью.
 */
const AutoFitOrbitCamera: React.FC<{ gfxObject: GfxObject }> = ({ gfxObject }) => {
  const { camera, scene } = useThree()
  const centerRef = React.useRef(new THREE.Vector3(0, 0, 0))
  const radiusRef = React.useRef(3)
  const elevationRef = React.useRef(0.6) // радианы, ~34° над горизонтом
  const angleRef = React.useRef(0)
  const readyRef = React.useRef(false)

  /**
   * Вычисляет bounding box сцены, центр и оптимальную дистанцию для камеры.
   * Вызывается один раз после того, как примитивы оказались в сцене.
   */
  React.useLayoutEffect(() => {
    const t = setTimeout(() => {
      const meshes: THREE.Object3D[] = []
      scene.traverse(child => {
        if ((child as any).isMesh) meshes.push(child)
      })

      if (meshes.length === 0) {
        centerRef.current.set(0, 0, 0)
        radiusRef.current = 3
        readyRef.current = true
        return
      }

      const bbox = new THREE.Box3()
      for (const m of meshes) {
        bbox.union(new THREE.Box3().setFromObject(m))
      }

      if (bbox.isEmpty()) {
        centerRef.current.set(0, 0, 0)
        radiusRef.current = 3
        readyRef.current = true
        return
      }

      const center = bbox.getCenter(new THREE.Vector3())
      const size = bbox.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      const perspective = camera as THREE.PerspectiveCamera
      const fov = (perspective.fov * Math.PI) / 180
      const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.1

      centerRef.current.copy(center)
      radiusRef.current = distance

      // Стартовая позиция камеры под углом для приятной композиции
      const angle0 = Math.PI / 4
      angleRef.current = angle0
      camera.position.set(
        center.x + distance * Math.cos(elevationRef.current) * Math.cos(angle0),
        center.y + distance * Math.sin(elevationRef.current),
        center.z + distance * Math.cos(elevationRef.current) * Math.sin(angle0),
      )
      camera.lookAt(center)
      camera.updateProjectionMatrix()

      readyRef.current = true
    }, 60)

    return () => clearTimeout(t)
  }, [gfxObject, camera, scene])

  /**
   * Плавное вращение камеры вокруг центра объекта.
   * Скорость выбрана небольшой, чтобы не отвлекать и не утомлять.
   */
  useFrame((_, delta) => {
    if (!readyRef.current) return
    const center = centerRef.current
    const R = radiusRef.current
    const elev = elevationRef.current

    angleRef.current += delta * 0.3 // рад/с
    const a = angleRef.current
    camera.position.set(
      center.x + R * Math.cos(elev) * Math.cos(a),
      center.y + R * Math.sin(elev),
      center.z + R * Math.cos(elev) * Math.sin(a),
    )
    camera.lookAt(center)
  })

  return null
}

/**
 * Сцена превью для hover-состояния карточки библиотеки:
 * - Переиспользует ObjectRendererR3F для консистентного вида геометрии
 * - Добавляет нейтральное освещение (ambient + два directional)
 * - Включает автоустановку и автоворот камеры AutoFitOrbitCamera
 */
const HoverPreviewScene: React.FC<{ gfxObject: GfxObject }> = ({ gfxObject }) => {
  // Цвет фона как в offscreen превью PNG (см. OffscreenObjectRenderer)
  const background = '#EAF4FF'
  return (
    <>
      {/* Фон сцены совпадает с PNG превью, чтобы не было отличий */}
      {/* @ts-ignore three-fiber intrinsic */}
      <color attach="background" args={[background]} />
      <ambientLight color="#ffffff" intensity={0.7} />
      <directionalLight position={[5, 8, 6]} color="#ffffff" intensity={1.0} />
      <directionalLight position={[-4, -6, -3]} color="#ffffff" intensity={0.5} />

      <ObjectRendererR3F gfxObject={gfxObject} renderMode="solid" />

      <AutoFitOrbitCamera gfxObject={gfxObject} />
    </>
  )
}

/**
 * Интерактивное превью для карточки библиотеки, которое отображается при наведении курсора.
 * Canvas занимает весь контейнер превью и рендерит объект с авто-подбором и вращением камеры.
 *
 * Важно: Canvas создаётся только когда компонент смонтирован (т.е. при hover),
 * чтобы не расходовать ресурсы вне наведения.
 */
export const HoverInteractivePreview: React.FC<HoverInteractivePreviewProps> = ({ gfxObject }) => {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, pointerEvents: 'none' }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', outputColorSpace: THREE.SRGBColorSpace }}
      dpr={1}
      camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 2000 }}
    >
      <HoverPreviewScene gfxObject={gfxObject} />
    </Canvas>
  )
}

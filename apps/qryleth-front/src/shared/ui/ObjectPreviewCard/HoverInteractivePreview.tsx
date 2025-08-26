import React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GfxObject } from '@/entities/object'
import { ObjectRendererR3F } from '@/features/object-editor/lib/offscreen-renderer/ObjectRendererR3F'
import { LoadingOverlay } from '@mantine/core'

export interface HoverInteractivePreviewProps {
  /** Объект для рендеринга в интерактивном превью */
  gfxObject: GfxObject
  /** Колбэк изменения готовности рендера: true — можно показывать Canvas */
  onReadyChange?: (ready: boolean) => void
}

/**
 * Автоподстройка и мягкое вращение камеры вокруг объекта.
 *
 * Логика подбора дистанции учитывает реальный аспект Canvas и вертикальный FOV камеры.
 * Дистанция выбирается как максимум из вертикального и горизонтального вписывания:
 *   dV = (H/2) / tan(FOVy/2), dH = (W/2) / (tan(FOVy/2) * aspect)
 * Для более крупного кадрирования используется небольшой отступ (padding ~ 1.05).
 * После подстройки выполняется плавное вращение вокруг оси Y.
 */
/**
 * Вспомогательная функция для вычисления аспект‑отношения Canvas.
 * Принимает объект размера R3F (`size.width`, `size.height`) и возвращает `width / height`.
 * Содержит защиту от деления на ноль: при нулевой высоте возвращает 1.
 */
function sizeRefFromThree(size: { width: number; height: number }): number {
  return size.height > 0 ? size.width / size.height : 1
}

const AutoFitOrbitCamera: React.FC<{ gfxObject: GfxObject, onReady?: () => void }> = ({ gfxObject, onReady }) => {
  const { camera, scene, size } = useThree()
  const centerRef = React.useRef(new THREE.Vector3(0, 0, 0))
  const radiusRef = React.useRef(3)
  const elevationRef = React.useRef(0.6) // радианы, ~34° над горизонтом
  const angleRef = React.useRef(0)
  const readyRef = React.useRef(false)

  /**
   * Вычисляет геометрию охвата (AABB + bounding sphere), центр и оптимальную дистанцию камеры.
   * Используем сферу охвата для устойчивого кадрирования при вращении: если камера всегда смотрит в центр
   * сферы, то при дистанции d >= r/sin(FOV/2) объект гарантированно целиком влезает в кадр.
   * Учитываем вертикальный FOV (fovY) и горизонтальный FOV (fovX), выбираем максимальную необходимую дистанцию.
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
      const sphere = bbox.getBoundingSphere(new THREE.Sphere())
      const r = sphere.radius > 0 ? sphere.radius : 1

      const perspective = camera as THREE.PerspectiveCamera
      const fovY = (perspective.fov * Math.PI) / 180
      const aspect = sizeRefFromThree(size)
      const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect)
      // Для сферы охвата условие влезания: d >= r / sin(FOV/2)
      const dV = r / Math.sin(fovY / 2)
      const dH = r / Math.sin(fovX / 2)
      const baseDistance = Math.max(dV, dH)
      const distance = baseDistance * 1.2 // безопасный запас против краевых случаев и вращения

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
      onReady?.()
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
const HoverPreviewScene: React.FC<{ gfxObject: GfxObject, onReady?: () => void }> = ({ gfxObject, onReady }) => {
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

      <AutoFitOrbitCamera gfxObject={gfxObject} onReady={onReady} />
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
export const HoverInteractivePreview: React.FC<HoverInteractivePreviewProps> = ({ gfxObject, onReadyChange }) => {
  // Локальное состояние готовности сцены: true, когда камера подстроена и можно показывать рендер
  const [ready, setReady] = React.useState(false)

  // Сообщаем наружу о готовности, чтобы родитель мог синхронизировать видимость PNG
  React.useEffect(() => {
    onReadyChange?.(ready)
  }, [ready, onReadyChange])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Оверлей загрузки до готовности сцены */}
      <LoadingOverlay
        visible={!ready}
        zIndex={1}
        // Делаем фон оверлея таким же, как у PNG превью (#EAF4FF)
        overlayProps={{ radius: 'sm', blur: 0, color: '#EAF4FF', opacity: 1 }}
        loaderProps={{ type: 'oval' }}
        transitionProps={{ duration: 80 }}
        // Не блокируем события, чтобы hover не пропал
        style={{ pointerEvents: 'none' }}
      />

      <Canvas
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, pointerEvents: 'none', opacity: ready ? 1 : 0 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', outputColorSpace: THREE.SRGBColorSpace }}
        dpr={1}
        camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 2000 }}
        onCreated={() => setReady(false)}
      >
        {/* Для сигнализации о готовности передаём колбэк готовности сцены */}
        <HoverPreviewScene gfxObject={gfxObject} onReady={() => setReady(true)} />
      </Canvas>
    </div>
  )
}

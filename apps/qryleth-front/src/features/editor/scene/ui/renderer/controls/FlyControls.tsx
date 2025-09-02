import React, { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../../../model/sceneStore.ts'
import { UiMode } from '@/shared/types/ui'

export const FlyControls: React.FC = () => {
  const { camera, gl } = useThree()
  const controlsRef = useRef<any>(null)
  
  // Movement state
  const moveForward = useRef(false)
  const moveBackward = useRef(false)
  const moveLeft = useRef(false)
  const moveRight = useRef(false)
  
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const speedRef = useRef(100)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          moveForward.current = true
          break
        case 'KeyS':
          moveBackward.current = true
          break
        case 'KeyA':
          moveLeft.current = true
          break
        case 'KeyD':
          moveRight.current = true
          break
        case 'NumpadAdd':
          speedRef.current = Math.min(speedRef.current + 25, 1000)
          window.dispatchEvent(new CustomEvent('flySpeedChange', { detail: speedRef.current }))
          break
        case 'NumpadSubtract':
          speedRef.current = Math.max(speedRef.current - 25, 10)
          window.dispatchEvent(new CustomEvent('flySpeedChange', { detail: speedRef.current }))
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          moveForward.current = false
          break
        case 'KeyS':
          moveBackward.current = false
          break
        case 'KeyA':
          moveLeft.current = false
          break
        case 'KeyD':
          moveRight.current = false
          break
      }
    }

    const handleClick = () => {
      if (controlsRef.current) {
        controlsRef.current.lock()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    gl.domElement.addEventListener('click', handleClick)

    // Установить стартовую позу камеры из сохранённой (если есть), иначе дефолт
    try {
      const pose = useSceneStore.getState().restoreCameraPose?.()
      if (pose?.position) {
        camera.position.set(pose.position[0], pose.position[1], pose.position[2])
      } else {
        camera.position.set(0, 5, 10)
      }
      if (pose?.rotation) {
        camera.rotation.set(pose.rotation[0], pose.rotation[1], pose.rotation[2])
      }
    } catch {
      camera.position.set(0, 5, 10)
    }

    // При монтировании сразу отправляем актуальную скорость
    window.dispatchEvent(new CustomEvent('flySpeedChange', { detail: speedRef.current }))

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      gl.domElement.removeEventListener('click', handleClick)
    }
  }, [camera, gl])

  useFrame((_, delta) => {
    if (!controlsRef.current || !controlsRef.current.isLocked) return

    // Apply damping
    velocity.current.x -= velocity.current.x * 10.0 * delta
    velocity.current.z -= velocity.current.z * 10.0 * delta

    // Calculate movement direction (локальный вектор)
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current)
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current)
    direction.current.y = 0
    if (direction.current.lengthSq() > 0) direction.current.normalize()

    const speed = speedRef.current
    if (moveForward.current || moveBackward.current) {
      velocity.current.z -= direction.current.z * speed * delta
    }
    if (moveLeft.current || moveRight.current) {
      velocity.current.x -= direction.current.x * speed * delta
    }

    // --- Новый блок: движение относительно направления взгляда камеры ---
    // Для fly-режима: X — вправо, Z — вперёд (Three.js)
    // Исправляем знак для X: влево (A) — отрицательно, вправо (D) — положительно
    const move = new THREE.Vector3(-velocity.current.x, 0, velocity.current.z)
    move.applyQuaternion(camera.quaternion)
    camera.position.addScaledVector(move, delta)
    // --- Конец нового блока ---
  })

  return (
    <PointerLockControls
      ref={controlsRef}
      camera={camera}
      domElement={gl.domElement}
      onUnlock={() => {
        try {
          const state = useSceneStore.getState()
          if (state.uiMode !== UiMode.Play) return

          // Если уже переключились на Orbit (через 1/панель) — остаёмся в Play.
          // Если всё ещё Walk/Fly и разблокировали курсор (Esc) — переключаемся на Orbit и выходим из Play.
          if (state.viewMode === 'orbit') {
            return
          }
          try { state.setViewMode('orbit') } catch {}
          state.togglePlay()
        } catch {}
      }}
    />
  )
}

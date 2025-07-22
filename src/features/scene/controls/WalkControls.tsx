import React, { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../model/sceneStore'

export const WalkControls: React.FC = () => {
  const { camera, gl, scene } = useThree()
  const controlsRef = useRef<any>()

  // Movement state
  const moveForward = useRef(false)
  const moveBackward = useRef(false)
  const moveLeft = useRef(false)
  const moveRight = useRef(false)

  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const raycaster = useRef(new THREE.Raycaster())

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

    // Set initial camera position for walk mode
    camera.position.set(0, 1.8, 5)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      gl.domElement.removeEventListener('click', handleClick)
    }
  }, [camera, gl])

  useFrame((state, delta) => {
    if (!controlsRef.current || !controlsRef.current.isLocked) return

    // Apply damping
    velocity.current.x -= velocity.current.x * 10.0 * delta
    velocity.current.z -= velocity.current.z * 10.0 * delta

    // Calculate movement direction
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current)
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current)
    direction.current.normalize()

    const speed = 100
    if (moveForward.current || moveBackward.current) {
      velocity.current.z -= direction.current.z * speed * delta
    }
    if (moveLeft.current || moveRight.current) {
      velocity.current.x -= direction.current.x * speed * delta
    }

    // Move the camera
    if (controlsRef.current.moveRight) {
      controlsRef.current.moveRight(-velocity.current.x * delta)
    }
    if (controlsRef.current.moveForward) {
      controlsRef.current.moveForward(-velocity.current.z * delta)
    }

    // Adjust camera height based on perlin landscape
    const layers = useSceneStore.getState().layers
    const perlinLayerIds = layers
      .filter(l => l.type === 'landscape' && l.shape === 'perlin')
      .map(l => l.id)

    if (perlinLayerIds.length > 0) {
      const meshes: THREE.Object3D[] = []
      scene.traverse(obj => {
        if (
          obj.userData?.layerType === 'landscape' &&
          perlinLayerIds.includes(obj.userData.layerId)
        ) {
          meshes.push(obj)
        }
      })

      if (meshes.length > 0) {
        raycaster.current.set(
          new THREE.Vector3(camera.position.x, 1000, camera.position.z),
          new THREE.Vector3(0, -1, 0)
        )
        const intersects = raycaster.current.intersectObjects(meshes, true)
        if (intersects.length > 0) {
          camera.position.y = intersects[0].point.y + 1.8
        } else {
          camera.position.y = 1.8
        }
      } else {
        camera.position.y = 1.8
      }
    } else {
      camera.position.y = 1.8
    }
  })

  return (
    <PointerLockControls
      ref={controlsRef}
      camera={camera}
      domElement={gl.domElement}
    />
  )
}

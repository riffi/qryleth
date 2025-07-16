import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SceneObject, ScenePrimitive } from '../types/scene'

export const useObjectEditor = (containerRef: React.RefObject<HTMLDivElement | null>, isOpen: boolean = true) => {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const editObjectRef = useRef<THREE.Object3D | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const primitivesRef = useRef<THREE.Mesh[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedPrimitive, setSelectedPrimitive] = useState<THREE.Mesh | null>(null)
  const [selectedPrimitiveIndex, setSelectedPrimitiveIndex] = useState<number>(0)

  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false)
      return
    }
    
    // Wait for container to be ready
    const initializeWhenReady = () => {
      if (!containerRef.current) {
        setTimeout(initializeWhenReady, 100)
        return
      }

      const container = containerRef.current

      // Check if container has dimensions
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(initializeWhenReady, 100)
        return
      }

      initializeThreeJS(container)
    }

    // Add a small delay to ensure modal is fully rendered
    setTimeout(initializeWhenReady, 200)
  }, [containerRef, isOpen])

  const initializeThreeJS = (container: HTMLDivElement) => {
    try {
      // Scene setup
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf5f5f5)
      sceneRef.current = scene

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        100
      )
      camera.position.set(3, 3, 3)
      cameraRef.current = camera

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // Controls setup
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.enableZoom = true
      controls.enablePan = true
      controlsRef.current = controls

      // Lighting setup
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
      scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(5, 5, 5)
      directionalLight.castShadow = true
      directionalLight.shadow.mapSize.width = 1024
      directionalLight.shadow.mapSize.height = 1024
      scene.add(directionalLight)

      // Grid helper
      const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc)
      scene.add(gridHelper)

      // Axes helper
      const axesHelper = new THREE.AxesHelper(2)
      scene.add(axesHelper)

      // Mouse event handlers
      const onMouseClick = (event: MouseEvent) => {
        const rect = container.getBoundingClientRect()
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

        raycasterRef.current.setFromCamera(mouseRef.current, camera)
        const intersects = raycasterRef.current.intersectObjects(primitivesRef.current)

        if (intersects.length > 0) {
          const clickedPrimitive = intersects[0].object as THREE.Mesh
          
          setSelectedPrimitive(clickedPrimitive)
          
          // Find index of selected primitive
          const index = primitivesRef.current.findIndex(p => p === clickedPrimitive)
          if (index !== -1) {
            setSelectedPrimitiveIndex(index)
          }
          
          updatePrimitiveHighlight(clickedPrimitive)
        }
      }

      renderer.domElement.addEventListener('click', onMouseClick)

      // Render loop
      const animate = () => {
        if (controlsRef.current) {
          controlsRef.current.update()
        }
        
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
        
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      animate()

      // Resize handler
      const handleResize = () => {
        if (!container || !camera || !renderer) return
        
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(container.clientWidth, container.clientHeight)
      }

      window.addEventListener('resize', handleResize)
      setIsInitialized(true)

    } catch (error) {
      console.error('Failed to initialize 3D editor:', error)
    }
  }

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      if (rendererRef.current && containerRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }
      
      rendererRef.current?.dispose()
      controlsRef.current?.dispose()
    }
  }, [containerRef, isOpen])

  const updatePrimitiveHighlight = (selectedMesh: THREE.Mesh | null) => {
    // Remove highlight from all primitives
    primitivesRef.current.forEach(primitive => {
      if (primitive.material instanceof THREE.MeshStandardMaterial) {
        primitive.material.emissive.setHex(0x000000)
        primitive.material.emissiveIntensity = 0
      }
    })

    // Add highlight to selected primitive
    if (selectedMesh && selectedMesh.material instanceof THREE.MeshStandardMaterial) {
      selectedMesh.material.emissive.setHex(0x444444)
      selectedMesh.material.emissiveIntensity = 0.3
    }
  }

  const createPrimitiveMesh = (primitive: ScenePrimitive): THREE.Mesh => {
    const color = new THREE.Color(primitive.color || '#cccccc')
    const materialOptions: THREE.MeshStandardMaterialParameters = { color }

    // Обработка прозрачности
    if (primitive.opacity !== undefined && primitive.opacity < 1) {
      materialOptions.transparent = true
      materialOptions.opacity = Math.max(0, Math.min(1, primitive.opacity))
    }

    // Обработка свечения
    if (primitive.emissive) {
      materialOptions.emissive = new THREE.Color(primitive.emissive)
      if (primitive.emissiveIntensity !== undefined) {
        materialOptions.emissiveIntensity = Math.max(0, primitive.emissiveIntensity)
      }
    }

    const material = new THREE.MeshStandardMaterial(materialOptions)
    let mesh: THREE.Mesh

    switch (primitive.type) {
      case 'box': {
        const geometry = new THREE.BoxGeometry(
          primitive.width || 1,
          primitive.height || 1,
          primitive.depth || 1
        )
        mesh = new THREE.Mesh(geometry, material)
        break
      }
      case 'sphere': {
        const geometry = new THREE.SphereGeometry(primitive.radius || 1, 32, 16)
        mesh = new THREE.Mesh(geometry, material)
        break
      }
      case 'cylinder': {
        const geometry = new THREE.CylinderGeometry(
          primitive.radiusTop || 1,
          primitive.radiusBottom || 1,
          primitive.height || 2,
          primitive.radialSegments || 16
        )
        mesh = new THREE.Mesh(geometry, material)
        break
      }
      case 'cone': {
        const geometry = new THREE.ConeGeometry(
          primitive.radius || 1,
          primitive.height || 2,
          primitive.radialSegments || 16
        )
        mesh = new THREE.Mesh(geometry, material)
        break
      }
      case 'pyramid': {
        const geometry = new THREE.ConeGeometry(
          (primitive.baseSize || 1) / 2,
          primitive.height || 2,
          4
        )
        mesh = new THREE.Mesh(geometry, material)
        
        // Автоматически поворачиваем пирамиду на 45 градусов по Y-оси
        mesh.rotation.y = Math.PI / 4
        break
      }
      case 'plane': {
        const geometry = new THREE.PlaneGeometry(
          primitive.width || 1,
          primitive.height || 1
        )
        mesh = new THREE.Mesh(geometry, material)
        break
      }
      default:
        console.warn('Unknown primitive type:', primitive.type)
        mesh = new THREE.Mesh()
    }

    // Устанавливаем позицию и поворот примитива относительно центра составного объекта
    if (primitive.position) {
      mesh.position.set(...primitive.position)
    }

    if (primitive.rotation) {
      // Для пирамиды добавляем заданный поворот к автоматическому
      if (primitive.type === 'pyramid') {
        mesh.rotation.x += primitive.rotation[0]
        mesh.rotation.y += primitive.rotation[1]
        mesh.rotation.z += primitive.rotation[2]
      } else {
        mesh.rotation.set(...primitive.rotation)
      }
    }

    mesh.castShadow = true
    mesh.receiveShadow = true

    return mesh
  }

  const createCompositeObject = (sceneObject: SceneObject): THREE.Group => {
    const group = new THREE.Group()
    group.name = sceneObject.name

    // Clear previous primitives
    primitivesRef.current = []

    sceneObject.primitives.forEach((primitive, index) => {
      const mesh = createPrimitiveMesh(primitive)
      mesh.userData.primitiveIndex = index
      mesh.userData.primitiveData = primitive
      
      // Store initial transform from primitive data (before mesh creation)
      mesh.userData.initialPosition = new THREE.Vector3(
        primitive.position?.[0] || 0,
        primitive.position?.[1] || 0,
        primitive.position?.[2] || 0
      )
      
      // For pyramid, account for the automatic rotation
      let initialRotationX = primitive.rotation?.[0] || 0
      let initialRotationY = primitive.rotation?.[1] || 0
      let initialRotationZ = primitive.rotation?.[2] || 0
      
      if (primitive.type === 'pyramid') {
        initialRotationY += Math.PI / 4 // Add the automatic rotation
      }
      
      mesh.userData.initialRotation = new THREE.Euler(
        initialRotationX,
        initialRotationY,
        initialRotationZ
      )
      mesh.userData.initialScale = new THREE.Vector3(1, 1, 1) // Scale is always 1 initially
      mesh.userData.hasBeenModified = false // Track if primitive was modified
      
      group.add(mesh)
      primitivesRef.current.push(mesh)
    })

    // Select first primitive by default
    if (primitivesRef.current.length > 0) {
      setSelectedPrimitive(primitivesRef.current[0])
      setSelectedPrimitiveIndex(0)
      updatePrimitiveHighlight(primitivesRef.current[0])
    }

    return group
  }


  const updateObjectTransform = useCallback((
    position: [number, number, number],
    rotation: [number, number, number],
    dimensions: any
  ) => {
    if (!selectedPrimitive) {
      return
    }

    // Apply relative position to initial position
    const initialPosition = selectedPrimitive.userData.initialPosition
    if (initialPosition) {
      selectedPrimitive.position.set(
        initialPosition.x + position[0],
        initialPosition.y + position[1],
        initialPosition.z + position[2]
      )
    } else {
      selectedPrimitive.position.set(...position)
    }

    // Apply relative rotation to initial rotation
    const initialRotation = selectedPrimitive.userData.initialRotation
    if (initialRotation) {
      selectedPrimitive.rotation.set(
        initialRotation.x + rotation[0],
        initialRotation.y + rotation[1],
        initialRotation.z + rotation[2]
      )
    } else {
      selectedPrimitive.rotation.set(...rotation)
    }

    // Update geometry with new dimensions
    const primitive = selectedPrimitive.userData.primitiveData
    if (primitive && dimensions) {
      let newGeometry: THREE.BufferGeometry | null = null
      
      switch (primitive.type) {
        case 'box':
          newGeometry = new THREE.BoxGeometry(
            dimensions.width || 1,
            dimensions.height || 1,
            dimensions.depth || 1
          )
          break
        case 'sphere':
          newGeometry = new THREE.SphereGeometry(dimensions.radius || 1, 32, 16)
          break
        case 'cylinder':
          newGeometry = new THREE.CylinderGeometry(
            dimensions.radius || 1,
            dimensions.radius || 1,
            dimensions.height || 2,
            16
          )
          break
        case 'cone':
          newGeometry = new THREE.ConeGeometry(
            dimensions.radius || 1,
            dimensions.height || 2,
            16
          )
          break
        case 'pyramid':
          newGeometry = new THREE.ConeGeometry(
            (dimensions.baseSize || 1) / 2,
            dimensions.height || 2,
            4
          )
          break
        case 'plane':
          newGeometry = new THREE.PlaneGeometry(
            dimensions.width || 1,
            dimensions.height || 1
          )
          break
      }
      
      if (newGeometry) {
        selectedPrimitive.geometry.dispose()
        selectedPrimitive.geometry = newGeometry
      }
    }

    // Force update matrix and mark for re-render
    selectedPrimitive.updateMatrix()
    selectedPrimitive.updateMatrixWorld(true)
    
    // Also update the parent group's matrix if it exists
    if (selectedPrimitive.parent) {
      selectedPrimitive.parent.updateMatrix()
      selectedPrimitive.parent.updateMatrixWorld(true)
    }
  }, [selectedPrimitive])

  const getObjectTransform = useCallback(() => {
    if (!selectedPrimitive) return null

    const initial = selectedPrimitive.userData.initialPosition
    const current = selectedPrimitive.position
    
    // Calculate relative position from initial position
    const relativePosition = initial ? [
      current.x - initial.x,
      current.y - initial.y,
      current.z - initial.z
    ] : [current.x, current.y, current.z]

    // Get relative rotation from initial rotation
    const initialRotation = selectedPrimitive.userData.initialRotation
    const currentRotation = selectedPrimitive.rotation
    
    const relativeRotation = initialRotation ? [
      currentRotation.x - initialRotation.x,
      currentRotation.y - initialRotation.y,
      currentRotation.z - initialRotation.z
    ] : [currentRotation.x, currentRotation.y, currentRotation.z]

    // Get relative scale from initial scale
    const initialScale = selectedPrimitive.userData.initialScale
    const currentScale = selectedPrimitive.scale
    
    const relativeScale = initialScale ? [
      currentScale.x / initialScale.x,
      currentScale.y / initialScale.y,
      currentScale.z / initialScale.z
    ] : [currentScale.x, currentScale.y, currentScale.z]

    return {
      position: relativePosition as [number, number, number],
      rotation: relativeRotation as [number, number, number],
      scale: relativeScale as [number, number, number]
    }
  }, [selectedPrimitive])

  const selectPrimitiveByIndex = useCallback((index: number) => {
    if (index >= 0 && index < primitivesRef.current.length) {
      const primitive = primitivesRef.current[index]
      
      setSelectedPrimitive(primitive)
      setSelectedPrimitiveIndex(index)
      updatePrimitiveHighlight(primitive)
    }
  }, [])

  const getPrimitivesList = useCallback(() => {
    return primitivesRef.current.map((primitive, index) => ({
      index,
      name: primitive.userData.primitiveData?.type || 'Unknown',
      mesh: primitive
    }))
  }, [])

  const getCameraRelativeMovement = useCallback((direction: 'forward' | 'backward' | 'left' | 'right', distance: number): [number, number, number] => {
    if (!cameraRef.current) return [0, 0, 0]

    const camera = cameraRef.current
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    // Get forward direction (negative Z in camera space)
    camera.getWorldDirection(forward)
    forward.y = 0 // Remove vertical component for XZ movement
    forward.normalize()

    // Get right direction (cross product of forward and up)
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
    right.normalize()

    let movement = new THREE.Vector3()
    
    switch (direction) {
      case 'forward':
        movement = forward.clone().multiplyScalar(-distance) // Negative because camera looks down negative Z
        break
      case 'backward':
        movement = forward.clone().multiplyScalar(distance)
        break
      case 'left':
        movement = right.clone().multiplyScalar(-distance)
        break
      case 'right':
        movement = right.clone().multiplyScalar(distance)
        break
    }

    return [movement.x, movement.y, movement.z]
  }, [])

  const cloneSelectedPrimitive = useCallback(() => {
    if (!selectedPrimitive || !editObjectRef.current) return null

    const primitiveData = selectedPrimitive.userData.primitiveData
    if (!primitiveData) return null

    // Create a copy of the primitive data
    const clonedPrimitiveData = {
      ...primitiveData,
      position: [
        (primitiveData.position?.[0] || 0) + 0.5, // Offset slightly
        (primitiveData.position?.[1] || 0),
        (primitiveData.position?.[2] || 0)
      ]
    }

    // Create the mesh for the cloned primitive
    const clonedMesh = createPrimitiveMesh(clonedPrimitiveData)
    const newIndex = primitivesRef.current.length
    
    // Set up userData for the cloned primitive
    clonedMesh.userData.primitiveIndex = newIndex
    clonedMesh.userData.primitiveData = clonedPrimitiveData
    
    // Store initial transform
    clonedMesh.userData.initialPosition = new THREE.Vector3(
      clonedPrimitiveData.position[0],
      clonedPrimitiveData.position[1],
      clonedPrimitiveData.position[2]
    )
    
    let initialRotationX = clonedPrimitiveData.rotation?.[0] || 0
    let initialRotationY = clonedPrimitiveData.rotation?.[1] || 0
    let initialRotationZ = clonedPrimitiveData.rotation?.[2] || 0
    
    if (clonedPrimitiveData.type === 'pyramid') {
      initialRotationY += Math.PI / 4 // Add the automatic rotation
    }
    
    clonedMesh.userData.initialRotation = new THREE.Euler(
      initialRotationX,
      initialRotationY,
      initialRotationZ
    )
    clonedMesh.userData.initialScale = new THREE.Vector3(1, 1, 1)
    clonedMesh.userData.hasBeenModified = false

    // Add to the scene and primitives array
    editObjectRef.current.add(clonedMesh)
    primitivesRef.current.push(clonedMesh)

    // Select the new primitive
    setSelectedPrimitive(clonedMesh)
    setSelectedPrimitiveIndex(newIndex)
    updatePrimitiveHighlight(clonedMesh)

    return clonedPrimitiveData
  }, [selectedPrimitive])

  const createObjectFromData = useCallback((objectData: SceneObject) => {
    if (!sceneRef.current) return

    // Remove existing edit object
    if (editObjectRef.current) {
      sceneRef.current.remove(editObjectRef.current)
    }

    const compositeObject = createCompositeObject(objectData)
    sceneRef.current.add(compositeObject)
    editObjectRef.current = compositeObject

    return compositeObject
  }, [])

  const createSampleObject = useCallback(() => {
    if (!sceneRef.current) return

    // Remove existing edit object
    if (editObjectRef.current) {
      sceneRef.current.remove(editObjectRef.current)
    }

    // Create a sample object (cube with material)
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x4285f4,
      transparent: true,
      opacity: 0.8
    })
    const cube = new THREE.Mesh(geometry, material)
    cube.castShadow = true
    cube.receiveShadow = true
    
    sceneRef.current.add(cube)
    editObjectRef.current = cube

    return cube
  }, [])

  return {
    isInitialized,
    createSampleObject,
    createObjectFromData,
    updateObjectTransform,
    getObjectTransform,
    selectedPrimitive,
    selectedPrimitiveIndex,
    selectPrimitiveByIndex,
    getPrimitivesList,
    getCameraRelativeMovement,
    cloneSelectedPrimitive
  }
}
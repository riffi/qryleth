import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SceneObject, ScenePrimitive } from '../utils/openAIAPI'

export const useObjectEditor = (containerRef: React.RefObject<HTMLDivElement | null>, isOpen: boolean = true) => {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const editObjectRef = useRef<THREE.Object3D | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      console.log('Editor not open, skipping initialization')
      setIsInitialized(false)
      return
    }
    
    // Wait for container to be ready
    const initializeWhenReady = () => {
      if (!containerRef.current) {
        console.log('Container not ready, waiting...')
        setTimeout(initializeWhenReady, 50)
        return
      }

      const container = containerRef.current
      console.log('Container found, checking dimensions:', container.clientWidth, 'x', container.clientHeight)

      // Check if container has dimensions
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        console.log('Container has no dimensions, waiting...')
        setTimeout(initializeWhenReady, 50)
        return
      }

      console.log('Starting 3D editor initialization...')
      initializeThreeJS(container)
    }

    initializeWhenReady()
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
      console.log('3D editor initialized successfully')
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

    sceneObject.primitives.forEach(primitive => {
      const mesh = createPrimitiveMesh(primitive)
      group.add(mesh)
    })

    return group
  }

  const createObjectFromData = (objectData: SceneObject) => {
    if (!sceneRef.current) return

    // Remove existing edit object
    if (editObjectRef.current) {
      sceneRef.current.remove(editObjectRef.current)
    }

    const compositeObject = createCompositeObject(objectData)
    sceneRef.current.add(compositeObject)
    editObjectRef.current = compositeObject

    return compositeObject
  }

  const createSampleObject = () => {
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
  }

  const updateObjectTransform = (
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number]
  ) => {
    if (!editObjectRef.current) return

    editObjectRef.current.position.set(...position)
    editObjectRef.current.rotation.set(...rotation)
    editObjectRef.current.scale.set(...scale)
  }

  const getObjectTransform = () => {
    if (!editObjectRef.current) return null

    return {
      position: editObjectRef.current.position.toArray() as [number, number, number],
      rotation: editObjectRef.current.rotation.toArray().slice(0, 3) as [number, number, number],
      scale: editObjectRef.current.scale.toArray() as [number, number, number]
    }
  }

  return {
    isInitialized,
    createSampleObject,
    createObjectFromData,
    updateObjectTransform,
    getObjectTransform
  }
}
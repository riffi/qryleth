import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import type {LightingSettings} from '../utils/openRouterAPI'

export interface SceneObject {
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid'
  width?: number
  height?: number
  depth?: number
  radius?: number
  radiusTop?: number
  radiusBottom?: number
  radialSegments?: number
  baseSize?: number
  color?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  opacity?: number
  emissive?: string
  emissiveIntensity?: number
}

export interface SceneLights {
  ambient: THREE.AmbientLight;
  directional: THREE.DirectionalLight;
}

export const useThreeJSScene = (containerRef: React.RefObject<HTMLDivElement>) => {
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const controlsRef = useRef<OrbitControls>()
  const animationFrameRef = useRef<number>()
  const lightsRef = useRef<SceneLights>()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8f9fa)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    )
    camera.position.set(5, 5, 8)
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

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 10, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // Сохраняем ссылки на источники света
    lightsRef.current = {
      ambient: ambientLight,
      directional: directionalLight
    }

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)

    // Resize handler
    const handleResize = () => {
      if (!container) return

      const { clientWidth, clientHeight } = container
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }

    window.addEventListener('resize', handleResize)

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    setIsInitialized(true)

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('resize', handleResize)

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement)
      }

      renderer.dispose()
      controls.dispose()
      setIsInitialized(false)
    }
  }, [containerRef])

  const buildSceneFromDescription = (description: SceneObject[] | any) => {
    if (!sceneRef.current || !isInitialized) return

    const scene = sceneRef.current

    // Clear existing generated objects
    const objectsToRemove = scene.children.filter(child =>
        child.userData.generated === true
    )
    objectsToRemove.forEach(obj => scene.remove(obj))

    // Обработка нового формата ответа
    let objects = description
    let lighting = null

    // Если пришел объект с полями objects и lighting
    if (description && typeof description === 'object' && !Array.isArray(description)) {
      if (description.objects && Array.isArray(description.objects)) {
        objects = description.objects
        lighting = description.lighting
      } else {
        // Обратная совместимость - пытаемся найти массив в объекте
        const possibleArrays = Object.values(description).filter(Array.isArray)
        if (possibleArrays.length > 0) {
          objects = possibleArrays[0]
        }
      }
    }

    // Применяем настройки освещения, если они есть
    if (lighting) {
      updateLighting(lighting)
    }

    if (!Array.isArray(objects)) {
      console.error('Invalid scene description:', description)
      return
    }

    objects.forEach((item: SceneObject) => {
      let mesh: THREE.Mesh
      const color = new THREE.Color(item.color || '#cccccc')
      const materialOptions: THREE.MeshStandardMaterialParameters = { color }

      // Обработка прозрачности
      if (item.opacity !== undefined && item.opacity < 1) {
        materialOptions.transparent = true
        materialOptions.opacity = Math.max(0, Math.min(1, item.opacity))
      }

      // Обработка свечения
      if (item.emissive) {
        materialOptions.emissive = new THREE.Color(item.emissive)
        if (item.emissiveIntensity !== undefined) {
          materialOptions.emissiveIntensity = Math.max(0, item.emissiveIntensity)
        }
      }

      const material = new THREE.MeshStandardMaterial(materialOptions)

      switch (item.type) {
        case 'box': {
          const geometry = new THREE.BoxGeometry(
              item.width || 1,
              item.height || 1,
              item.depth || 1
          )
          mesh = new THREE.Mesh(geometry, material)
          break
        }
        case 'sphere': {
          const geometry = new THREE.SphereGeometry(item.radius || 1, 32, 16)
          mesh = new THREE.Mesh(geometry, material)
          break
        }
        case 'cylinder': {
          const geometry = new THREE.CylinderGeometry(
              item.radiusTop || 1,
              item.radiusBottom || 1,
              item.height || 2,
              item.radialSegments || 16
          )
          mesh = new THREE.Mesh(geometry, material)
          break
        }
        case 'cone': {
          const geometry = new THREE.ConeGeometry(
              item.radius || 1,
              item.height || 2,
              item.radialSegments || 16
          )
          mesh = new THREE.Mesh(geometry, material)
          break
        }
        case 'pyramid': {
          const geometry = new THREE.ConeGeometry(
              (item.baseSize || 1) / 2,
              item.height || 2,
              4
          )
          mesh = new THREE.Mesh(geometry, material)
          break
        }
        default:
          console.warn('Unknown object type:', item.type)
          return
      }

      if (item.position) {
        mesh.position.set(...item.position)
      }

      if (item.rotation) {
        mesh.rotation.set(...item.rotation)
      }

      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.generated = true
      scene.add(mesh)
    })
  }

  const clearScene = () => {
    if (!sceneRef.current) return

    const scene = sceneRef.current
    const objectsToRemove = scene.children.filter(child =>
        child.userData.generated === true
    )
    objectsToRemove.forEach(obj => scene.remove(obj))
  }

  const updateLighting = (settings: LightingSettings) => {
    if (!isInitialized || !lightsRef.current || !sceneRef.current) return

    const { ambient, directional } = lightsRef.current
    const scene = sceneRef.current

    // Обновление цвета и интенсивности фонового света
    if (settings.ambientColor) {
      ambient.color.set(settings.ambientColor)
    }

    if (settings.ambientIntensity !== undefined) {
      ambient.intensity = Math.max(0, settings.ambientIntensity)
    }

    // Обновление цвета и интенсивности направленного света
    if (settings.directionalColor) {
      directional.color.set(settings.directionalColor)
    }

    if (settings.directionalIntensity !== undefined) {
      directional.intensity = Math.max(0, settings.directionalIntensity)
    }

    // Обновление цвета фона сцены
    if (settings.backgroundColor && scene) {
      scene.background = new THREE.Color(settings.backgroundColor)
    }
  }

  return {
    buildSceneFromDescription,
    clearScene,
    updateLighting,
    scene: sceneRef.current,
    renderer: rendererRef.current,
    camera: cameraRef.current,
    isInitialized
  }
}

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { LightingSettings, ScenePlacement, SceneResponse, SceneObject, ScenePrimitive } from '../utils/openAIAPI.ts'

export interface SceneLights {
  ambient: THREE.AmbientLight;
  directional: THREE.DirectionalLight;
}

export interface ObjectInfo {
  name: string
  count: number
  visible: boolean
  objectIndex: number
}

export const useThreeJSScene = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lightsRef = useRef<SceneLights | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([])
  const [objectsInfo, setObjectsInfo] = useState<ObjectInfo[]>([])
  const placementsRef = useRef<ScenePlacement[]>([])
  const objectVisibilityRef = useRef<Map<number, boolean>>(new Map())

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

  const updateObjectsInfo = (
    objects: SceneObject[] = sceneObjects,
    placements: ScenePlacement[] = placementsRef.current
  ) => {
    if (!objects.length || !placements.length) {
      setObjectsInfo([])
      return
    }

    const objectCounts = new Map<number, number>()

    // Подсчитываем количество размещений для каждого объекта
    placements.forEach(placement => {
      objectCounts.set(placement.objectIndex, (objectCounts.get(placement.objectIndex) || 0) + 1)
    })

    // Создаем информацию об объектах
    const info: ObjectInfo[] = []
    objectCounts.forEach((count, objectIndex) => {
      const sceneObject = objects[objectIndex]
      if (sceneObject) {
        info.push({
          name: sceneObject.name,
          count,
          visible: objectVisibilityRef.current.get(objectIndex) !== false,
          objectIndex
        })
      }
    })

    setObjectsInfo(info)
  }

  const toggleObjectVisibility = (objectIndex: number) => {
    if (!sceneRef.current) return

    const scene = sceneRef.current
    const isVisible = objectVisibilityRef.current.get(objectIndex) !== false
    const newVisibility = !isVisible

    objectVisibilityRef.current.set(objectIndex, newVisibility)

    // Обновляем видимость всех объектов с данным индексом
    scene.children.forEach(child => {
      if (child.userData.generated && child.userData.objectIndex === objectIndex) {
        child.visible = newVisibility
      }
    })

    updateObjectsInfo()
  }

  const removeObjectFromScene = (objectIndex: number) => {
    if (!sceneRef.current) return

    // Удаляем информацию о видимости
    objectVisibilityRef.current.delete(objectIndex)

    updateObjectsInfo()
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
        break
      }
      default:
        console.warn('Unknown primitive type:', primitive.type)
        return new THREE.Mesh()
    }

    // Устанавливаем позицию и поворот примитива относительно центра составного объекта
    if (primitive.position) {
      mesh.position.set(...primitive.position)
    }

    if (primitive.rotation) {
      mesh.rotation.set(...primitive.rotation)
    }

    mesh.castShadow = true
    mesh.receiveShadow = true

    return mesh
  }

  const createCompositeObject = (sceneObject: SceneObject): THREE.Group => {
    const group = new THREE.Group()
    group.name = sceneObject.name

    // Создаем все примитивы и добавляем их в группу
    sceneObject.primitives.forEach(primitive => {
      const mesh = createPrimitiveMesh(primitive)
      group.add(mesh)
    })

    return group
  }

  const buildSceneFromDescription = (description: SceneResponse | unknown) => {
    if (!sceneRef.current || !isInitialized) return

    const scene = sceneRef.current

    // Clear existing generated objects
    const objectsToRemove = scene.children.filter(child =>
        child.userData.generated === true
    )
    objectsToRemove.forEach(obj => scene.remove(obj))

    // Обработка нового формата ответа
    let objects: SceneObject[] = []
    let placements: ScenePlacement[] = []
    let lighting: LightingSettings | null = null

    // Если пришел объект с полями objects и lighting
    if (description && typeof description === 'object' && !Array.isArray(description)) {
      const descObj = description as Record<string, unknown>
      if (Array.isArray(descObj.objects)) {
        objects = descObj.objects as SceneObject[]
      }
      if (Array.isArray(descObj.placements)) {
        placements = descObj.placements as ScenePlacement[]
      }
      lighting = descObj.lighting as LightingSettings | null
    } else if (Array.isArray(description)) {
      // Старый формат - массив примитивов, конвертируем в новый
      objects = description.map((primitive: ScenePrimitive, index: number) => ({
        name: `Object_${index}`,
        primitives: [primitive]
      }))
      placements = objects.map((_, index) => ({ objectIndex: index }))
    }

    // Сохраняем данные в состояние
    setSceneObjects(objects)
    placementsRef.current = placements

    // Сбрасываем состояние видимости
    objectVisibilityRef.current.clear()

    // Применяем настройки освещения, если они есть
    if (lighting) {
      updateLighting(lighting)
    }

    if (!Array.isArray(objects)) {
      console.error('Invalid scene description:', description)
      return
    }

    // Если нет расстановки, создаем по умолчанию
    if (placements.length === 0) {
      placements = objects.map((_, idx) => ({
        objectIndex: idx,
        position: [0, 0, 0] as [number, number, number]
      }))
      placementsRef.current = placements
    }

    // Создаем и размещаем составные объекты
    placements.forEach((placement: ScenePlacement) => {
      const sceneObject = objects[placement.objectIndex]
      if (!sceneObject) return

      const compositeObject = createCompositeObject(sceneObject)

      // Применяем трансформации к группе
      if (placement.position) {
        compositeObject.position.set(...placement.position)
      }

      if (placement.rotation) {
        compositeObject.rotation.set(...placement.rotation)
      }

      if (placement.scale) {
        compositeObject.scale.set(...placement.scale)
      }

      compositeObject.userData.generated = true
      compositeObject.userData.objectIndex = placement.objectIndex
      scene.add(compositeObject)
    })

    // Обновляем информацию об объектах
    updateObjectsInfo(objects, placements)
  }

  const clearScene = () => {
    if (!sceneRef.current) return

    const scene = sceneRef.current
    const objectsToRemove = scene.children.filter(child =>
        child.userData.generated === true
    )
    objectsToRemove.forEach(obj => scene.remove(obj))

    // Очищаем состояние
    setSceneObjects([])
    setObjectsInfo([])
    placementsRef.current = []
    objectVisibilityRef.current.clear()
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
    toggleObjectVisibility,
    removeObjectFromScene,
    scene: sceneRef.current,
    renderer: rendererRef.current,
    camera: cameraRef.current,
    isInitialized,
    objectsInfo
  }
}
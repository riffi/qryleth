import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { LightingSettings, ScenePlacement, SceneResponse, SceneObject, ScenePrimitive } from '../utils/openAIAPI.ts'

export interface SceneLights {
  ambient: THREE.AmbientLight;
  directional: THREE.DirectionalLight;
}

export interface ObjectInstance {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  visible: boolean
}

export interface ObjectInfo {
  name: string
  count: number
  visible: boolean
  objectIndex: number
  instances?: ObjectInstance[]
}

export type ViewMode = 'orbit' | 'walk'

export const useThreeJSScene = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | FirstPersonControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lightsRef = useRef<SceneLights | null>(null)
  const clockRef = useRef<THREE.Clock>(new THREE.Clock())
  const composerRef = useRef<EffectComposer | null>(null)
  const outlinePassRef = useRef<OutlinePass | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([])
  const [objectsInfo, setObjectsInfo] = useState<ObjectInfo[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('orbit')
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Setup post-processing for outline effect
    const composer = new EffectComposer(renderer)
    
    // Main render pass
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)
    
    // Outline pass
    const outlinePass = new OutlinePass(new THREE.Vector2(container.clientWidth, container.clientHeight), scene, camera)
    outlinePass.edgeStrength = 3
    outlinePass.edgeGlow = 0.5
    outlinePass.edgeThickness = 2
    outlinePass.pulsePeriod = 0
    outlinePass.visibleEdgeColor.set('#00ff00')
    outlinePass.hiddenEdgeColor.set('#00ff00')
    composer.addPass(outlinePass)
    
    // Output pass for proper tone mapping and gamma correction
    const outputPass = new OutputPass()
    composer.addPass(outputPass)
    
    composerRef.current = composer
    outlinePassRef.current = outlinePass

    // Controls setup - default to orbit mode
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
      
      if (composerRef.current) {
        composerRef.current.setSize(clientWidth, clientHeight)
      }
      if (outlinePassRef.current) {
        outlinePassRef.current.setSize(clientWidth, clientHeight)
      }
    }

    window.addEventListener('resize', handleResize)

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      if (controlsRef.current) {
        if (controlsRef.current instanceof FirstPersonControls) {
          controlsRef.current.update(clockRef.current.getDelta())
        } else {
          controlsRef.current.update()
        }
      }
      
      if (composerRef.current) {
        composerRef.current.render()
      } else {
        renderer.render(scene, camera)
      }
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
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      if (composerRef.current) {
        composerRef.current.dispose()
      }
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
    const objectInstances = new Map<number, ObjectInstance[]>()

    // Подсчитываем количество размещений и создаем информацию об экземплярах
    placements.forEach((placement, index) => {
      objectCounts.set(placement.objectIndex, (objectCounts.get(placement.objectIndex) || 0) + 1)
      
      if (!objectInstances.has(placement.objectIndex)) {
        objectInstances.set(placement.objectIndex, [])
      }
      
      const instances = objectInstances.get(placement.objectIndex)!
      instances.push({
        id: `${placement.objectIndex}-${index}`,
        position: placement.position || [0, 0, 0],
        rotation: placement.rotation || [0, 0, 0],
        scale: placement.scale || [1, 1, 1],
        visible: objectVisibilityRef.current.get(placement.objectIndex) !== false
      })
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
          objectIndex,
          instances: objectInstances.get(objectIndex) || []
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

  const toggleInstanceVisibility = (objectIndex: number, instanceId: string) => {
    if (!sceneRef.current) return

    const scene = sceneRef.current
    const [, placementIndex] = instanceId.split('-').map(Number)
    
    scene.children.forEach((child, index) => {
      if (child.userData.generated && 
          child.userData.objectIndex === objectIndex && 
          child.userData.placementIndex === placementIndex) {
        child.visible = !child.visible
      }
    })

    updateObjectsInfo()
  }

  const removeInstance = (objectIndex: number, instanceId: string) => {
    if (!sceneRef.current) return

    const scene = sceneRef.current
    const [, placementIndex] = instanceId.split('-').map(Number)
    
    const objectsToRemove = scene.children.filter(child => 
      child.userData.generated && 
      child.userData.objectIndex === objectIndex && 
      child.userData.placementIndex === placementIndex
    )
    
    objectsToRemove.forEach(obj => scene.remove(obj))
    
    // Удаляем из массива размещений
    placementsRef.current = placementsRef.current.filter((_, index) => index !== placementIndex)
    
    updateObjectsInfo()
  }

  const highlightObjects = (objectIndex: number, instanceId?: string) => {
    if (!sceneRef.current || !outlinePassRef.current) return

    const scene = sceneRef.current
    const objectsToHighlight: THREE.Object3D[] = []

    if (instanceId) {
      // Highlight specific instance
      const [, placementIndex] = instanceId.split('-').map(Number)
      scene.children.forEach(child => {
        if (child.userData.generated && 
            child.userData.objectIndex === objectIndex && 
            child.userData.placementIndex === placementIndex) {
          objectsToHighlight.push(child)
        }
      })
    } else {
      // Highlight all instances of this object type
      scene.children.forEach(child => {
        if (child.userData.generated && child.userData.objectIndex === objectIndex) {
          objectsToHighlight.push(child)
        }
      })
    }

    outlinePassRef.current.selectedObjects = objectsToHighlight
  }

  const clearHighlight = () => {
    if (outlinePassRef.current) {
      outlinePassRef.current.selectedObjects = []
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
        // чтобы ребро смотрело вперед, а не грань
        mesh.rotation.y = Math.PI / 4
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
    placements.forEach((placement: ScenePlacement, placementIndex: number) => {
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
      compositeObject.userData.placementIndex = placementIndex
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

  const switchViewMode = (mode: ViewMode) => {
    if (!cameraRef.current || !rendererRef.current || !containerRef.current) return
    
    const camera = cameraRef.current
    const renderer = rendererRef.current
    const container = containerRef.current
    
    // Dispose current controls
    if (controlsRef.current) {
      controlsRef.current.dispose()
    }
    
    // Create new controls based on mode
    if (mode === 'orbit') {
      // Reset camera position for orbit mode
      camera.position.set(5, 5, 8)
      camera.lookAt(0, 0, 0)
      
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.enableZoom = true
      controls.enablePan = true
      controlsRef.current = controls
    } else if (mode === 'walk') {
      // Reset camera position for walk mode
      camera.position.set(0, 2, 5)
      camera.lookAt(0, 0, 0)
      
      const controls = new FirstPersonControls(camera, renderer.domElement)
      controls.lookSpeed = 0.1
      controls.movementSpeed = 10
      controls.lookVertical = true
      controls.constrainVertical = true
      controls.verticalMin = 0.1
      controls.verticalMax = Math.PI - 0.1
      controls.activeLook = true
      controls.heightSpeed = false
      controls.heightCoef = 1
      controls.heightMin = 0
      controls.heightMax = 1
      controlsRef.current = controls
    }
    
    setViewMode(mode)
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
    objectsInfo,
    viewMode,
    switchViewMode,
    toggleInstanceVisibility,
    removeInstance,
    highlightObjects,
    clearHighlight
  }
}
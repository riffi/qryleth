import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js'
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { GridHelper } from 'three'
import type { LightingSettings, ScenePlacement, SceneResponse, SceneObject, ScenePrimitive, SceneLayer } from '../types/scene'
import { db } from '../utils/database'
import { notifications } from '@mantine/notifications'

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
  layerId?: string
}

export type ViewMode = 'orbit' | 'walk' | 'fly'

export type SceneStatus = 'draft' | 'saved' | 'modified'

export interface CurrentScene {
  uuid?: string
  name: string
  status: SceneStatus
}

export const useThreeJSScene = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | FirstPersonControls | FlyControls | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lightsRef = useRef<SceneLights | null>(null)
  const clockRef = useRef<THREE.Clock>(new THREE.Clock())
  const composerRef = useRef<EffectComposer | null>(null)
  const outlinePassRef = useRef<OutlinePass | null>(null)
  const selectedOutlinePassRef = useRef<OutlinePass | null>(null)
  const [selectedObject, setSelectedObject] = useState<{objectIndex: number, instanceId?: string} | null>(null)
  const selectedObjectRef = useRef<{objectIndex: number, instanceId?: string} | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const [isInitialized, setIsInitialized] = useState(false)
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([])
  const [objectsInfo, setObjectsInfo] = useState<ObjectInfo[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('orbit')
  const [currentScene, setCurrentScene] = useState<CurrentScene>({ name: 'Новая сцена', status: 'draft' })
  const placementsRef = useRef<ScenePlacement[]>([])
  const objectVisibilityRef = useRef<Map<number, boolean>>(new Map())
  const lastSavedDataRef = useRef<string>('')
  const gridHelperRef = useRef<THREE.GridHelper | null>(null)
  const [gridVisible, setGridVisible] = useState<boolean>(true)
  const [layers, setLayers] = useState<SceneLayer[]>([
    { id: 'objects', name: 'Объекты', visible: true, position: 0 }
  ])
  
  // История изменений для undo/redo
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)
  const maxHistorySize = 50
  
  // Сохраняем исходные объекты для восстановления
  const originalObjectsRef = useRef<SceneObject[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x222)
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
    
    // Hover outline pass (green)
    const outlinePass = new OutlinePass(new THREE.Vector2(container.clientWidth, container.clientHeight), scene, camera)
    outlinePass.edgeStrength = 3
    outlinePass.edgeGlow = 0.5
    outlinePass.edgeThickness = 2
    outlinePass.pulsePeriod = 0
    outlinePass.visibleEdgeColor.set('#00ff00')
    outlinePass.hiddenEdgeColor.set('#00ff00')
    composer.addPass(outlinePass)
    
    // Selection outline pass (orange)
    const selectedOutlinePass = new OutlinePass(new THREE.Vector2(container.clientWidth, container.clientHeight), scene, camera)
    selectedOutlinePass.edgeStrength = 4
    selectedOutlinePass.edgeGlow = 0.8
    selectedOutlinePass.edgeThickness = 3
    selectedOutlinePass.pulsePeriod = 2
    selectedOutlinePass.visibleEdgeColor.set('#ff6600')
    selectedOutlinePass.hiddenEdgeColor.set('#ff6600')
    composer.addPass(selectedOutlinePass)
    
    // Output pass for proper tone mapping and gamma correction
    const outputPass = new OutputPass()
    composer.addPass(outputPass)
    
    composerRef.current = composer
    outlinePassRef.current = outlinePass
    selectedOutlinePassRef.current = selectedOutlinePass

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
    
    // Настройка теневой камеры
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 100
    directionalLight.shadow.camera.left = -50
    directionalLight.shadow.camera.right = 50
    directionalLight.shadow.camera.top = 50
    directionalLight.shadow.camera.bottom = -50
    
    // Устранение артефактов теней
    directionalLight.shadow.bias = -0.001
    directionalLight.shadow.normalBias = 0.01
    
    scene.add(directionalLight)

    // Добавляем плоскость для приема теней
    const groundGeometry = new THREE.PlaneGeometry(100, 100)
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true, opacity: 0.3 })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)
    
    // Добавляем сетку на уровне z=0
    const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x888888)
    gridHelper.position.set(0, 0, 0)
    gridHelper.visible = gridVisible
    scene.add(gridHelper)
    gridHelperRef.current = gridHelper

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
      if (selectedOutlinePassRef.current) {
        selectedOutlinePassRef.current.setSize(clientWidth, clientHeight)
      }
    }

    window.addEventListener('resize', handleResize)
    
    // Keyboard event handler for object movement
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedObjectRef.current) {
        return
      }
      
      let moved = false
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          moveSelectedObject('left')
          moved = true
          break
        case 'ArrowRight':
          event.preventDefault()
          moveSelectedObject('right')
          moved = true
          break
        case 'ArrowUp':
          event.preventDefault()
          moveSelectedObject('forward')
          moved = true
          break
        case 'ArrowDown':
          event.preventDefault()
          moveSelectedObject('backward')
          moved = true
          break
        case '8':
          if (event.code === 'Numpad8' || event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
            event.preventDefault()
            moveSelectedObject('up')
            moved = true
          }
          break
        case '2':
          if (event.code === 'Numpad2' || event.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
            event.preventDefault()
            moveSelectedObject('down')
            moved = true
          }
          break
        case '+':
        case '=':
          if (event.code === 'NumpadAdd' || event.code === 'Equal') {
            event.preventDefault()
            scaleSelectedObject('up')
            moved = true
          }
          break
        case '-':
        case '_':
          if (event.code === 'NumpadSubtract' || event.code === 'Minus') {
            event.preventDefault()
            scaleSelectedObject('down')
            moved = true
          }
          break
        case 'Escape':
          clearSelection()
          break
      }
    }
    
    // Add keyboard event listener to the container
    container.addEventListener('keydown', handleKeyDown)
    container.tabIndex = 0
    container.style.outline = 'none'
    
    // Mouse click handler for object selection
    const handleMouseClick = (event: MouseEvent) => {
      if (!sceneRef.current || !cameraRef.current) return
      
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Update raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
      
      // Find intersected objects
      const generatedObjects = sceneRef.current.children.filter(child => child.userData.generated)
      const intersects = raycasterRef.current.intersectObjects(generatedObjects, true)
      
      if (intersects.length > 0) {
        // Find the top-level generated object (group)
        let clickedObject = intersects[0].object
        while (clickedObject.parent && !clickedObject.userData.generated) {
          clickedObject = clickedObject.parent
        }
        
        if (clickedObject.userData.generated) {
          const objectIndex = clickedObject.userData.objectIndex
          const placementIndex = clickedObject.userData.placementIndex
          const instanceId = `${objectIndex}-${placementIndex}`
          
          // Select the clicked object
          selectObject(objectIndex, instanceId)
        }
      } else {
        // Clear selection if clicked on empty space
        clearSelection()
      }
    }
    
    container.addEventListener('click', handleMouseClick)

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      if (controlsRef.current) {
        if (controlsRef.current instanceof FirstPersonControls || controlsRef.current instanceof FlyControls) {
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
      container.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('click', handleMouseClick)

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

  const getObjectsFromScene = (): { [key: number]: SceneObject } => {
    if (!sceneRef.current) return {}
    
    const scene = sceneRef.current
    const objectMap: { [key: number]: SceneObject } = {}
    
    // Extract unique objects from scene
    scene.children.forEach(child => {
      if (child.userData.generated && child.userData.objectIndex !== undefined) {
        const objectIndex = child.userData.objectIndex
        if (!objectMap[objectIndex]) {
          // Используем исходные объекты с примитивами
          const originalObject = originalObjectsRef.current[objectIndex]
          objectMap[objectIndex] = {
            name: child.name,
            primitives: originalObject?.primitives || [] // Берем примитивы из исходных объектов
          }
        }
      }
    })
    
    return objectMap
  }

  const updateObjectsInfo = (
    objects: { [key: number]: SceneObject } | SceneObject[] = getObjectsFromScene(),
    placements: ScenePlacement[] = placementsRef.current
  ) => {
    // Convert objects to array if it's an object map
    const objectsArray = Array.isArray(objects) ? objects : Object.values(objects)
    const objectsMap = Array.isArray(objects) ? 
      objects.reduce((map, obj, index) => ({ ...map, [index]: obj }), {}) : objects
    
    if (!objectsArray.length || !placements.length) {
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
      const sceneObject = objectsArray[objectIndex]
      if (sceneObject) {
        info.push({
          name: sceneObject.name,
          count,
          visible: objectVisibilityRef.current.get(objectIndex) !== false,
          objectIndex,
          instances: objectInstances.get(objectIndex) || [],
          layerId: sceneObject.layerId
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

  const selectObject = (objectIndex: number, instanceId?: string) => {
    const selection = { objectIndex, instanceId }
    setSelectedObject(selection)
    selectedObjectRef.current = selection
    
    // Focus the container to ensure keyboard events are received
    if (containerRef.current) {
      containerRef.current.focus()
    }
    
    if (!sceneRef.current || !selectedOutlinePassRef.current) return

    const scene = sceneRef.current
    const objectsToSelect: THREE.Object3D[] = []

    if (instanceId) {
      // Select specific instance
      const [, placementIndex] = instanceId.split('-').map(Number)
      scene.children.forEach(child => {
        if (child.userData.generated && 
            child.userData.objectIndex === objectIndex && 
            child.userData.placementIndex === placementIndex) {
          objectsToSelect.push(child)
        }
      })
    } else {
      // Select all instances of this object type
      scene.children.forEach(child => {
        if (child.userData.generated && child.userData.objectIndex === objectIndex) {
          objectsToSelect.push(child)
        }
      })
    }

    selectedOutlinePassRef.current.selectedObjects = objectsToSelect
  }

  const clearSelection = () => {
    setSelectedObject(null)
    selectedObjectRef.current = null
    if (selectedOutlinePassRef.current) {
      selectedOutlinePassRef.current.selectedObjects = []
    }
  }

  const scaleSelectedObject = (scaleDirection: 'up' | 'down') => {
    if (!selectedObjectRef.current || !sceneRef.current) return

    const scene = sceneRef.current
    const scaleAmount = 0.1
    const { objectIndex, instanceId } = selectedObjectRef.current
    
    const scaleMultiplier = scaleDirection === 'up' ? (1 + scaleAmount) : (1 - scaleAmount)
    
    if (instanceId) {
      // Scale specific instance
      const [, placementIndex] = instanceId.split('-').map(Number)
      scene.children.forEach(child => {
        if (child.userData.generated && 
            child.userData.objectIndex === objectIndex && 
            child.userData.placementIndex === placementIndex) {
          // Apply scale change
          child.scale.multiplyScalar(scaleMultiplier)
          
          // Ensure minimum scale
          const minScale = 0.1
          if (child.scale.x < minScale) {
            child.scale.setScalar(minScale)
          }
          
          // Update placement data
          if (placementsRef.current[placementIndex]) {
            placementsRef.current[placementIndex].scale = [
              child.scale.x,
              child.scale.y,
              child.scale.z
            ]
          }
        }
      })
    } else {
      // Scale all instances of this object type
      scene.children.forEach(child => {
        if (child.userData.generated && child.userData.objectIndex === objectIndex) {
          // Apply scale change
          child.scale.multiplyScalar(scaleMultiplier)
          
          // Ensure minimum scale
          const minScale = 0.1
          if (child.scale.x < minScale) {
            child.scale.setScalar(minScale)
          }
          
          // Update placement data
          const placementIndex = child.userData.placementIndex
          if (placementsRef.current[placementIndex]) {
            placementsRef.current[placementIndex].scale = [
              child.scale.x,
              child.scale.y,
              child.scale.z
            ]
          }
        }
      })
    }
    
    // Update objects info to reflect new scale
    const currentObjects = getObjectsFromScene()
    updateObjectsInfo(currentObjects, placementsRef.current)
    
    // Сохранить состояние в историю и отметить сцену как измененную
    saveToHistory()
    markSceneAsModified()
  }

  const moveSelectedObject = (direction: 'left' | 'right' | 'forward' | 'backward' | 'up' | 'down') => {
    if (!selectedObjectRef.current || !sceneRef.current || !cameraRef.current) return

    const scene = sceneRef.current
    const camera = cameraRef.current
    const moveAmount = 0.5
    const { objectIndex, instanceId } = selectedObjectRef.current
    
    // Calculate camera-relative movement vectors
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    
    // For OrbitControls, we need to calculate direction based on camera position relative to target
    if (controlsRef.current instanceof OrbitControls) {
      // In orbit mode, calculate direction from camera to target
      const target = controlsRef.current.target
      forward.subVectors(target, camera.position)
      forward.y = 0 // Keep movement on XZ plane
      forward.normalize()
      
      // Calculate right direction (cross product of up and forward)
      right.crossVectors(up, forward)
      right.normalize()
    } else {
      // For other controls (FirstPerson, etc.), use camera's world direction
      camera.getWorldDirection(forward)
      forward.y = 0 // Keep movement on XZ plane for forward/backward
      forward.normalize()
      
      // Calculate right direction (cross product of up and forward)
      right.crossVectors(up, forward)
      right.normalize()
    }
    
    
    // Calculate movement vector based on direction
    let movementVector = new THREE.Vector3()
    switch (direction) {
      case 'left':
        movementVector.copy(right).multiplyScalar(moveAmount)
        break
      case 'right':
        movementVector.copy(right).multiplyScalar(-moveAmount)
        break
      case 'forward':
        movementVector.copy(forward).multiplyScalar(moveAmount)
        break
      case 'backward':
        movementVector.copy(forward).multiplyScalar(-moveAmount)
        break
      case 'up':
        movementVector.set(0, moveAmount, 0)
        break
      case 'down':
        movementVector.set(0, -moveAmount, 0)
        break
    }

    if (instanceId) {
      // Move specific instance
      const [, placementIndex] = instanceId.split('-').map(Number)
      scene.children.forEach(child => {
        if (child.userData.generated && 
            child.userData.objectIndex === objectIndex && 
            child.userData.placementIndex === placementIndex) {
          // Apply camera-relative movement
          child.position.add(movementVector)
          
          // Update placement data
          if (placementsRef.current[placementIndex]) {
            placementsRef.current[placementIndex].position = [
              child.position.x,
              child.position.y,
              child.position.z
            ]
          }
        }
      })
    } else {
      // Move all instances of this object type
      scene.children.forEach(child => {
        if (child.userData.generated && child.userData.objectIndex === objectIndex) {
          // Apply camera-relative movement
          child.position.add(movementVector)
          
          // Update placement data
          const placementIndex = child.userData.placementIndex
          if (placementsRef.current[placementIndex]) {
            placementsRef.current[placementIndex].position = [
              child.position.x,
              child.position.y,
              child.position.z
            ]
          }
        }
      })
    }
    
    // Update objects info to reflect new positions
    const currentObjects = getObjectsFromScene()
    updateObjectsInfo(currentObjects, placementsRef.current)
    
    // Сохранить состояние в историю и отметить сцену как измененную
    saveToHistory()
    markSceneAsModified()
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

  const buildSceneFromDescription = (description: SceneResponse | unknown, sceneName?: string, sceneUuid?: string) => {
    if (!sceneRef.current || !isInitialized) {
      return
    }

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
    let sceneLayers: SceneLayer[] = []

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
      if (Array.isArray(descObj.layers)) {
        sceneLayers = descObj.layers as SceneLayer[]
      }
    } else if (Array.isArray(description)) {
      // Старый формат - массив примитивов, конвертируем в новый
      objects = description.map((primitive: ScenePrimitive, index: number) => ({
        name: `Object_${index}`,
        primitives: [primitive]
      }))
      placements = objects.map((_, index) => ({ objectIndex: index }))
    }

    // Автоматически добавляем объекты в слой "Объекты" если layerId не указан
    objects = objects.map(obj => ({
      ...obj,
      layerId: obj.layerId || 'objects'
    }))

    // Если слои не были переданы, создаем слой "Объекты"
    if (sceneLayers.length === 0) {
      sceneLayers = [{ id: 'objects', name: 'Объекты', visible: true, position: 0 }]
    }

    // Обновляем слои
    setLayers(sceneLayers)


    // Сохраняем данные в состояние
    setSceneObjects(objects)
    originalObjectsRef.current = objects
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
      console.log('Adding composite object to scene:', compositeObject)
      scene.add(compositeObject)
    })
    
    console.log('Scene children count after adding objects:', scene.children.length)
    console.log('Generated objects count:', scene.children.filter(child => child.userData.generated === true).length)

    // Обновляем информацию об объектах
    updateObjectsInfo(objects, placements)
    
    // Сохраняем состояние в историю только если это не восстановление из истории
    if (!isRestoringFromHistory.current) {
      saveToHistory()
    }
    
    // Set scene state based on parameters
    if (sceneName && sceneUuid) {
      // Loading from library - set as saved scene
      setCurrentScene({
        uuid: sceneUuid,
        name: sceneName,
        status: 'saved'
      })
      lastSavedDataRef.current = JSON.stringify(description)
    } else {
      // Loading from API generation - set as new draft
      setCurrentScene({ name: 'Новая сцена', status: 'draft' })
      lastSavedDataRef.current = ''
    }
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
    
    // Сохранить состояние в историю и отметить сцену как измененную
    saveToHistory()
    markSceneAsModified()
  }

  // Функция для переключения видимости сетки
  const toggleGridVisibility = () => {
    if (!gridHelperRef.current) return
    
    const newVisibility = !gridVisible
    gridHelperRef.current.visible = newVisibility
    setGridVisible(newVisibility)
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
      // Reset camera position for walk mode (FPS style)
      camera.position.set(0, 1.8, 5)
      camera.lookAt(0, 1.8, 0)
      
      const controls = new FirstPersonControls(camera, renderer.domElement)
      controls.lookSpeed = 0.8
      controls.movementSpeed = 15
      controls.lookVertical = true
      controls.constrainVertical = false
      controls.activeLook = true
      controls.heightSpeed = false
      controls.heightCoef = 1
      controls.heightMin = 0
      controls.heightMax = 1000
      controlsRef.current = controls
    } else if (mode === 'fly') {
      // Reset camera position for fly mode
      camera.position.set(0, 5, 10)
      camera.lookAt(0, 0, 0)
      
      const controls = new FlyControls(camera, renderer.domElement)
      controls.movementSpeed = 15
      controls.rollSpeed = 1
      controls.autoForward = false
      controls.dragToLook = true
      controlsRef.current = controls
    }
    
    setViewMode(mode)
  }

  const getCurrentSceneData = () => {
    // Получаем объекты из сцены, если состояние пустое
    const objectsFromScene = getObjectsFromScene()
    const objectsArray = Array.isArray(objectsFromScene) ? objectsFromScene : Object.values(objectsFromScene)
    const currentObjects = sceneObjects.length > 0 ? sceneObjects : objectsArray
    
    return {
      objects: currentObjects,
      placements: placementsRef.current,
      layers: layers,
      lighting: {
        ambientColor: lightsRef.current?.ambient.color.getHex(),
        ambientIntensity: lightsRef.current?.ambient.intensity,
        directionalColor: lightsRef.current?.directional.color.getHex(),
        directionalIntensity: lightsRef.current?.directional.intensity,
        backgroundColor: sceneRef.current?.background && (sceneRef.current.background as THREE.Color).getHex ? (sceneRef.current.background as THREE.Color).getHex() : undefined
      }
    }
  }

  const checkSceneModified = () => {
    const currentData = JSON.stringify(getCurrentSceneData())
    const isModified = currentData !== lastSavedDataRef.current
    
    if (currentScene.status === 'saved' && isModified) {
      setCurrentScene(prev => ({ ...prev, status: 'modified' }))
    } else if (currentScene.status === 'draft' && lastSavedDataRef.current && !isModified) {
      setCurrentScene(prev => ({ ...prev, status: 'saved' }))
    }
  }

  const markSceneAsModified = () => {
    // Не меняем статус если восстанавливаем из истории
    if (isRestoringFromHistory.current) return
    
    if (currentScene.status === 'saved') {
      setCurrentScene(prev => ({ ...prev, status: 'modified' }))
    } else if (currentScene.status === 'draft') {
      setCurrentScene(prev => ({ ...prev, status: 'modified' }))
    }
  }

  // Функции для работы с историей изменений
  const isRestoringFromHistory = useRef(false)
  
  const saveToHistory = () => {
    // Не сохраняем в историю если восстанавливаем из неё
    if (isRestoringFromHistory.current) return
    
    const sceneData = getCurrentSceneData()
    const currentState = JSON.stringify(sceneData)
    
    // Если текущее состояние отличается от последнего в истории
    if (historyRef.current[historyIndexRef.current] !== currentState) {
      // Удаляем все состояния после текущего индекса (для случая когда делали undo, а потом новое действие)
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
      
      // Добавляем новое состояние
      historyRef.current.push(currentState)
      historyIndexRef.current++
      
      // Ограничиваем размер истории
      if (historyRef.current.length > maxHistorySize) {
        historyRef.current.shift()
        historyIndexRef.current--
      }
    }
  }

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--
      const previousState = historyRef.current[historyIndexRef.current]
      if (previousState) {
        const stateData = JSON.parse(previousState)
        isRestoringFromHistory.current = true
        loadSceneData(stateData, currentScene.name, currentScene.uuid)
        isRestoringFromHistory.current = false
      }
    }
  }

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++
      const nextState = historyRef.current[historyIndexRef.current]
      if (nextState) {
        const stateData = JSON.parse(nextState)
        isRestoringFromHistory.current = true
        loadSceneData(stateData, currentScene.name, currentScene.uuid)
        isRestoringFromHistory.current = false
      }
    }
  }

  const canUndo = () => historyIndexRef.current > 0
  const canRedo = () => historyIndexRef.current < historyRef.current.length - 1

  const loadSceneData = (sceneData: any, sceneName?: string, sceneUuid?: string) => {
    if (sceneData && typeof sceneData === 'object') {
      buildSceneFromDescription(sceneData, sceneName, sceneUuid)
    }
  }

  const saveCurrentSceneToLibrary = async (name: string, description?: string): Promise<string> => {
    try {
      const sceneData = getCurrentSceneData()
      let sceneUuid: string
      
      if (currentScene.uuid && currentScene.status === 'modified') {
        // Update existing scene if it's modified
        await db.updateScene(currentScene.uuid, name, sceneData, description, undefined, layers)
        sceneUuid = currentScene.uuid
      } else if (!currentScene.uuid || currentScene.status === 'draft') {
        // Save as new scene if it's a draft or has no UUID
        sceneUuid = await db.saveScene(name, sceneData, description, undefined, layers)
      } else {
        // For already saved scenes, always create a new one to avoid overwriting
        sceneUuid = await db.saveScene(name, sceneData, description, undefined, layers)
      }
      
      // Update current scene state
      setCurrentScene({
        uuid: sceneUuid,
        name: name,
        status: 'saved'
      })
      
      // Store as last saved data
      lastSavedDataRef.current = JSON.stringify(sceneData)
      
      return sceneUuid
    } catch (error) {
      console.error('Error saving scene to library:', error)
      throw error
    }
  }

  const saveObjectToLibrary = async (objectIndex: number) => {
    try {
      const sceneObject = sceneObjects[objectIndex]
      if (!sceneObject) {
        throw new Error('Объект не найден')
      }

      await db.saveObject(sceneObject.name, sceneObject)
      notifications.show({
        title: 'Успешно!',
        message: `Объект "${sceneObject.name}" сохранен в библиотеку`,
        color: 'green'
      })
    } catch (error) {
      console.error('Error saving object to library:', error)
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось сохранить объект в библиотеку',
        color: 'red'
      })
    }
  }

  const findOptimalPlacement = (): [number, number, number] => {
    if (!sceneRef.current) return [0, 0, 0]
    
    const scene = sceneRef.current
    const existingPositions: THREE.Vector3[] = []
    
    // Collect existing object positions
    scene.children.forEach(child => {
      if (child.userData.generated) {
        existingPositions.push(child.position.clone())
      }
    })
    
    // Try to find empty spot in a grid pattern
    const gridSize = 3
    const minDistance = 4
    
    for (let x = -gridSize; x <= gridSize; x++) {
      for (let z = -gridSize; z <= gridSize; z++) {
        const testPosition = new THREE.Vector3(x * minDistance, 0, z * minDistance)
        
        // Check if this position is far enough from existing objects
        const isFarEnough = existingPositions.every(pos => 
          pos.distanceTo(testPosition) >= minDistance
        )
        
        if (isFarEnough) {
          return [testPosition.x, testPosition.y, testPosition.z]
        }
      }
    }
    
    // If no optimal spot found, place randomly around the scene
    const angle = Math.random() * Math.PI * 2
    const radius = 8 + Math.random() * 4
    return [
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ]
  }

  const addObjectToScene = (objectData: SceneObject) => {
    if (!sceneRef.current || !isInitialized) return
    
    
    // Find optimal placement
    const position = findOptimalPlacement()
    
    // Add to scene objects
    const newObjectIndex = sceneObjects.length
    const updatedObjects = [...sceneObjects, objectData]
    setSceneObjects(updatedObjects)
    
    // Add to placements
    const newPlacement: ScenePlacement = {
      objectIndex: newObjectIndex,
      position: position as [number, number, number],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    }
    placementsRef.current = [...placementsRef.current, newPlacement]
    
    // Create and add the object to the scene
    const compositeObject = createCompositeObject(objectData)
    compositeObject.position.set(...position)
    compositeObject.userData.generated = true
    compositeObject.userData.objectIndex = newObjectIndex
    compositeObject.userData.placementIndex = placementsRef.current.length - 1
    
    sceneRef.current.add(compositeObject)
    
    // Update objects info
    updateObjectsInfo(updatedObjects, placementsRef.current)
    
    // Сохранить состояние в историю и отметить сцену как измененную
    saveToHistory()
    markSceneAsModified()
  }

  const updateObjectPrimitives = (objectIndex: number, primitiveStates: {[key: number]: {position: [number, number, number], rotation: [number, number, number], dimensions: any}}) => {
    if (!sceneRef.current) return

    // Find the object in sceneObjects array
    const objectToUpdate = sceneObjects[objectIndex]
    if (!objectToUpdate) return

    // Update the primitive data in sceneObjects
    objectToUpdate.primitives.forEach((primitive, index) => {
      const state = primitiveStates[index]
      if (state) {
        // Update primitive position (relative to object center)
        primitive.position = [
          (primitive.position?.[0] || 0) + state.position[0],
          (primitive.position?.[1] || 0) + state.position[1], 
          (primitive.position?.[2] || 0) + state.position[2]
        ]
        
        // Update primitive rotation
        primitive.rotation = [
          (primitive.rotation?.[0] || 0) + state.rotation[0],
          (primitive.rotation?.[1] || 0) + state.rotation[1],
          (primitive.rotation?.[2] || 0) + state.rotation[2]
        ]
        
        // Update primitive dimensions directly
        if (state.dimensions) {
          if (primitive.type === 'box') {
            primitive.width = state.dimensions.width || 1
            primitive.height = state.dimensions.height || 1
            primitive.depth = state.dimensions.depth || 1
          } else if (primitive.type === 'sphere') {
            primitive.radius = state.dimensions.radius || 1
          } else if (primitive.type === 'cylinder' || primitive.type === 'cone') {
            primitive.radius = state.dimensions.radius || 1
            primitive.height = state.dimensions.height || 2
          } else if (primitive.type === 'pyramid') {
            primitive.baseSize = state.dimensions.baseSize || 1
            primitive.height = state.dimensions.height || 2
          }
        }
      }
    })

    // Regenerate all instances of this object type in the scene
    sceneRef.current.children.forEach(child => {
      if (child.userData.generated && child.userData.objectIndex === objectIndex) {
        // Store the current world position and rotation of the object
        const currentPosition = child.position.clone()
        const currentRotation = child.rotation.clone()
        const currentScale = child.scale.clone()
        
        // Remove the old object
        sceneRef.current!.remove(child)
        
        // Create new object with updated primitive data
        const newCompositeObject = createCompositeObject(objectToUpdate)
        
        // Restore the object's world position and rotation
        newCompositeObject.position.copy(currentPosition)
        newCompositeObject.rotation.copy(currentRotation)
        newCompositeObject.scale.copy(currentScale)
        
        // Copy over the metadata
        newCompositeObject.userData = child.userData
        
        // Add the new object to the scene
        sceneRef.current!.add(newCompositeObject)
      }
    })
    
    // Сохранить состояние в историю и отметить сцену как измененную
    saveToHistory()
    markSceneAsModified()
  }

  // Функции для работы со слоями
  const createLayer = (name: string): SceneLayer => {
    const newLayer: SceneLayer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      visible: true,
      position: layers.length
    }
    setLayers([...layers, newLayer])
    markSceneAsModified()
    return newLayer
  }

  const updateLayer = (layerId: string, updates: Partial<SceneLayer>) => {
    setLayers(layers.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ))
    markSceneAsModified()
  }

  const deleteLayer = (layerId: string) => {
    if (layerId === 'objects') return // Нельзя удалить слой "Объекты"
    
    // Перенести все объекты из удаляемого слоя в слой "Объекты"
    const updatedObjects = sceneObjects.map(obj => 
      obj.layerId === layerId ? { ...obj, layerId: 'objects' } : obj
    )
    setSceneObjects(updatedObjects)
    
    // Удалить слой
    setLayers(layers.filter(layer => layer.id !== layerId))
    markSceneAsModified()
  }

  const moveObjectToLayer = (objectIndex: number, layerId: string) => {
    const updatedObjects = sceneObjects.map((obj, index) => 
      index === objectIndex ? { ...obj, layerId } : obj
    )
    setSceneObjects(updatedObjects)
    markSceneAsModified()
  }

  const toggleLayerVisibility = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (!layer) return
    
    updateLayer(layerId, { visible: !layer.visible })
    
    // Обновить видимость всех объектов в слое
    sceneObjects.forEach((obj, index) => {
      if (obj.layerId === layerId) {
        toggleObjectVisibility(index)
      }
    })
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
    clearHighlight,
    selectObject,
    clearSelection,
    selectedObject,
    getCurrentSceneData,
    loadSceneData,
    saveObjectToLibrary,
    addObjectToScene,
    currentScene,
    saveCurrentSceneToLibrary,
    checkSceneModified,
    getSceneObjects: () => sceneObjects,
    updateObjectPrimitives,
    undo,
    redo,
    canUndo,
    canRedo,
    toggleGridVisibility,
    gridVisible,
    layers,
    createLayer,
    updateLayer,
    deleteLayer,
    moveObjectToLayer,
    toggleLayerVisibility
  }
}
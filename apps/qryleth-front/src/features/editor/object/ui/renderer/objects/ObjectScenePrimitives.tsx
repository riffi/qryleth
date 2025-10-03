import React, { useMemo } from 'react'
import { PrimitiveRenderer } from '@/shared/r3f/primitives/PrimitiveRenderer.tsx'
import { paletteRegistry } from '@/shared/lib/palette'
import { usePalettePreviewUuid } from '../../../model/palettePreviewStore.ts'
import { GroupRenderer } from './GroupRenderer.tsx'
import { InstancedBranchesOE } from './InstancedBranchesOE'
import { InstancedLeavesOE } from './InstancedLeavesOE'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getOrCreateTreeBillboard } from '@/shared/r3f/optimization/TreeBillboardBaker'
import { getOrCreateGrassBillboard, getOrCreateGrassBillboardSet } from '@/shared/r3f/optimization/GrassBillboardBaker'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import {
  useObjectPrimitives,
  useObjectStore,
  useObjectMaterials,
  useRootGroups,
  usePrimitiveGroupAssignments
} from '../../../model/objectStore.ts'

/**
 * Отрисовывает примитивы и группы выбранного объекта, а также обрабатывает их выбор.
 */
export const ObjectScenePrimitives: React.FC = () => {
  const primitives = useObjectPrimitives()
  const groupAssignments = usePrimitiveGroupAssignments()
  const rootGroups = useRootGroups()
  const objectMaterials = useObjectMaterials()
  const clearSelection = useObjectStore(state => state.clearSelection)
  const renderMode = useObjectStore(state => state.renderMode)
  // Выбранная палитра предпросмотра из ObjectEditor (только для отображения)
  const paletteUuid = usePalettePreviewUuid()
  const lodPreviewEnabled = useObjectStore(s => s.lodPreviewEnabled)
  // ВАЖНО: не возвращаем новый объект из селектора zustand — это ломает useSyncExternalStore и ведёт к бесконечным обновлениям.
  // Читаем поля по отдельности и собираем мемо-объект.
  const objectType = useObjectStore(s => s.objectType)
  const treeData = useObjectStore(s => s.treeData)
  const grassData = useObjectStore(s => s.grassData)
  const primitivesState = useObjectStore(s => s.primitives)
  const materialsState = useObjectStore(s => s.materials)
  const objectState = useMemo(() => ({
    objectType,
    treeData,
    grassData,
    primitives: primitivesState,
    materials: materialsState,
  }), [objectType, treeData, grassData, primitivesState, materialsState])

  /**
   * Обрабатывает клик по примитиву, поддерживая выделение групп через Ctrl+Click
   * и множественный выбор примитивов через Shift+Click.
   */
  const handleObjectClick = (event: any) => {
    event.stopPropagation()
    const primitiveIndex = event.object.userData.primitiveIndex
    const groupUuid = event.object.userData.groupUuid
    const store = useObjectStore.getState()

    if (event.ctrlKey && groupUuid) {
      // Ctrl+Click на примитив в группе = выделить группу
      if (event.shiftKey) {
        store.toggleGroupSelection(groupUuid)
      } else {
        store.selectGroup(groupUuid)
      }
    } else if (event.shiftKey) {
      // Shift+Click = множественное выделение примитивов
      store.togglePrimitiveSelection(primitiveIndex)
    } else {
      // Обычный клик = выделить примитив
      store.selectPrimitive(primitiveIndex)
    }
  }

  // Подготовим инстанс‑массивы для не сгруппированных листьев и цилиндров,
  // чтобы в ObjectEditor дерево выглядело так же, как в SceneEditor.
  const ungrouped = primitives
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !groupAssignments[p.uuid] && p.visible !== false)

  const ungroupedCylinders = ungrouped.filter(({ p }) => p.type === 'trunk' || p.type === 'branch')
  const ungroupedLeaves = ungrouped.filter(({ p }) => p.type === 'leaf')
  const ungroupedLeafBillboards = ungroupedLeaves

  // Предпросмотр LOD (импостора): заменяем обычный рендер дерева на билборд
  if (lodPreviewEnabled) {
    if (objectType === 'grass') {
      return <GrassTriplanarPreview objectState={objectState as any} paletteUuid={paletteUuid || 'default'} />
    }
    return <BillboardPreview objectState={objectState as any} paletteUuid={paletteUuid || 'default'} />
  }

  return (
    <group onPointerMissed={() => clearSelection()}>
      {/* Инстанс‑отрисовка для не сгруппированных цилиндров (ствол/ветви) */}
      {ungroupedCylinders.length > 0 && (
        <InstancedBranchesOE
          cylinders={ungroupedCylinders.map(({ p, idx }) => ({ primitive: p, index: idx })) as any}
          objectMaterials={objectMaterials}
          onPrimitiveClick={handleObjectClick}
          onPrimitiveHover={() => {}}
        />
      )}

      {/* Инстанс‑отрисовка для не сгруппированных листьев (плоские биллборды) */}
      {ungroupedLeafBillboards.length > 0 && (
        <InstancedLeavesOE
          leaves={ungroupedLeafBillboards.map(({ p, idx }) => ({ primitive: p, index: idx })) as any}
          objectMaterials={objectMaterials}
          onPrimitiveClick={handleObjectClick}
          onPrimitiveHover={() => {}}
        />
      )}
      {/* Сферические листья удалены */}

      {rootGroups.map(group => (
        <GroupRenderer
          key={group.uuid}
          groupUuid={group.uuid}
          groupName={group.name}
          renderMode={renderMode}
          objectMaterials={objectMaterials}
          onPrimitiveClick={handleObjectClick}
        />
      ))}
      {primitives.map((primitive, index) => (
        // Для несгруппированных цилиндров и листьев уже есть инстанс‑варианты — пропускаем их,
        // остальные примитивы отображаем обычным путём
        groupAssignments[primitive.uuid] || primitive.visible === false
          ? null
          : (primitive.type === 'trunk' || primitive.type === 'branch' || primitive.type === 'leaf')
            ? null
            : (
              <PrimitiveRenderer
                key={`root-${primitive.uuid}`}
                primitive={primitive}
                renderMode={renderMode}
                objectMaterials={objectMaterials}
                activePalette={(paletteRegistry.get(paletteUuid) || paletteRegistry.get('default')) as any}
                userData={{ generated: true, primitiveIndex: index }}
                onClick={handleObjectClick}
              />
            )
      ))}
    </group>
  )
}

const BillboardPreview: React.FC<{ objectState: any; paletteUuid: string }> = ({ objectState, paletteUuid }) => {
  const meshRef = React.useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const [data, setData] = React.useState<{ texture: THREE.Texture; heightWorld: number; widthWorld: number } | null>(null)
  const geometry = React.useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1)
    // якорь по нижней середине: смещаем геометрию один раз
    g.translate(0, 0.5, 0)
    return g
  }, [])

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      const sceneObject = {
        uuid: 'object-editor-preview',
        name: 'ObjectEditorPreview',
        primitives: objectState.primitives,
        materials: objectState.materials,
        objectType: objectState.objectType,
        treeData: objectState.treeData,
        grassData: objectState.grassData,
      } as any
      // ВЫБОР БЭЙКЕРА: дерево или трава
      const bill = sceneObject.objectType === 'grass'
        ? await getOrCreateGrassBillboard(sceneObject, paletteUuid)
        : await getOrCreateTreeBillboard(sceneObject, paletteUuid)
      if (!alive) return
      if (bill) {
        try {
          bill.texture.center.set(0.5, 0.5)
          bill.texture.rotation = Math.PI
          bill.texture.flipY = true
          bill.texture.needsUpdate = true
        } catch {}
        setData(bill)
      }
    })()
    return () => { alive = false }
  }, [objectState.objectType, objectState.treeData, objectState.grassData, objectState.primitives, objectState.materials, paletteUuid])

  // Применяем масштаб меша один раз при получении данных
  React.useEffect(() => {
    if (!meshRef.current || !data) return
    meshRef.current.scale.set(data.widthWorld, data.heightWorld, 1)
  }, [data])

  useFrame(() => {
    if (!meshRef.current) return
    const pos = new THREE.Vector3()
    meshRef.current.getWorldPosition(pos)
    const dx = camera.position.x - pos.x
    const dz = camera.position.z - pos.z
    const yaw = Math.atan2(dx, dz)
    meshRef.current.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0, 'XYZ'))
  })

  if (!data) return null

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} rotation={[0, 0, 0]} geometry={geometry}>
      <meshStandardMaterial
        map={data.texture}
        transparent={false}
        alphaTest={0.5}
        roughness={0.8}
        metalness={0.0}
        envMapIntensity={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * Трипланар‑превью для травы: 3 вертикальные плоскости (0/120/240°) со смещением вдоль нормали.
 */
const GrassTriplanarPreview: React.FC<{ objectState: any; paletteUuid: string }> = ({ objectState, paletteUuid }) => {
  const meshRefs = [React.useRef<THREE.Mesh>(null), React.useRef<THREE.Mesh>(null), React.useRef<THREE.Mesh>(null)]
  const [bill, setBill] = React.useState<{ textures: [THREE.Texture, THREE.Texture, THREE.Texture]; normalTextures?: [THREE.Texture, THREE.Texture, THREE.Texture]; heightWorld: number; widthWorlds: [number, number, number] } | null>(null)
  const geometry = React.useMemo(() => { const g = new THREE.PlaneGeometry(1,1); g.translate(0,0.5,0); return g }, [])
  // Берём offset из данных травы объекта, если задан; иначе глобальный из настроек сцены
  const globalOffset = useSceneStore(s => s.grassLodConfig?.offset ?? 0.02)
  const objectOffset = (objectState?.grassData?.params as any)?.lod2Offset
  const offset = (typeof objectOffset === 'number' && objectOffset >= 0) ? objectOffset : globalOffset

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      const sceneObject = {
        uuid: 'object-editor-preview',
        name: 'ObjectEditorPreview',
        primitives: objectState.primitives,
        materials: objectState.materials,
        objectType: objectState.objectType,
        grassData: objectState.grassData,
      } as any
      const data = await getOrCreateGrassBillboardSet(sceneObject, paletteUuid)
      if (!alive) return
      if (data) {
        try {
          data.textures.forEach(t => { t.center.set(0.5, 0.5); t.rotation = Math.PI; t.flipY = true; t.needsUpdate = true })
          ;(data as any).normalTextures?.forEach((t: any) => { t.center?.set?.(0.5, 0.5); t.rotation = Math.PI; t.flipY = true; t.needsUpdate = true })
        } catch {}
        setBill({ textures: data.textures as any, normalTextures: (data as any).normalTextures, heightWorld: data.heightWorld, widthWorlds: data.widthWorlds as any })
      }
    })()
    return () => { alive = false }
  }, [objectState.objectType, objectState.grassData, objectState.primitives, objectState.materials, paletteUuid])

  React.useEffect(() => {
    if (!bill) return
    const yaws = [0, 120, 240].map(a => THREE.MathUtils.degToRad(a))
    for (let i=0;i<3;i++) {
      const m = meshRefs[i].current
      if (!m) continue
      m.scale.set(bill.widthWorlds[i], bill.heightWorld, 1)
      m.rotation.set(0, yaws[i], 0)
      // Смещение вдоль местной нормали (+Z) на offset
      const n = new THREE.Vector3(0,0,1).applyEuler(new THREE.Euler(0, yaws[i], 0, 'XYZ'))
      m.position.set(n.x * offset, 0, n.z * offset)
    }
  }, [bill])

  if (!bill) return null
  return (
    <group>
      {[0,1,2].map(i => (
        <mesh key={`l2-${i}`} ref={meshRefs[i]} geometry={geometry}>
          <meshStandardMaterial
            map={bill.textures[i]}
            normalMap={(bill as any).normalTextures?.[i]}
            normalScale={new THREE.Vector2(0.75, 0.75)}
            roughness={0.8}
            metalness={0.0}
            emissive={'#ffffff'}
            emissiveIntensity={40}
            emissiveMap={bill.textures[i]}
            transparent={false}
            alphaTest={0.5}
            side={THREE.DoubleSide}
            envMapIntensity={5}
          />
        </mesh>
      ))}
    </group>
  )
}

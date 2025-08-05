import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useObjectStore, useSelectedGroupUuids, useObjectPrimitives, useObjectPrimitiveGroups, usePrimitiveGroupAssignments, useSelectedItemType } from '../../../model/objectStore.ts'
import { useOEPrimitiveSelection } from '../../../lib/hooks/useOEPrimitiveSelection.ts'
import { getGroupCenter } from '@/entities/primitiveGroup/lib/coordinateUtils'
import type {
  PrimitiveTransformEvent,
  SelectedObjectPrimitive,
  TransformMode
} from '@/shared/types/ui'
import type {Transform} from "@/shared/types";

export interface PrimitiveTransformGizmoProps {
  selectedPrimitive?: SelectedObjectPrimitive
  transformMode: TransformMode
  selectedGroupUuids?: string[]
}

/**
 * Gizmo для трансформации выбранного примитива.
 * Синхронизирует изменения с состоянием стора и блокирует OrbitControls во время перетаскивания.
 */
export const PrimitiveTransformGizmo: React.FC<PrimitiveTransformGizmoProps & { orbitControlsRef?: React.RefObject<any> }> = ({ orbitControlsRef }) => {
  const { camera, gl, scene } = useThree()
  const transformControlsRef = useRef<any>()
  const selectedPrimitiveIds = useObjectStore(state => state.selectedPrimitiveIds)
  const selectedGroupUuids = useSelectedGroupUuids()
  const selectedItemType = useSelectedItemType()
  const primitives = useObjectPrimitives()
  const primitiveGroups = useObjectPrimitiveGroups()
  const primitiveGroupAssignments = usePrimitiveGroupAssignments()
  const transformMode = useObjectStore(state => state.transformMode)
  const updatePrimitive = useObjectStore(state => state.updatePrimitive)
  const updateGroup = useObjectStore(state => state.updateGroup)
  const setTemporaryGroupTransform = useObjectStore(state => state.setTemporaryGroupTransform)
  const clearTemporaryGroupTransform = useObjectStore(state => state.clearTemporaryGroupTransform)
  const { selectedMeshes } = useOEPrimitiveSelection()

  const groupCenter = useMemo(() => {
    // Handle group selection
    if (selectedItemType === 'group' && selectedGroupUuids.length === 1) {
      const groupUuid = selectedGroupUuids[0]
      const center = getGroupCenter(groupUuid, primitives, primitiveGroups, primitiveGroupAssignments)
      return new THREE.Vector3(center.x, center.y, center.z)
    }
    
    // Handle primitive selection (existing logic)
    if (selectedMeshes.length === 0) return new THREE.Vector3()

    const center = new THREE.Vector3()
    selectedMeshes.forEach(mesh => {
      center.add(mesh.position)
    })
    center.divideScalar(selectedMeshes.length)
    return center
  }, [selectedMeshes, selectedItemType, selectedGroupUuids, primitives, primitiveGroups, primitiveGroupAssignments])

  const groupHelper = useMemo(() => {
    // For group selection, always create a helper at the group center
    if (selectedItemType === 'group' && selectedGroupUuids.length === 1) {
      const helper = new THREE.Object3D()
      helper.position.copy(groupCenter)
      helper.userData.isGroupHelper = true
      helper.userData.isSelectedGroup = true
      return helper
    }
    
    // For multiple primitive selection
    if (selectedMeshes.length === 0) return null

    const helper = new THREE.Object3D()
    helper.position.copy(groupCenter)
    helper.userData.isGroupHelper = true
    return helper
  }, [groupCenter, selectedMeshes.length, selectedItemType, selectedGroupUuids])

  useEffect(() => {
    if (!scene) return

    const shouldShowHelper = (selectedPrimitiveIds.length > 1) || (selectedItemType === 'group' && selectedGroupUuids.length === 1)
    
    if (shouldShowHelper && groupHelper && !groupHelper.parent) {
      groupHelper.position.copy(groupCenter)
      scene.add(groupHelper)
      return () => {
        if (groupHelper.parent && scene) {
          scene.remove(groupHelper)
        }
      }
    } else if (groupHelper && groupHelper.parent) {
      groupHelper.position.copy(groupCenter)
    }
  }, [selectedPrimitiveIds.length, selectedItemType, selectedGroupUuids.length, groupHelper, groupCenter, scene])

  const initialTransforms = useRef<Map<number, {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
    relativeToGroup: THREE.Vector3;
  }>>(new Map())
  const initialGroupTransform = useRef<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3
  }>()
  const pendingUpdates = useRef<Map<number, Transform>>(new Map())

  const handlePrimitiveChange = useCallback(() => {
    if (!transformControlsRef.current?.object) return

    const gizmoObject = transformControlsRef.current.object

    // Для групп применяем временную трансформацию
    if (selectedItemType === 'group' && selectedGroupUuids.length === 1) {
      const groupUuid = selectedGroupUuids[0]
      setTemporaryGroupTransform(groupUuid, {
        position: [gizmoObject.position.x, gizmoObject.position.y, gizmoObject.position.z],
        rotation: [gizmoObject.rotation.x, gizmoObject.rotation.y, gizmoObject.rotation.z],
        scale: [gizmoObject.scale.x, gizmoObject.scale.y, gizmoObject.scale.z]
      })
      return
    }

    // Для примитивов оставляем существующую логику
    if (selectedPrimitiveIds.length === 0 || !initialGroupTransform.current) return

    const currentGroupPos = gizmoObject.position
    const currentGroupRot = gizmoObject.rotation
    const currentGroupScale = gizmoObject.scale

    const deltaPos = currentGroupPos.clone().sub(initialGroupTransform.current.position)
    const deltaRot = new THREE.Euler(
      currentGroupRot.x - initialGroupTransform.current.rotation.x,
      currentGroupRot.y - initialGroupTransform.current.rotation.y,
      currentGroupRot.z - initialGroupTransform.current.rotation.z
    )
    const scaleRatio = new THREE.Vector3(
      currentGroupScale.x / initialGroupTransform.current.scale.x,
      currentGroupScale.y / initialGroupTransform.current.scale.y,
      currentGroupScale.z / initialGroupTransform.current.scale.z
    )

    pendingUpdates.current.clear()

    selectedPrimitiveIds.forEach(id => {
      const init = initialTransforms.current.get(id)
      if (!init) return

      let newPos = init.position.clone()
      let newRot = init.rotation.clone()
      let newScale = init.scale.clone()

      if (transformMode === 'translate') {
        newPos.add(deltaPos)
      } else if (transformMode === 'rotate') {
        const relativePos = init.relativeToGroup.clone()
        relativePos.applyEuler(deltaRot)
        newPos = initialGroupTransform.current.position.clone().add(relativePos)
        newRot = new THREE.Euler(
          init.rotation.x + deltaRot.x,
          init.rotation.y + deltaRot.y,
          init.rotation.z + deltaRot.z
        )
      } else if (transformMode === 'scale') {
        const relativePos = init.relativeToGroup.clone()
        relativePos.multiply(scaleRatio)
        newPos = initialGroupTransform.current.position.clone().add(relativePos)
        newScale = init.scale.clone().multiply(scaleRatio)
      }

      pendingUpdates.current.set(id, {
        position: [newPos.x, newPos.y, newPos.z],
        rotation: [newRot.x, newRot.y, newRot.z],
        scale: [newScale.x, newScale.y, newScale.z]
      })
    })
  }, [selectedPrimitiveIds, selectedItemType, selectedGroupUuids, transformMode, setTemporaryGroupTransform])

  const handleDraggingChanged = useCallback((event: any) => {
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = !event.value
    }
  }, [orbitControlsRef])

  const handleMouseDown = useCallback(() => {
    initialTransforms.current.clear()
    
    // Очищаем временные трансформации при начале перетаскивания
    if (selectedItemType === 'group' && selectedGroupUuids.length === 1) {
      clearTemporaryGroupTransform(selectedGroupUuids[0])
    }

    if (selectedPrimitiveIds.length === 1) {
      const mesh = selectedMeshes[0]
      if (!mesh) return

      initialGroupTransform.current = {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
        scale: mesh.scale.clone()
      }

      initialTransforms.current.set(mesh.userData.primitiveIndex, {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
        scale: mesh.scale.clone(),
        relativeToGroup: new THREE.Vector3(0, 0, 0)
      })
    } else if (groupHelper) {
      initialGroupTransform.current = {
        position: groupHelper.position.clone(),
        rotation: groupHelper.rotation.clone(),
        scale: groupHelper.scale.clone()
      }

      selectedMeshes.forEach(mesh => {
        const relativeToGroup = mesh.position.clone().sub(groupHelper.position)
        initialTransforms.current.set(mesh.userData.primitiveIndex, {
          position: mesh.position.clone(),
          rotation: mesh.rotation.clone(),
          scale: mesh.scale.clone(),
          relativeToGroup
        })
      })
    }

    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = false
    }
  }, [selectedPrimitiveIds, selectedMeshes, groupHelper, orbitControlsRef, selectedItemType, selectedGroupUuids, clearTemporaryGroupTransform])

  const applyPendingUpdates = useCallback(() => {
    if (selectedItemType === 'group' && selectedGroupUuids.length === 1) {
      // Для группы сохраняем финальную трансформацию в store и очищаем временную
      if (transformControlsRef.current?.object) {
        const gizmoObject = transformControlsRef.current.object
        const groupUuid = selectedGroupUuids[0]
        
        updateGroup(groupUuid, {
          transform: {
            position: { x: gizmoObject.position.x, y: gizmoObject.position.y, z: gizmoObject.position.z },
            rotation: { x: gizmoObject.rotation.x, y: gizmoObject.rotation.y, z: gizmoObject.rotation.z },
            scale: { x: gizmoObject.scale.x, y: gizmoObject.scale.y, z: gizmoObject.scale.z }
          }
        })
        
        // Очищаем временную трансформацию
        clearTemporaryGroupTransform(groupUuid)
      }
    } else {
      // Для примитивов применяем изменения как раньше
      pendingUpdates.current.forEach((update, id) => {
        updatePrimitive(id, { transform: update })
      })
    }
    pendingUpdates.current.clear()
  }, [updatePrimitive, updateGroup, selectedItemType, selectedGroupUuids, clearTemporaryGroupTransform])

  const handleMouseUp = useCallback(() => {
    applyPendingUpdates()
    if (orbitControlsRef?.current) {
      orbitControlsRef.current.enabled = true
    }
  }, [orbitControlsRef, applyPendingUpdates])

  useEffect(() => {
    const controls = transformControlsRef.current
    if (!controls) return

    controls.addEventListener('objectChange', handlePrimitiveChange)
    controls.addEventListener('dragging-changed', handleDraggingChanged)
    controls.addEventListener('mouseDown', handleMouseDown)
    controls.addEventListener('mouseUp', handleMouseUp)

    return () => {
      controls.removeEventListener('objectChange', handlePrimitiveChange)
      controls.removeEventListener('dragging-changed', handleDraggingChanged)
      controls.removeEventListener('mouseDown', handleMouseDown)
      controls.removeEventListener('mouseUp', handleMouseUp)
    }
  }, [selectedPrimitiveIds, orbitControlsRef, transformMode, handlePrimitiveChange, handleDraggingChanged, handleMouseDown, handleMouseUp])

  if (selectedPrimitiveIds.length === 0 && selectedGroupUuids.length === 0) return null

  // Определяем объект для gizmo
  const gizmoObject = (() => {
    if (selectedItemType === 'group' && selectedGroupUuids.length === 1) {
      return groupHelper
    } else if (selectedPrimitiveIds.length > 1) {
      return groupHelper
    } else {
      return selectedMeshes[0]
    }
  })()

  // Не показываем gizmo если нет объекта для привязки
  if (!gizmoObject) return null

  return (
    <TransformControls
      ref={transformControlsRef}
      object={gizmoObject}
      mode={transformMode}
      camera={camera}
      gl={gl}
      size={1}
    />
  )
}

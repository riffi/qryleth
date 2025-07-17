import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

import type { SceneResponse, SceneObject, ScenePrimitive } from '../../types/scene'

export type Scene = SceneResponse

export {
  THREE,
  OrbitControls,
  PointerLockControls,
  TransformControls,
  EffectComposer,
  RenderPass,
  OutlinePass,
  OutputPass
}

function createPrimitiveMesh(primitive: ScenePrimitive): THREE.Mesh {
  const color = new THREE.Color(primitive.color || '#cccccc')
  const materialOptions: THREE.MeshStandardMaterialParameters = { color }

  if (primitive.opacity !== undefined && primitive.opacity < 1) {
    materialOptions.transparent = true
    materialOptions.opacity = Math.max(0, Math.min(1, primitive.opacity))
  }

  if (primitive.emissive) {
    materialOptions.emissive = new THREE.Color(primitive.emissive)
    if (primitive.emissiveIntensity !== undefined) {
      materialOptions.emissiveIntensity = Math.max(0, primitive.emissiveIntensity)
    }
  }

  const material = new THREE.MeshStandardMaterial(materialOptions)
  let mesh: THREE.Mesh

  switch (primitive.type) {
    case 'box':
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(primitive.width || 1, primitive.height || 1, primitive.depth || 1),
        material
      )
      break
    case 'sphere':
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(primitive.radius || 1, 32, 16),
        material
      )
      break
    case 'cylinder':
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          primitive.radiusTop || 1,
          primitive.radiusBottom || 1,
          primitive.height || 2,
          primitive.radialSegments || 16
        ),
        material
      )
      break
    case 'cone':
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(
          primitive.radius || 1,
          primitive.height || 2,
          primitive.radialSegments || 16
        ),
        material
      )
      break
    case 'pyramid':
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry((primitive.baseSize || 1) / 2, primitive.height || 2, 4),
        material
      )
      mesh.rotation.y = Math.PI / 4
      break
    case 'plane':
      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(primitive.width || 1, primitive.height || 1),
        material
      )
      mesh.rotation.x = -Math.PI / 2
      break
    default:
      mesh = new THREE.Mesh()
  }

  if (primitive.position) {
    mesh.position.set(...primitive.position)
  }

  if (primitive.rotation) {
    if (primitive.type === 'pyramid' || primitive.type === 'plane') {
      mesh.rotation.x += primitive.rotation[0]
      mesh.rotation.y += primitive.rotation[1]
      mesh.rotation.z += primitive.rotation[2]
    } else {
      mesh.rotation.set(...primitive.rotation)
    }
  }

  mesh.castShadow = true
  mesh.receiveShadow = true
  ;(mesh as any).userData.primitiveData = primitive

  return mesh
}

function createCompositeObject(obj: SceneObject): THREE.Group {
  const group = new THREE.Group()
  group.name = obj.name
  obj.primitives.forEach(p => {
    const mesh = createPrimitiveMesh(p)
    group.add(mesh)
  })
  return group
}

export function toThreeScene(domain: Scene): THREE.Scene {
  const scene = new THREE.Scene()

  domain.placements?.forEach(placement => {
    const obj = domain.objects[placement.objectIndex]
    if (!obj) return
    const group = createCompositeObject(obj)
    if (placement.position) group.position.set(...placement.position)
    if (placement.rotation) group.rotation.set(...placement.rotation)
    if (placement.scale) group.scale.set(...placement.scale)
    group.userData.objectIndex = placement.objectIndex
    scene.add(group)
  })

  if (domain.lighting?.backgroundColor) {
    scene.background = new THREE.Color(domain.lighting.backgroundColor)
  }

  return scene
}

export function fromThreeObject(o: THREE.Object3D): SceneObject {
  const primitives: ScenePrimitive[] = []
  o.traverse(child => {
    if (child instanceof THREE.Mesh && child.userData.primitiveData) {
      primitives.push(child.userData.primitiveData as ScenePrimitive)
    }
  })
  return {
    name: o.name,
    primitives
  }
}

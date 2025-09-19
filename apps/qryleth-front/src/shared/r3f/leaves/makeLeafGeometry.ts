import * as THREE from 'three'

/**
 * Создает и возвращает плоскость 1x1 для рендера биллборда листа.
 * Геометрия используется как базовая для режимов 'billboard' и 'texture'.
 */
export function makeLeafPlaneGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(1, 1, 1, 1)
}

/**
 * Создает геометрию «креста» (две плоскости под 90°) для режима 'coniferCross'.
 *
 * Поведение:
 * - Берет две единичные плоскости, вторую поворачивает на 90° вокруг Y,
 * - Сшивает буфера вручную в один BufferGeometry.
 *
 * Возвращает итоговую BufferGeometry с объединенными атрибутами и индексами.
 */
export function makeConiferCrossGeometry(): THREE.BufferGeometry {
  const p1 = makeLeafPlaneGeometry()
  const p2 = makeLeafPlaneGeometry()
  p2.rotateY(Math.PI / 2)

  const g = new THREE.BufferGeometry()
  const pos1 = p1.getAttribute('position') as THREE.BufferAttribute
  const pos2 = p2.getAttribute('position') as THREE.BufferAttribute
  const uv1 = p1.getAttribute('uv') as THREE.BufferAttribute
  const uv2 = p2.getAttribute('uv') as THREE.BufferAttribute
  const normal1 = p1.getAttribute('normal') as THREE.BufferAttribute
  const normal2 = p2.getAttribute('normal') as THREE.BufferAttribute
  const index1 = p1.getIndex()!
  const index2 = p2.getIndex()!

  const positions = new Float32Array(pos1.array.length + pos2.array.length)
  positions.set(pos1.array as any, 0)
  positions.set(pos2.array as any, pos1.array.length)

  const uvs = new Float32Array(uv1.array.length + uv2.array.length)
  uvs.set(uv1.array as any, 0)
  uvs.set(uv2.array as any, uv1.array.length)

  const normals = new Float32Array(normal1.array.length + normal2.array.length)
  normals.set(normal1.array as any, 0)
  normals.set(normal2.array as any, normal1.array.length)

  const idx = new Uint16Array(index1.array.length + index2.array.length)
  idx.set(index1.array as any, 0)
  const offset = pos1.count
  for (let i = 0; i < index2.array.length; i++) idx[index1.array.length + i] = (index2.array as any)[i] + offset

  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  g.setIndex(new THREE.BufferAttribute(idx, 1))
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}


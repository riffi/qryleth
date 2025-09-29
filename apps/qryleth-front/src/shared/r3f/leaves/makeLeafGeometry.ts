import * as THREE from 'three'

/**
 * Создает и возвращает плоскость 1x1 для рендера текстурированного листа.
 */
export function makeLeafPlaneGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(1, 1, 1, 1)
}


import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial } from '@/entities/material'
import { generateUUID } from '@/shared/lib/uuid'
import type { RockGeneratorParams } from './types'
import { createRockSDF } from './sdf'
import { buildRockGeometry } from './mesher'

/**
 * Создаёт материал «Камень» по умолчанию (однотонный, односторонний).
 * Возвращает массив CreateGfxMaterial без UUID — UUID присваивается при добавлении в стор.
 */
export function createDefaultRockMaterials(options?: { color?: string }): CreateGfxMaterial[] {
  return [
    {
      name: 'Камень',
      type: 'dielectric',
      isGlobal: false,
      properties: {
        color: options?.color ?? '#9f9f9f',
        roughness: 0.92,
        metalness: 0.0,
        side: 'front' as any,
      },
    },
  ]
}

/**
 * Генерирует единый mesh‑примитив камня на основе SDF и маршинга кубов.
 * Присваивает UUID материала через objectMaterialUuid.
 */
export function generateRock(params: RockGeneratorParams & { rockMaterialUuid: string }): GfxPrimitive[] {
  const sdf = createRockSDF(params)
  const geometry = buildRockGeometry({ ...params, sdf })
  const positions: number[] = Array.from((geometry.getAttribute('position') as any)?.array || [])
  const normals: number[] = Array.from((geometry.getAttribute('normal') as any)?.array || [])
  const indicesAttr: any = geometry.getIndex()
  const indices: number[] = indicesAttr ? Array.from(indicesAttr.array as any) : []
  const uvsAttr: any = (geometry.getAttribute('uv') as any)
  const uvs: number[] | undefined = uvsAttr ? Array.from(uvsAttr.array as any) : undefined

  const primitives: GfxPrimitive[] = []
  if (positions.length > 0 && indices.length > 0) {
    primitives.push({
      uuid: generateUUID(),
      type: 'mesh',
      name: 'Камень',
      geometry: { positions, normals, indices, ...(uvs ? { uvs } : {}) },
      objectMaterialUuid: params.rockMaterialUuid,
      visible: true,
      transform: { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] },
    } as any)
  }
  return primitives
}


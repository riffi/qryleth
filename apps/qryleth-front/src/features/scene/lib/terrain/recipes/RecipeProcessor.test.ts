import { describe, it, expect } from 'vitest'
import { generateOpsForRecipeAtPoints } from './RecipeProcessor'
import type { GfxTerrainOpRecipe } from '@/entities/terrain'

describe('RecipeProcessor', () => {
  it('генерация id детерминирована сидом и количеством точек', () => {
    const recipe: GfxTerrainOpRecipe = {
      kind: 'hill',
      count: 2,
      placement: { type: 'uniform' },
      radius: [5, 10],
      intensity: [3, 6],
    }
    const seed = 4242
    const pts: Array<[number, number]> = [[0,0], [10, 5]]
    const ops1 = generateOpsForRecipeAtPoints(recipe, pts, seed)
    const ops2 = generateOpsForRecipeAtPoints(recipe, pts, seed)
    expect(ops1.length).toBe(2)
    expect(ops2.length).toBe(2)
    expect(ops1[0].id).toEqual(ops2[0].id)
    expect(ops1[1].id).toEqual(ops2[1].id)
  })

  it('intensityScale влияет на амплитуду', () => {
    const recipe: GfxTerrainOpRecipe = {
      kind: 'hill',
      count: 1,
      placement: { type: 'uniform' },
      radius: 5,
      intensity: 4,
    }
    const seed = 7
    const pts: Array<[number, number]> = [[0,0]]
    const ops1 = generateOpsForRecipeAtPoints(recipe, pts, seed, { intensityScale: 1 })
    const ops2 = generateOpsForRecipeAtPoints(recipe, pts, seed, { intensityScale: 2 })
    expect(ops1[0].intensity * 2).toBeCloseTo(ops2[0].intensity)
  })
})


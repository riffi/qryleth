/**
 * Terrain Entity
 * 
 * Экспорт всех типов и интерфейсов для системы террейна
 */

export type {
  GfxPerlinParams,
  GfxHeightmapParams,
  GfxTerrainSource,
  GfxTerrainOp,
  GfxTerrainConfig,
  GfxHeightSampler
} from './model/types';

export type {
  GfxLandscape
} from './model/types'

// Экспорт типов процедурной генерации террейна
export type {
  GfxProceduralPerlinParams,
  GfxProceduralTerrainSpec,
  GfxTerrainOpPool,
  GfxTerrainOpRecipe,
  GfxPlacementSpec,
  GfxBiasSpec,
  GfxPlacementArea,
  GfxOpsGenerationOptions
} from './model/proceduralTypes'

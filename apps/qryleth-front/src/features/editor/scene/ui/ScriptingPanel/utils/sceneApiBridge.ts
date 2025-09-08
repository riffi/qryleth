import { SceneAPI } from '@/features/editor/scene/lib/sceneAPI'

/**
 * Возвращает объект‑обёртку для скриптового окружения панели.
 *
 * Зачем нужна обёртка:
 * - Внутри панели скрипт выполняется через `new Function(...)` с передачей переменной `sceneApi`.
 * - Класс `SceneAPI` предоставляет статические методы, но экземпляр класса таких методов не имеет.
 * - Чтобы избежать ошибок вида "sceneApi.<method> is not a function", мы передаём не класс,
 *   а простой объект с функциями, делегирующими вызовы к статическим методам `SceneAPI`.
 *
 * Этот объект содержит только публичные методы, допущенные к использованию в скриптах.
 */
export function createSceneApiBridge() {
  return {
    // Обзор и выборки
    getSceneOverview: () => SceneAPI.getSceneOverview(),
    getSceneObjects: () => SceneAPI.getSceneObjects(),
    getSceneInstances: () => SceneAPI.getSceneInstances(),
    getSceneStats: () => SceneAPI.getSceneStats(),
    getAvailableLayers: () => SceneAPI.getAvailableLayers(),

    // Поиск
    findObjectByUuid: (uuid: string) => SceneAPI.findObjectByUuid(uuid),
    findObjectByName: (name: string) => SceneAPI.findObjectByName(name),
    searchObjectsInLibrary: (query: string) => SceneAPI.searchObjectsInLibrary(query),

    // Создание/размещение
    canAddInstance: (objectUuid: string) => SceneAPI.canAddInstance(objectUuid),
    addInstances: (
      objectUuid: string,
      layerId?: string,
      count?: number,
      placement?: import('@/features/editor/scene/lib/placement/ObjectPlacementUtils').PlacementStrategyConfig
    ) => SceneAPI.addInstances(objectUuid, layerId, count, placement),
    createObject: (
      objectData: import('@/entities/object/model/types').GfxObject,
      layerId?: string,
      count?: number,
      placement?: import('@/features/editor/scene/lib/placement/ObjectPlacementUtils').PlacementStrategyConfig
    ) => SceneAPI.createObject(objectData, layerId, count, placement),
    addObjectFromLibrary: (
      objectUuid: string,
      layerId?: string,
      count?: number,
      placement?: import('@/features/editor/scene/lib/placement/ObjectPlacementUtils').PlacementStrategyConfig
    ) => SceneAPI.addObjectFromLibrary(objectUuid, layerId, count, placement),

    // Террейн: процедурная генерация и корректировка
    generateProceduralTerrain: (spec: import('@/entities/terrain').GfxProceduralTerrainSpec) =>
      SceneAPI.generateProceduralTerrain(spec),
    generateTerrainOpsFromPool: (
      pool: import('@/entities/terrain').GfxTerrainOpPool,
      seed: number,
      opts?: import('@/entities/terrain').GfxOpsGenerationOptions & { worldWidth?: number; worldDepth?: number; worldHeight?: number }
    ) => SceneAPI.generateTerrainOpsFromPool(pool, seed, opts),
    createProceduralLandscape: (
      spec: import('@/entities/terrain').GfxProceduralTerrainSpec,
      opts?: { name?: string; center?: [number, number]; size?: { width: number; depth: number }; material?: { color?: string; multiColor?: import('@/entities/layer').GfxMultiColorConfig } }
    ) => SceneAPI.createProceduralLandscape(spec, opts),
    // legacy методы удалены: createProceduralLayer, adjustInstancesForPerlinTerrain

    // Палитры сцены
    listPalettes: () => SceneAPI.listPalettes(),
    setPalette: (uuid: string) => SceneAPI.setPalette(uuid),
  }
}


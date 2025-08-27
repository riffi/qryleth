import { SceneAPI } from '../../../lib/sceneAPI'

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
      placement?: import('../../../lib/placement/ObjectPlacementUtils').PlacementStrategyConfig
    ) => SceneAPI.addInstances(objectUuid, layerId, count, placement),
    createObject: (
      objectData: import('@/entities/object/model/types').GfxObject,
      layerId?: string,
      count?: number,
      placement?: import('../../../lib/placement/ObjectPlacementUtils').PlacementStrategyConfig
    ) => SceneAPI.createObject(objectData, layerId, count, placement),
    addObjectFromLibrary: (
      objectUuid: string,
      layerId?: string,
      count?: number,
      placement?: import('../../../lib/placement/ObjectPlacementUtils').PlacementStrategyConfig
    ) => SceneAPI.addObjectFromLibrary(objectUuid, layerId, count, placement),

    // Террейн: процедурная генерация и корректировка
    generateProceduralTerrain: (spec: import('@/entities/terrain').GfxProceduralTerrainSpec) =>
      SceneAPI.generateProceduralTerrain(spec),
    generateTerrainOpsFromPool: (
      pool: import('@/entities/terrain').GfxTerrainOpPool,
      seed: number,
      opts?: import('@/entities/terrain').GfxOpsGenerationOptions & { worldWidth?: number; worldHeight?: number }
    ) => SceneAPI.generateTerrainOpsFromPool(pool, seed, opts),
    createProceduralLayer: (
      spec: import('@/entities/terrain').GfxProceduralTerrainSpec,
      layerData?: Partial<import('@/entities/scene/types').SceneLayer>
    ) => SceneAPI.createProceduralLayer(spec, layerData),
    adjustInstancesForPerlinTerrain: (terrainLayerId: string) =>
      SceneAPI.adjustInstancesForPerlinTerrain(terrainLayerId),

    // Fit‑хелперы: генерация только рецептов/оценок (без создания слоя)
    terrainHelpers: {
      /**
       * Вписать долину в прямоугольник XZ и получить рецепты для pool.recipes.
       * Слой не создаётся — хелпер только готовит операции для встраивания в сценарий.
       */
      valleyFitToRecipes: (
        rect: import('@/entities/terrain').FitRect,
        options: import('@/entities/terrain').ValleyFitOptions,
        world: import('@/entities/terrain').WorldSize,
        edgeFade?: number
      ) => SceneAPI.terrainValleyFitToRecipes(rect, options, world, edgeFade),

      /** Вписать гряду/хребет, получить рецепты и оценки */
      ridgeBandFitToRecipes: (
        rect: import('@/entities/terrain').FitRect,
        options: import('@/entities/terrain').RidgeBandFitOptions,
        world: import('@/entities/terrain').WorldSize,
        edgeFade?: number
      ) => SceneAPI.terrainRidgeBandFitToRecipes(rect, options, world, edgeFade),

      /** Оценить бюджет (ops) по рецептам */
      estimateOpsForRecipes: (recipes: import('@/entities/terrain').GfxTerrainOpRecipe[]) =>
        SceneAPI.terrainEstimateOpsForRecipes(recipes),

      /** Предложить pool.global.maxOps с запасом */
      suggestGlobalBudget: (recipes: import('@/entities/terrain').GfxTerrainOpRecipe[], margin?: number) =>
        SceneAPI.terrainSuggestGlobalBudget(recipes, margin),

      /** Подрезать рецепты под бюджет */
      autoBudget: (
        recipes: import('@/entities/terrain').GfxTerrainOpRecipe[],
        maxOps: number
      ) => SceneAPI.terrainAutoBudget(recipes, maxOps)
    }
  }
}

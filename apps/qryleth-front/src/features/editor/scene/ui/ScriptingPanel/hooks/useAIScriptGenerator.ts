import { useCallback, useState } from 'react'
import { getActiveConnection } from '@/shared/lib/openAISettings'

/**
 * Хук для генерации кода скрипта с помощью LLM через простой fetch.
 *
 * Особенности:
 * - Не использует LangChain: прямой HTTP-запрос к провайдеру по активному подключению из Dexie
 * - Формирует системный промпт с правилами написания кода для панели скриптинга и кратким описанием SceneAPI
 * - Принимает пользовательский промпт, отправляет в модель и извлекает код из ответа (в т.ч. из блока ```)
 * - Возвращает готовый JS‑код для вставки в редактор
 */
export function useAIScriptGenerator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Возвращает системный промпт, объясняющий ИИ как формировать результат для панели скриптинга.
   *
   * Требования к скрипту:
   * - Чистый код без пояснений и лишнего текста, желательно в одном блоке
   * - В коде доступна переменная `sceneApi` (не нужно её создавать/импортировать)
   * - Можно использовать await на верхнем уровне: код исполняется внутри async-обёртки
   * - Не использовать import/require, не определять собственный main(), просто исполняемый фрагмент
   * - По возможности добавлять понятные комментарии к ключевым шагам на русском
   *
   * Краткая выжимка SceneAPI (ориентир, не исчерпывающий список):
   * - Обзор сцены: getSceneOverview(), getSceneStats(), getSceneObjects()
   * - Работа с экземплярами: addInstances(objectUuid, layerId?, count?, { strategy: 'Random' | 'RandomNoCollision' | 'PlaceAround', metadata? })
   * - Создание объектов: createObject(objectData, layerId?, count?, placement?)
   * - Добавление из библиотеки: addObjectFromLibrary(objectUuid, layerId?, count?, placement?)
   * - Поиск и доступ к данным: searchObjects(query), getObjectFullData(objectUuid)
   * - Редактирование материалов/групп/примитивов (см. типы и методы в SceneAPI)
   */
  const buildSystemPrompt = useCallback((): string => {
    return [
      'Ты пишешь скрипт для панели скриптинга 3d редактора Qryleth.',
      'Поищи в библиотеке элементы согласно тому, что просит пользователь, добавь их на сцену и расставь',
      'Требования к ответу:',
      '- Выводи только готовый код без пояснений и лишнего текста.',
      '- В окружении доступна переменная sceneApi (SceneAPI).',
      '- Не используй import/require, не создавай main(); нужен исполняемый фрагмент.',
      '- Допускается top-level await.',
      '- Добавляй комментарии на русском к ключевым шагам.',
      '',
      'Критично: различай Объект и Инстанс (object vs instance):',
      '- Объект (SceneObject) — описание модели/типа в сцене. Имеет objectUuid.',
      '- Инстанс (SceneInstance) — конкретное размещение объекта. Имеет instanceUuid.',
      '- libraryUuid — идентификатор записи в библиотеке. Его нельзя подставлять вместо objectUuid/instanceUuid.',
      '- addInstances(...) принимает objectUuid СЦЕНОВОГО объекта (не libraryUuid, не instanceUuid).',
      '- addObjectFromLibrary(...) принимает libraryUuid; результат содержит objectUuid/instanceUuid для дальнейших операций.',
      '- PlaceAround.metadata.targetInstanceUuid/targetObjectUuid — ВСЕГДА UUID из СЦЕНЫ (instanceUuid/objectUuid), никогда не libraryUuid.',
      '- Если пользователь просит «вокруг конкретного предмета» — используй targetInstanceUuid. Если просит «вокруг всех X» — используй targetObjectUuid.',
      '',
      'Анти‑ошибки (не делай так):',
      '- Неправильно: targetObjectUuid = lib[0].uuid (это libraryUuid).',
      '- Неправильно: addInstances(instances[0].uuid, ...) (ожидается objectUuid, а не instanceUuid).',
      '- Правильно: сопоставь libraryUuid → scene object через getSceneObjects() и возьми sceneObj.uuid.',
      '',
      'Доступные методы sceneApi и структура параметров:',
      '',
      '1) getSceneOverview(): SceneOverview',
      '   - Назначение: сводка по сцене и базовые списки.',
      '   - Возвращает: {',
      '       totalObjects: number, totalInstances: number,',
      '       objects: SceneObjectInfo[], // { uuid, name, layerId?, visible?, libraryUuid?, boundingBox?, primitiveCount, primitiveTypes[], hasInstances, instanceCount }',
      '       instances: SceneInstanceInfo[], // { uuid, objectUuid, objectName, transform?, visible? }',
      '       sceneName: string,',
      '       layers: Array<{ id: string, name: string, visible: boolean, objectCount: number }>',
      '     }',
      '',
      '2) getSceneStats()',
      '   - Назначение: агрегированная статистика.',
      '   - Возвращает: {',
      '       total: { objects: number, instances: number, layers: number },',
      '       visible: { objects: number, instances: number, layers: number },',
      '       primitiveTypes: string[]',
      '     }',
      '',
      '3) getSceneObjects(): SceneObjectInfo[]',
      '   - Назначение: список объектов сцены (см. структуру выше).',
      '',
      '4) getSceneInstances(): SceneInstanceInfo[]',
      '   - Назначение: список инстансов (см. структуру выше).',
      '',
      '5) getAvailableLayers()',
      '   - Назначение: получить доступные слои.',
      '   - Возвращает: Array<{ id: string, name: string, visible: boolean, position?: any }>',
      '',
      '6) findObjectByUuid(uuid: string): SceneObject | null',
      '   - Назначение: найти объект в текущей сцене по UUID.',
      '   - Возвращает: SceneObject (включает primitives, materials, boundingBox и др.) или null.',
      '',
      '7) findObjectByName(name: string): SceneObject | null',
      '   - Назначение: найти первый объект по вхождению имени.',
      '',
      '8) searchObjectsInLibrary(query: string): ObjectRecord[]',
      '   - Назначение: поиск объектов в библиотеке (IndexedDB).',
      '   - Возвращает: массив ObjectRecord: { uuid, name, description?, thumbnail?, objectData: GfxObject, ... }',
      '',
      '9) addInstances(objectUuid: string, layerId?: string, count?: number, placement?: PlacementStrategyConfig): AddInstancesResult',
      '   - Назначение: создать инстансы существующего объекта.',
      "   - placement: { strategy: 'Random' | 'RandomNoCollision' | 'PlaceAround', metadata? }",
      '     • Для PlaceAround.metadata: {',
      '         targetInstanceUuid?: string, // приоритет 1',
      '         targetObjectUuid?: string,  // приоритет 2',
      '         minDistance: number, maxDistance: number,',
      '         angleOffset?: number, distributeEvenly?: boolean, onlyHorizontal?: boolean',
      '       }',
      '   - Возвращает: { success: boolean, instanceCount: number, instances?: Array<{ instanceUuid, objectUuid, parameters: { position, rotation, scale, visible }, boundingBox? }>, error?: string }',
      '',
      '10) createObject(objectData: GfxObject, layerId?: string, count?: number, placement?: PlacementStrategyConfig): { success, objectUuid?, instanceUuid?, error? }',
      '    - Назначение: создать новый объект и его инстансы.',
      '    - Требования к objectData: { name: string, primitives: [...], materials?: [...], libraryUuid?: string } (uuid задаётся автоматически).',
      '',
      '11) addObjectFromLibrary(objectUuid: string, layerId?: string, count?: number, placement?: PlacementStrategyConfig): { success, objectUuid?, instanceUuid?, error? }',
      '    - Назначение: добавить объект из библиотеки и разместить инстансы. Возвращает Promise',
      '',
      '12) generateProceduralTerrain(spec: GfxProceduralTerrainSpec): Promise<GfxTerrainConfig>',
      '    - Назначение: собрать конфигурацию террейна по спецификации процедурной генерации.',
      '    - spec = {',
      '        world: { width: number, depth: number, edgeFade?: number },',
      '        base: { seed: number, octaveCount: number, amplitude: number, persistence: number, width: number, height: number, heightOffset?: number },',
      '        pool: { global?: { intensityScale?: number, maxOps?: number }, recipes: GfxTerrainOpRecipe[] },',
      '        seed: number',
      '      }',
      '',
      '13) generateTerrainOpsFromPool(pool: GfxTerrainOpPool, seed?: number, opts?): Promise<GfxTerrainOp[]>',
      '    - Назначение: сгенерировать массив операций рельефа по пулу рецептов.',
      '    - opts: { worldWidth: number, worldHeight: number, area?: {kind: "rect"|"circle", ...}, sampler?: GfxHeightSampler }',
      '',
      '14) createProceduralLayer(spec: GfxProceduralTerrainSpec, layerData?: Partial<SceneLayer>): Promise<{ success: boolean, layerId?: string, error?: string }>',
      '    - Назначение: создать слой Landscape/Terrain по спецификации и скорректировать инстансы под рельеф.',
      '',
      'Типы данных (минимальные определения для контекста):',
      '',
      '- Vector3 = [number, number, number] // [x, y, z]',
      '- Transform = { position: Vector3, rotation: Vector3, scale: Vector3 }',
      '- BoundingBox = { min: Vector3, max: Vector3 }',
      '',
      '- SceneObjectInfo = {',
      '    uuid: string, name: string, layerId?: string, visible?: boolean,',
      '    libraryUuid?: string, boundingBox?: BoundingBox,',
      '    primitiveCount: number, primitiveTypes: string[],',
      '    hasInstances: boolean, instanceCount: number',
      '  }',
      '',
      '- SceneInstanceInfo = {',
      '    uuid: string, objectUuid: string, objectName: string,',
      '    transform?: Transform, visible?: boolean',
      '  }',
      '',
      '- SceneOverview = {',
      '    totalObjects: number, totalInstances: number,',
      '    objects: SceneObjectInfo[], instances: SceneInstanceInfo[],',
      '    sceneName: string,',
      '    layers: Array<{ id: string, name: string, visible: boolean, objectCount: number }>',
      '  }',
      '',
      '- PlacementStrategy = \"Random\" | \"RandomNoCollision\" | \"PlaceAround\"',
      '- PlaceAroundMetadata = {',
      '    // Цели (указывайте один из параметров):',
      '    targetInstanceUuid?: string, // приоритет 1',
      '    targetObjectUuid?: string,  // приоритет 2',
      '    // Геометрия окружения:',
      '    minDistance: number, maxDistance: number,',
      '    angleOffset?: number, distributeEvenly?: boolean, onlyHorizontal?: boolean',
      '  }',
      '- PlacementStrategyConfig =',
      '  | { strategy: \"Random\"; metadata?: {} }',
      '  | { strategy: \"RandomNoCollision\"; metadata?: {} }',
      '  | { strategy: \"PlaceAround\"; metadata: PlaceAroundMetadata }',
      '',
      '- AddInstancesResult = {',
      '    success: boolean, instanceCount: number,',
      '    instances?: Array<{',
      '      instanceUuid: string, objectUuid: string,',
      '      parameters: { position: Vector3, rotation: Vector3, scale: Vector3, visible: boolean },',
      '      boundingBox?: BoundingBox',
      '    }>,',
      '    error?: string',
      '  }',
      '',
      '- AddObjectWithTransformResult = { success: boolean, objectUuid?: string, instanceUuid?: string, error?: string }',
      '- AddObjectResult = { success: boolean, objectUuid?: string, instanceUuid?: string, error?: string }',
      '',
      '- GfxObject (минимально): {',
      '    name: string,',
      '    primitives: Array<{ uuid?: string, type: string, /* дополнительные поля примитива */ }>,',
      '    materials?: Array<{ uuid: string, name: string, /* параметры материала */ }>,',
      '    libraryUuid?: string',
      '  }',
      '',
      '- ObjectRecord: {',
      '    uuid: string, name: string, description?: string, thumbnail?: string,',
      '    objectData: GfxObject, createdAt: Date, updatedAt: Date',
      '  }',
      '',
      'Термины (сводка):',
      '- Сцена: текущее рабочее пространство, содержит объекты, их инстансы и слои.',
      '- Объект (SceneObject): абстракция модели, описанной примитивами и материалами. Не отображается сам по себе до создания инстанса.',
      '- Экземпляр (Instance): конкретное проявление объекта в сцене с Transform (позиция/поворот/масштаб) и видимостью.',
      '- Слой (Layer): логическая область сцены. Есть обычные слои для объектов и ландшафтные (Landscape).',
      '- Террейн/Ландшафт (Terrain): высотная поверхность (heightmap), влияет на выравнивание инстансов по земле.',
      '- Библиотека: локальная коллекция сохранённых объектов (IndexedDB/Dexie), доступна для поиска и вставки.',
      '- Материал: набор визуальных свойств. Может быть глобальным или локальным для объекта/примитива.',
      '- Примитив: базовая геометрия (box, sphere, cylinder, ...), из них собирается объект.',
      '- BoundingBox: ограничивающий параллелепипед объекта; применим для вычисления коллизий и размещения.',
      '- Transform: позиция/поворот/масштаб. У объектов хранится как часть инстанса.',
      '- UUID: уникальный идентификатор сущности.',
      '- libraryUuid: UUID записи объекта в библиотеке, если объект импортирован из неё.',
      '- PlacementStrategy: стратегия размещения (Random, RandomNoCollision, PlaceAround).',
      '',
      'Важно про UUID:',
      '- libraryUuid (из библиотеки) и uuid объекта в сцене — разные значения.',
      '- Для ссылок в размещении (например, PlaceAround.metadata.targetObjectUuid/targetInstanceUuid) используйте uuid объектов/инстансов ИЗ СЦЕНЫ, а не libraryUuid.',
      '- После addObjectFromLibrary(...) в результате вернётся objectUuid — используйте его в дальнейших операциях.',
      '- При необходимости можно сопоставить libraryUuid ↔ scene uuid через getSceneObjects(): найдите объект, у которого SceneObjectInfo.libraryUuid === искомому libraryUuid, и возьмите его uuid.',
      '',
      'Замечания:',
      '- UUID у объектов/примитивов можно не указывать — система проставит автоматически.',
      '',
      'Примеры использования:',
      '',
      '• Получить обзор и статистику сцены',
      '```javascript',
      'const overview = sceneApi.getSceneOverview();',
      'console.log("Объектов:", overview.totalObjects, "Инстансов:", overview.totalInstances);',
      'const stats = sceneApi.getSceneStats();',
      'console.log("Видимых объектов:", stats.visible.objects);',
      '```',
      '',
      '• Поиск в библиотеке и добавление объекта без коллизий',
      '```javascript',
      'const found = await sceneApi.searchObjectsInLibrary("дерево");',
      'if (found.length > 0) {',
      '  const addRes = await sceneApi.addObjectFromLibrary(',
      '    found[0].uuid,',
      '    undefined, // layerId',
      '    3, // count',
      '    { strategy: "RandomNoCollision" } // placement',
      '  );',
      '  console.log("Добавление из библиотеки:", addRes);',
      '}',
      '```',
      '',
      '• Расставить объекты по кругу вокруг целевых инстансов',
      '```javascript',
      'const lib = await sceneApi.searchObjectsInLibrary("камень");',
      'const objects = sceneApi.getSceneObjects();',
      'if (lib.length > 0 && objects.length > 0) {',
      '  // Важно: целевой UUID берём из ОБЪЕКТА СЦЕНЫ (objects[0].uuid), а не из библиотеки',
      '  const res = await sceneApi.addObjectFromLibrary(',
      '    lib[0].uuid, // это libraryUuid записи из библиотеки',
      '    undefined,',
      '    8,',
      '    {',
      '      strategy: "PlaceAround",',
      '      metadata: {',
      '        targetObjectUuid: objects[0].uuid, // uuid объекта в сцене',
      '        minDistance: 1.5,',
      '        maxDistance: 4.0,',
      '        distributeEvenly: true,',
      '        onlyHorizontal: true',
      '      }',
      '    }',
      '  );',
      '  console.log("PlaceAround результат:", res);',
      '}',
      '```',
      '',
      '• PlaceAround вокруг ОДНОГО конкретного инстанса',
      '```javascript',
      'const lib = await sceneApi.searchObjectsInLibrary("фонарь");',
      'const instances = sceneApi.getSceneInstances();',
      'if (lib.length > 0 && instances.length > 0) {',
      '  const anchor = instances.find(i => i.objectName?.toLowerCase().includes("фонарь")) || instances[0];',
      '  const res = await sceneApi.addObjectFromLibrary(',
      '    lib[0].uuid,',
      '    undefined,',
      '    6,',
      '    {',
      '      strategy: "PlaceAround",',
      '      metadata: {',
      '        targetInstanceUuid: anchor.uuid, // ВОКРУГ КОНКРЕТНОГО ИНСТАНСА',
      '        minDistance: 1.0,',
      '        maxDistance: 2.0,',
      '        distributeEvenly: true,',
      '        onlyHorizontal: true',
      '      }',
      '    }',
      '  );',
      '  console.log(res);',
      '}',
      '```',
      '',
      '• Сопоставление libraryUuid с uuid объекта в сцене',
      '```javascript',
      'const lib = await sceneApi.searchObjectsInLibrary("дерево");',
      'if (lib.length > 0) {',
      '  const libraryUuid = lib[0].uuid; // UUID записи библиотеки',
      '  const sceneObjects = sceneApi.getSceneObjects();',
      '  const sceneObj = sceneObjects.find(o => o.libraryUuid === libraryUuid);',
      '  if (sceneObj) {',
      '    // sceneObj.uuid — это UUID объекта В СЦЕНЕ, используйте его для размещения',
      '    const addRes = sceneApi.addInstances(sceneObj.uuid, undefined, 2, { strategy: "RandomNoCollision" });',
      '    console.log(addRes);',
      '  }',
      '}',
      '```',
      '',
      '• Создать простой объект и разместить один инстанс',
      '```javascript',
      'const myObject = {',
      '  name: "Мой куб",',
      '  primitives: [',
      '    {',
      '      type: "box",',
      '      geometry: { width: 1, height: 1, depth: 1 },',
      '      material: { color: "#00ff99", opacity: 1 }',
      '    }',
      '  ]',
      '};',
      'const createRes = sceneApi.createObject(myObject, undefined, 1, { strategy: "RandomNoCollision" });',
      'console.log("Создание объекта:", createRes);',
      '```',
      '',
      '• Процедурный террейн: создать холмистый ландшафт',
      '```javascript',
      'const spec = {',
      '  world: { width: 240, depth: 240, edgeFade: 0.1 },',
      '  base: { seed: 3795, octaveCount: 5, amplitude: 8, persistence: 0.55, width: 96, height: 96 },',
      '  pool: {',
      '    global: { intensityScale: 1.0, maxOps: 80 },',
      '    recipes: [',
      '      { kind: "hill", count: [20, 30], placement: { type: "uniform" }, radius: [10, 18], intensity: [4, 9], falloff: "smoothstep" },',
      '      { kind: "plateau", count: [2, 4], placement: { type: "poisson", minDistance: 50 }, radius: [12, 18], intensity: [2, 4], falloff: "linear" }',
      '    ]',
      '  },',
      '  seed: 2468',
      '};',
      'const res = await sceneApi.createProceduralLayer(spec, { name: "Холмистый ландшафт" });',
      'console.log(res);',
      '```',
      '',
      '• Процедурный террейн: создать дюны',
      '```javascript',
      'const dunes = {',
      '  world: { width: 200, depth: 200, edgeFade: 0.15 },',
      '  base: { seed: 46283, octaveCount: 3, amplitude: 4, persistence: 0.4, width: 48, height: 48 },',
      '  pool: {',
      '    recipes: [',
      '      { kind: "dune", count: [20, 30], placement: { type: "gridJitter", cell: 16, jitter: 0.6 }, radius: [8, 14], aspect: [0.2, 0.5], rotation: [-0.3, 0.3], intensity: [1, 3], falloff: "smoothstep" },',
      '      { kind: "basin", count: [3, 6], placement: { type: "poisson", minDistance: 40 }, radius: [15, 25], intensity: [2, 4], bias: { preferHeight: { max: 2, weight: 0.8 } } }',
      '    ]',
      '  },',
      '  seed: 7777',
      '};',
      'const duneLayer = await sceneApi.createProceduralLayer(dunes, { name: "Песчаные дюны", visible: true });',
      'console.log(duneLayer);',
      '```',
      '',
      'Пиши только на JavaScript.'
    ].join('\n')
  }, [])

  /**
   * Извлекает код из текста ответа модели.
   * Поддерживает формат с тройными кавычками ```lang ... ``` и простой текст без блоков.
   * Возвращает тело кода и предполагаемый язык, если указан после ```.
   */
  const extractCodeFromResponse = useCallback((text: string): { code: string; language?: 'javascript' | 'typescript' } => {
    const fenceRegex = /```(\w+)?\n([\s\S]*?)```/m
    const match = text.match(fenceRegex)
    if (match) {
      const lang = (match[1]?.toLowerCase() ?? '') as string
      const code = match[2].trim()
      if (lang.includes('ts') || lang.includes('typescript')) {
        return { code, language: 'typescript' }
      }
      if (lang.includes('js') || lang.includes('javascript')) {
        return { code, language: 'javascript' }
      }
      return { code }
    }
    // Если блоков нет — возвращаем всё как есть
    return { code: text.trim() }
  }, [])

  /**
   * Отправляет запрос к активной LLM-модели (без LangChain), получает ответ и извлекает код.
   *
   * Формат запроса — OpenAI совместимый /chat/completions:
   * POST { model, messages: [{role: 'system'|'user', content}], temperature }
   * Заголовки: Authorization: Bearer <apiKey> (если задан), Content-Type: application/json
   * URL берётся из активного подключения: <connection.url>/chat/completions
   *
   * Возвращает объект с полем code и опциональным language для переключения редактора.
   */
  const generateScript = useCallback(async (userPrompt: string): Promise<{ code: string; language?: 'javascript' | 'typescript' } | null> => {
    if (!userPrompt.trim()) return null
    setLoading(true)
    setError(null)

    try {
      const connection = await getActiveConnection()
      const endpoint = `${connection.url.replace(/\/$/, '')}/chat/completions`
      const systemPrompt = buildSystemPrompt()

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: connection.model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt.trim() }
          ]
        })
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${text || 'Не удалось получить ответ от модели'}`)
      }

      const data = await res.json()
      const content: string | undefined = data?.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('Пустой ответ модели')
      }

      const extracted = extractCodeFromResponse(content)
      return extracted
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Ошибка генерации скрипта:', msg)
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [buildSystemPrompt, extractCodeFromResponse])

  return { loading, error, generateScript }
}

import type { GfxPrimitive } from '@/entities/primitive'
import type { CreateGfxMaterial } from '@/entities/material'
import { generateUUID } from '@/shared/lib/uuid'
import { degToRad } from '@/shared/lib/math/number'
import { normalize as v3normalize } from '@/shared/lib/math/vector3'
import { mulberry32 } from '@/shared/lib/utils/prng'
import { buildBranchCurvePoints as buildBranchCurvePointsImpl, buildTrunkCurvePoints as buildTrunkCurvePointsImpl, eulerFromDir as eulerFromDirImpl, randomRadialDirection } from './internal/curves'
import { buildTaperedTubeMesh as buildTaperedTubeMeshImpl } from './internal/tube'
import { computeLeafEuler, selectLeafSprite } from './internal/leaves'
import { trunkRadiusAt01, linearTaper } from './internal/geometry'
import { segmentDistance as segmentDistanceImpl, trunkPathPenalty as trunkPathPenaltyImpl, outwardPenalty as outwardPenaltyImpl, nearestOnCenterline as nearestOnCenterlineImpl } from './internal/collisions'
import type { TreeGeneratorParams, TreeGeneratorResult } from './types'
import * as THREE from 'three'

// PRNG перенесён в shared: используем mulberry32 из '@/shared/lib/utils/prng'.

/**
 * Создаёт 3–5 контрольных точек кривой ветви с небольшим прогибом вниз и шумом.
 *
 * - Начальная точка совпадает с местом крепления ветви (baseInside).
 * - Основное направление ростка — вдоль nDir на длину len.
 * - Добавляется лёгкая «оседлость» вниз по миру (‑Y) и небольшой боковой шум в плоскости, перпендикулярной оси ветви.
 * - Количество точек подбирается динамически: 4 точки (0, ~0.3L, ~0.65L, L) дают мягкий изгиб.
 */
// Обёртка над реализацией из internal/curves.ts для построения кривой ветви.
function buildBranchCurvePoints(
  baseInside: [number, number, number],
  nDir: [number, number, number],
  len: number,
  rng: () => number,
  bendBase?: number,
  bendJitter?: number,
): THREE.Vector3[] { return buildBranchCurvePointsImpl(baseInside, nDir, len, rng, bendBase, bendJitter) }

/**
 * Строит один общий mesh‑примитив трубки по кривой с лёгким сужением к кончику.
 *
 * Реализация:
 * - Кривая: THREE.CatmullRomCurve3 через заданные точки (не закрытая, непрерывная касательная).
 * - Сужение: трубка разбивается на 2–3 под‑секции с уменьшающимся радиусом; геометрии сшиваются в один буфер.
 * - UV: используем uv TubeGeometry и нормируем компоненту v по общей длине (для непрерывной коры).
 */
// Обёртка над реализацией построения трубки из internal/tube.ts
function buildTaperedTubeMesh(
  points: THREE.Vector3[],
  baseRadius: number,
  options?: { tubularSegments?: number; radialSegments?: number; taper?: (t: number) => number; collarFrac?: number; collarScale?: number; collarBulgeExtra?: number; vStart?: number; vScale?: number; uAngleOffset?: number; uRefRadius?: number; useParallelTransport?: boolean; refNormal?: [number,number,number]; capStart?: boolean; capEnd?: boolean; overrideStartRingPositions?: number[]; overrideStartRingUVs?: number[] }
): { positions: number[]; normals: number[]; indices: number[]; uvs: number[]; endPoint: [number, number, number]; endTangent: [number, number, number]; endRadius: number; endRingPositions?: number[]; endRingUVs?: number[] } {
  return buildTaperedTubeMeshImpl(points, baseRadius, options)
}

/**
 * Создаёт точки кривой ствола по высоте с лёгким боковым изгибом без «провиса» вниз.
 * Сила изгиба масштабируется параметром shearStrength (0..1) и randomness.
 */
function buildTrunkCurvePoints(
  height: number,
  shearStrength: number | undefined,
  rng: () => number,
  randomness: number | undefined,
): THREE.Vector3[] {
  // Реализация вынесена в shared-совместимый модуль internal/curves.ts
  return buildTrunkCurvePointsImpl(height, shearStrength, rng, randomness)
}

/**
 * Возвращает случайное число в диапазоне [min, max), детерминированно для сидов.
 */
function randRange(rng: () => number, min: number, max: number) {
  return min + (max - min) * rng()
}

/**
 * Нормализует угол в радианы, добавляя небольшой случайный разброс.
 */
function randomTiltRad(baseDeg: number, spread: number, rng: () => number) {
  const s = Math.max(0, Math.min(1, spread))
  const jitter = (rng() * 2 - 1) * s * 0.5 * baseDeg
  return degToRad(baseDeg + jitter)
}


/**
 * Вычисляет эйлеровы углы (в радианах) для поворота вектора оси Y (0,1,0)
 * в заданное нормализованное направление dir. Упрощённая аппроксимация через yaw/pitch.
 */
function eulerFromDir(dir: [number, number, number]): [number, number, number] { return eulerFromDirImpl(dir) }


/**
 * Нормализует 3D‑вектор. Если длина близка к нулю — возвращает ось Y.
 */
function normalize(v: [number, number, number]): [number, number, number] {
  // Делегируем нормализацию вектора в shared-утилиту vector3.normalize
  return v3normalize(v as any) as any
}

/**
 * Вычисляет минимальную дистанцию между двумя отрезками в 3D и
 * параметры u,v (0..1) ближайших точек на каждом из них.
 * Используется для оценки пересечений/слишком близких ветвей.
 */

/**
 * Быстрая оценка штрафа за «вход в ствол»: дискретно сэмплируем путь ветки
 * и сравниваем радиальное расстояние до оси Y с радиусом ствола на той высоте.
 * Если точка попадает внутрь ствола — добавляем большой штраф.
 */
// Находит ближайшую точку на полилинии (centers) и возвращает индекс сегмента и параметр t (0..1)

// Оценка штрафа входа ветви внутрь ствола по реальной осевой полилинии ствола

/**
 * Эвристика «направления наружу»: штрафует направления, идущие не радиально
 * от оси ствола (в XZ‑плоскости). Чем меньше проекция на радиальный вектор, тем больше штраф.
 */

/** Запись о размещённой ветви/сегменте для проверки коллизий. */
type PlacedSegment = { a: [number,number,number]; b: [number,number,number]; radius: number }

/**
 * Генерация примитивов простого дерева: сегментированный ствол, ветви‑цилиндры
 * с 1–2 уровнями ветвления и листьями‑сферами на концах ветвей.
 * Каждый примитив снабжается UUID, базовыми трансформациями и привязкой к
 * материалам объекта (objectMaterialUuid), которые создаются вызвавшей стороной.
 */
export function generateTree(params: TreeGeneratorParams & {
  /** UUID материала коры (будет присвоен стволу и ветвям) */
  barkMaterialUuid: string
  /** UUID материала листвы (будет присвоен листьям) */
  leafMaterialUuid: string
}): GfxPrimitive[] {
  const rng = mulberry32(params.seed)
  const {
    trunkHeight,
    trunkRadius,
    trunkSegments,
    trunkTaperFactor,
    trunkShearStrength,
    trunkBranchLevels,
    trunkBranchesPerLevel,
    trunkBranchAngleDeg,
    trunkBranchChildHeightFactor,
    branchLevels,
    branchesPerSegment,
    branchTopBias,
    branchLength,
    branchRadius,
    branchRadiusFalloff,
    branchAngleDeg,
    randomness,
    leavesPerBranch,
    leafSize,
    branchTipTaper,
    barkMaterialUuid,
    leafMaterialUuid,
  } = params

  // Отсечка по высоте для появления ветвей: все точки крепления ниже
  // этой высоты полностью исключаются из генерации веток. Нормируем
  // значение параметра на диапазон [0 .. trunkHeight]. Если не задано — 0.
  const branchCutoffY = Math.max(0, Math.min(trunkHeight, (params as any).branchHeightCutoff ?? 0))

  // Единая плотность текстуры коры (повторов на метр) для согласования UV
  const texD = Math.max(1e-6, (params as any).barkTexDensityPerMeter ?? 1)

  const primitives: GfxPrimitive[] = []
  // Реестр уже размещённых сегментов ветвей для проверки коллизий при подборе направлений
  const placed: PlacedSegment[] = []
  // ЕДИНЫЙ МЕШ для ствола и всех ветвей: аккумуляторы геометрии
  const unifiedPos: number[] = []
  const unifiedNor: number[] = []
  const unifiedUv: number[] = []
  const unifiedIdx: number[] = []
  function appendToUnified(geom: { positions: number[]; normals: number[]; uvs?: number[]; indices?: number[] }) {
    const base = Math.floor(unifiedPos.length / 3)
    unifiedPos.push(...geom.positions)
    unifiedNor.push(...geom.normals)
    if (geom.uvs) unifiedUv.push(...geom.uvs)
    const idx = geom.indices || []
    for (let i = 0; i < idx.length; i++) unifiedIdx.push(base + idx[i])
  }

  // Данные о верхнем торце ствола для последующего «бесшовного» продолжения
  // Эти значения заполняются при сборке единого меша ствола (трубки) и
  // используются после генерации обычных веток, чтобы при необходимости
  // добавить на самой верхушке ствола ветвь‑продолжение со сшивкой по кольцу.
  let trunkEndPoint: [number, number, number] | null = null
  let trunkEndTangent: [number, number, number] | null = null
  let trunkEndRadius: number | null = null
  let trunkEndRingPositions: number[] | null = null
  let trunkEndRingUVs: number[] | null = null
  // Число радиальных сегментов у ствола (нужно для совпадения топологии кольца)
  const trunkRadialSegments = 18

  // 1) Ствол(ы): один вертикальный + опциональные разветвления, с плавными стыками
  const segH = trunkHeight / Math.max(1, trunkSegments)
  const taper = trunkTaperFactor ?? 0.4
  /**
   * Функция радиуса ствола на расстоянии s [0..1] вдоль его высоты с учётом taper.
   */
  const radiusAt01 = (rBase: number, s01: number) => trunkRadiusAt01(rBase, s01, taper)

  /**
   * Генерирует цепочку сегментов ствола вдоль произвольного направления axis.
   * Добавляет примитивы в общий список, регистрирует сегменты в placed для коллизий,
   * а также возвращает массив точек крепления ветвей (верхние грани сегментов).
   *
   * Поддерживает параметр «скоса» сегментов ствола: при ненулевой силе скоса
   * каждый сегмент получает собственное случайное боковое отклонение (азимут),
   * а ось сегмента наклоняется относительно базовой оси на угол, пропорциональный
   * силе скоса. Стыковка между соседними сегментами выполняется без зазоров за
   * счёт:
   * - согласования верхнего радиуса предыдущего сегмента с нижним радиусом текущего,
   * - небольшого перекрытия (embed) вниз и «воротника» у основания.
   */
  function generateTrunkChain(options: {
    basePoint: [number, number, number]
    axis: [number, number, number]
    totalHeight: number
    segments: number
    baseRadius: number
    namePrefix: string
    emitPrimitives?: boolean
    collectPath?: boolean
    /** Доп. заглубление первого сегмента вниз (для бесшовного стыка к родителю) */
    rootEmbedDepth?: number
    /** Включить «воротник» у самого первого сегмента (для плавного перехода в родителя) */
    baseCollarFrac?: number
    baseCollarScale?: number
  }): { attachments: { point: [number,number,number]; axis: [number,number,number]; radius: number }[], endPoint: [number,number,number], endRadius: number, path?: { centers: [number,number,number][], radii: number[], tangents: [number,number,number][] } } {
    const attachments: { point: [number,number,number]; axis: [number,number,number]; radius: number }[] = []
    const aBase = normalize(options.axis)
    const segHLocal = options.totalHeight / Math.max(1, options.segments)
    // Предварительно вычислим ортонормированный базис вокруг базовой оси aBase
    const tmp: [number, number, number] = Math.abs(aBase[1]) < 0.99 ? [0,1,0] : [1,0,0]
    const b1v = new THREE.Vector3().crossVectors(new THREE.Vector3(...aBase), new THREE.Vector3(...tmp)).normalize()
    const b2v = new THREE.Vector3().crossVectors(new THREE.Vector3(...aBase), b1v).normalize()
    const b1: [number, number, number] = [b1v.x, b1v.y, b1v.z]
    const b2: [number, number, number] = [b2v.x, b2v.y, b2v.z]

    // Точка низа текущего сегмента (для первого — basePoint), далее — верх предыдущего
    let segA: [number, number, number] = [options.basePoint[0], options.basePoint[1], options.basePoint[2]]
    const centers: [number,number,number][] = []
    const radii: number[] = []
    const tangents: [number,number,number][] = []
    // Добавляем начальное кольцо
    centers.push([segA[0], segA[1], segA[2]])
    radii.push(radiusAt01(options.baseRadius, 0))
    tangents.push(aBase)
    // Итоговая сила скоса и максимальный угол наклона сегмента (в рад)
    const shear01 = Math.max(0, Math.min(1, trunkShearStrength ?? 0))
    const maxTiltRad = degToRad(35) * shear01

    let prevAxis: [number, number, number] | null = null
    for (let i = 0; i < options.segments; i++) {
      const sBottom = i / Math.max(1, options.segments)
      const sTop = (i + 1) / Math.max(1, options.segments)
      const rBottomRaw = radiusAt01(options.baseRadius, sBottom)
      const rTopRaw = radiusAt01(options.baseRadius, sTop)

      // Стыки: нижний радиус текущего = верхний предыдущего
      const prevTop = i > 0 ? radiusAt01(options.baseRadius, sBottom) : rBottomRaw
      const rBottom = i > 0 ? prevTop : rBottomRaw
      const rTop = rTopRaw

      // Перекрытие вниз
      const trunkEmbedFactorLocal = params.embedFactor ?? 0.6

      // Вычисляем ось текущего сегмента с учётом «скоса»
      // При нулевом скосе остаётся базовая ось, при максимальном — сильный наклон в случайном азимуте
      let segAxis: [number, number, number]
      if (maxTiltRad > 1e-6) {
        const theta = randRange(rng, 0, Math.PI * 2)
        // Лёгкая вариация величины наклона (чтобы не были все одинаковые по силе)
        const alpha = Math.max(0, Math.min(Math.PI / 2 - 0.05, maxTiltRad * (0.8 + 0.4 * rng())))
        const s = Math.sin(alpha), c = Math.cos(alpha)
        const ortho: [number, number, number] = [
          b1[0] * Math.cos(theta) + b2[0] * Math.sin(theta),
          b1[1] * Math.cos(theta) + b2[1] * Math.sin(theta),
          b1[2] * Math.cos(theta) + b2[2] * Math.sin(theta),
        ]
        segAxis = normalize([
          aBase[0] * c + ortho[0] * s,
          aBase[1] * c + ortho[1] * s,
          aBase[2] * c + ortho[2] * s,
        ])
      } else {
        segAxis = aBase
      }

      // Верх текущего сегмента (видимая часть) — на длину segHLocal вдоль оси сегмента
      const segB: [number, number, number] = [
        segA[0] + segAxis[0] * segHLocal,
        segA[1] + segAxis[1] * segHLocal,
        segA[2] + segAxis[2] * segHLocal,
      ]

      // Минимально необходимое перекрытие для скрытия круглой грани при наклоне
      let embedExtra = 0
      if (i > 0 && prevAxis) {
        const dot = Math.max(-1, Math.min(1, segAxis[0]*prevAxis[0] + segAxis[1]*prevAxis[1] + segAxis[2]*prevAxis[2]))
        const ang = Math.acos(Math.abs(dot)) // 0..pi/2
        // Чем больше угол между сегментами, тем больше перекрытие требуется
        const ang01 = Math.min(1, ang / (Math.PI * 0.5))
        // 0.05..0.35 радиусов: достаточно, чтобы край диска не выглядывал
        embedExtra = Math.max(0.0, rBottom * (0.05 + 0.30 * ang01))
      }
      let embedBottom = 0
      if (i > 0) {
        const baseEmbed = Math.max(0.0, Math.min(1.0, trunkEmbedFactorLocal)) * Math.min(rBottom, prevTop)
        embedBottom = Math.max(baseEmbed, embedExtra)
      } else if (options.rootEmbedDepth && options.rootEmbedDepth > 0) {
        embedBottom = options.rootEmbedDepth
      }

      const height = segHLocal + embedBottom
      // Центр сегмента: середина видимой части минус половина перекрытия вдоль оси сегмента
      const center: [number, number, number] = [
        (segA[0] + segB[0]) * 0.5 - segAxis[0] * (embedBottom * 0.5),
        (segA[1] + segB[1]) * 0.5 - segAxis[1] * (embedBottom * 0.5),
        (segA[2] + segB[2]) * 0.5 - segAxis[2] * (embedBottom * 0.5),
      ]
      const rotation = eulerFromDir(segAxis)

      // «Воротник» у стыка: расширяем основание текущего сегмента, чтобы накрыть крышку предыдущего
      const collarFrac = i > 0 ? 0.25 : (options.baseCollarFrac ?? 0.0)
      // Немного «перекрываем» по радиусу, чтобы гарантированно накрыть верх предыдущего сегмента даже при сильном наклоне
      let collarScale = (i === 0 && (options.baseCollarFrac ?? 0) > 0) ? Math.max(1.0, options.baseCollarScale ?? 1.1) : 1.0
      if (i > 0 && rBottom > 0) {
        const baseScale = Math.max(1.0, prevTop / rBottom)
        // Усиливаем с ростом угла между сегментами
        if (prevAxis) {
          const dot = Math.max(-1, Math.min(1, segAxis[0]*prevAxis[0] + segAxis[1]*prevAxis[1] + segAxis[2]*prevAxis[2]))
          const ang = Math.acos(Math.abs(dot))
          const ang01 = Math.min(1, ang / (Math.PI * 0.5))
          collarScale = baseScale * (1.02 + 0.20 * ang01)
        } else {
          collarScale = baseScale * 1.02
        }
        // Ограничим сверху, чтобы не было перетяжек
        collarScale = Math.min(collarScale, 1.8)
      }

      if (options.emitPrimitives !== false) primitives.push({
        uuid: generateUUID(),
        type: 'trunk',
        name: `${options.namePrefix} ${i + 1}`,
        geometry: {
          radiusTop: Math.max(0.02, rTop),
          radiusBottom: Math.max(0.02, rBottom),
          height,
          radialSegments: 10,
          collarFrac: collarFrac || undefined,
          collarScale: collarFrac > 0 ? collarScale : undefined,
          capBottom: i === 0, // нижняя крышка только у самого первого сегмента
          capTop: i === options.segments - 1, // верхняя крышка только у самого верхнего
        },
        objectMaterialUuid: barkMaterialUuid,
        visible: true,
        transform: {
          position: center,
          rotation,
          scale: [1, 1, 1],
        },
      })

      // Регистрируем сегмент как препятствие (для избегания пересечений веток)
      placed.push({ a: segA, b: segB, radius: Math.max(rBottom, rTop) })

      // Точка крепления ветви: верхняя грань сегмента
      attachments.push({ point: segB, axis: segAxis, radius: Math.max(0.02, rTop) })

      // Переходим к следующему сегменту: его низ — наша текущая вершина
      prevAxis = segAxis
      segA = segB
      // Заполняем путь для сборки единого меша
      centers.push([segA[0], segA[1], segA[2]])
      radii.push(rTop)
      tangents.push(segAxis)
    }
    // Конечная точка цепочки — вершина последнего сегмента
    const endPoint: [number,number,number] = segA
    const endRadius = radiusAt01(options.baseRadius, 1)
    const path = options.collectPath ? { centers, radii, tangents } : undefined
    return { attachments, endPoint, endRadius, path }
  }

  // Генерируем основной вертикальный ствол
  // Для основного ствола собираем только путь без отдельных цилиндров — ниже соберём единый меш
  const mainTrunk = generateTrunkChain({
    basePoint: [0,0,0],
    axis: [0,1,0],
    totalHeight: trunkHeight,
    segments: trunkSegments,
    baseRadius: trunkRadius,
    namePrefix: 'Ствол',
    emitPrimitives: false,
    collectPath: true,
  })

  // Опционально: разветвления ствола (1..N уровней)
  const tbLevels = Math.max(0, Math.round(trunkBranchLevels ?? 0))
  const tbPerLevel = Math.max(1, Math.round(trunkBranchesPerLevel ?? 2))
  const tbAngle = degToRad(trunkBranchAngleDeg ?? 20)
  const tbHeightFactor = Math.max(0.3, Math.min(0.95, trunkBranchChildHeightFactor ?? 0.7))

  // Список всех точек крепления веток (по всем стволам)
  const trunkAttachments: { point: [number,number,number]; axis: [number,number,number]; radius: number }[] = []

  // Сборка единого меша ствола: та же трубка по кривой, что и для ветвей
  {
    const curvePts = buildTrunkCurvePoints(trunkHeight, trunkShearStrength, rng, randomness)
    const taper = Math.max(0, Math.min(0.95, trunkTaperFactor ?? 0.4))
    const tube = buildTaperedTubeMesh(curvePts, trunkRadius, {
      tubularSegments: Math.max(12, trunkSegments * 4),
      radialSegments: trunkRadialSegments,
      taper: linearTaper(taper),
      collarFrac: 0,
      collarScale: 1,
      // Единая плотность по UV: repeats = длина(м) * texD
      vStart: 0,
      vScale: trunkHeight * texD,
      // U: классическая угловая развёртка без метрического пересчёта — стабильна по окружности
      // Зафиксируем начальную ориентацию U=0 для ствола вдоль мировой оси X
      refNormal: [1, 0, 0],
    })
    appendToUnified({ positions: tube.positions, normals: tube.normals, indices: tube.indices, uvs: tube.uvs })

    // Сохраняем данные верхнего торца ствола для бесшовного продолжения
    trunkEndPoint = tube.endPoint
    trunkEndTangent = tube.endTangent
    trunkEndRadius = tube.endRadius
    trunkEndRingPositions = tube.endRingPositions
    trunkEndRingUVs = tube.endRingUVs

    // Синхронизация точек крепления веток с новой кривой ствола:
    // берём вершины сегментов (верх каждой из trunkSegments частей) и используем
    // локальную касательную и радиус ствола на этой высоте
    const curve = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.5)
    const segs = Math.max(1, trunkSegments)
    for (let i = 0; i < segs; i++) {
      const t = (i + 1) / segs
      const p = curve.getPoint(t)
      const tan = curve.getTangent(t).normalize()
      const r = Math.max(0.02, radiusAt01(trunkRadius, t))
      trunkAttachments.push({
        point: [p.x, p.y, p.z],
        axis: [tan.x, tan.y, tan.z],
        radius: r,
      })
    }
  }

  type TrunkNode = { base: [number,number,number]; axis: [number,number,number]; height: number; radius: number; segments: number; endPoint: [number,number,number]; endAxis: [number,number,number] }
  const mainEndAxis: [number,number,number] = mainTrunk.path ? normalize(mainTrunk.path.tangents[mainTrunk.path.tangents.length - 1]) : [0,1,0]
  let currentLevel: TrunkNode[] = [{ base: [0,0,0], axis: [0,1,0], height: trunkHeight, radius: trunkRadius, segments: trunkSegments, endPoint: mainTrunk.endPoint, endAxis: mainEndAxis }]
  for (let lvl = 0; lvl < tbLevels; lvl++) {
    const nextLevel: TrunkNode[] = []
    for (const node of currentLevel) {
      // Стартовать ответвления с ВЕРШИНЫ данного ствола (по фактической траектории)
      const startPoint: [number,number,number] = node.endPoint
      // Локальный ортонормированный базис вокруг КАСАТЕЛЬНОЙ в вершине
      const a = normalize(node.endAxis)
      const tmp: [number, number, number] = Math.abs(a[1]) < 0.99 ? [0,1,0] : [1,0,0]
      const b1v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), new THREE.Vector3(...tmp)).normalize()
      const b2v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), b1v).normalize()
      const b1: [number, number, number] = [b1v.x, b1v.y, b1v.z]
      const b2: [number, number, number] = [b2v.x, b2v.y, b2v.z]

      // Случайная фаза распределения по азимуту и лёгкий джиттер между ответвлениями
      const phase = randRange(rng, 0, Math.PI * 2)
      for (let k = 0; k < tbPerLevel; k++) {
        const step = (2 * Math.PI) / tbPerLevel
        const jitter = step * 0.25 * (rng() * 2 - 1) * Math.min(1, Math.max(0, randomness))
        const theta = phase + step * k + jitter
        // Наклон дочернего ствола: базовый угол с вариацией ±30% * randomness
        const alphaVar = 1 + 0.3 * (rng() * 2 - 1) * Math.min(1, Math.max(0, randomness))
        const alpha = Math.max(0, Math.min(Math.PI / 2 - 0.05, tbAngle * alphaVar))
        const s = Math.sin(alpha)
        const c = Math.cos(alpha)
        const ortho: [number, number, number] = [
          b1[0] * Math.cos(theta) + b2[0] * Math.sin(theta),
          b1[1] * Math.cos(theta) + b2[1] * Math.sin(theta),
          b1[2] * Math.cos(theta) + b2[2] * Math.sin(theta),
        ]
        const childAxis: [number,number,number] = normalize([
          a[0] * c + ortho[0] * s,
          a[1] * c + ortho[1] * s,
          a[2] * c + ortho[2] * s,
        ])
        // Высота дочернего ствола с вариацией ±25% * randomness
        const hVar = 1 + 0.25 * (rng() * 2 - 1) * Math.min(1, Math.max(0, randomness))
        const childHeightRaw = node.height * tbHeightFactor * hVar
        const childHeight = Math.max(node.height * 0.3, Math.min(node.height, childHeightRaw))
        // Базовый радиус дочернего ствола должен соответствовать верхнему радиусу родителя,
        // чтобы в месте разветвления не было утолщения/ступеньки при сильном сужении taper.
        const parentEndRadius = radiusAt01(node.radius, 1)
        const childRadius = Math.max(0.02, parentEndRadius)
        // Лёгкая вариация числа сегментов дочернего ствола (±1)
        const baseSegs = Math.round(node.segments * tbHeightFactor)
        const segJitter = (rng() < 0.5 ? -1 : 1)
        const childSegs = Math.max(2, baseSegs + (rng() < Math.min(1, Math.max(0, randomness)) ? segJitter : 0))
        const child = generateTrunkChain({
          basePoint: startPoint,
          axis: childAxis,
          totalHeight: childHeight,
          segments: childSegs,
          baseRadius: childRadius,
          namePrefix: `Ствол L${lvl+1}`,
          collectPath: true,
          // Лёгкое заглубление первого сегмента + воротник на базе для бесшовного перехода
          rootEmbedDepth: Math.min(childRadius * 0.35, segH * 0.6),
          baseCollarFrac: 0.22,
          baseCollarScale: 1.25,
        })
        trunkAttachments.push(...child.attachments)
        const childEndAxis: [number,number,number] = child.path ? normalize(child.path.tangents[child.path.tangents.length - 1]) : childAxis
        nextLevel.push({ base: startPoint, axis: childAxis, height: childHeight, radius: childRadius, segments: childSegs, endPoint: child.endPoint, endAxis: childEndAxis })
      }
    }
    currentLevel = nextLevel
  }

  // Функция генерации ветвей рекурсивно
  type BranchArgs = {
    basePoint: [number, number, number]
    level: number
    /** Ось родительского цилиндра, для прижатия к его поверхности */
    parentAxis: [number, number, number]
    /** Радиус родительского цилиндра в точке присоединения */
    parentRadius: number
    /** Точный радиус родителя на конце (для ветки‑продолжения) */
    parentEndRadius?: number
    dirHintAzimuth?: number // предпочтительное направление по азимуту, радианы
    /** Сегмент‑родитель (для игнорирования коллизий у самой базы) */
    parentSeg?: PlacedSegment
    /** Масштаб локального количества ветвей (для биаса к верху) */
    countScale?: number
    /** Присоединение к КОНЦУ родителя: требует дополнительного осевого заглубления */
    attachToParentTip?: boolean
    /** Если задано — родительская кривая (Catmull-Rom) и параметры для вычисления локального радиуса вдоль неё */
    parentCurvePts?: THREE.Vector3[]
    parentBaseRadius?: number
    parentCollarScale?: number
    parentTipTaper?: number
    /** Доля, которую избегаем от базы родителя (0..0.8) */
    avoidBaseFrac?: number
    /** Биас к концу родителя (0..1) при выборе точки крепления */
    tipBias?: number
    /** Жёстный максимум дочерних ветвей из данного узла (для верхушки ствола). */
    maxCountOverride?: number
  }

  const genBranches = ({ basePoint, level, parentAxis, parentRadius, parentEndRadius, dirHintAzimuth, parentSeg, countScale, attachToParentTip, parentCurvePts, parentBaseRadius, parentCollarScale, parentTipTaper, avoidBaseFrac, tipBias, parentEndRingPositions, parentEndRingUVs, parentRadialSegments, maxCountOverride }: BranchArgs) => {
    if (level > branchLevels) return

    const scale = countScale == null ? 1 : Math.max(0, countScale)
    const baseCount = branchesPerSegment * scale
    const jitter = Math.max(0, Math.min(1, params.branchCountJitter ?? 0))
    const expected = baseCount
    const delta = Math.round(expected * jitter * ((rng() * 2) - 1))
    let count = Math.max(0, Math.round(expected) + delta)
    if (maxCountOverride != null) {
      count = Math.min(count, Math.max(0, Math.floor(maxCountOverride)))
    } else {
      // Автокап для верхушки основного ствола: максимум одна «штатная» ветвь
      if (level === 1 && trunkEndPoint && trunkEndRadius && (!parentCurvePts || parentCurvePts.length === 0)) {
        const dApex = Math.hypot(
          basePoint[0] - trunkEndPoint[0],
          basePoint[1] - trunkEndPoint[1],
          basePoint[2] - trunkEndPoint[2],
        )
        if (dApex <= Math.max(0.02, trunkEndRadius * 0.6)) count = 0
      }
    }
    // Чтобы ветки одного узла не «смотрели» все в одну сторону,
    // вводим штраф за схожесть азимута относительно оси родителя.
    const siblingOrthoDirs: THREE.Vector3[] = []
    // Локальный список баз дочерних ветвей для пост‑анализа (необходим для добавления «продолжения»)
    const childBases: [number,number,number][] = []
    for (let i = 0; i < count; i++) {
      // Подбор направления с учётом коллизий (см. цикл maxAttempts ниже)
      // Выбор лучшего направления из нескольких попыток (минимум пересечений)
      const maxAttempts = 12
      let best: null | {
        nDir: [number,number,number]
        baseInside: [number,number,number]
        embedDepth: number
        height: number
        center: [number,number,number]
        rotation: [number,number,number]
        len: number
        rad: number
        endPoint: [number,number,number]
        score: number
        perpOrtho: [number,number,number]
      } = null

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Локальные параметры крепления: по умолчанию — как пришло в аргументах
        let basePointLoc = basePoint
        let parentAxisN = normalize(parentAxis)
        let parentRadiusLoc = parentRadius
        let attachToTip = !!attachToParentTip
        // Если есть кривая родителя — выбираем якорь случайно вдоль неё (с биасом к концу и избеганием базы)
        if (parentCurvePts && parentCurvePts.length >= 2 && parentBaseRadius && parentTipTaper != null) {
          const curve = new THREE.CatmullRomCurve3(parentCurvePts, false, 'catmullrom', 0.5)
          const tipB = Math.max(0, Math.min(1, tipBias ?? (params.branchChildTipBias ?? 0.5)))
          const minT = Math.max(0, Math.min(0.8, avoidBaseFrac ?? 0.1))
          const powK = 1 + 4 * tipB
          const u = rng()
          const tAttach = minT + (1 - minT) * (1 - Math.pow(1 - u, powK))
          const anchor = curve.getPoint(tAttach)
          const tangent = curve.getTangent(tAttach).normalize()
          basePointLoc = [anchor.x, anchor.y, anchor.z]
          parentAxisN = [tangent.x, tangent.y, tangent.z]
          const collarFracLocal = Math.max(0, Math.min(0.6, params.branchCollarFrac ?? 0.22))
          const collarK = tAttach < collarFracLocal && parentCollarScale ? (parentCollarScale * (1 - tAttach / collarFracLocal) + 1 * (tAttach / collarFracLocal)) : 1
          parentRadiusLoc = Math.max(0.005, parentBaseRadius * (1 - Math.max(0, Math.min(0.95, parentTipTaper)) * tAttach) * collarK)
          attachToTip = tAttach > 0.98
        }
        // Отсечка веток по высоте: пропускаем попытку, если точка крепления
        // ниже установленной высоты отсечки. Это полностью блокирует появление
        // ветвей до заданной высоты на любом уровне и для любых родителей.
        if (basePointLoc[1] < branchCutoffY) {
          continue
        }
        const a = normalize(parentAxisN)
        const tmp: [number, number, number] = Math.abs(a[1]) < 0.99 ? [0,1,0] : [1,0,0]
        const b1v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), new THREE.Vector3(...tmp)).normalize()
        const b2v = new THREE.Vector3().crossVectors(new THREE.Vector3(...a), b1v).normalize()
        const b1: [number, number, number] = [b1v.x, b1v.y, b1v.z]
        const b2: [number, number, number] = [b2v.x, b2v.y, b2v.z]

        const baseAngleDeg = (level === 1)
          ? (params.branchAngleDegFirst ?? branchAngleDeg)
          : (params.branchAngleDegNext ?? branchAngleDeg)
        const alpha = randomTiltRad(baseAngleDeg, params.angleSpread ?? 1, rng)
        const theta = randRange(rng, 0, Math.PI * 2)
        const s = Math.sin(alpha)
        const c = Math.cos(alpha)
        const ortho: [number, number, number] = [
          b1[0] * Math.cos(theta) + b2[0] * Math.sin(theta),
          b1[1] * Math.cos(theta) + b2[1] * Math.sin(theta),
          b1[2] * Math.cos(theta) + b2[2] * Math.sin(theta),
        ]
        const dir: [number, number, number] = normalize([
          a[0] * c + ortho[0] * s,
          a[1] * c + ortho[1] * s,
          a[2] * c + ortho[2] * s,
        ])
        const nDir = normalize(dir)

        const dot = nDir[0]*parentAxisN[0] + nDir[1]*parentAxisN[1] + nDir[2]*parentAxisN[2]
        let perp: [number, number, number] = [
          nDir[0] - dot * parentAxisN[0],
          nDir[1] - dot * parentAxisN[1],
          nDir[2] - dot * parentAxisN[2],
        ]
        const perpLen = Math.hypot(perp[0], perp[1], perp[2])
        if (perpLen < 1e-6) {
          const tmp = Math.abs(parentAxisN[1]) < 0.99 ? [0,1,0] as [number,number,number] : [1,0,0] as [number,number,number]
          const cross = new THREE.Vector3().crossVectors(new THREE.Vector3(...parentAxisN), new THREE.Vector3(...tmp)).normalize()
          perp = [cross.x, cross.y, cross.z]
        } else {
          perp = [perp[0]/perpLen, perp[1]/perpLen, perp[2]/perpLen]
        }
        const j = Math.max(0, Math.min(1, params.branchLengthJitter ?? randomness))
        const len = branchLength * Math.pow(0.75, level - 1) * (1 - 0.3 * j + 0.6 * j * rng())
        const falloff = Math.max(0.4, Math.min(0.95, params.branchRadiusFalloff ?? 0.7))
        const radBase = Math.max(0.01, branchRadius * Math.pow(falloff, level - 1))
        // Радиус у основания дочерней ветви не должен превышать радиус родителя в точке сочленения
        const parentLimit = Math.max(0.005, parentRadiusLoc - Math.max(0.002, parentRadiusLoc * 0.02))
        const rad = Math.max(0.005, Math.min(radBase, parentLimit))
        // Толщина воротника у основания не должна превышать радиус родителя: r0 <= parentRadius - margin
        const margin = Math.max(0.002, parentRadiusLoc * 0.02)
        const r0 = Math.min(rad * 1.15, Math.max(0.005, parentRadiusLoc - margin))
        // Допускаем уменьшение основания (collarScale < 1), если родитель тоньше
        const collarScaleLocal = Math.max(0.2, Math.min(1.8, r0 / Math.max(1e-3, rad)))
        // Радиальное заглубление центра базы внутрь родителя так, чтобы круглая грань воротника была внутри
        const epsInside = Math.max(0.001, parentRadius * 0.02)
        const depthRadial = attachToParentTip ? 0 : Math.max(0, parentRadius - (epsInside + r0))
        const axialEmbed = attachToParentTip ? r0 : 0
        const baseInside: [number, number, number] = [
          basePointLoc[0] + perp[0] * depthRadial - parentAxisN[0] * axialEmbed,
          basePointLoc[1] + perp[1] * depthRadial - parentAxisN[1] * axialEmbed,
          basePointLoc[2] + perp[2] * depthRadial - parentAxisN[2] * axialEmbed,
        ]
        const endPoint: [number, number, number] = [
          baseInside[0] + nDir[0] * len,
          baseInside[1] + nDir[1] * len,
          baseInside[2] + nDir[2] * len,
        ]

        let score = 0
        // В штрафе за вхождение в ствол пропускаем начальный участок, соответствующий заглублению: сдвигаем старт вперёд
        const shift = Math.max(axialEmbed, Math.min(len * 0.25, r0 * 1.2))
        const baseForPenalty: [number, number, number] = [
          baseInside[0] + nDir[0] * shift,
          baseInside[1] + nDir[1] * shift,
          baseInside[2] + nDir[2] * shift,
        ]
        // Используем реализацию штрафа «входа в ствол» из internal/collisions
        score += trunkPathPenaltyImpl(mainTrunk.path ?? null as any, trunkHeight, trunkRadius, baseForPenalty, nDir, Math.max(0.01, len - shift), rad)
        for (const seg of placed) {
          if (parentSeg && seg === parentSeg) continue
          const { dist, u, v } = segmentDistanceImpl(baseInside, endPoint, seg.a, seg.b)
          const nearBase = u < 0.08 && v < 0.08
          if (nearBase) continue
          const clearance = dist - (rad + seg.radius)
          if (clearance < 0) score += (-clearance) * 500
          else score += Math.max(0, 0.05 - clearance) * 50
        }
        score += outwardPenaltyImpl(baseInside, nDir, mainTrunk.path ? { centers: mainTrunk.path.centers } as any : undefined) * 5
        // Стремление вверх: штрафуем направления с малой/отрицательной Y‑составляющей
        const upBias = Math.max(0, Math.min(1, params.branchUpBias ?? 0))
        if (upBias > 0) {
          const upY = nDir[1]
          let upPenalty = 0
          if (upY < 0) upPenalty += (-upY) * 400 * upBias // сильный штраф за «вниз»
          upPenalty += (1 - Math.max(0, upY)) * 30 * upBias // мягкий штраф за недостаточную «вверх»
          score += upPenalty
        }

        // Штраф за схожесть с уже выбранными ветками данного узла: раздвигаем по азимуту
        if (siblingOrthoDirs.length > 0) {
          const cand = new THREE.Vector3(perp[0], perp[1], perp[2])
          let simPenalty = 0
          for (const v of siblingOrthoDirs) {
            const d = Math.max(-1, Math.min(1, v.dot(cand))) // косинус между ортонормальными направлениями (вокруг оси)
            const closeness = (d + 1) * 0.5 // 0..1
            // усиливаем штраф при близости, мягко при отдалении
            simPenalty += Math.pow(closeness, 4) * 40
          }
          score += simPenalty
        }

        if (!best || score < best.score) best = { nDir, baseInside, len, rad, endPoint, score, perpOrtho: perp, collarScale: collarScaleLocal }
      }

      if (!best) continue
      const { nDir, baseInside, len, rad, endPoint, perpOrtho, collarScale } = best

      // Генерируем изогнутую трубку по кривой (Catmull-Rom) с лёгким сужением к концу
      // 1) Кривая
      const curvePts = buildBranchCurvePoints(baseInside, nDir, len, rng, params.branchBendBase, params.branchBendJitter)
      // 2) Сборка трубки из 2–3 секций с убывающим радиусом
      // Параметры воротника для бесшовного стыка с родителем
      const tipTaper = Math.max(0, Math.min(0.95, branchTipTaper ?? 0.35))
      // Параметры воротника применяем ТОЛЬКО для сочленения со стволом (когда parentCurvePts отсутствует)
      const isTrunkParent = !parentCurvePts
      const collarBulge = isTrunkParent ? Math.max(0, Math.min(1, params.branchCollarSize ?? 0.6)) : 0
      const collarFrac = isTrunkParent ? Math.max(0, Math.min(0.6, params.branchCollarFrac ?? 0.22)) : 0
      // Ограничиваем стартовое расширение воротника с учётом ТЕКУЩЕГО радиуса ствола на высоте:
      // rad * startScale <= (parentRadius - margin). С учётом дополнительного усиления bulge.
      let collarScaleUse = 1
      if (isTrunkParent) {
        const margin = Math.max(0.002, parentRadius * 0.02)
        const maxStartScale = Math.max(0.2, (parentRadius - margin) / Math.max(1e-3, rad))
        const bulgeFactor = (1 + 0.5 * collarBulge)
        const allowedScale = maxStartScale / Math.max(1e-3, bulgeFactor)
        collarScaleUse = Math.min(collarScale, allowedScale)
        if (!isFinite(collarScaleUse) || collarScaleUse <= 0) collarScaleUse = 1
      } else {
        collarScaleUse = 1
      }
      // Начальная нормаль для параллельного транспорта: радиальное направление в точке крепления
      const refNormalVec = new THREE.Vector3(perpOrtho[0], perpOrtho[1], perpOrtho[2]).normalize()
      const tube = buildTaperedTubeMesh(curvePts, rad, {
        tubularSegments: 20,
        radialSegments: 10,
        collarFrac,
        collarScale: collarScaleUse,
        collarBulgeExtra: collarBulge,
        taper: linearTaper(tipTaper),
        // Согласование UV по V с местом крепления на стволе
        vStart: isTrunkParent && mainTrunk.path ? (() => { const q = nearestOnCenterlineImpl(mainTrunk.path.centers, baseInside); const total = Math.max(1, mainTrunk.path.centers.length - 1); return Math.max(0, Math.min(1, (q.seg + q.t) / total)) })() : 0,
        // Единая плотность по V: repeats = len * texD, но минимум 1 повтор
        vScale: Math.max(1, len * texD),
        // Переиспользуем кольцо вершин и UV последнего сегмента ствола для бесшовного стыка
        // фиксируем начальную нормаль для стабильных UV
        refNormal: [refNormalVec.x, refNormalVec.y, refNormalVec.z],
      })
      appendToUnified({ positions: tube.positions, normals: tube.normals, indices: tube.indices, uvs: tube.uvs })

      // Добавляем геометрию ветви в единый меш

      const curvedEnd: [number, number, number] = tube.endPoint
      const currentSeg: PlacedSegment = { a: baseInside, b: curvedEnd, radius: rad }
      placed.push(currentSeg)
      // Добавляем выбранное ортонормальное направление для штрафа схожести следующих веток
      siblingOrthoDirs.push(new THREE.Vector3(perpOrtho[0], perpOrtho[1], perpOrtho[2]))
      // Регистрируем базу дочерней ветви
      childBases.push(baseInside)

      // Если достигли максимального уровня — создаём листья согласно схеме размещения
      if (level === branchLevels) {
        const placement = params.leafPlacement || 'end'
        if (placement === 'along') {
          const density = Math.max(0.5, params.leavesPerMeter ?? 6)
          const countAlong = Math.max(1, Math.round(density * len))
          // Распределяем листья вдоль последней части ветви (например, 30%..100%)
          const tStart = 0.3
          // Кривая текущей ветви для получения локальных точек/касательных и корректного учёта сужения радиуса
          const curve = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.5)
          // Флаг: есть ли уже листик у самого кончика (t ~ 1)
          let tipLeafPlaced = false
          for (let j = 0; j < countAlong; j++) {
            const tj = tStart + (1 - tStart) * ((j + rng() * 0.3) / countAlong)
            const tj01 = Math.min(1, Math.max(0, tj))
            // Точка на оси ветви
            const p = curve.getPoint(tj01)
            const axisPoint: [number, number, number] = [p.x, p.y, p.z]
            // Радиальное направление и смещение РОВНО на поверхность ветки с учётом локального радиуса (сужения)
            // Вместо глобальной оси ветви берём локальную касательную на кривой, чтобы ориентация соответствовала геометрии
            let tVec = curve.getTangent(tj01).normalize()
            // Принудительное направление касательной к ТОЧКЕ РОСТА (к концу ветки):
            // если касательная смотрит в сторону начала (обратна вектору на конец), инвертируем знак.
            const endP = curve.getPoint(1)
            const toEnd = new THREE.Vector3(endP.x - p.x, endP.y - p.y, endP.z - p.z)
            if (tVec.dot(toEnd) < 0) tVec = tVec.multiplyScalar(-1)
            const axisN = [tVec.x, tVec.y, tVec.z] as [number, number, number]
            const radial = randomRadialDirection(axisN, rng)
            // Локальный радиус ветви с учётом taper: r(t) = rad * (1 - tipTaper * t)
            const localRadius = Math.max(0.003, rad * (1 - tipTaper * tj01))
            const eps = Math.max(0.003, localRadius * 0.08)
            const radialDist = localRadius + eps
            const pos: [number, number, number] = [
              axisPoint[0] + radial.x * radialDist,
              axisPoint[1] + radial.y * radialDist,
              axisPoint[2] + radial.z * radialDist,
            ]
            // Небольшой тангенциальный джиттер вдоль касательного направления, чтобы избежать строгого кольца
            const tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(...axisN), radial).normalize()
            const tShift = (rng() - 0.5) * Math.min(rad * 0.3, 0.02 * len)
            pos[0] += tangent.x * tShift
            pos[1] += tangent.y * tShift
            pos[2] += tangent.z * tShift

            // Готовим ориентацию/смещение для листа
            const isTexture = (params.leafShape || 'billboard') === 'texture'
            let leafEuler: [number, number, number]
            // Радиус текущего листа (детерминированный для разброса) — используем и для сдвига центра
            const leafRadius = Math.max(0.01, leafSize * (0.7 + 0.6 * rng()))
            // Единообразно считаем ориентацию листа
            leafEuler = computeLeafEuler(axisN, radial, params as any, rng, nDir)

            // Выбор спрайта: один указанный или случайный из списка
            const texName: string | undefined = selectLeafSprite(params as any, rng)
            primitives.push({
              uuid: generateUUID(),
              type: 'leaf',
              name: 'Лист',
              geometry: { radius: leafRadius, shape: params.leafShape || 'billboard', texSpriteName: texName as any },
              objectMaterialUuid: leafMaterialUuid,
              visible: true,
              transform: {
                position: pos,
                rotation: leafEuler,
                scale: [1, 1, 1],
              },
            })
            if (tj01 >= 0.98) tipLeafPlaced = true
          }
          // Гарантируем хотя бы один листик на самом кончике ветви
          if (!tipLeafPlaced) {
            let axisN = normalize(tube.endTangent as any)
            const radial = randomRadialDirection(axisN, rng)
            // Инвертируем ось, если она направлена в начало ветви
            const lastIdx = Math.max(1, curvePts.length - 1)
            const prevEnd = curvePts[lastIdx - 1]
            const toEnd2 = new THREE.Vector3(curvedEnd[0] - prevEnd.x, curvedEnd[1] - prevEnd.y, curvedEnd[2] - prevEnd.z)
            const axisVecCheck = new THREE.Vector3(...axisN)
            if (axisVecCheck.dot(toEnd2) < 0) {
              axisN = [-axisN[0], -axisN[1], -axisN[2]]
            }
            const endRadius = Math.max(0.003, tube.endRadius)
            const eps = Math.max(0.003, endRadius * 0.08)
            const radialDist = endRadius + eps
            const pos: [number, number, number] = [
              curvedEnd[0] + radial.x * radialDist,
              curvedEnd[1] + radial.y * radialDist,
              curvedEnd[2] + radial.z * radialDist,
            ]
            const isTexture = (params.leafShape || 'billboard') === 'texture'
            let leafEuler: [number, number, number]
            const leafRadius = Math.max(0.01, leafSize * (0.7 + 0.6 * rng()))
            leafEuler = computeLeafEuler(axisN, radial, params as any, rng, nDir)
            const texName2: string | undefined = selectLeafSprite(params as any, rng)
            primitives.push({
              uuid: generateUUID(),
              type: 'leaf',
              name: 'Лист',
              geometry: { radius: leafRadius, shape: params.leafShape || 'billboard', texSpriteName: texName2 as any },
              objectMaterialUuid: leafMaterialUuid,
              visible: true,
              transform: {
                position: pos,
                rotation: leafEuler,
                scale: [1, 1, 1],
              },
            })
          }
        } else {
          // На конце ветви — размещаем на поверхности торца/трубки, а не в воздухе
          const leaves = Math.max(0, Math.round(leavesPerBranch))
          for (let j = 0; j < leaves; j++) {
            let axisN = normalize(tube.endTangent as any)
            const tmp: [number, number, number] = Math.abs(axisN[1]) < 0.99 ? [0,1,0] : [1,0,0]
            const o1 = new THREE.Vector3().crossVectors(new THREE.Vector3(...axisN), new THREE.Vector3(...tmp)).normalize()
            const o2 = new THREE.Vector3().crossVectors(new THREE.Vector3(...axisN), o1).normalize()
            const aJ = rng() * Math.PI * 2
            const radial = new THREE.Vector3(
              o1.x * Math.cos(aJ) + o2.x * Math.sin(aJ),
              o1.y * Math.cos(aJ) + o2.y * Math.sin(aJ),
              o1.z * Math.cos(aJ) + o2.z * Math.sin(aJ),
            )
            // Инвертируем ось, если она направлена в начало ветви: сравниваем с направлением из предпоследней точки к концу
            const lastIdx = Math.max(1, curvePts.length - 1)
            const prevEnd = curvePts[lastIdx - 1]
            const toEnd2 = new THREE.Vector3(curvedEnd[0] - prevEnd.x, curvedEnd[1] - prevEnd.y, curvedEnd[2] - prevEnd.z)
            const axisVecCheck = new THREE.Vector3(...axisN)
            if (axisVecCheck.dot(toEnd2) < 0) {
              axisN = [-axisN[0], -axisN[1], -axisN[2]]
            }
            // Используем ИМЕННО конечный радиус трубки, а не базовый: лист прилипает к фактической геометрии торца
            const endRadius = Math.max(0.003, tube.endRadius)
            const eps = Math.max(0.003, endRadius * 0.08)
            const radialDist = endRadius + eps
            const pos: [number, number, number] = [
              curvedEnd[0] + radial.x * radialDist,
              curvedEnd[1] + radial.y * radialDist,
              curvedEnd[2] + radial.z * radialDist,
            ]
              const isTexture = (params.leafShape || 'billboard') === 'texture'
              let leafEuler: [number, number, number]
              const leafRadius = Math.max(0.01, leafSize * (0.7 + 0.6 * rng()))
              leafEuler = computeLeafEuler(axisN, radial, params as any, rng, nDir)
              const texName2: string | undefined = selectLeafSprite(params as any, rng)
              primitives.push({
                uuid: generateUUID(),
                type: 'leaf',
                name: 'Лист',
                geometry: { radius: leafRadius, shape: params.leafShape || 'billboard', texSpriteName: texName2 as any },
                objectMaterialUuid: leafMaterialUuid,
                visible: true,
                transform: {
                  position: pos,
                  rotation: leafEuler,
                  scale: [1, 1, 1],
                },
              })
          }
        }
      } else {
        // Иначе — ответвления следующего уровня из конца текущей ветви (видимой части)
        // Выбираем точку крепления дочерней ветки на ТЕКУЩЕЙ кривой с биасом к концу
        // Передаём в генератор следующего уровня полную информацию о кривой родителя,
        // чтобы для КАЖДОЙ дочерней ветви выбирать свою точку крепления вдоль кривой
        const tipTaper = Math.max(0, Math.min(0.95, branchTipTaper ?? 0.35))
        genBranches({
          basePoint: curvedEnd,
          level: level + 1,
          parentAxis: tube.endTangent,
          parentRadius: tube.endRadius,
          parentEndRadius: tube.endRadius,
          parentSeg: currentSeg,
          // Кривая и параметры радиуса вдоль неё
          parentCurvePts: curvePts,
          parentBaseRadius: rad,
          parentCollarScale: collarScale,
          parentTipTaper: tipTaper,
          avoidBaseFrac: Math.max(0, Math.min(0.5, (params.branchChildAvoidBaseFrac as any) ?? 0.1)),
          tipBias: Math.max(0, Math.min(1, params.branchChildTipBias ?? 0.5))
        } as any)
      }
    }
    // Пост‑обработка: если это дочерние для ветки (есть кривая родителя), убеждаемся, что у самого
    // кончика родителя есть как минимум две дочерние. Если меньше — добавляем «продолжение».
    if (parentCurvePts && parentCurvePts.length >= 2 && parentBaseRadius && parentTipTaper != null) {
      const curve = new THREE.CatmullRomCurve3(parentCurvePts, false, 'catmullrom', 0.5)
      const endPoint = curve.getPoint(1)
      // Оценим, сколько баз оказалось у кончика (t ≳ 0.98)
      let tipCount = 0
      const samples = 32
      for (const b of childBases) {
        // Грубая аппроксимация t через выбор ближайшей из 32 точек
        let bestT = 0, bestD = Infinity
        for (let s = 0; s <= samples; s++) {
          const t = s / samples
          const p = curve.getPoint(t)
          const d = Math.hypot(b[0]-p.x, b[1]-p.y, b[2]-p.z)
          if (d < bestD) { bestD = d; bestT = t }
        }
        if (bestT > 0.98) tipCount++
      }
      // Добавляем «ветку‑продолжение» у кончика родителя только если не достигнут последний уровень
      if (level < branchLevels && tipCount < 2) {
        // Добавляем одну дополнительную ветку‑продолжение
        const tTip = 1
        const anchor = endPoint
        const tangent = curve.getTangent(tTip).normalize()
        const parentRadiusLoc = Math.max(0.003, (parentEndRadius ?? (parentBaseRadius * Math.max(0.05, 1 - Math.max(0, Math.min(0.95, parentTipTaper)) * tTip))))
        const aN: [number,number,number] = [tangent.x, tangent.y, tangent.z]
        // Точное соответствие радиуса: делаем базовый радиус дочерней равным радиусу родителя на стыке
        const rad = parentRadiusLoc
        // Кап стартовый скрываем (не рисуем) и не утопляем осево — труба начинается прямо в плоскости стыка
        const baseInside: [number,number,number] = [anchor.x, anchor.y, anchor.z]
        const j = Math.max(0, Math.min(1, params.branchLengthJitter ?? randomness))
        const len = branchLength * Math.pow(0.75, level - 1) * (1 - 0.3 * j + 0.6 * j * rng())
        const tipTaper = Math.max(0, Math.min(0.95, branchTipTaper ?? 0.35))
        const curvePts = buildBranchCurvePoints(baseInside, aN, len, rng)
        // Вычислим конечную нормаль родителя (минимальное кручение) и длину родителя для непрерывного UV
        const samples = 64
        let nEnd: THREE.Vector3 | null = null
        let totalLen = 0
        let prevP = curve.getPoint(0)
        // начальная нормаль — проект мировой up на плоскость, перпендикулярную касательной
        const t0 = curve.getTangent(0).normalize()
        let ref = (Math.abs(t0.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0))
        ref = ref.sub(t0.clone().multiplyScalar(ref.dot(t0))).normalize()
        let nPrev = ref.clone()
        for (let s = 1; s <= samples; s++) {
          const tt = s / samples
          const p = curve.getPoint(tt)
          totalLen += p.distanceTo(prevP)
          const tPrev = curve.getTangent((s-1)/samples).normalize()
          const tCur = curve.getTangent(tt).normalize()
          const q = new THREE.Quaternion().setFromUnitVectors(tPrev, tCur)
          nPrev = nPrev.clone().applyQuaternion(q).normalize()
          // Ре-ортонормировка
          const b = new THREE.Vector3().crossVectors(tCur, nPrev).normalize()
          nPrev = new THREE.Vector3().crossVectors(b, tCur).normalize()
          prevP = p
          if (s === samples) nEnd = nPrev.clone()
        }
        const vStartCont = Math.max(1, totalLen * Math.max(1e-6, (params as any).barkTexDensityPerMeter ?? 1))
        // Для «ветка→ветка»: без воротника и БЕЗ стартовой крышки для идеального сопряжения по радиусу
        const tube = buildTaperedTubeMesh(curvePts, rad, {
          tubularSegments: 20,
          radialSegments: (parentRadialSegments || 10),
          collarFrac: 0,
          collarScale: 1,
          capStart: false,
          // Продолжаем UV по V от родителя и фиксируем начальную нормаль
          vStart: vStartCont,
          vScale: Math.max(1, len * Math.max(1e-6, (params as any).barkTexDensityPerMeter ?? 1)),
          refNormal: nEnd ? [nEnd.x, nEnd.y, nEnd.z] : undefined,
          // Жёсткая привязка первого кольца к последнему кольцу родителя
          overrideStartRingPositions: parentEndRingPositions,
          overrideStartRingUVs: parentEndRingUVs,
          taper: linearTaper(tipTaper),
        })
        appendToUnified({ positions: tube.positions, normals: tube.normals, indices: tube.indices, uvs: tube.uvs })
        const curvedEnd: [number,number,number] = tube.endPoint
        placed.push({ a: baseInside, b: curvedEnd, radius: rad })
        // Рекурсия на следующий уровень
        if (level < branchLevels) {
          const nextBase: [number, number, number] = curvedEnd
          const parentRadiusNext = Math.max(0.005, tube.endRadius)
          genBranches({
            basePoint: nextBase,
            level: level + 1,
            parentAxis: tube.endTangent,
            parentRadius: parentRadiusNext,
            parentSeg: undefined,
            parentCurvePts: curvePts,
            parentBaseRadius: rad,
            parentCollarScale: 1,
            parentTipTaper: tipTaper,
            avoidBaseFrac: Math.max(0, Math.min(0.5, params.branchChildAvoidBaseFrac ?? 0.1)),
            tipBias: Math.max(0, Math.min(1, params.branchChildTipBias ?? 0.5)),
          })
        }
      }
    }
  }

  // 2) Размещаем ветви по всем стволам: используем точки верхних граней сегментов
  if (branchLevels > 0) {
    // Подготовим нормировку высоты для биаса к верху по Y
    let minY = Infinity, maxY = -Infinity
    for (const att of trunkAttachments) {
      if (att.point[1] < minY) minY = att.point[1]
      if (att.point[1] > maxY) maxY = att.point[1]
    }
    const span = Math.max(1e-4, maxY - minY)
    const bias = Math.min(1, Math.max(0, branchTopBias ?? 0))
    for (const att of trunkAttachments) {
      // Пропускаем крепления на стволе, расположенные ниже отсечки
      if (att.point[1] < branchCutoffY) continue
      const h01 = (att.point[1] - minY) / span
      // Вес: при 0 — равномерно (1), при 1 — квадратичная концентрация к верху (0..1 -> 0..1^2)
      const topWeight = (1 - bias) * 1 + bias * (h01 * h01)
      // На верхушке ствола оставляем максимум одну «штатную» ветвь
      const isApex = !!(trunkEndPoint && trunkEndRadius && Math.hypot(
        att.point[0] - trunkEndPoint[0],
        att.point[1] - trunkEndPoint[1],
        att.point[2] - trunkEndPoint[2],
      ) <= Math.max(0.02, trunkEndRadius * 0.6))
      genBranches({ basePoint: att.point, level: 1, parentAxis: att.axis, parentRadius: att.radius, countScale: topWeight, attachToParentTip: false, maxCountOverride: isApex ? 0 : undefined })
      // На верхушке ствола жёстко ограничиваем максимум обычных ответвлений до 1
    }
  }

  // Бесшовная «ветвь‑продолжение» на верхушке ствола
  // По аналогии с ветвями: если у самого кончика родителя маловато дочерних,
  // добавляем продолжение, сшитое по последнему кольцу геометрии родителя.
  // Здесь роль «родителя» играет сам ствол: используем сохранённое верхнее кольцо.
  if (trunkEndPoint && trunkEndTangent && trunkEndRadius && trunkEndRingPositions && trunkEndRingUVs) {
    const baseInside: [number, number, number] = [trunkEndPoint[0], trunkEndPoint[1], trunkEndPoint[2]]
    const aN = normalize(trunkEndTangent)
    const j = Math.max(0, Math.min(1, params.branchLengthJitter ?? randomness))
    const len = branchLength * (1 - 0.3 * j + 0.6 * j * rng())
    const tipTaper = Math.max(0, Math.min(0.95, branchTipTaper ?? 0.35))
    const rad = Math.max(0.005, trunkEndRadius)
    const curvePts = buildBranchCurvePoints(baseInside, aN, len, rng)
    const vStartCont = Math.max(1, trunkHeight * texD)
    const tube = buildTaperedTubeMesh(curvePts, rad, {
      tubularSegments: 20,
      radialSegments: trunkRadialSegments,
      collarFrac: 0,
      collarScale: 1,
      capStart: false,
      vStart: vStartCont,
      vScale: Math.max(1, len * texD),
      overrideStartRingPositions: trunkEndRingPositions,
      overrideStartRingUVs: trunkEndRingUVs,
      taper: linearTaper(tipTaper),
    })
    appendToUnified({ positions: tube.positions, normals: tube.normals, indices: tube.indices, uvs: tube.uvs })
    const curvedEnd: [number, number, number] = tube.endPoint
    placed.push({ a: baseInside, b: curvedEnd, radius: rad })

    // Всегда отрисовываем листву на кроне вне зависимости от числа уровней ветвей.
    // Ранее листья на кроне добавлялись только при `branchLevels === 1`,
    // из-за чего при глубине ветвления > 1 верхушка получалась «лысой».
    // Привязку листьев к обычным веткам не трогаем — она выполняется в генерации дочерних ветвей ниже.
    if (branchLevels >= 1) {
      const placement = params.leafPlacement || 'end'
      if (placement === 'along') {
        const density = Math.max(0.5, params.leavesPerMeter ?? 6)
        const countAlong = Math.max(1, Math.round(density * len))
        const tStart = 0.3
        const curve = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.5)
        for (let jj = 0; jj < countAlong; jj++) {
          const tj = tStart + (1 - tStart) * ((jj + rng() * 0.3) / countAlong)
          const tj01 = Math.min(1, Math.max(0, tj))
          const p = curve.getPoint(tj01)
          const axisPoint: [number, number, number] = [p.x, p.y, p.z]
          let tVec = curve.getTangent(tj01).normalize()
          const endP = curve.getPoint(1)
          const toEnd = new THREE.Vector3(endP.x - p.x, endP.y - p.y, endP.z - p.z)
          if (tVec.dot(toEnd) < 0) tVec = tVec.multiplyScalar(-1)
          const axisN = [tVec.x, tVec.y, tVec.z] as [number, number, number]
          const radial = randomRadialDirection(axisN, rng)
          const localRadius = Math.max(0.003, rad * (1 - tipTaper * tj01))
          const eps = Math.max(0.003, localRadius * 0.08)
          const radialDist = localRadius + eps
          const pos: [number, number, number] = [
            axisPoint[0] + radial.x * radialDist,
            axisPoint[1] + radial.y * radialDist,
            axisPoint[2] + radial.z * radialDist
          ]
          const tangent = new THREE.Vector3().crossVectors(new THREE.Vector3(...axisN), radial).normalize()
          const tShift = (rng() - 0.5) * Math.min(rad * 0.3, 0.02 * len)
          pos[0] += tangent.x * tShift
          pos[1] += tangent.y * tShift
          pos[2] += tangent.z * tShift

          const isTexture = (params.leafShape || 'billboard') === 'texture'
          let leafEuler: [number, number, number]
          const leafRadius = Math.max(0.01, leafSize * (0.7 + 0.6 * rng()))
          leafEuler = computeLeafEuler(axisN, radial, params as any, rng, [tVec.x, tVec.y, tVec.z])
          const texName: string | undefined = selectLeafSprite(params as any, rng)
          primitives.push({
            uuid: generateUUID(),
            type: 'leaf',
            name: 'Лист',
            geometry: { radius: leafRadius, shape: params.leafShape || 'billboard', texSpriteName: texName as any },
            objectMaterialUuid: leafMaterialUuid,
            visible: true,
            transform: { position: pos, rotation: leafEuler, scale: [1, 1, 1] },
          })
        }
      } else {
        const leaves = Math.max(0, Math.round(leavesPerBranch))
        for (let jj = 0; jj < leaves; jj++) {
          let axisN = normalize(tube.endTangent as any)
          const radial = randomRadialDirection(axisN, rng)
          const endRadius = Math.max(0.003, tube.endRadius)
          const eps = Math.max(0.003, endRadius * 0.08)
          const radialDist = endRadius + eps
          const pos: [number, number, number] = [
            curvedEnd[0] + radial.x * radialDist,
            curvedEnd[1] + radial.y * radialDist,
            curvedEnd[2] + radial.z * radialDist
          ]
          const isTexture = (params.leafShape || 'billboard') === 'texture'
          let leafEuler: [number, number, number]
          const leafRadius = Math.max(0.01, leafSize * (0.7 + 0.6 * rng()))
          leafEuler = computeLeafEuler(axisN, radial, params as any, rng, tube.endTangent as any)
          const texName2: string | undefined = selectLeafSprite(params as any, rng)
          primitives.push({
            uuid: generateUUID(),
            type: 'leaf',
            name: 'Лист',
            geometry: { radius: leafRadius, shape: params.leafShape || 'billboard', texSpriteName: texName2 as any },
            objectMaterialUuid: leafMaterialUuid,
            visible: true,
            transform: { position: pos, rotation: leafEuler, scale: [1, 1, 1] },
          })
        }
      }

      if (branchLevels > 1) {
        const parentRadiusNext = Math.max(0.005, tube.endRadius)
        genBranches({
          basePoint: curvedEnd,
          level: 1,
          parentAxis: tube.endTangent,
          parentRadius: parentRadiusNext,
          parentSeg: undefined,
          parentCurvePts: curvePts,
          parentBaseRadius: rad,
          parentCollarScale: 1,
          parentTipTaper: tipTaper,
          avoidBaseFrac: Math.max(0, Math.min(0.5, params.branchChildAvoidBaseFrac ?? 0.1)),
          tipBias: Math.max(0, Math.min(1, params.branchChildTipBias ?? 0.5)),
          parentRadialSegments: trunkRadialSegments,
        } as any)
      }
    }
  }
// 3) Сводный меш коры (ствол + ветви)
  if (unifiedPos.length > 0) {
    primitives.push({
      uuid: generateUUID(),
      type: 'mesh',
      name: 'Дерево: ствол+ветви (единый меш)',
      geometry: { positions: unifiedPos, normals: unifiedNor, indices: unifiedIdx, uvs: unifiedUv },
      objectMaterialUuid: barkMaterialUuid,
      visible: true,
      transform: { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] },
    } as any)
  }

  return primitives
}

/**
 * Фабрика материалов по умолчанию для дерева: «Кора» и «Листья».
 * Возвращает массив CreateGfxMaterial без UUID — UUID присваивается при добавлении в стор.
 */
export function createDefaultTreeMaterials(options?: {
  barkColor?: string
  leafColor?: string
}): CreateGfxMaterial[] {
  return [
    {
      name: 'Кора',
      type: 'dielectric',
      isGlobal: false,
      properties: {
        color: options?.barkColor ?? '#8B5A2B',
        roughness: 0.9,
        metalness: 0.0,
      },
    },
    {
      name: 'Листья',
      type: 'dielectric',
      isGlobal: false,
      properties: {
        color: options?.leafColor ?? '#2E8B57',
        roughness: 0.7,
        metalness: 0.0,
      },
    },
  ]
}


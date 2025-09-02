/**
 * Утилиты для работы с координатами и трансформациями групп примитивов
 */

import type { Vector3, BoundingBox } from "@/shared/types";
import { add, sub, mul, scale as v3scale, midpoint, min as v3min, max as v3max } from '@/shared/lib/math/vector3'
import type { GfxPrimitive } from "@/entities/primitive";
import type { GfxPrimitiveGroup } from "../model/types";

/**
 * Пересчитывает координаты примитива при перемещении между группами
 * @param primitiveUuid UUID примитива для перемещения
 * @param fromGroupUuid UUID исходной группы (null для корневого уровня)
 * @param toGroupUuid UUID целевой группы (null для корневого уровня)
 * @param primitives Массив всех примитивов объекта
 * @param groups Все группы объекта
 * @param groupAssignments Привязки примитивов к группам
 * @returns Обновленный примитив с пересчитанными координатами
 */
export function movePrimitiveToGroup(
  primitiveUuid: string,
  fromGroupUuid: string | null,
  toGroupUuid: string | null,
  primitives: GfxPrimitive[],
  groups: Record<string, GfxPrimitiveGroup>
): GfxPrimitive | null {
  const primitive = primitives.find(p => p.uuid === primitiveUuid);
  if (!primitive) return null;

  // Если обе группы одинаковые, координаты не меняются
  if (fromGroupUuid === toGroupUuid) return primitive;

  const worldTransform = getWorldTransform(primitive, fromGroupUuid, groups);

  // Получаем обратную трансформацию для целевой группы
  const targetGroupInverseTransform = getGroupInverseTransform(toGroupUuid, groups);

  // Применяем обратную трансформацию к мировым координатам
  const newLocalTransform = applyTransform(worldTransform, targetGroupInverseTransform);

  // Создаём новый transform только если он существенно отличается от значений по умолчанию
  const newTransform: { position?: Vector3; rotation?: Vector3; scale?: Vector3 } = {};

  const [px, py, pz] = newLocalTransform.position;
  if (px !== 0 || py !== 0 || pz !== 0) {
    newTransform.position = [px, py, pz];
  }

  const [rx, ry, rz] = newLocalTransform.rotation;
  if (rx !== 0 || ry !== 0 || rz !== 0) {
    newTransform.rotation = [rx, ry, rz];
  }

  const [sx, sy, sz] = newLocalTransform.scale;
  if (sx !== 1 || sy !== 1 || sz !== 1) {
    newTransform.scale = [sx, sy, sz];
  }

  return {
    ...primitive,
    transform: Object.keys(newTransform).length > 0 ? newTransform : undefined
  };
}

/**
 * Рассчитывает границы (bounding box) группы на основе всех входящих в неё примитивов
 * @param groupUuid UUID группы
 * @param primitives Массив всех примитивов объекта
 * @param groups Все группы объекта
 * @param groupAssignments Привязки примитивов к группам
 * @returns BoundingBox группы или null если группа пуста
 */
export function calculateGroupBounds(
  groupUuid: string,
  primitives: GfxPrimitive[],
  groups: Record<string, GfxPrimitiveGroup>,
  groupAssignments: Record<string, string>
): BoundingBox | null {
  // Получаем все примитивы, принадлежащие группе (включая дочерние группы)
  const groupPrimitives = getGroupPrimitivesRecursive(groupUuid, primitives, groups, groupAssignments);
  
  if (groupPrimitives.length === 0) return null;

  let accMin: Vector3 | null = null
  let accMax: Vector3 | null = null

  for (const primitive of groupPrimitives) {
    const bounds = getPrimitiveBounds(primitive)
    if (!bounds) continue
    if (!accMin || !accMax) {
      accMin = bounds.min
      accMax = bounds.max
    } else {
      accMin = v3min(accMin, bounds.min)
      accMax = v3max(accMax, bounds.max)
    }
  }

  if (!accMin || !accMax) return null

  return { min: accMin, max: accMax }
}

/**
 * Получает геометрический центр группы для позиционирования pivot point
 * @param groupUuid UUID группы
 * @param primitives Массив всех примитивов объекта
 * @param groups Все группы объекта
 * @param groupAssignments Привязки примитивов к группам
 * @returns Координаты центра группы
 */
export function getGroupCenter(
  groupUuid: string,
  primitives: GfxPrimitive[],
  groups: Record<string, GfxPrimitiveGroup>,
  groupAssignments: Record<string, string>
): Vector3 {
  const bounds = calculateGroupBounds(groupUuid, primitives, groups, groupAssignments);

  if (!bounds) {
    return [0, 0, 0];
  }

  return midpoint(bounds.min, bounds.max);
}

/**
 * Получает геометрический центр группы с учетом трансформации самой группы
 * @param groupUuid UUID группы
 * @param primitives Массив всех примитивов объекта
 * @param groups Все группы объекта
 * @param groupAssignments Привязки примитивов к группам
 * @returns Координаты центра группы с учетом трансформации
 */
export function getGroupCenterWithTransform(
  groupUuid: string,
  primitives: GfxPrimitive[],
  groups: Record<string, GfxPrimitiveGroup>,
  groupAssignments: Record<string, string>
): Vector3 {
  // Сначала получаем базовый геометрический центр группы
  const baseCenter = getGroupCenter(groupUuid, primitives, groups, groupAssignments);
  
  // Получаем группу для проверки трансформации
  const group = groups[groupUuid];
  if (!group?.transform?.position) {
    return baseCenter;
  }

  // Применяем трансформацию группы к базовому центру
  return add(baseCenter, [
    group.transform.position[0] || 0,
    group.transform.position[1] || 0,
    group.transform.position[2] || 0,
  ] as Vector3);
}

/**
 * Получает мировые координаты примитива с учетом иерархии групп
 */
function getWorldTransform(
  primitive: GfxPrimitive,
  groupUuid: string | null,
  groups: Record<string, GfxPrimitiveGroup>
): { position: Vector3; rotation: Vector3; scale: Vector3 } {
  const localTransform = {
    position: primitive.transform?.position ? [...primitive.transform.position] as Vector3 : [0, 0, 0],
    rotation: primitive.transform?.rotation ? [...primitive.transform.rotation] as Vector3 : [0, 0, 0],
    scale: primitive.transform?.scale ? [...primitive.transform.scale] as Vector3 : [1, 1, 1]
  };

  if (!groupUuid) return localTransform;

  // Получаем цепочку групп до корня
  const groupChain = getGroupChain(groupUuid, groups);

  let worldTransform = { ...localTransform };

  // Применяем трансформации всех родительских групп
  for (const group of groupChain) {
    if (group.transform) {
      worldTransform = applyTransform(worldTransform, group.transform);
    }
  }

  return worldTransform;
}

/**
 * Получает обратную трансформацию группы для перевода из мировых координат в локальные
 */
function getGroupInverseTransform(
  groupUuid: string | null,
  groups: Record<string, GfxPrimitiveGroup>
): { position: Vector3; rotation: Vector3; scale: Vector3 } {
  if (!groupUuid) {
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    };
  }

  const groupChain = getGroupChain(groupUuid, groups);

  let inverseTransform = {
    position: [0, 0, 0] as Vector3,
    rotation: [0, 0, 0] as Vector3,
    scale: [1, 1, 1] as Vector3
  };

  // Применяем обратные трансформации в обратном порядке
  for (let i = groupChain.length - 1; i >= 0; i--) {
    const group = groupChain[i];
    if (group.transform) {
      inverseTransform = applyInverseTransform(inverseTransform, group.transform);
    }
  }

  return inverseTransform;
}

/**
 * Получает цепочку групп от указанной группы до корня
 */
function getGroupChain(groupUuid: string, groups: Record<string, GfxPrimitiveGroup>): GfxPrimitiveGroup[] {
  const chain: GfxPrimitiveGroup[] = [];
  let currentUuid: string | undefined = groupUuid;

  while (currentUuid && groups[currentUuid]) {
    const group = groups[currentUuid];
    chain.unshift(group); // Добавляем в начало для правильного порядка
    currentUuid = group.parentGroupUuid;
  }

  return chain;
}

/**
 * Применяет трансформацию к другой трансформации
 */
function applyTransform(
  transform: { position: Vector3; rotation: Vector3; scale: Vector3 },
  parentTransform: { position?: Vector3; rotation?: Vector3; scale?: Vector3 }
): { position: Vector3; rotation: Vector3; scale: Vector3 } {
  const p = parentTransform
  return {
    position: add(transform.position, [p.position?.[0] ?? 0, p.position?.[1] ?? 0, p.position?.[2] ?? 0] as Vector3),
    rotation: add(transform.rotation, [p.rotation?.[0] ?? 0, p.rotation?.[1] ?? 0, p.rotation?.[2] ?? 0] as Vector3),
    scale: mul(transform.scale, [p.scale?.[0] ?? 1, p.scale?.[1] ?? 1, p.scale?.[2] ?? 1] as Vector3),
  };
}

/**
 * Применяет обратную трансформацию
 */
function applyInverseTransform(
  transform: { position: Vector3; rotation: Vector3; scale: Vector3 },
  parentTransform: { position?: Vector3; rotation?: Vector3; scale?: Vector3 }
): { position: Vector3; rotation: Vector3; scale: Vector3 } {
  const p = parentTransform
  const posParent: Vector3 = [p.position?.[0] ?? 0, p.position?.[1] ?? 0, p.position?.[2] ?? 0]
  const rotParent: Vector3 = [p.rotation?.[0] ?? 0, p.rotation?.[1] ?? 0, p.rotation?.[2] ?? 0]
  const sclParent: Vector3 = [p.scale?.[0] ?? 1, p.scale?.[1] ?? 1, p.scale?.[2] ?? 1]

  return {
    position: sub(transform.position, posParent),
    rotation: sub(transform.rotation, rotParent),
    scale: [
      sclParent[0] !== 0 ? transform.scale[0] / sclParent[0] : transform.scale[0],
      sclParent[1] !== 0 ? transform.scale[1] / sclParent[1] : transform.scale[1],
      sclParent[2] !== 0 ? transform.scale[2] / sclParent[2] : transform.scale[2],
    ] as Vector3,
  };
}

/**
 * Получает все примитивы группы, включая примитивы дочерних групп
 */
function getGroupPrimitivesRecursive(
  groupUuid: string,
  primitives: GfxPrimitive[],
  groups: Record<string, GfxPrimitiveGroup>,
  groupAssignments: Record<string, string>
): GfxPrimitive[] {
  const result: GfxPrimitive[] = [];
  
  // Добавляем примитивы текущей группы
  for (const primitive of primitives) {
    if (groupAssignments[primitive.uuid] === groupUuid) {
      result.push(primitive);
    }
  }

  // Рекурсивно добавляем примитивы дочерних групп
  const childGroups = Object.values(groups).filter(g => g.parentGroupUuid === groupUuid);
  for (const childGroup of childGroups) {
    result.push(...getGroupPrimitivesRecursive(childGroup.uuid, primitives, groups, groupAssignments));
  }

  return result;
}

/**
 * Получает приблизительные границы примитива на основе его геометрии и трансформации
 */
function getPrimitiveBounds(primitive: GfxPrimitive): BoundingBox | null {
  const position = primitive.transform?.position || [0, 0, 0];
  const scale = primitive.transform?.scale || [1, 1, 1];

  let size: Vector3;

  switch (primitive.type) {
    case 'box': {
      size = [
        primitive.geometry.width * scale[0],
        primitive.geometry.height * scale[1],
        primitive.geometry.depth * scale[2]
      ];
      break;
    }
    case 'sphere': {
      const radius = primitive.geometry.radius * Math.max(scale[0], scale[1], scale[2]);
      size = [radius * 2, radius * 2, radius * 2];
      break;
    }
    case 'cylinder': {
      const diameter = Math.max(primitive.geometry.radiusTop, primitive.geometry.radiusBottom) * 2 * Math.max(scale[0], scale[2]);
      size = [
        diameter,
        primitive.geometry.height * scale[1],
        diameter
      ];
      break;
    }
    case 'cone': {
      const diameter = primitive.geometry.radius * 2 * Math.max(scale[0], scale[2]);
      size = [
        diameter,
        primitive.geometry.height * scale[1],
        diameter
      ];
      break;
    }
    case 'pyramid': {
      size = [
        primitive.geometry.baseSize * scale[0],
        primitive.geometry.height * scale[1],
        primitive.geometry.baseSize * scale[2]
      ];
      break;
    }
    case 'plane': {
      size = [
        primitive.geometry.width * scale[0],
        0,
        primitive.geometry.height * scale[2]
      ];
      break;
    }
    case 'torus': {
      const outerRadius = (primitive.geometry.majorRadius + primitive.geometry.minorRadius) * Math.max(scale[0], scale[2]);
      size = [
        outerRadius * 2,
        primitive.geometry.minorRadius * 2 * scale[1],
        outerRadius * 2
      ];
      break;
    }
    default:
      return null;
  }

  const halfSize: Vector3 = v3scale(size, 0.5);

  return {
    min: sub(position, halfSize),
    max: add(position, halfSize)
  } as BoundingBox;
}

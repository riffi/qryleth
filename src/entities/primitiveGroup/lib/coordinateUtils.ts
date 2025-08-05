/**
 * Утилиты для работы с координатами и трансформациями групп примитивов
 */

import type { Vector3, BoundingBox } from "@/shared/types";
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

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const primitive of groupPrimitives) {
    const bounds = getPrimitiveBounds(primitive);
    if (bounds) {
      minX = Math.min(minX, bounds.min[0]);
      minY = Math.min(minY, bounds.min[1]);
      minZ = Math.min(minZ, bounds.min[2]);
      maxX = Math.max(maxX, bounds.max[0]);
      maxY = Math.max(maxY, bounds.max[1]);
      maxZ = Math.max(maxZ, bounds.max[2]);
    }
  }

  if (minX === Infinity) return null;

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ]
  };
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

  return [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2
  ];
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
  return {
    position: [
      transform.position[0] + (parentTransform.position?.[0] ?? 0),
      transform.position[1] + (parentTransform.position?.[1] ?? 0),
      transform.position[2] + (parentTransform.position?.[2] ?? 0)
    ],
    rotation: [
      transform.rotation[0] + (parentTransform.rotation?.[0] ?? 0),
      transform.rotation[1] + (parentTransform.rotation?.[1] ?? 0),
      transform.rotation[2] + (parentTransform.rotation?.[2] ?? 0)
    ],
    scale: [
      transform.scale[0] * (parentTransform.scale?.[0] ?? 1),
      transform.scale[1] * (parentTransform.scale?.[1] ?? 1),
      transform.scale[2] * (parentTransform.scale?.[2] ?? 1)
    ]
  };
}

/**
 * Применяет обратную трансформацию
 */
function applyInverseTransform(
  transform: { position: Vector3; rotation: Vector3; scale: Vector3 },
  parentTransform: { position?: Vector3; rotation?: Vector3; scale?: Vector3 }
): { position: Vector3; rotation: Vector3; scale: Vector3 } {
  return {
    position: [
      transform.position[0] - (parentTransform.position?.[0] ?? 0),
      transform.position[1] - (parentTransform.position?.[1] ?? 0),
      transform.position[2] - (parentTransform.position?.[2] ?? 0)
    ],
    rotation: [
      transform.rotation[0] - (parentTransform.rotation?.[0] ?? 0),
      transform.rotation[1] - (parentTransform.rotation?.[1] ?? 0),
      transform.rotation[2] - (parentTransform.rotation?.[2] ?? 0)
    ],
    scale: [
      (parentTransform.scale?.[0] ?? 1) !== 0 ? transform.scale[0] / (parentTransform.scale?.[0] ?? 1) : transform.scale[0],
      (parentTransform.scale?.[1] ?? 1) !== 0 ? transform.scale[1] / (parentTransform.scale?.[1] ?? 1) : transform.scale[1],
      (parentTransform.scale?.[2] ?? 1) !== 0 ? transform.scale[2] / (parentTransform.scale?.[2] ?? 1) : transform.scale[2]
    ]
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

  const halfSize: Vector3 = [size[0] / 2, size[1] / 2, size[2] / 2];

  return {
    min: [position[0] - halfSize[0], position[1] - halfSize[1], position[2] - halfSize[2]],
    max: [position[0] + halfSize[0], position[1] + halfSize[1], position[2] + halfSize[2]]
  };
}

/**
 * Утилиты для работы с координатами и трансформациями групп примитивов
 */

import type { Vector3, BoundingBox } from "@/shared/types";
import type { GfxPrimitive } from "@/entities/primitive";
import type { GfxPrimitiveGroup } from "../model/types";

/** Внутренний тип для координат в объектном формате */
type Vector3Object = { x: number; y: number; z: number };

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

  // Получаем мировые координаты примитива в текущей группе
  const worldTransform = getWorldTransform(primitive, fromGroupUuid, groups);
  
  // Получаем обратную трансформацию для целевой группы
  const targetGroupInverseTransform = getGroupInverseTransform(toGroupUuid, groups);
  
  // Применяем обратную трансформацию к мировым координатам
  const newLocalTransform = applyTransform(worldTransform, targetGroupInverseTransform);


  // Создаём новый transform только если он существенно отличается от значений по умолчанию
  const newTransform: any = {};
  
  // Добавляем position только если он не равен [0, 0, 0]
  if (newLocalTransform.position.x !== 0 || newLocalTransform.position.y !== 0 || newLocalTransform.position.z !== 0) {
    newTransform.position = [newLocalTransform.position.x, newLocalTransform.position.y, newLocalTransform.position.z];
  }
  
  // Добавляем rotation только если он не равен [0, 0, 0]
  if (newLocalTransform.rotation.x !== 0 || newLocalTransform.rotation.y !== 0 || newLocalTransform.rotation.z !== 0) {
    newTransform.rotation = [newLocalTransform.rotation.x, newLocalTransform.rotation.y, newLocalTransform.rotation.z];
  }
  
  // Добавляем scale только если он не равен [1, 1, 1]
  if (newLocalTransform.scale.x !== 1 || newLocalTransform.scale.y !== 1 || newLocalTransform.scale.z !== 1) {
    newTransform.scale = [newLocalTransform.scale.x, newLocalTransform.scale.y, newLocalTransform.scale.z];
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
      minX = Math.min(minX, bounds.min.x);
      minY = Math.min(minY, bounds.min.y);
      minZ = Math.min(minZ, bounds.min.z);
      maxX = Math.max(maxX, bounds.max.x);
      maxY = Math.max(maxY, bounds.max.y);
      maxZ = Math.max(maxZ, bounds.max.z);
    }
  }

  if (minX === Infinity) return null;

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ }
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
): Vector3Object {
  const bounds = calculateGroupBounds(groupUuid, primitives, groups, groupAssignments);
  
  if (!bounds) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2
  };
}

/**
 * Получает мировые координаты примитива с учетом иерархии групп
 */
function getWorldTransform(
  primitive: GfxPrimitive,
  groupUuid: string | null,
  groups: Record<string, GfxPrimitiveGroup>
): { position: Vector3Object; rotation: Vector3Object; scale: Vector3Object } {
  const localTransform = {
    position: primitive.transform?.position 
      ? { x: primitive.transform.position[0], y: primitive.transform.position[1], z: primitive.transform.position[2] }
      : { x: 0, y: 0, z: 0 },
    rotation: primitive.transform?.rotation
      ? { x: primitive.transform.rotation[0], y: primitive.transform.rotation[1], z: primitive.transform.rotation[2] }
      : { x: 0, y: 0, z: 0 },
    scale: primitive.transform?.scale
      ? { x: primitive.transform.scale[0], y: primitive.transform.scale[1], z: primitive.transform.scale[2] }
      : { x: 1, y: 1, z: 1 }
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
): { position: Vector3Object; rotation: Vector3Object; scale: Vector3Object } {
  if (!groupUuid) {
    return {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    };
  }

  const groupChain = getGroupChain(groupUuid, groups);
  
  let inverseTransform = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
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
  transform: { position: Vector3Object; rotation: Vector3Object; scale: Vector3Object },
  parentTransform: { position?: Vector3Object; rotation?: Vector3Object; scale?: Vector3Object }
): { position: Vector3Object; rotation: Vector3Object; scale: Vector3Object } {
  return {
    position: {
      x: transform.position.x + (parentTransform.position?.x || 0),
      y: transform.position.y + (parentTransform.position?.y || 0),
      z: transform.position.z + (parentTransform.position?.z || 0)
    },
    rotation: {
      x: transform.rotation.x + (parentTransform.rotation?.x || 0),
      y: transform.rotation.y + (parentTransform.rotation?.y || 0),
      z: transform.rotation.z + (parentTransform.rotation?.z || 0)
    },
    scale: {
      x: transform.scale.x * (parentTransform.scale?.x || 1),
      y: transform.scale.y * (parentTransform.scale?.y || 1),
      z: transform.scale.z * (parentTransform.scale?.z || 1)
    }
  };
}

/**
 * Применяет обратную трансформацию
 */
function applyInverseTransform(
  transform: { position: Vector3Object; rotation: Vector3Object; scale: Vector3Object },
  parentTransform: { position?: Vector3Object; rotation?: Vector3Object; scale?: Vector3Object }
): { position: Vector3Object; rotation: Vector3Object; scale: Vector3Object } {
  return {
    position: {
      x: transform.position.x - (parentTransform.position?.x || 0),
      y: transform.position.y - (parentTransform.position?.y || 0),
      z: transform.position.z - (parentTransform.position?.z || 0)
    },
    rotation: {
      x: transform.rotation.x - (parentTransform.rotation?.x || 0),
      y: transform.rotation.y - (parentTransform.rotation?.y || 0),
      z: transform.rotation.z - (parentTransform.rotation?.z || 0)
    },
    scale: {
      x: (parentTransform.scale?.x || 1) !== 0 ? transform.scale.x / (parentTransform.scale.x || 1) : transform.scale.x,
      y: (parentTransform.scale?.y || 1) !== 0 ? transform.scale.y / (parentTransform.scale.y || 1) : transform.scale.y,
      z: (parentTransform.scale?.z || 1) !== 0 ? transform.scale.z / (parentTransform.scale.z || 1) : transform.scale.z
    }
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
  const position = primitive.transform?.position || { x: 0, y: 0, z: 0 };
  const scale = primitive.transform?.scale || { x: 1, y: 1, z: 1 };

  let size: Vector3;

  switch (primitive.type) {
    case 'box': {
      size = {
        x: primitive.geometry.width * scale.x,
        y: primitive.geometry.height * scale.y,
        z: primitive.geometry.depth * scale.z
      };
      break;
    }
    case 'sphere': {
      const radius = primitive.geometry.radius * Math.max(scale.x, scale.y, scale.z);
      size = { x: radius * 2, y: radius * 2, z: radius * 2 };
      break;
    }
    case 'cylinder': {
      size = {
        x: Math.max(primitive.geometry.radiusTop, primitive.geometry.radiusBottom) * 2 * Math.max(scale.x, scale.z),
        y: primitive.geometry.height * scale.y,
        z: Math.max(primitive.geometry.radiusTop, primitive.geometry.radiusBottom) * 2 * Math.max(scale.x, scale.z)
      };
      break;
    }
    case 'cone': {
      size = {
        x: primitive.geometry.radius * 2 * Math.max(scale.x, scale.z),
        y: primitive.geometry.height * scale.y,
        z: primitive.geometry.radius * 2 * Math.max(scale.x, scale.z)
      };
      break;
    }
    case 'pyramid': {
      size = {
        x: primitive.geometry.baseSize * scale.x,
        y: primitive.geometry.height * scale.y,
        z: primitive.geometry.baseSize * scale.z
      };
      break;
    }
    case 'plane': {
      size = {
        x: primitive.geometry.width * scale.x,
        y: 0,
        z: primitive.geometry.height * scale.z
      };
      break;
    }
    case 'torus': {
      const outerRadius = (primitive.geometry.majorRadius + primitive.geometry.minorRadius) * Math.max(scale.x, scale.z);
      size = { 
        x: outerRadius * 2, 
        y: primitive.geometry.minorRadius * 2 * scale.y, 
        z: outerRadius * 2 
      };
      break;
    }
    default:
      return null;
  }

  const halfSize = {
    x: size.x / 2,
    y: size.y / 2,
    z: size.z / 2
  };

  return {
    min: {
      x: position.x - halfSize.x,
      y: position.y - halfSize.y,
      z: position.z - halfSize.z
    },
    max: {
      x: position.x + halfSize.x,
      y: position.y + halfSize.y,
      z: position.z + halfSize.z
    }
  };
}
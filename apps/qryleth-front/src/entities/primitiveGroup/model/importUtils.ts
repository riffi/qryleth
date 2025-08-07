import type { GfxObject, GfxPrimitive, GfxPrimitiveGroup, ImportConflictResolution } from '@/entities';
import { generateUUID } from '@/shared/lib/uuid';

/**
 * Разрешает конфликты при импорте объекта с группами в целевой объект
 * @param sourceObject - Импортируемый объект
 * @param targetObject - Целевой объект
 * @returns Результат разрешения конфликтов с новыми UUID и именами
 */
export function resolveImportConflicts(
  sourceObject: GfxObject,
  targetObject: GfxObject
): ImportConflictResolution {
  const groupUuidMapping: Record<string, string> = {};
  const primitiveUuidMapping: Record<string, string> = {};
  const resolvedGroups: Record<string, GfxPrimitiveGroup> = {};
  const resolvedAssignments: Record<string, string> = {};

  // Получаем существующие имена групп в целевом объекте
  const existingGroupNames = new Set(
    Object.values(targetObject.primitiveGroups || {}).map(group => group.name)
  );

  // Получаем существующие UUID примитивов в целевом объекте  
  const existingPrimitiveUuids = new Set(
    targetObject.primitives.map(primitive => primitive.uuid)
  );

  // Получаем существующие UUID групп в целевом объекте
  const existingGroupUuids = new Set(
    Object.keys(targetObject.primitiveGroups || {})
  );

  // Создаем маппинг для примитивов (всегда генерируем новые UUID)
  sourceObject.primitives.forEach(primitive => {
    let newUuid: string;
    do {
      newUuid = generateUUID();
    } while (existingPrimitiveUuids.has(newUuid));
    
    primitiveUuidMapping[primitive.uuid] = newUuid;
    existingPrimitiveUuids.add(newUuid);
  });

  // Создаем маппинг для групп (всегда генерируем новые UUID)
  if (sourceObject.primitiveGroups) {
    Object.values(sourceObject.primitiveGroups).forEach(group => {
      let newUuid: string;
      do {
        newUuid = generateUUID();
      } while (existingGroupUuids.has(newUuid));
      
      groupUuidMapping[group.uuid] = newUuid;
      existingGroupUuids.add(newUuid);
    });
  }

  // Создаем разрешенные группы с новыми UUID и именами
  if (sourceObject.primitiveGroups) {
    Object.values(sourceObject.primitiveGroups).forEach(sourceGroup => {
      const newUuid = groupUuidMapping[sourceGroup.uuid];
      const resolvedName = resolveGroupNameConflict(sourceGroup.name, existingGroupNames);
      existingGroupNames.add(resolvedName);

      resolvedGroups[newUuid] = {
        uuid: newUuid,
        name: resolvedName,
        visible: sourceGroup.visible,
        parentGroupUuid: sourceGroup.parentGroupUuid 
          ? groupUuidMapping[sourceGroup.parentGroupUuid] 
          : undefined,
        sourceObjectUuid: sourceObject.uuid
      };
    });
  }

  // Создаем разрешенные привязки примитивов к группам
  if (sourceObject.primitiveGroupAssignments) {
    Object.entries(sourceObject.primitiveGroupAssignments).forEach(([primitiveUuid, groupUuid]) => {
      const newPrimitiveUuid = primitiveUuidMapping[primitiveUuid];
      const newGroupUuid = groupUuidMapping[groupUuid];
      
      if (newPrimitiveUuid && newGroupUuid) {
        resolvedAssignments[newPrimitiveUuid] = newGroupUuid;
      }
    });
  }

  return {
    groupUuidMapping,
    primitiveUuidMapping,
    resolvedGroups,
    resolvedAssignments
  };
}

/**
 * Разрешает конфликт имен групп добавлением суффикса
 * @param baseName - Базовое имя группы
 * @param existingNames - Множество существующих имен
 * @returns Уникальное имя
 */
function resolveGroupNameConflict(baseName: string, existingNames: Set<string>): string {
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let counter = 1;
  let newName: string;
  
  do {
    newName = `${baseName} (импорт ${counter})`;
    counter++;
  } while (existingNames.has(newName));
  
  return newName;
}

/**
 * Применяет результат разрешения конфликтов к импорту объекта
 * @param sourceObject - Исходный объект
 * @param resolution - Результат разрешения конфликтов
 * @param groupName - Имя создаваемой группы импорта
 * @returns Обновленные примитивы, группы и привязки для импорта
 */
export function applyImportResolution(
  sourceObject: GfxObject,
  resolution: ImportConflictResolution,
  groupName: string
): {
  importedPrimitives: GfxPrimitive[];
  importGroupUuid: string;
  importGroup: GfxPrimitiveGroup;
  allGroups: Record<string, GfxPrimitiveGroup>;
  allAssignments: Record<string, string>;
} {
  // Создаем группу для импорта
  const importGroupUuid = generateUUID();
  const importGroup: GfxPrimitiveGroup = {
    uuid: importGroupUuid,
    name: groupName,
    visible: true,
    sourceObjectUuid: sourceObject.uuid
  };

  // Создаем примитивы с новыми UUID
  const importedPrimitives: GfxPrimitive[] = sourceObject.primitives.map(primitive => ({
    ...primitive,
    uuid: resolution.primitiveUuidMapping[primitive.uuid]
  }));

  // Обновляем родительские группы - все корневые группы станут дочерними для группы импорта
  const allGroups: Record<string, GfxPrimitiveGroup> = { ...resolution.resolvedGroups };
  
  // Находим корневые группы (без родителя) и делаем их дочерними для группы импорта
  Object.values(allGroups).forEach(group => {
    if (!group.parentGroupUuid) {
      group.parentGroupUuid = importGroupUuid;
    }
  });

  // Добавляем группу импорта
  allGroups[importGroupUuid] = importGroup;

  // Создаем привязки - примитивы без групп привязываем к группе импорта
  const allAssignments: Record<string, string> = { ...resolution.resolvedAssignments };
  
  importedPrimitives.forEach(primitive => {
    if (!allAssignments[primitive.uuid]) {
      allAssignments[primitive.uuid] = importGroupUuid;
    }
  });

  return {
    importedPrimitives,
    importGroupUuid,
    importGroup,
    allGroups,
    allAssignments
  };
}

/**
 * Проверяет валидность UUID в объекте и автоматически присваивает недостающие
 * @param object - Объект для проверки
 * @returns Объект с корректными UUID
 */
export function ensureValidUuids(object: GfxObject): GfxObject {
  const updatedObject = { ...object };
  
  // Проверяем и исправляем UUID примитивов
  updatedObject.primitives = object.primitives.map(primitive => {
    if (!primitive.uuid) {
      return { ...primitive, uuid: generateUUID() };
    }
    return primitive;
  });

  // Проверяем уникальность UUID примитивов
  const primitiveUuids = new Set<string>();
  updatedObject.primitives = updatedObject.primitives.map(primitive => {
    if (primitiveUuids.has(primitive.uuid)) {
      // Дублированный UUID - генерируем новый
      return { ...primitive, uuid: generateUUID() };
    }
    primitiveUuids.add(primitive.uuid);
    return primitive;
  });

  // Проверяем и исправляем UUID групп
  if (object.primitiveGroups) {
    const groupUuids = new Set<string>();
    const updatedGroups: Record<string, GfxPrimitiveGroup> = {};
    
    Object.entries(object.primitiveGroups).forEach(([uuid, group]) => {
      let validUuid = uuid;
      if (!validUuid || groupUuids.has(validUuid)) {
        validUuid = generateUUID();
      }
      groupUuids.add(validUuid);
      updatedGroups[validUuid] = { ...group, uuid: validUuid };
    });
    
    updatedObject.primitiveGroups = updatedGroups;
  }

  return updatedObject;
}
/**
 * Типы для системы группировки примитивов GfxObject
 */

/**
 * Интерфейс группы примитивов с поддержкой иерархии
 */
export interface GfxPrimitiveGroup {
  /** Уникальный идентификатор группы */
  uuid: string;
  
  /** Название группы */
  name: string;
  
  /** Видимость группы. Если false, все примитивы в группе скрыты */
  visible?: boolean;
  
  /** UUID родительской группы для создания иерархии */
  parentGroupUuid?: string;
  
  /** UUID исходного объекта при импорте объекта как группы */
  sourceObjectUuid?: string;
}

/**
 * Узел дерева групп для построения иерархической структуры
 */
export interface GroupTreeNode {
  /** Группа */
  group: GfxPrimitiveGroup;
  
  /** Дочерние группы */
  children: GroupTreeNode[];
  
  /** Глубина вложенности */
  depth: number;
}

/**
 * Результат разрешения конфликтов при импорте
 */
export interface ImportConflictResolution {
  /** Маппинг старых UUID на новые для групп */
  groupUuidMapping: Record<string, string>;
  
  /** Маппинг старых UUID на новые для примитивов */
  primitiveUuidMapping: Record<string, string>;
  
  /** Обновленные группы с новыми UUID и именами */
  resolvedGroups: Record<string, GfxPrimitiveGroup>;
  
  /** Обновленные привязки примитивов к группам */
  resolvedAssignments: Record<string, string>;
}
import type { GfxPrimitiveGroup, GfxGroupTreeNode } from './types';

/**
 * Строит иерархическое дерево групп из плоского списка
 * @param groups - Record с группами где ключ - UUID группы
 * @returns Массив корневых узлов дерева
 */
export function buildGroupTree(groups: Record<string, GfxPrimitiveGroup>): GfxGroupTreeNode[] {
  const nodeMap = new Map<string, GfxGroupTreeNode>();
  const rootNodes: GfxGroupTreeNode[] = [];

  // Создаем узлы для всех групп
  Object.values(groups).forEach(group => {
    nodeMap.set(group.uuid, {
      group,
      children: [],
      depth: 0
    });
  });

  // Строим иерархию и вычисляем глубину
  Object.values(groups).forEach(group => {
    const node = nodeMap.get(group.uuid)!;

    if (group.parentGroupUuid && nodeMap.has(group.parentGroupUuid)) {
      // Добавляем как дочерний узел
      const parentNode = nodeMap.get(group.parentGroupUuid)!;
      parentNode.children.push(node);
      node.depth = parentNode.depth + 1;
    } else {
      // Корневой узел
      rootNodes.push(node);
    }
  });

  // Сортируем дочерние узлы по имени для консистентности
  const sortChildren = (node: GfxGroupTreeNode) => {
    node.children.sort((a, b) => a.group.name.localeCompare(b.group.name));
    node.children.forEach(sortChildren);
  };

  rootNodes.forEach(sortChildren);
  rootNodes.sort((a, b) => a.group.name.localeCompare(b.group.name));

  return rootNodes;
}

/**
 * Находит все дочерние группы для указанной группы
 * @param groupUuid - UUID родительской группы
 * @param groups - Record с группами
 * @returns Массив UUID дочерних групп (включая вложенные)
 */
export function findGroupChildren(
  groupUuid: string,
  groups: Record<string, GfxPrimitiveGroup>
): string[] {
  const children: string[] = [];

  // Находим прямых потомков
  const directChildren = Object.values(groups)
    .filter(group => group.parentGroupUuid === groupUuid)
    .map(group => group.uuid);

  children.push(...directChildren);

  // Рекурсивно находим потомков потомков
  directChildren.forEach(childUuid => {
    children.push(...findGroupChildren(childUuid, groups));
  });

  return children;
}

/**
 * Получает полный путь до группы (включая всех родителей)
 * @param groupUuid - UUID группы
 * @param groups - Record с группами
 * @returns Массив групп от корня до указанной группы
 */
export function getGroupPath(
  groupUuid: string,
  groups: Record<string, GfxPrimitiveGroup>
): GfxPrimitiveGroup[] {
  const path: GfxPrimitiveGroup[] = [];
  let currentGroup = groups[groupUuid];

  while (currentGroup) {
    path.unshift(currentGroup);
    currentGroup = currentGroup.parentGroupUuid
      ? groups[currentGroup.parentGroupUuid]
      : undefined;
  }

  return path;
}

/**
 * Проверяет, является ли группа потомком другой группы
 * @param childUuid - UUID предполагаемого потомка
 * @param ancestorUuid - UUID предполагаемого предка
 * @param groups - Record с группами
 * @returns true если childUuid является потомком ancestorUuid
 */
export function isGroupDescendant(
  childUuid: string,
  ancestorUuid: string,
  groups: Record<string, GfxPrimitiveGroup>
): boolean {
  let currentGroup = groups[childUuid];

  while (currentGroup?.parentGroupUuid) {
    if (currentGroup.parentGroupUuid === ancestorUuid) {
      return true;
    }
    currentGroup = groups[currentGroup.parentGroupUuid];
  }

  return false;
}

/**
 * Получает максимальную глубину вложенности в дереве групп
 * @param groups - Record с группами
 * @returns Максимальная глубина (0 если нет групп)
 */
export function getMaxGroupDepth(groups: Record<string, GfxPrimitiveGroup>): number {
  if (Object.keys(groups).length === 0) return 0;

  const tree = buildGroupTree(groups);
  let maxDepth = 0;

  const findMaxDepth = (nodes: GfxGroupTreeNode[]) => {
    nodes.forEach(node => {
      maxDepth = Math.max(maxDepth, node.depth);
      findMaxDepth(node.children);
    });
  };

  findMaxDepth(tree);
  return maxDepth;
}

/**
 * Получает все группы определенного уровня вложенности
 * @param depth - Уровень вложенности (0 = корневые группы)
 * @param groups - Record с группами
 * @returns Массив групп указанного уровня
 */
export function getGroupsByDepth(
  depth: number,
  groups: Record<string, GfxPrimitiveGroup>
): GfxPrimitiveGroup[] {
  const tree = buildGroupTree(groups);
  const result: GfxPrimitiveGroup[] = [];

  const collectByDepth = (nodes: GfxGroupTreeNode[], currentDepth: number) => {
    if (currentDepth === depth) {
      result.push(...nodes.map(node => node.group));
    } else if (currentDepth < depth) {
      nodes.forEach(node => collectByDepth(node.children, currentDepth + 1));
    }
  };

  collectByDepth(tree, 0);
  return result;
}

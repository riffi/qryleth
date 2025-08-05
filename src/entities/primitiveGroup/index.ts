export type {
  GfxPrimitiveGroup,
  GroupTreeNode,
  ImportConflictResolution
} from './model/types';

export {
  buildGroupTree,
  findGroupChildren,
  getGroupPath,
  isGroupDescendant,
  getMaxGroupDepth,
  getGroupsByDepth
} from './model/utils';

export {
  resolveImportConflicts,
  applyImportResolution,
  ensureValidUuids
} from './model/importUtils';

export {
  movePrimitiveToGroup,
  calculateGroupBounds,
  getGroupCenter
} from './lib/coordinateUtils';
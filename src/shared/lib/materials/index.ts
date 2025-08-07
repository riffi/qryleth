// Основной реестр материалов
export { materialRegistry } from './MaterialRegistry';

// Утилиты для резолвинга материалов
export {
  resolveMaterial,
  isEmissiveMaterial,
  isTransparentMaterial,
  isMetallicMaterial,
  materialToThreeProps,
  getMeshPropsFromMaterial,
  DEFAULT_MATERIAL,
  type MaterialResolutionContext,
} from './materialResolver';

// Предопределенные глобальные материалы
export {
  PREDEFINED_GLOBAL_MATERIALS_WITH_UUID,
  GLOBAL_MATERIAL_UUIDS
} from './globalMaterials';

// Инициализация системы материалов
export {
  initializeMaterials,
} from './initializeMaterials';

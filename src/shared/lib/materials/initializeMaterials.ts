import { materialRegistry } from './MaterialRegistry';
import { PREDEFINED_GLOBAL_MATERIALS_WITH_UUID } from './globalMaterials';

/**
 * Инициализирует систему материалов, регистрируя все предопределенные глобальные материалы
 * Должна вызываться при старте приложения
 *
 * ВАЖНО: Использует материалы с фиксированными UUID для стабильности между сессиями
 */
export function initializeMaterials(): void {
  // Очищаем реестр на всякий случай
  materialRegistry.clear();

  // Регистрируем все предопределенные глобальные материалы с фиксированными UUID
  PREDEFINED_GLOBAL_MATERIALS_WITH_UUID.forEach(material => {
    materialRegistry.registerWithUuid(material);
  });

  console.log(`Инициализирована система материалов: ${materialRegistry.globalSize} глобальных материалов с фиксированными UUID`);
}


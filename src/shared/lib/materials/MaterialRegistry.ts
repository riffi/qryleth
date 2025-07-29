import type { GfxMaterial, CreateGfxMaterial } from '@/entities/material';
import { generateUUID } from '@/shared/lib/uuid';

/**
 * Глобальный реестр материалов
 * Управляет коллекцией материалов и обеспечивает быстрый доступ по uuid
 */
class MaterialRegistry {
  private materials: Map<string, GfxMaterial> = new Map();
  private globalMaterials: Map<string, GfxMaterial> = new Map();

  /**
   * Регистрирует новый материал в реестре
   */
  register(materialData: CreateGfxMaterial): GfxMaterial {
    const material: GfxMaterial = {
      ...materialData,
      uuid: generateUUID(),
    };

    this.materials.set(material.uuid, material);
    
    if (material.isGlobal) {
      this.globalMaterials.set(material.uuid, material);
    }

    return material;
  }

  /**
   * Регистрирует материал с уже существующим UUID (для глобальных материалов)
   */
  registerWithUuid(material: GfxMaterial): GfxMaterial {
    // Проверяем, что UUID уникален
    if (this.materials.has(material.uuid)) {
      console.warn(`Material with UUID ${material.uuid} already exists, skipping registration`);
      return this.materials.get(material.uuid)!;
    }

    this.materials.set(material.uuid, material);
    
    if (material.isGlobal) {
      this.globalMaterials.set(material.uuid, material);
    }

    return material;
  }

  /**
   * Получает материал по uuid
   */
  get(uuid: string): GfxMaterial | undefined {
    return this.materials.get(uuid);
  }

  /**
   * Получает все глобальные материалы
   */
  getGlobalMaterials(): GfxMaterial[] {
    return Array.from(this.globalMaterials.values());
  }

  /**
   * Получает все материалы
   */
  getAllMaterials(): GfxMaterial[] {
    return Array.from(this.materials.values());
  }

  /**
   * Проверяет существование материала
   */
  has(uuid: string): boolean {
    return this.materials.has(uuid);
  }

  /**
   * Удаляет материал из реестра
   */
  remove(uuid: string): boolean {
    const material = this.materials.get(uuid);
    if (!material) {
      return false;
    }

    this.materials.delete(uuid);
    
    if (material.isGlobal) {
      this.globalMaterials.delete(uuid);
    }

    return true;
  }

  /**
   * Обновляет существующий материал
   */
  update(uuid: string, updates: Partial<Omit<GfxMaterial, 'uuid'>>): GfxMaterial | undefined {
    const material = this.materials.get(uuid);
    if (!material) {
      return undefined;
    }

    const updatedMaterial: GfxMaterial = {
      ...material,
      ...updates,
    };

    this.materials.set(uuid, updatedMaterial);
    
    // Обновляем глобальные материалы если нужно
    if (updatedMaterial.isGlobal) {
      this.globalMaterials.set(uuid, updatedMaterial);
    } else {
      this.globalMaterials.delete(uuid);
    }

    return updatedMaterial;
  }

  /**
   * Очищает все материалы
   */
  clear(): void {
    this.materials.clear();
    this.globalMaterials.clear();
  }

  /**
   * Получает количество зарегистрированных материалов
   */
  get size(): number {
    return this.materials.size;
  }

  /**
   * Получает количество глобальных материалов
   */
  get globalSize(): number {
    return this.globalMaterials.size;
  }
}

// Создаем единственный экземпляр реестра
export const materialRegistry = new MaterialRegistry();
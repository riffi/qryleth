import type {Transform} from "@/shared/types/transform.ts";

export interface GfxObjectInstance {
  uuid: string;
  objectUuid: string;
  transform?: Transform;
  /**
   * Опциональная ссылка на биом, внутри которого расположен данный инстанс.
   *
   * Поле используется для связи инстансов, созданных скаттерингом биома,
   * с источником генерации. Это упрощает последующее редактирование/перегенерацию
   * биома и массовые операции (удаление, обновление параметров распределения).
   */
  biomeUuid?: string;

}

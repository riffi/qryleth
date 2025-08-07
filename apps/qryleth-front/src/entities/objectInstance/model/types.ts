import type {Transform} from "@/shared/types/transform.ts";

export interface GfxObjectInstance {
  uuid: string;
  objectUuid: string;
  transform?: Transform;

}

import type {GfxPrimitive} from "../../primitive";

export interface GfxObject {
  uuid: string;
  name: string;
  primitives: GfxPrimitive[];
}

import type {GfxObject} from "../lighting";
import type {GfxObjectInstance} from "../objectInstance";
import type {GfxLayer} from "../layer";

export interface SceneObject extends GfxObject{
  layerId?: string;
  /** Controls visibility of all object instances of this object */
  visible?: boolean;
}

export interface SceneObjectInstance extends GfxObjectInstance{
  /** Visibility of a particular instance */
  visible?: boolean;
}

export interface SceneLayer extends GfxLayer{
  /** Видимость слоя в сцене **/
  visible: boolean;
  position: number;
}




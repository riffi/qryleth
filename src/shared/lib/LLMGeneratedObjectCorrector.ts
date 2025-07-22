import type {GFXObjectWithTransform, GfxPrimitive} from "@/entities";

export const correctLLMGeneratedObject = (object: GFXObjectWithTransform) => {
  const newObject = {...object};
  newObject.primitives = newObject.primitives.map((prim: GfxPrimitive) => {
    if (prim.type === 'cylinder' && prim.rotation?.[0] > 1.5) {
      return {
        ...prim,
        rotation: [0, 0, -Math.PI/2]
      };
    }
    return prim;
  });
  return newObject;
}

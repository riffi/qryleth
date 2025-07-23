import type {GFXObjectWithTransform, GfxPrimitive} from "@/entities";




const getPrimitiveBottomY = (primitive: GfxPrimitive): number => {
  const position = primitive.position || [0, 0, 0];
  const rotation = primitive.rotation || [0, 0, 0];
  const centerY = position[1];

  // Get primitive dimensions
  let width = 0, height = 0, depth = 0;

  switch (primitive.type) {
    case 'box':
      width = primitive.width || 1;
      height = primitive.height || 1;
      depth = primitive.depth || 1;
      break;
    case 'sphere':
      const radius = primitive.radius || 0.5;
      width = height = depth = radius * 2;
      break;
    case 'cylinder':
      const cylRadius = primitive.radius || 0.5;
      width = depth = cylRadius * 2;
      height = primitive.height || 1;
      break;
    case 'cone':
      const coneRadius = primitive.radius || 0.5;
      width = depth = coneRadius * 2;
      height = primitive.height || 1;
      break;
    case 'pyramid':
      width = depth = primitive.baseSize || 1;
      height = primitive.height || 1;
      break;
    case 'plane':
      return centerY;
  }

  // For sphere, rotation doesn't change the bounding box
  if (primitive.type === 'sphere') {
    return centerY - height / 2;
  }

  // Calculate rotated bounding box
  const [rx, ry, rz] = rotation;

  // Half dimensions
  const hx = width / 2;
  const hy = height / 2;
  const hz = depth / 2;

  // Calculate all 8 corners of the bounding box
  const corners = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz],
    [-hx, -hy, hz], [hx, -hy, hz], [-hx, hy, hz], [hx, hy, hz]
  ];

  // Apply rotation to each corner and find min Y
  let minY = Infinity;

  for (const [x, y, z] of corners) {
    // Apply rotation matrix (XYZ order)
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

    // Rotate around X axis
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;

    // Rotate around Y axis
    const x2 = x * cosY + z1 * sinY;
    const z2 = -x * sinY + z1 * cosY;

    // Rotate around Z axis
    const rotatedY = x2 * sinZ + y1 * cosZ;

    minY = Math.min(minY, rotatedY);
  }

  return centerY + minY;
};



export const correctLLMGeneratedObject = (
  object: GFXObjectWithTransform,
) => {

  const newObject = {...object};

  // Apply existing cylinder rotation correction
  newObject.primitives = newObject.primitives.map((prim: GfxPrimitive) => {
    if (prim.type === 'cylinder' && prim.rotation?.[0] > 1.5) {
      return {
        ...prim,
        rotation: [0, 0, -Math.PI/2]
      };
    }
    // if (prim.type === 'box'){
    //   return {
    //     ...prim,
    //     rotation: [0, -Math.PI/2,0]
    //   };
    // }
    return prim;
  });

  // Calculate the minimum Y coordinate (bottom edge) of all primitives
  const minY = Math.min(...newObject.primitives.map(getPrimitiveBottomY));



  // Calculate vertical offset to move bottom edge to target Y
  const verticalOffset =  - minY;

  // Apply vertical offset to all primitives
  if (verticalOffset !== 0) {
    newObject.primitives = newObject.primitives.map((prim: GfxPrimitive) => {
      const currentPosition = prim.position || [0, 0, 0];
      return {
        ...prim,
        position: [
          currentPosition[0],
          currentPosition[1] + verticalOffset,
          currentPosition[2]
        ]
      };
    });
  }

  return newObject;
}

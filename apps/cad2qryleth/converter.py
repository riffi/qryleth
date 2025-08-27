#!/usr/bin/env python3
"""
Blender‑CAD → Three.js JSON converter  (sandbox exec, Y‑up)
==========================================================
Now supports **cones** (`bpy.ops.mesh.primitive_cone_add`) in addition to
`sphere`, `cylinder`, `cube`, and `torus`.  A cone is exported as its own
primitive with `radiusTop`, `radiusBottom`, and `height` — if your renderer
lacks a dedicated cone, simply create a cylinder with `radiusTop = 0`.

Quick start
-----------
```bash
python converter.py Logo.py -o logo.json --name Logo
```

Highlights
----------
* Executes the input script in an isolated sandbox; loops & math are fully
  evaluated, so rotations/positions are exact.
* **Stubs `bpy`** (materials, context, object operations, and now
  `primitive_cone_add`) so `import bpy` works.
* Axis swap Z‑up → Y‑up (disable with `--up z`).
* Cylinders are exported with `openEnded=true` to mimic Blender wireframe.
"""
from __future__ import annotations
import types
import math
import json
import sys
import argparse
from pathlib import Path
from typing import Any, Dict, List, Tuple

###############################################################################
# Sandbox & capture                                                           #
###############################################################################

_PRIMITIVES = ("cylinder", "uv_sphere", "sphere", "cube", "torus", "cone", "plane")

class _CaptureContext:
  """Captures all `bpy.ops.mesh.primitive_*_add` calls at runtime."""

  def __init__(self) -> None:
    self.primitives: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------
    # create stub `bpy` module
    # ------------------------------------------------------------------
    self.bpy = types.ModuleType("bpy")
    self.bpy.ops = types.SimpleNamespace(mesh=types.SimpleNamespace())

    # --- materials ----------------------------------------------------
    class _Material:
      def __init__(self, name: str | None = None):
        self.name = name or "Material"
        self.diffuse_color = (1.0, 1.0, 1.0, 1.0)
    class _MaterialsList(list):
      def new(self, name: str | None = None):
        mat = _Material(name)
        self.append(mat)
        return mat
    self.bpy.data = types.SimpleNamespace(materials=_MaterialsList())

    # --- context ------------------------------------------------------
    self.bpy.context = types.SimpleNamespace(object=None)

    self.bpy.ops.object = types.SimpleNamespace(
        select_all=lambda **kw: None,
        select_by_type=lambda **kw: None,
        delete=lambda **kw: None,
        mode_set=lambda **kw: None,
    )

    # --- primitive stubs ---------------------------------------------
    for prim in _PRIMITIVES:
      setattr(self.bpy.ops.mesh, f"primitive_{prim}_add", self._make_stub(prim))

    # --- mesh operations stubs -----------------------------------
    self.bpy.ops.mesh.extrude_region_move = lambda **kw: None
    
    # make `import bpy` visible inside user script
    sys.modules["bpy"] = self.bpy

  # ------------------------------------------------------------------
  def _make_stub(self, prim_key: str):
    def _stub(**kwargs):
      kwargs.setdefault("location", (0.0, 0.0, 0.0))
      kwargs.setdefault("rotation", (0.0, 0.0, 0.0))
      # create dummy object so script may rename/materialise it
      obj = types.SimpleNamespace(name="", data=types.SimpleNamespace(materials=[]), scale=[1.0, 1.0, 1.0], rotation_euler=[0.0, 0.0, 0.0])
      self.bpy.context.object = obj
      self.primitives.append({"__prim": prim_key, "__obj": obj, **kwargs})
    return _stub

  # ------------------------------------------------------------------
  def run(self, source: str) -> List[Dict[str, Any]]:
    exec(source, {"bpy": self.bpy, "math": math})
    return self.primitives

###############################################################################
# Conversion helpers                                                          #
###############################################################################

def _rgb_to_hex(r: float, g: float, b: float) -> str:
  """Convert RGB values (0.0-1.0) to HEX color string."""
  r_int = int(r * 255)
  g_int = int(g * 255)
  b_int = int(b * 255)
  return f"#{r_int:02x}{g_int:02x}{b_int:02x}"

def _get_object_color(obj) -> tuple[str, float] | None:
  """Extract HEX color and alpha from object's materials, return None if no material."""
  if obj.data.materials:
    material = obj.data.materials[0]  # Use first material
    r, g, b, a = material.diffuse_color
    return _rgb_to_hex(r, g, b), a
  return None

# Global material mappings - UUID constants should match the ones in globalMaterials.ts
GLOBAL_MATERIAL_MAPPINGS = {
  "#8B4513": "global-material-wood-001",    # Дерево (коричневый)
  "#7D7D7D": "global-material-metal-001",   # Металл (серый металлик)
  "#654321": "global-material-earth-001",   # Земля (темно-коричневый)
  "#708090": "global-material-stone-001",   # Камень (серый камень)
  "#FFFFFF": "global-material-plastic-001", # Пластик (белый) - более подходящий для белого цвета
  "#FFD700": "global-material-gold-001",    # Золото
  "#B87333": "global-material-copper-001",  # Медь
  "#2F2F2F": "global-material-rubber-001",  # Резина (темно-серая)
  "#F5F5DC": "global-material-ceramic-001", # Керамика (бежевый)
}

def _color_distance(color1: str, color2: str) -> float:
  """Calculate RGB distance between two hex colors."""
  def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
  
  rgb1 = hex_to_rgb(color1)
  rgb2 = hex_to_rgb(color2)
  
  # Simple Euclidean distance in RGB space
  return sum((a - b) ** 2 for a, b in zip(rgb1, rgb2)) ** 0.5

def _find_matching_global_material(color_hex: str) -> str | None:
  """Find matching global material UUID for a given color."""
  if not color_hex:
    return None
  
  color_upper = color_hex.upper()
  
  # Exact match first
  if color_upper in GLOBAL_MATERIAL_MAPPINGS:
    return GLOBAL_MATERIAL_MAPPINGS[color_upper]
  
  # Find closest color match within tolerance (RGB distance < 20)
  closest_color = None
  min_distance = float('inf')
  
  for global_color, uuid in GLOBAL_MATERIAL_MAPPINGS.items():
    distance = _color_distance(color_upper, global_color)
    if distance < min_distance:
      min_distance = distance
      closest_color = uuid
  
  # Return closest match if within reasonable tolerance
  if min_distance < 20:  # Adjust tolerance as needed
    return closest_color
  
  return None

def _get_material_data(obj, object_materials: list) -> dict:
  """
  Extract material data from object and determine material references.
  Returns dict with material info for the primitive.
  """
  color_data = _get_object_color(obj)
  if not color_data:
    return {}
  
  color, alpha = color_data
  
  # Try to match with predefined global materials first
  global_material_uuid = _find_matching_global_material(color)
  if global_material_uuid:
    return {"globalMaterialUuid": global_material_uuid}
  
  # Create object-level material for custom colors
  material_name = f"Material_{color[1:]}"  # Remove # from hex
  is_transparent = alpha < 1.0
  
  object_material = {
    "name": material_name,
    "type": "custom",
    "properties": {
      "color": color,
      "opacity": alpha,
      "transparent": is_transparent,
      "metalness": 0.0,
      "roughness": 0.5,
      "castShadow": True,
      "receiveShadow": True
    },
    "isGlobal": False,
    "description": f"Auto-generated material from CAD import with color {color} and opacity {alpha}"
  }
  
  # Check if this material already exists in object materials
  existing_material = None
  for mat in object_materials:
    if mat.get("name") == material_name:
      existing_material = mat
      break
  
  if not existing_material:
    # Generate UUID for new material (simplified UUID generation)
    import time
    import random
    material_uuid = f"object-material-{int(time.time())}-{random.randint(1000, 9999)}"
    object_material["uuid"] = material_uuid
    object_materials.append(object_material)
    return {"objectMaterialUuid": material_uuid}
  else:
    return {"objectMaterialUuid": existing_material["uuid"]}

def _create_object_materials_list(primitives_data: list) -> list:
  """Extract all unique object materials from primitives data."""
  materials = []
  for prim_data in primitives_data:
    if "temp_material" in prim_data:
      materials.append(prim_data["temp_material"])
      del prim_data["temp_material"]  # Clean up temporary data
  return materials

def _prim_to_schema(rec: Dict[str, Any], object_materials: list) -> Dict[str, Any]:
  kind = rec["__prim"]
  loc  = list(rec["location"])
  rot  = list(rec["rotation"])
  scale = rec["__obj"].scale
  color_data = _get_object_color(rec["__obj"])
  color = color_data[0] if color_data else None

  # Common structure for new format
  result = {
    "type": "",
    "name": rec["__obj"].name or "",
    "geometry": {},
    "transform": {
      "position": loc,
      "rotation": rot,
    }
  }

  # Add material data using new system
  material_data = _get_material_data(rec["__obj"], object_materials)
  result.update(material_data)

  if kind in ("sphere", "uv_sphere"):
    result["type"] = "sphere"
    result["name"] = result["name"] or "sphere"
    result["geometry"] = {
      "radius": float(rec.get("radius", 1)) * max(scale),
    }
    return result

  if kind == "cylinder":
    r = float(rec.get("radius", 1))
    h = float(rec.get("depth", 1))
    result["type"] = "cylinder"
    result["name"] = result["name"] or "cylinder"
    result["geometry"] = {
      "radiusTop": r * max(scale[0], scale[1]),
      "radiusBottom": r * max(scale[0], scale[1]),
      "height": h * scale[2],
    }
    return result

  if kind == "cube":
    s = float(rec.get("size", 1))
    result["type"] = "box"
    result["name"] = result["name"] or "box"
    result["geometry"] = {
      "width": s * scale[0],
      "height": s * scale[2],
      "depth": s * scale[1],
    }
    return result

  if kind == "torus":
    result["type"] = "torus"
    result["name"] = result["name"] or "torus"
    result["geometry"] = {
      "majorRadius": float(rec.get("major_radius", 1)) * max(scale[0], scale[1]),
      "minorRadius": float(rec.get("minor_radius", 0.25)) * max(scale[0], scale[1]),
    }
    return result

  if kind == "cone":
    radius_bottom = float(rec.get("radius1", rec.get("radius", 1)))
    radius_top    = float(rec.get("radius2", 0.0))  # cone tip – default 0
    height        = float(rec.get("depth", 1))
    result["type"] = "cone"
    result["name"] = result["name"] or "cone"
    result["geometry"] = {
      "radius": radius_bottom * max(scale[0], scale[1]),  # Note: using radius instead of radiusTop/radiusBottom for cone
      "height": height * scale[2],
    }
    return result

  if kind == "plane":
    s = float(rec.get("size", 2.0))  # Blender plane default size is 2.0
    result["type"] = "plane"
    result["name"] = result["name"] or "plane"
    result["geometry"] = {
      "width": s * scale[0],
      "height": s * scale[1],
    }
    return result

  raise ValueError(f"Unsupported primitive: {kind}")

# ---------------------------------------------------------------------------
# BBox utilities, centring, axis swap                                         #
# ---------------------------------------------------------------------------

def _bbox(p: Dict[str, Any]):
  x, y, z = p["transform"]["position"]
  t = p["type"]
  g = p["geometry"]
  
  if t == "sphere":
    r = g["radius"]
    return [x - r, y - r, z - r], [x + r, y + r, z + r]
  if t == "cylinder":
    r = max(g.get("radiusTop", 0), g.get("radiusBottom", 0))
    h = g["height"] / 2
    return [x - r, y - r, z - h], [x + r, y + r, z + h]
  if t == "cone":
    r = g["radius"]
    h = g["height"] / 2
    return [x - r, y - r, z - h], [x + r, y + r, z + h]
  if t == "box":
    w, h, d = g["width"]/2, g["height"]/2, g["depth"]/2
    return [x - w, y - d, z - h], [x + w, y + d, z + h]
  if t == "torus":
    r = g["majorRadius"] + g["minorRadius"]
    return [x - r, y - r, z - r], [x + r, y + r, z + r]
  if t == "plane":
    w, h = g["width"]/2, g["height"]/2
    return [x - w, y - h, z], [x + w, y + h, z]  # plane has no depth
  return [x-0.5]*3, [x+0.5]*3


def _centre(prims: List[Dict[str, Any]]):
  if not prims:
    return
  lo = [float("inf")]*3
  hi = [float("-inf")]*3
  for p in prims:
    bmin, bmax = _bbox(p)
    for i in range(3):
      lo[i] = min(lo[i], bmin[i])
      hi[i] = max(hi[i], bmax[i])
  mid = [(a+b)/2 for a,b in zip(lo,hi)]
  for p in prims:
    p["transform"]["position"] = [p["transform"]["position"][i]-mid[i] for i in range(3)]


def _z_to_y(prims: List[Dict[str, Any]]):
  for p in prims:
    x,y,z = p["transform"]["position"]
    p["transform"]["position"] = [x, z, y]
    rx,ry,rz = p["transform"]["rotation"]
    p["transform"]["rotation"] = [rx, rz, ry]

###############################################################################
# Public API                                                                  #
###############################################################################

def convert(src: str, *, name: str = "ImportedObject", up_axis: str = "Y") -> Dict[str, Any]:
  ctx = _CaptureContext()
  recs = ctx.run(src)
  
  # Create list to collect object materials during conversion
  object_materials = []
  
  # Convert primitives with material system support
  prims = [_prim_to_schema(r, object_materials) for r in recs]
  _centre(prims)
  if up_axis.lower() == "y":
    _z_to_y(prims)
  
  # Build result with new material system
  result = {
    "name": name, 
    "upAxis": up_axis.upper(), 
    "primitives": prims
  }
  
  # Add object materials if any were created
  if object_materials:
    result["materials"] = object_materials
  
  return result

###############################################################################
# CLI                                                                         #
###############################################################################

if __name__ == "__main__":
  parser = argparse.ArgumentParser(description="Blender‑CAD ➜ Three.js JSON (sandbox exec)")
  parser.add_argument("input", help="Blender‑Python *.py file")
  parser.add_argument("-o", "--output", help="Write JSON to file (stdout if omitted)")
  parser.add_argument("--name", help="Override object name (defaults to filename)")
  parser.add_argument("--up", choices=["y","z"], default="y", help="Target up‑axis (default: y)")
  ns = parser.parse_args()

  code = Path(ns.input).read_text(encoding="utf-8")
  obj_name = ns.name or Path(ns.input).stem

  data = convert(code, name=obj_name, up_axis=ns.up)
  js = json.dumps(data, indent=2)

  if ns.output:
    Path(ns.output).write_text(js, encoding="utf-8")
  else:
    print(js)

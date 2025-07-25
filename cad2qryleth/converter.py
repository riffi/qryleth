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
python cad_to_three_json.py Logo.py -o logo.json --name Logo
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

_PRIMITIVES = ("cylinder", "uv_sphere", "sphere", "cube", "torus", "cone")

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
    )

    # --- primitive stubs ---------------------------------------------
    for prim in _PRIMITIVES:
      setattr(self.bpy.ops.mesh, f"primitive_{prim}_add", self._make_stub(prim))

    # make `import bpy` visible inside user script
    sys.modules["bpy"] = self.bpy

  # ------------------------------------------------------------------
  def _make_stub(self, prim_key: str):
    def _stub(**kwargs):
      kwargs.setdefault("location", (0.0, 0.0, 0.0))
      kwargs.setdefault("rotation", (0.0, 0.0, 0.0))
      # create dummy object so script may rename/materialise it
      obj = types.SimpleNamespace(name="", data=types.SimpleNamespace(materials=[]), scale=[1.0, 1.0, 1.0])
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

def _prim_to_schema(rec: Dict[str, Any]) -> Dict[str, Any]:
  kind = rec["__prim"]
  loc  = list(rec["location"])
  rot  = list(rec["rotation"])
  scale = rec["__obj"].scale

  if kind in ("sphere", "uv_sphere"):
    return {
      "type": "sphere",
      "name": rec["__obj"].name or "sphere",
      "radius": float(rec.get("radius", 1)) * max(scale),
      "position": loc,
      "rotation": rot,
    }

  if kind == "cylinder":
    r = float(rec.get("radius", 1))
    h = float(rec.get("depth", 1))
    return {
      "type": "cylinder",
      "name": rec["__obj"].name or "cylinder",
      "radiusTop": r * max(scale[0], scale[1]),
      "radiusBottom": r * max(scale[0], scale[1]),
      "height": h * scale[2],
      "openEnded": True,
      "position": loc,
      "rotation": rot,
    }

  if kind == "cube":
    s = float(rec.get("size", 1))
    return {
      "type": "box",
      "name": rec["__obj"].name or "box",
      "width": s * scale[0],
      "height": s * scale[2],
      "depth": s * scale[1],
      "position": loc,
      "rotation": rot,
    }

  if kind == "torus":
    return {
      "type": "torus",
      "name": rec["__obj"].name or "torus",
      "majorRadius": float(rec.get("major_radius", 1)) * max(scale[0], scale[1]),
      "minorRadius": float(rec.get("minor_radius", 0.25)) * max(scale[0], scale[1]),
      "position": loc,
      "rotation": rot,
    }

  if kind == "cone":
    radius_bottom = float(rec.get("radius1", rec.get("radius", 1)))
    radius_top    = float(rec.get("radius2", 0.0))  # cone tip – default 0
    height        = float(rec.get("depth", 1))
    return {
      "type": "cone",
      "name": rec["__obj"].name or "cone",
      "radiusTop": radius_top * max(scale[0], scale[1]),
      "radiusBottom": radius_bottom * max(scale[0], scale[1]),
      "height": height * scale[2],
      "openEnded": True,
      "position": loc,
      "rotation": rot,
    }

  raise ValueError(f"Unsupported primitive: {kind}")

# ---------------------------------------------------------------------------
# BBox utilities, centring, axis swap                                         #
# ---------------------------------------------------------------------------

def _bbox(p: Dict[str, Any]):
  x, y, z = p["position"]
  t = p["type"]
  if t == "sphere":
    r = p["radius"]
    return [x - r, y - r, z - r], [x + r, y + r, z + r]
  if t in {"cylinder", "cone"}:
    r = max(p.get("radiusTop", 0), p.get("radiusBottom", 0))
    h = p["height"] / 2
    return [x - r, y - r, z - h], [x + r, y + r, z + h]
  if t == "box":
    w, h, d = p["width"]/2, p["height"]/2, p["depth"]/2
    return [x - w, y - d, z - h], [x + w, y + d, z + h]
  if t == "torus":
    r = p["majorRadius"] + p["minorRadius"]
    return [x - r, y - r, z - r], [x + r, y + r, z + r]
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
    p["position"] = [p["position"][i]-mid[i] for i in range(3)]


def _z_to_y(prims: List[Dict[str, Any]]):
  for p in prims:
    x,y,z = p["position"]
    p["position"] = [x, z, y]
    rx,ry,rz = p["rotation"]
    p["rotation"] = [rx, rz, ry]

###############################################################################
# Public API                                                                  #
###############################################################################

def convert(src: str, *, name: str = "ImportedObject", up_axis: str = "Y") -> Dict[str, Any]:
  ctx = _CaptureContext()
  recs = ctx.run(src)
  prims = [_prim_to_schema(r) for r in recs]
  _centre(prims)
  if up_axis.lower() == "y":
    _z_to_y(prims)
  return {"name": name, "upAxis": up_axis.upper(), "primitives": prims}

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

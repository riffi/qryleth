import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Step 2: Create the Body
bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=1.0, location=(0, 0, 0.5))
body = bpy.context.object
body.name = "Body"

# Step 3: Create the Plunger
bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=1.2, location=(0, 0, 0.7))
plunger = bpy.context.object
plunger.name = "Plunger"

# Step 4: Create the Needle
bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.5, location=(0, 0, -0.25))
needle = bpy.context.object
needle.name = "Needle"

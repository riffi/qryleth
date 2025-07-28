
import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Step 2: Create the Drum Body
bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=1.5, location=(0, 0, 0.75))
drum_body = bpy.context.object
drum_body.name = "Drum Body"

# Step 3: Create the Drumhead
bpy.ops.mesh.primitive_cylinder_add(radius=1.05, depth=0.05, location=(0, 0, 1.525))
drumhead = bpy.context.object
drumhead.name = "Drumhead"

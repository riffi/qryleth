
import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
body_color = bpy.data.materials.new(name="Body Color")
body_color.diffuse_color = (0.5, 0.25, 0.1, 1) # Medium brown color
lid_color = bpy.data.materials.new(name="Lid Color")
lid_color.diffuse_color = (0.3, 0.15, 0.05, 1) # Darker brown color
knob_color = bpy.data.materials.new(name="Knob Color")
knob_color.diffuse_color = (0.2, 0.1, 0.05, 1) # Very dark brown color

# Step 2: Create the Body
bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=2, location=(0, 0, 1))
body = bpy.context.object
body.name = "Body"
body.data.materials.append(body_color)

# Step 3: Create the Spout
bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=0.5, location=(1.1, 0, 1.5), rotation=(1.57, 0, 0))
spout = bpy.context.object
spout.name = "Spout"
spout.data.materials.append(body_color)

# Step 4: Create the Handle
bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.1, location=(-1.1, 0, 1.5), rotation=(0, 1.57, 0))
handle = bpy.context.object
handle.name = "Handle"
handle.data.materials.append(body_color)

# Step 5: Create the Lid
bpy.ops.mesh.primitive_cylinder_add(radius=1.05, depth=0.1, location=(0, 0, 2.05))
lid = bpy.context.object
lid.name = "Lid"
lid.data.materials.append(lid_color)

# Step 6: Create the Knob
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(0, 0, 2.15))
knob = bpy.context.object
knob.name = "Knob"
knob.data.materials.append(knob_color)

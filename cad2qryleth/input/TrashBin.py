import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
bin_color = bpy.data.materials.new(name="Bin Color")
bin_color.diffuse_color = (0.2, 0.2, 0.2, 1) # Dark gray color
lid_color = bpy.data.materials.new(name="Lid Color")
lid_color.diffuse_color = (0.3, 0.3, 0.3, 1) # Slightly lighter gray color

# Step 2: Create the Bin
bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=2, location=(0, 0, 1))
bin = bpy.context.object
bin.name = "Trash Bin"
bin.data.materials.append(bin_color)

# Step 3: Create the Lid
bpy.ops.mesh.primitive_cylinder_add(radius=1.05, depth=0.1, location=(0, 0, 2.05))
lid = bpy.context.object
lid.name = "Lid"
lid.data.materials.append(lid_color)

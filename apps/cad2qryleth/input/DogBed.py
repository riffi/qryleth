import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
bed_color = bpy.data.materials.new(name="Bed Color")
bed_color.diffuse_color = (0.5, 0.35, 0.05, 1) # Brown color
bottom_color = bpy.data.materials.new(name="Bottom Color")
bottom_color.diffuse_color = (0.1, 0.1, 0.1, 1) # Dark gray color

# Step 2: Create the Raised Edges
bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=0.2, location=(0, 0, 0.1))
edges = bpy.context.object
edges.name = "Edges"
edges.data.materials.append(bed_color)

# Step 3: Create the Flat Sleeping Area
bpy.ops.mesh.primitive_cylinder_add(radius=0.9, depth=0.1, location=(0, 0, 0.05))
sleeping_area = bpy.context.object
sleeping_area.name = "Sleeping Area"
sleeping_area.data.materials.append(bed_color)

# Step 4: Create the Non-Slip Bottom
bpy.ops.mesh.primitive_cylinder_add(radius=1.1, depth=0.05, location=(0, 0, 0))
bottom = bpy.context.object
bottom.name = "Bottom"
bottom.data.materials.append(bottom_color)

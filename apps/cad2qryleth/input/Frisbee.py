import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
blue = bpy.data.materials.new(name="Blue")
blue.diffuse_color = (0.0, 0.0, 1.0, 1) # Blue color
white = bpy.data.materials.new(name="White")
white.diffuse_color = (1.0, 1.0, 1.0, 1) # White color

# Step 2: Create the Main Body of the Frisbee
bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=0.1, location=(0, 0, 0))
body = bpy.context.object
body.name = "Frisbee Body"
body.data.materials.append(blue)

# Step 3: Create the Outer Ring of the Frisbee
bpy.ops.mesh.primitive_torus_add(major_radius=1.05, minor_radius=0.05, location=(0, 0, 0))
outer_ring = bpy.context.object
outer_ring.name = "Outer Ring"
outer_ring.data.materials.append(white)

# Step 4: Create the Inner Ring of the Frisbee
bpy.ops.mesh.primitive_torus_add(major_radius=0.95, minor_radius=0.05, location=(0, 0, 0))
inner_ring = bpy.context.object
inner_ring.name = "Inner Ring"
inner_ring.data.materials.append(blue)

import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the color
wood_color = bpy.data.materials.new(name="Wood")
wood_color.diffuse_color = (0.55, 0.27, 0.07, 1) # Wood color

# Step 2: Create the Table Top
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.75))
table_top = bpy.context.object
table_top.scale[0] = 1.5 # Scale along X-axis
table_top.scale[1] = 0.75 # Scale along Y-axis
table_top.scale[2] = 0.1 # Scale along Z-axis
table_top.name = "Table Top"
table_top.data.materials.append(wood_color)

# Step 3: Create the Legs
leg_height = 0.5
leg_radius = 0.05
positions = [(-1.4, -0.7, leg_height / 2), (1.4, -0.7, leg_height / 2), (-1.4, 0.7, leg_height / 2), (1.4, 0.7, leg_height / 2)]

for i, pos in enumerate(positions):
  bpy.ops.mesh.primitive_cylinder_add(radius=leg_radius, depth=leg_height, location=pos)
  leg = bpy.context.object
  leg.name = f"Leg {i + 1}"
  leg.data.materials.append(wood_color)

# Step 4: Create the Lower Shelf
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.25))
shelf = bpy.context.object
shelf.scale[0] = 1.4 # Scale along X-axis
shelf.scale[1] = 0.7 # Scale along Y-axis
shelf.scale[2] = 0.05 # Scale along Z-axis
shelf.name = "Lower Shelf"
shelf.data.materials.append(wood_color)

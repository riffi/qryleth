
import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the color for the bookshelf
wood_color = bpy.data.materials.new(name="Wood")
wood_color.diffuse_color = (0.55, 0.27, 0.07, 1) # Brown wood color

# Step 2: Create the Shelves
shelf_height = 0.1
shelf_depth = 0.2
shelf_width = 0.5
num_shelves = 5
shelf_spacing = 0.4

for i in range(num_shelves):
  bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, i * shelf_spacing))
shelf = bpy.context.object
shelf.scale = (shelf_width / 2, shelf_depth / 2, shelf_height / 2)
shelf.name = f"Shelf {i + 1}"
shelf.data.materials.append(wood_color)

# Step 3: Create the Side Panels
panel_thickness = 0.05
panel_height = num_shelves * shelf_spacing

for i in range(2):
  x = (shelf_width / 2) * (i * 2 - 1)
bpy.ops.mesh.primitive_cube_add(size=2, location=(x, 0, panel_height / 2))
panel = bpy.context.object
panel.scale = (panel_thickness / 2, shelf_depth / 2, panel_height / 2)
panel.name = f"Side Panel {i + 1}"
panel.data.materials.append(wood_color)

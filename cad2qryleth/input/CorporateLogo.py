import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
bold_red = bpy.data.materials.new(name="Bold Red")
bold_red.diffuse_color = (1, 0, 0, 1) # Bold red color
bold_blue = bpy.data.materials.new(name="Bold Blue")
bold_blue.diffuse_color = (0, 0, 1, 1) # Bold blue color

# Step 2: Create the Geometric Shape (Circle)
bpy.ops.mesh.primitive_circle_add(radius=1, location=(0, 0, 0))
circle = bpy.context.object
circle.name = "Circle"
circle.data.materials.append(bold_red)

# Step 3: Create the Geometric Shape (Square)
bpy.ops.mesh.primitive_cube_add(size=1, location=(2, 0, 0))
square = bpy.context.object
square.name = "Square"
square.scale = (1, 1, 0.1)
square.data.materials.append(bold_blue)

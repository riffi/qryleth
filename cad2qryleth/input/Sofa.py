import bpy


# Define the colors
sofa_color = bpy.data.materials.new(name="Sofa Color")
sofa_color.diffuse_color = (0.5, 0.25, 0.25, 1) # Medium brown color

# Step 2: Create the Seat
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.5))
seat = bpy.context.object
seat.scale = (2, 1, 0.2)
seat.name = "Seat"
seat.data.materials.append(sofa_color)

# Step 3: Create the Backrest
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, -0.75, 1.1))
backrest = bpy.context.object
backrest.scale = (2, 0.1, 0.6)
backrest.name = "Backrest"
backrest.data.materials.append(sofa_color)

# Step 4: Create the Armrests
for i in range(2):
  x = 1.9 * (i * 2 - 1)
  bpy.ops.mesh.primitive_cube_add(size=2, location=(x, 0, 0.75))
  armrest = bpy.context.object
  armrest.scale = (0.1, 1, 0.4)
  armrest.name = f"Armrest {i + 1}"
  armrest.data.materials.append(sofa_color)

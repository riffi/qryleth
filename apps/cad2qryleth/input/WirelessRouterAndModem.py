import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
black = bpy.data.materials.new(name="Black")
black.diffuse_color = (0, 0, 0, 1) # Black color
green = bpy.data.materials.new(name="Green")
green.diffuse_color = (0, 1, 0, 1) # Green color

# Step 2: Create the Router
# Router Body
bpy.ops.mesh.primitive_cube_add(size=1, location=(-2, 0, 0.5))
router_body = bpy.context.object
router_body.name = "Router Body"
router_body.scale = (1.5, 1, 0.5)
router_body.data.materials.append(black)

# Antennas
for i in range(3):
  x = -2 + 0.5 * (i - 1)
  bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=1, location=(x, 0, 1.25))
  antenna = bpy.context.object
  antenna.name = f"Router Antenna {i + 1}"
antenna.data.materials.append(black)

# LED Indicators
for i in range(3):
  x = -2 + 0.5 * (i - 1)
  bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(x, 0.5, 0.5))
  led = bpy.context.object
  led.name = f"Router LED {i + 1}"
  led.data.materials.append(green)

# Step 3: Create the Modem
# Modem Body
bpy.ops.mesh.primitive_cube_add(size=1, location=(2, 0, 0.5))
modem_body = bpy.context.object
modem_body.name = "Modem Body"
modem_body.scale = (1, 0.5, 0.5)
modem_body.data.materials.append(black)

# Antenna
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.5, location=(2, 0, 1.25))
modem_antenna = bpy.context.object
modem_antenna.name = "Modem Antenna"
modem_antenna.data.materials.append(black)

# LED Indicators
for i in range(2):
  x = 2 + 0.2 * (i - 0.5)
  bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(x, 0.5, 0.5))
  led = bpy.context.object
  led.name = f"Modem LED {i + 1}"
  led.data.materials.append(green)

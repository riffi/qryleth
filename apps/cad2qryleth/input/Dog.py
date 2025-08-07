import bpy
import math

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
body_color = bpy.data.materials.new(name="Body Color")
body_color.diffuse_color = (0.8, 0.2, 0.2, 1)  # Red color for the body
eye_color = bpy.data.materials.new(name="Eye Color")
eye_color.diffuse_color = (0, 0, 0, 1)  # Black color for the eyes
ear_color = bpy.data.materials.new(name="Ear Color")
ear_color.diffuse_color = (0.8, 0.2, 0.2, 1)  # Red color for the ears
tail_color = bpy.data.materials.new(name="Tail Color")
tail_color.diffuse_color = (0.8, 0.2, 0.2, 1)  # Red color for the tail

# Step 2: Create the Body
bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=2, location=(0, 0, 1))
body = bpy.context.object
body.name = "Body"
body.data.materials.append(body_color)

# Step 3: Create the Legs
for i in range(4):
    x = 0.8 * (i % 2) - 0.4
    y = 0.8 * (i // 2) - 0.4
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=1, location=(x, y, 0.5))
    leg = bpy.context.object
    leg.name = f"Leg {i + 1}"
    leg.data.materials.append(body_color)

# Step 4: Create the Head
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0, 0, 2.5))
head = bpy.context.object
head.name = "Head"
head.data.materials.append(body_color)

# Step 5: Create the Nose
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(0, 0.5, 2.5))
nose = bpy.context.object
nose.name = "Nose"
nose.data.materials.append(body_color)

# Step 6: Create the Eyes
for i in range(2):
    x = 0.3 * (i * 2 - 1)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(x, 0.5, 2.7))
    eye = bpy.context.object
    eye.name = f"Eye {i + 1}"
    eye.data.materials.append(eye_color)

# Step 7: Create the Ears
for i in range(2):
    x = 0.5 * (i * 2 - 1)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(x, 0.5, 2.3))
    ear = bpy.context.object
    ear.name = f"Ear {i + 1}"
    ear.data.materials.append(ear_color)

# Step 8: Create the Tail
bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=1, location=(0, -1, 0.5), rotation=(0, 0, math.pi/2))
tail = bpy.context.object
tail.name = "Tail"
tail.data.materials.append(tail_color)
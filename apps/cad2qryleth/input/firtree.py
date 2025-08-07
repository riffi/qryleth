import bpy
import math

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
brown = bpy.data.materials.new(name="Brown")
brown.diffuse_color = (0.55, 0.27, 0.07, 1)  # Brown color for the trunk
green = bpy.data.materials.new(name="Green")
green.diffuse_color = (0.0, 0.5, 0.0, 1)  # Green color for the leaves

# Step 2: Create the Trunk (Cone)
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.1, radius2=0, depth=1, location=(0, 0, 0.5))
trunk = bpy.context.object
trunk.name = "Trunk"
trunk.data.materials.append(brown)

# Step 3: Create the Branches
branch_positions = [
    (0.3, 0, 1.2), (-0.3, 0, 1.2),
    (0.15, 0.3, 1.2), (-0.15, -0.3, 1.2),
    (0.15, -0.3, 1.2), (-0.15, 0.3, 1.2)
]

for pos in branch_positions:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.6, location=pos)
    branch = bpy.context.object
    branch.name = "Branch"
    branch.data.materials.append(brown)

# Step 4: Create the Leaves
leaf_positions = [
    (0.45, 0, 1.8), (-0.45, 0, 1.8),
    (0.3, 0.3, 1.8), (-0.3, -0.3, 1.8),
    (0.3, -0.3, 1.8), (-0.3, 0.3, 1.8),
    (0.6, 0, 1.8), (-0.6, 0, 1.8),
    (0.45, 0.3, 1.8), (-0.45, -0.3, 1.8)
]

for pos in leaf_positions:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=pos)
    leaf = bpy.context.object
    leaf.name = "Leaf"
    leaf.data.materials.append(green)
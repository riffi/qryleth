import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
umbrella_color = bpy.data.materials.new(name="Umbrella Color")
umbrella_color.diffuse_color = (0.2, 0.2, 0.2, 1) # Dark gray color

# Step 2: Create the Umbrella Canopy
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=1, radius2=0, depth=0.5, location=(0, 0, 0.25))
canopy = bpy.context.object
canopy.name = "Canopy"
canopy.data.materials.append(umbrella_color)

# Step 3: Create the Umbrella Handle
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=2, location=(0, 0, -1))
handle = bpy.context.object
handle.name = "Handle"
handle.data.materials.append(umbrella_color)

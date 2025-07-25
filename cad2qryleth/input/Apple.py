import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
apple_red = bpy.data.materials.new(name="Apple Red")
apple_red.diffuse_color = (0.8, 0.1, 0.1, 1) # Red color for the apple
stem_brown = bpy.data.materials.new(name="Stem Brown")
stem_brown.diffuse_color = (0.4, 0.2, 0, 1) # Brown color for the stem
leaf_green = bpy.data.materials.new(name="Leaf Green")
leaf_green.diffuse_color = (0.0, 0.5, 0.0, 1) # Green color for the leaf

# Step 2: Create the Apple
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0, 0, 0))
apple = bpy.context.object
apple.name = "Apple"
apple.data.materials.append(apple_red)

# Step 3: Create the Stem
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.3, location=(0, 0, 1.15))
stem = bpy.context.object
stem.name = "Stem"
stem.data.materials.append(stem_brown)

# Step 4: Create the Leaf
bpy.ops.mesh.primitive_plane_add(size=0.2, location=(0, 0, 1.4))
leaf = bpy.context.object
leaf.name = "Leaf"
leaf.data.materials.append(leaf_green)
leaf.rotation_euler = (1.57, 0, 0)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={"value":(0, 0, 0.05)})
bpy.ops.object.mode_set(mode='OBJECT')

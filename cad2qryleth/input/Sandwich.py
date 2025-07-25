import bpy

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
bread_color = bpy.data.materials.new(name="Bread")
bread_color.diffuse_color = (0.76, 0.60, 0.42, 1) # Light brown color for bread
lettuce_color = bpy.data.materials.new(name="Lettuce")
lettuce_color.diffuse_color = (0.13, 0.55, 0.13, 1) # Green color for lettuce
tomato_color = bpy.data.materials.new(name="Tomato")
tomato_color.diffuse_color = (0.89, 0.15, 0.07, 1) # Red color for tomato
cheese_color = bpy.data.materials.new(name="Cheese")
cheese_color.diffuse_color = (1.0, 0.83, 0.0, 1) # Yellow color for cheese
ham_color = bpy.data.materials.new(name="Ham")
ham_color.diffuse_color = (0.91, 0.59, 0.48, 1) # Pink color for ham

# Step 2: Create the Bottom Bread Slice
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
bottom_bread = bpy.context.object
bottom_bread.scale[2] = 0.1 # Make it flat
bottom_bread.name = "Bottom Bread"
bottom_bread.data.materials.append(bread_color)

# Step 3: Create the Lettuce Layer
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.2))
lettuce = bpy.context.object
lettuce.scale[2] = 0.05 # Make it flat
lettuce.name = "Lettuce"
lettuce.data.materials.append(lettuce_color)

# Step 4: Create the Tomato Slices
for i in range(2):
  x = -0.8 + i * 1.6
bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.05, location=(x, 0, 0.3))
tomato = bpy.context.object
tomato.name = f"Tomato {i + 1}"
tomato.data.materials.append(tomato_color)

# Step 5: Create the Cheese Layer
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.4))
cheese = bpy.context.object
cheese.scale[2] = 0.05 # Make it flat
cheese.name = "Cheese"
cheese.data.materials.append(cheese_color)

# Step 6: Create the Ham Slice
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.5))
ham = bpy.context.object
ham.scale[2] = 0.1 # Make it flat
ham.name = "Ham"
ham.data.materials.append(ham_color)

# Step 7: Create the Top Bread Slice
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.7))
top_bread = bpy.context.object
top_bread.scale[2] = 0.1 # Make it flat
top_bread.name = "Top Bread"
top_bread.data.materials.append(bread_color)

import bpy
import random

# Step 1: Clear the Scene
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Define the colors
dough_color = bpy.data.materials.new(name="Dough")
dough_color.diffuse_color = (0.9, 0.7, 0.4, 1) # Light brown color for dough
tomato_sauce_color = bpy.data.materials.new(name="Tomato Sauce")
tomato_sauce_color.diffuse_color = (0.8, 0.1, 0.1, 1) # Red color for tomato sauce
cheese_color = bpy.data.materials.new(name="Cheese")
cheese_color.diffuse_color = (1, 0.9, 0.5, 1) # Yellowish color for cheese
pepperoni_color = bpy.data.materials.new(name="Pepperoni")
pepperoni_color.diffuse_color = (0.6, 0.1, 0.1, 1) # Dark red color for pepperoni
olive_color = bpy.data.materials.new(name="Olive")
olive_color.diffuse_color = (0.1, 0.1, 0.1, 1) # Black color for olives

# Step 2: Create the Pizza Base
bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=0.1, location=(0, 0, 0))
pizza_base = bpy.context.object
pizza_base.name = "Pizza Base"
pizza_base.data.materials.append(dough_color)

# Step 3: Create the Tomato Sauce Layer
bpy.ops.mesh.primitive_cylinder_add(radius=0.95, depth=0.02, location=(0, 0, 0.06))
tomato_sauce = bpy.context.object
tomato_sauce.name = "Tomato Sauce"
tomato_sauce.data.materials.append(tomato_sauce_color)

# Step 4: Create the Cheese Layer
bpy.ops.mesh.primitive_cylinder_add(radius=0.9, depth=0.02, location=(0, 0, 0.08))
cheese = bpy.context.object
cheese.name = "Cheese"
cheese.data.materials.append(cheese_color)

# Step 5: Create Pepperoni Toppings
for i in range(8):
  x = random.uniform(-0.7, 0.7)
  y = random.uniform(-0.7, 0.7)
  bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.02, location=(x, y, 0.1))
  pepperoni = bpy.context.object
  pepperoni.name = f"Pepperoni {i + 1}"
  pepperoni.data.materials.append(pepperoni_color)

# Step 6: Create Olive Toppings
for i in range(10):
  x = random.uniform(-0.6, 0.6)
  y = random.uniform(-0.6, 0.6)
  bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.02, location=(x, y, 0.1))
  olive = bpy.context.object
  olive.name = f"Olive {i + 1}"
  olive.data.materials.append(olive_color)

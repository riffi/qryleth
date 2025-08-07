import bpy
import math

# Шаг 1: Очистка сцены
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Определение цвета
color = bpy.data.materials.new(name="Color")
color.diffuse_color = (0.8, 0.8, 0.8, 1)  # Белый цвет

# Шаг 2: Создание колонн
for i in range(4):
    x = 1.5 * (i % 2) - 0.75
    y = 1.5 * (i // 2) - 0.75
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=2, location=(x, y, 1))
    column = bpy.context.object
    column.name = f"Column {i + 1}"
    column.data.materials.append(color)

# Шаг 3: Создание крыши
bpy.ops.mesh.primitive_cone_add(radius1=1.5, depth=1, location=(0, 0, 2.5))
roof = bpy.context.object
roof.name = "Roof"
roof.data.materials.append(color)

# Шаг 4: Создание стены
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 1))
wall = bpy.context.object
wall.name = "Wall"
wall.scale = (1, 0.1, 1)
wall.data.materials.append(color)
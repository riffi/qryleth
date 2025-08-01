import bpy
import math

# Очистка сцены
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Определение цветов
wood_color = bpy.data.materials.new(name="Wood")
wood_color.diffuse_color = (0.55, 0.27, 0.07, 1)  # Wood color

# Создание колонн
for i in range(4):
    x = 1.5 * (i % 2) - 0.75
    y = 1.5 * (i // 2) - 0.75
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=2, location=(x, y, 1))
    column = bpy.context.object
    column.name = f"Column {i + 1}"
    column.data.materials.append(wood_color)

# Создание крыши
bpy.ops.mesh.primitive_cone_add(radius1=1.5, depth=1, location=(0, 0, 2.5))
roof = bpy.context.object
roof.name = "Roof"
roof.data.materials.append(wood_color)

# Создание фонаря на крыше
bpy.ops.object.light_add(type='POINT', radius=0.2, location=(0, 0, 3))
lamp = bpy.context.object
lamp.name = "Lamp"
bpy.ops.object.select_all(action='DESELECT')
roof.select_set(True)
bpy.context.view_layer.objects.active = roof
bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)

# Установка фонаря
bpy.ops.object.select_all(action='DESELECT')
lamp.select_set(True)
bpy.context.view_layer.objects.active = lamp
bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)
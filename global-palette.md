# 🟢 Постановка задачи для ИИ агента: внедрение глобальных палитр

## 🎯 Цель
Добавить поддержку **глобальных палитр цветов** в Qryleth, чтобы:
- Сцена имела одну палитру, управляющую цветами террейна, воды, неба, тумана и объектов.
- Материалы объектов могли брать цвет либо напрямую (`fixed`), либо из роли палитры (`role`).
- В будущем это позволило бы легко менять настроение всей сцены одной палитрой.


## 📂 Новые типы

### Палитра
```
export type PaletteRole =
  | 'sky' | 'fog' | 'water'
  | 'foliage' | 'wood' | 'rock' | 'metal', 'sand', 'ground', 'snow',  'accent';


export interface GlobalPalette {
  uuid: string;
  name: string;
  colors: Record<PaletteRole, string>;
}
```

###Источник цвета материала
```
export type ColorSource =
  | { type: 'fixed' }                                      // использовать свойство color
  | { type: 'role'; role: PaletteRole; tint?: number };    // взять из палитры + опциональный tint

export interface GfxMaterial {
  uuid: string;
  name: string;
  color?: string;                // если fixed
  colorSource?: ColorSource;     // если role
  // остальные свойства (roughness, metalness и т.д.)
}

export interface SceneData {
  uuid: string;
  name: string;
  paletteUuid?: string;            // ссылка на GlobalPalette
  // остальные поля (слои, объекты, освещение)
}
```

## Логика работы
###Резолв цвета материала

Если colorSource.type === 'fixed' → используем material.color.
Если colorSource.type === 'role' → берём цвет из palette.colors[role].

Если есть tint (от -1 до +1), модифицируем яркость:
- tint > 0 → осветляем.
- tint < 0 → затемняем.


### Террейн
В GfxMultiColorPaletteStop дать возможность цвет задавать из colorSource?: ColorSource;

### Вода
для простого вида воды цвет воды берём из palette.colors.water

### Туман и небо

Цвет тумана берём из palette.colors.fog.
Цвет неба/скайдома берём из palette.colors.sky.

## В рантайме

При загрузке сцены резолвим все материалы через resolveMaterialColor.

Если пользователь меняет палитру — обновляем все связанные материалы и шейдерные uniform’ы (туман, скай).

## Палитры по-умолчанию
```
export const QRYLETH_DEFAULT: GlobalPalette = {
  uuid: 'default',
  name: 'Qryleth Default',
  colors: {
    sky: '#7fb3ff',
    fog: '#9fb8c8',
    water: '#4aa3c7',
    foliage: '#4a7c59',
    wood: '#6a4b3b',
    rock: '#8a8a8a',
    metal: '#9fa3a7',
    sand:  '#d9c18f',
    ground:'#6b4f36',
    snow:  '#ffffff',      
    accent:'#d98f4a',
  }
};

export const QRYLETH_AUTUMN: GlobalPalette = {
  uuid: 'autumn',
  name: 'Qryleth Autumn',
  colors: {
    sky:    '#d0a36b', // тёплое осеннее небо, с золотистым оттенком
    fog:    '#c7a98c', // мягкий туман с бежево-серым оттенком
    water:  '#4a7c7c', // чуть более холодная, приглушённая вода для контраста
    foliage:'#c56b2c', // листво-оранжевый (золотая осень)
    wood:   '#8b5a2b', // насыщенно-коричневый, сухая древесина
    rock:   '#7f7f7f', // серо-каменный, без изменений
    metal:  '#9fa3a7', // оставляем нейтральным
    sand:   '#d8b56a', // песок теплее, с золотистым отливом
    ground: '#7c4a2d', // земля — тёплый коричнево-красный
    snow:   '#f2f2f2', // лёгкий кремово-белый, чтобы не выбивался из общей гаммы
    accent: '#e07a3c', // яркий акцент — тыквенно-оранжевый
  }
};
```

## ДОработка глобальных материалов
Перевести все глобальные материалы на источник цвета - role, оставлять кастомный цвет только если в палитре нет подходящей роли.

## Доработка редактора объектов
В редакторе объекта в панели свойств материала давать добавить переключатель источника цвета: fixed / role.
Если выбран fixed - работать с цветом как сейчас
Если выбран role - показывать цвет + крутилку для tint

## Доработка sceneObjectManager
Добавить в sceneObjectManager выбор палитры из выпадающего списка. При выборе палитры применять ее во всех ссылающихся элементах сцены

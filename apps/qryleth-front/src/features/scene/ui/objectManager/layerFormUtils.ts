import { DEFAULT_LANDSCAPE_COLOR } from '@/features/scene/constants.ts'
import type { SceneLayer } from '@/entities/scene/types'
import { GfxLayerType } from '@/entities/layer'

/**
 * Режим работы модального окна слоя сцены.
 * 'create' - создание нового слоя, 'edit' - редактирование существующего.
 */
export type SceneLayerModalMode = 'create' | 'edit'

/**
 * Создать пустую структуру слоя со значениями по умолчанию.
 * Используется для инициализации формы создания или редактирования слоя.
 */
export const createEmptySceneLayer = (): SceneLayer => ({
    id: '',
    name: '',
    // По умолчанию создаётся «объектный» слой
    type: GfxLayerType.Object,
    width: 10,
    height: 10,
    shape: 'plane',
    color: DEFAULT_LANDSCAPE_COLOR,
    visible: true,
    position: 0
})


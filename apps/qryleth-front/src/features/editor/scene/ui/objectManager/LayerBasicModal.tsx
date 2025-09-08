import React, { useMemo, useState } from 'react'
import { Modal, Stack, TextInput, Select, Group, Button } from '@mantine/core'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import { GfxLayerType } from '@/entities/layer'
import type { SceneLayer } from '@/entities/scene/types'

export interface LayerBasicModalProps {
  opened: boolean
  mode: 'create' | 'edit'
  initial?: { id?: string; name?: string; type?: GfxLayerType }
  /**
   * Фиксированный тип слоя для режима создания.
   * Если задан, селект выбора типа скрывается, а тип слоя принудительно
   * устанавливается как fixedType (пользователь не меняет его вручную).
   */
  fixedType?: GfxLayerType
  onClose: () => void
}

/**
 * Модалка базового слоя: создание/редактирование с полями «тип» и «название».
 *
 * - В режиме create создаёт тонкий слой (id генерируется в store). Для типов Landscape/Water
 *   никаких параметров содержимого не задаётся — их редактирование вынесено в отдельные окна.
 * - В режиме edit позволяет переименовать слой (тип не изменяется).
 */
export const LayerBasicModal: React.FC<LayerBasicModalProps> = ({ opened, mode, initial, fixedType, onClose }) => {
  const createLayer = useSceneStore(state => state.createLayer)
  const updateLayer = useSceneStore(state => state.updateLayer)
  const layers = useSceneStore(state => state.layers)

  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<GfxLayerType | undefined>(fixedType ?? initial?.type)

  const layerOptions = useMemo(() => ([
    { value: GfxLayerType.Object, label: 'Object' },
    { value: GfxLayerType.Landscape, label: 'Landscape' },
    { value: GfxLayerType.Water, label: 'Вода' },
  ]), [])

  const onCreate = () => {
    const nm = (name || '').trim()
    const finalType = fixedType ?? type
    if (!nm || !finalType) return
    const base: Omit<SceneLayer, 'id'> = {
      name: nm,
      type: finalType,
      visible: true,
      position: layers.length,
    } as any
    createLayer(base)
    onClose()
  }

  const onUpdate = () => {
    const nm = (name || '').trim()
    if (!nm || !initial?.id) return
    updateLayer(initial.id, { name: nm })
    onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title={mode === 'create' ? 'Создать слой' : 'Переименовать слой'}>
      <Stack>
        {mode === 'create' && !fixedType && (
          <Select
            label="Тип слоя"
            placeholder="Выберите тип"
            data={layerOptions}
            value={type}
            onChange={(v) => setType(v as GfxLayerType)}
            withinPortal
          />
        )}
        <TextInput
          label="Название"
          placeholder="Введите название слоя"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          {mode === 'create' ? (
            <Button onClick={onCreate} disabled={!type || !name.trim()}>Создать</Button>
          ) : (
            <Button onClick={onUpdate} disabled={!name.trim()}>Сохранить</Button>
          )}
        </Group>
      </Stack>
    </Modal>
  )
}

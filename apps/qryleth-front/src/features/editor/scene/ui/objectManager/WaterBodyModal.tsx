import React, { useEffect, useState } from 'react'
import { Modal, Stack, Select, NumberInput, Group, Button, TextInput } from '@mantine/core'
import { useSceneStore } from '@/features/editor/scene/model/sceneStore'
import type { GfxWaterBody } from '@/entities/water'
import { generateUUID } from '@/shared/lib/uuid'

export interface WaterBodyModalProps {
  opened: boolean
  mode: 'create' | 'edit'
  targetLayerId: string | null
  initial?: { layerId: string; body: GfxWaterBody } | null
  onClose: () => void
}

/**
 * Окно создания/редактирования GfxWaterBody.
 * Переносит водные параметры из старых модалок на уровень водного объекта.
 * На текущем этапе поддерживается поверхность типа 'rect'.
 */
export const WaterBodyModal: React.FC<WaterBodyModalProps> = ({ opened, mode, targetLayerId, initial, onClose }) => {
  const addWaterBody = useSceneStore(state => state.addWaterBody)
  const updateWaterBody = useSceneStore(state => state.updateWaterBody)

  const [name, setName] = useState<string>(initial?.body?.name ?? '')
  const [kind, setKind] = useState<'sea' | 'lake' | 'river'>(initial?.body.kind ?? 'sea')
  const [x, setX] = useState<number>(initial?.body.surface.kind === 'rect' ? (initial?.body.surface as any).x : -50)
  const [z, setZ] = useState<number>(initial?.body.surface.kind === 'rect' ? (initial?.body.surface as any).z : -50)
  const [width, setWidth] = useState<number>(initial?.body.surface.kind === 'rect' ? (initial?.body.surface as any).width : 100)
  const [depth, setDepth] = useState<number>(initial?.body.surface.kind === 'rect' ? (initial?.body.surface as any).depth : 100)
  const [altitudeY, setAltitudeY] = useState<number>(initial?.body.altitudeY ?? 0)
  const [brightness, setBrightness] = useState<number>((initial?.body as any)?.water?.brightness ?? 1.6)
  const [shaderType, setShaderType] = useState<'simple' | 'realistic'>(((initial?.body as any)?.water?.type as any) ?? 'realistic')

  useEffect(() => {
    if (opened) {
      setName(initial?.body?.name ?? '')
      setKind(initial?.body.kind ?? 'sea')
      const s = initial?.body.surface
      setX(s && s.kind === 'rect' ? (s as any).x : -50)
      setZ(s && s.kind === 'rect' ? (s as any).z : -50)
      setWidth(s && s.kind === 'rect' ? (s as any).width : 100)
      setDepth(s && s.kind === 'rect' ? (s as any).depth : 100)
      setAltitudeY(initial?.body.altitudeY ?? 0)
      setBrightness(((initial?.body as any)?.water?.brightness ?? 1.6))
      setShaderType(((initial?.body as any)?.water?.type as any) ?? 'realistic')
    }
  }, [opened])

  const onCreate = () => {
    if (!targetLayerId) return
    const body: GfxWaterBody = {
      id: generateUUID(),
      name: (name || '').trim() || undefined,
      kind,
      surface: { kind: 'rect', x, z, width: Math.max(0, width), depth: Math.max(0, depth) },
      altitudeY,
      water: { brightness, type: shaderType }
    }
    addWaterBody(targetLayerId, body)
    onClose()
  }

  const onUpdate = () => {
    if (!initial?.layerId || !initial?.body?.id) return
    updateWaterBody(initial.layerId, initial.body.id, {
      name: (name || '').trim() || undefined,
      kind,
      surface: { kind: 'rect', x, z, width: Math.max(0, width), depth: Math.max(0, depth) },
      altitudeY,
      water: { brightness, type: shaderType }
    })
    onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title={mode === 'create' ? 'Добавить водоём' : 'Редактировать водоём'}>
      <Stack>
        <TextInput label="Название" placeholder="Например: Южная бухта" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <Select label="Вид" data={[{ value: 'sea', label: 'Море' }, { value: 'lake', label: 'Озеро' }, { value: 'river', label: 'Река' }]} value={kind} onChange={(v) => setKind((v as any) || 'sea')} withinPortal />
        <Group grow>
          <NumberInput label="x" value={x} onChange={(v) => setX(Number(v) || 0)} />
          <NumberInput label="z" value={z} onChange={(v) => setZ(Number(v) || 0)} />
        </Group>
        <Group grow>
          <NumberInput label="width" value={width} onChange={(v) => setWidth(Number(v) || 0)} min={0} />
          <NumberInput label="depth" value={depth} onChange={(v) => setDepth(Number(v) || 0)} min={0} />
        </Group>
        <NumberInput label="Высота Y" value={altitudeY} onChange={(v) => setAltitudeY(Number(v) || 0)} />
        <Group grow>
          <NumberInput label="Яркость" value={brightness} onChange={(v) => setBrightness(Number(v) || 1.6)} min={0.1} step={0.1} />
          <Select label="Тип шейдера" data={[{ value: 'realistic', label: 'Realistic' }, { value: 'simple', label: 'Simple' }]} value={shaderType} onChange={(v) => setShaderType((v as any) || 'realistic')} withinPortal />
        </Group>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Отмена</Button>
          {mode === 'create' ? (
            <Button onClick={onCreate} disabled={!targetLayerId}>Добавить</Button>
          ) : (
            <Button onClick={onUpdate}>Сохранить</Button>
          )}
        </Group>
      </Stack>
    </Modal>
  )
}

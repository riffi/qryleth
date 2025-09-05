import React, { useEffect, useState } from 'react'
import { Modal, Stack, Select, NumberInput, Group, Button } from '@mantine/core'
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

  const [kind, setKind] = useState<'sea' | 'lake' | 'river'>(initial?.body.kind ?? 'sea')
  const [xMin, setXMin] = useState<number>(initial?.body.surface.kind === 'rect' ? initial?.body.surface.xMin : -50)
  const [xMax, setXMax] = useState<number>(initial?.body.surface.kind === 'rect' ? initial?.body.surface.xMax : 50)
  const [zMin, setZMin] = useState<number>(initial?.body.surface.kind === 'rect' ? initial?.body.surface.zMin : -50)
  const [zMax, setZMax] = useState<number>(initial?.body.surface.kind === 'rect' ? initial?.body.surface.zMax : 50)
  const [altitudeY, setAltitudeY] = useState<number>(initial?.body.altitudeY ?? 0)
  const [brightness, setBrightness] = useState<number>((initial?.body as any)?.water?.brightness ?? 1.6)
  const [shaderType, setShaderType] = useState<'simple' | 'realistic'>(((initial?.body as any)?.water?.type as any) ?? 'realistic')

  useEffect(() => {
    if (opened) {
      setKind(initial?.body.kind ?? 'sea')
      const s = initial?.body.surface
      setXMin(s && s.kind === 'rect' ? s.xMin : -50)
      setXMax(s && s.kind === 'rect' ? s.xMax : 50)
      setZMin(s && s.kind === 'rect' ? s.zMin : -50)
      setZMax(s && s.kind === 'rect' ? s.zMax : 50)
      setAltitudeY(initial?.body.altitudeY ?? 0)
      setBrightness(((initial?.body as any)?.water?.brightness ?? 1.6))
      setShaderType(((initial?.body as any)?.water?.type as any) ?? 'realistic')
    }
  }, [opened])

  const onCreate = () => {
    if (!targetLayerId) return
    const body: GfxWaterBody = {
      id: generateUUID(),
      kind,
      surface: { kind: 'rect', xMin: Math.min(xMin, xMax), xMax: Math.max(xMin, xMax), zMin: Math.min(zMin, zMax), zMax: Math.max(zMin, zMax) },
      altitudeY,
      water: { brightness, type: shaderType }
    }
    addWaterBody(targetLayerId, body)
    onClose()
  }

  const onUpdate = () => {
    if (!initial?.layerId || !initial?.body?.id) return
    updateWaterBody(initial.layerId, initial.body.id, {
      kind,
      surface: { kind: 'rect', xMin: Math.min(xMin, xMax), xMax: Math.max(xMin, xMax), zMin: Math.min(zMin, zMax), zMax: Math.max(zMin, zMax) },
      altitudeY,
      water: { brightness, type: shaderType }
    })
    onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title={mode === 'create' ? 'Добавить водоём' : 'Редактировать водоём'}>
      <Stack>
        <Select label="Вид" data={[{ value: 'sea', label: 'Море' }, { value: 'lake', label: 'Озеро' }, { value: 'river', label: 'Река' }]} value={kind} onChange={(v) => setKind((v as any) || 'sea')} withinPortal />
        <Group grow>
          <NumberInput label="xMin" value={xMin} onChange={(v) => setXMin(Number(v) || 0)} />
          <NumberInput label="xMax" value={xMax} onChange={(v) => setXMax(Number(v) || 0)} />
        </Group>
        <Group grow>
          <NumberInput label="zMin" value={zMin} onChange={(v) => setZMin(Number(v) || 0)} />
          <NumberInput label="zMax" value={zMax} onChange={(v) => setZMax(Number(v) || 0)} />
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


import React from 'react'
import { ActionIcon, Box, Divider, Group, Text, Tooltip } from '@mantine/core'
import { GridToggleButton, RenderModeSegment, TransformModeButtons } from '@/shared/ui'
import type { RenderMode, TransformMode } from '@/shared/types/ui'
import { IconTrash, IconTarget } from '@tabler/icons-react'

interface SceneEditorToolBarProps {
  /**
   * Флаг отображения сетки на сцене.
   * Используется для синхронизации состояния кнопки включения/выключения сетки.
   */
  gridVisible: boolean
  /**
   * Колбэк переключения отображения сетки.
   * Должен изменять состояние сетки в zustand‑хранилище сцены.
   */
  onToggleGrid: () => void

  /**
   * Флаг автопривязки цели OrbitControls к выбранному инстансу.
   * При включении при клике/выборе объект становится target камеры.
   */
  autoOrbitTargetOnSelect?: boolean
  /**
   * Колбэк переключения автопривязки цели OrbitControls при выборе.
   */
  onToggleAutoOrbitTargetOnSelect?: () => void

  /**
   * Текущий режим рендера сцены (например: solid / wireframe / normals и т.п.).
   * Значение передаётся в сегмент‑переключатель режимов рендера.
   */
  renderMode: RenderMode
  /**
   * Колбэк смены режима рендера сцены.
   * Принимает новое значение и сохраняет его в zustand‑хранилище.
   */
  onChangeRenderMode: (mode: RenderMode) => void

  /**
   * Текущий режим трансформации выбранного объекта (translate/rotate/scale).
   * Варьируется вместе с виджетом трансформаций в 3D.
   */
  transformMode: TransformMode
  /**
   * Колбэк смены режима трансформации выбранного объекта.
   * Принимает новое значение и синхронизирует его со стором сцены.
   */
  onChangeTransformMode: (mode: TransformMode) => void

  /**
   * Подпись выбранного инстанса для отображения в тулбаре.
   * Пример: "Tree [2]". Если undefined — блок действий для инстанса скрывается.
   */
  selectedInstanceLabel?: string
  /**
   * Колбэк удаления выбранного инстанса. Вызывается по нажатию на иконку корзины.
   * Если не передан — кнопка удаления не рендерится.
   */
  onDeleteSelectedInstance?: () => void
}

/**
 * SceneEditorToolBar
 *
 * Визуальный блок быстрых действий для редактора сцены (левая верхняя панель):
 * - Переключение сетки
 * - Смена режима рендера
 * - (Опционально) имя выбранного инстанса, кнопки смены режима трансформации
 *   и удаление инстанса
 *
 * Компонент инкапсулирует оформление (полупрозрачный фон с блюром, тень,
 * скругление) и позволяет переиспользовать тулбар независимо от контейнера.
 */
export const SceneEditorToolBar: React.FC<SceneEditorToolBarProps> = ({
  gridVisible,
  onToggleGrid,
  autoOrbitTargetOnSelect,
  onToggleAutoOrbitTargetOnSelect,
  renderMode,
  onChangeRenderMode,
  transformMode,
  onChangeTransformMode,
  selectedInstanceLabel,
  onDeleteSelectedInstance
}) => {
  return (
    <Box
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        padding: 6,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        background: 'color-mix(in srgb, var(--mantine-color-dark-7) 72%, transparent)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
        borderRadius: '10px',
        transition: 'opacity 200ms ease'
      }}
    >
      <Group gap="xs" wrap="nowrap" align="center">
        {/* Быстрые настройки (сетка / автоцель / режим рендера) */}
        <GridToggleButton visible={gridVisible} onToggle={onToggleGrid} />
        {typeof autoOrbitTargetOnSelect !== 'undefined' && onToggleAutoOrbitTargetOnSelect && (
          <Tooltip label={autoOrbitTargetOnSelect ? 'Отключить автонаведение камеры' : 'Включить автонаведение камеры'} withArrow>
            <ActionIcon
              variant={autoOrbitTargetOnSelect ? 'filled' : 'light'}
              c={autoOrbitTargetOnSelect ? 'white' : 'gray'}
              onClick={onToggleAutoOrbitTargetOnSelect}
              size="md"
              aria-label={autoOrbitTargetOnSelect ? 'Отключить автонаведение камеры' : 'Включить автонаведение камеры'}
            >
              <IconTarget size={18} />
            </ActionIcon>
          </Tooltip>
        )}
        <RenderModeSegment value={renderMode} onChange={onChangeRenderMode} frosted />

        {/* Если есть выбранный инстанс — показываем подпись и инструменты трансформации */}
        {selectedInstanceLabel && (
          <>
            <Divider orientation="vertical" ml="xs" mr="xs" />
            <Group gap={6} wrap="nowrap" align="center">
              {/* Подпись формата: Название [индекс] */}
              <Text size="xs" c="#AAA" mr={"xs"} style={{ whiteSpace: 'nowrap' }}>
                {selectedInstanceLabel}
              </Text>
              <TransformModeButtons mode={transformMode} onChange={onChangeTransformMode} />

              {onDeleteSelectedInstance && (
                <Tooltip label="Удалить инстанс" withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    onClick={onDeleteSelectedInstance}
                    aria-label="Удалить инстанс"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </>
        )}
      </Group>
    </Box>
  )
}

export default SceneEditorToolBar

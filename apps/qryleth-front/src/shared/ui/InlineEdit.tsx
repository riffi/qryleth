import React from 'react'
import { ActionIcon, Group, Text, TextInput } from '@mantine/core'
import { IconPencil } from '@tabler/icons-react'

export interface InlineEditProps {
  /** Текущее значение текста для отображения/редактирования */
  value: string
  /** Колбэк при изменении текста. Вызывается на каждый ввод символа. */
  onChange: (value: string) => void
  /** Колбэк при начале редактирования (например, клик по иконке). */
  onEditStart?: () => void
  /** Колбэк при завершении редактирования (blur, Enter, Escape). */
  onEditEnd?: () => void
  /** Колбэк подтверждения редактирования (по Enter/blur). */
  onCommit?: (value: string) => void
  /** Колбэк отмены редактирования (по Escape). */
  onCancel?: () => void
  /** Плейсхолдер для режима ввода. */
  placeholder?: string
  /** Размер инпута (Mantine size). */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Inline-стили корневого контейнера. */
  style?: React.CSSProperties
  /** Доп. CSS-класс корневого контейнера. */
  className?: string
  /** ARIA-лейбл для поля ввода. */
  ariaLabel?: string
  /** Начинать сразу в режиме редактирования. */
  startInEdit?: boolean
  /** Мин. ширина инпута в режиме редактирования (px). */
  minInputWidth?: number
}

/**
 * Компонент строкового инлайн-редактирования c двумя режимами:
 * - Просмотр: текст + маленькая иконка редактирования (карандаш)
 * - Редактирование: текстовое поле с поддержкой Enter (подтвердить), Escape (отменить), Blur (подтвердить)
 *
 * Компонент контролируемый по значению: актуальное значение приходит через проп `value`.
 * Внутренний черновик `draft` используется только во время редактирования и
 * синхронизируется при смене `value` извне (если не в режиме редактирования).
 */
export const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onChange,
  onEditStart,
  onEditEnd,
  onCommit,
  onCancel,
  placeholder,
  size = 'xs',
  style,
  className,
  ariaLabel,
  startInEdit = false,
  minInputWidth = 160,
}) => {
  // Черновик текста, редактируемый пользователем до подтверждения
  const [draft, setDraft] = React.useState<string>(value)
  // Локальный флаг режима редактирования
  const [editing, setEditing] = React.useState<boolean>(startInEdit)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  /**
   * Синхронизирует черновик с внешним значением, когда мы НЕ в режиме редактирования.
   * Это позволяет корректно обновлять отображаемый текст при смене `value` извне.
   */
  React.useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  /**
   * Переводит компонент в режим редактирования и фокусирует поле ввода.
   * Вызывает `onEditStart`, если он задан.
   */
  const beginEdit = React.useCallback(() => {
    setEditing(true)
    onEditStart?.()
    // Небольшая задержка, чтобы реф инпута был доступен после рендера
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [onEditStart])

  /**
   * Подтверждает редактирование: уведомляет внешний мир через `onChange` и `onCommit`,
   * затем выходит из режима редактирования и вызывает `onEditEnd`.
   */
  const commitEdit = React.useCallback(() => {
    onChange(draft)
    onCommit?.(draft)
    setEditing(false)
    onEditEnd?.()
  }, [draft, onChange, onCommit, onEditEnd])

  /**
   * Отменяет редактирование: откатывает черновик к исходному `value`,
   * выходит из режима редактирования и вызывает `onCancel`/`onEditEnd`.
   */
  const cancelEdit = React.useCallback(() => {
    setDraft(value)
    setEditing(false)
    onCancel?.()
    onEditEnd?.()
  }, [value, onCancel, onEditEnd])

  /**
   * Обрабатывает ввод в инпуте. Сохраняет черновое значение и передаёт его наружу через `onChange`.
   */
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value
    setDraft(v)
    onChange(v)
  }, [onChange])

  /**
   * Обрабатывает нажатия клавиш в режиме редактирования:
   * - Enter: подтвердить изменения;
   * - Escape: отменить изменения.
   */
  const handleInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }, [commitEdit, cancelEdit])

  /**
   * Обрабатывает потерю фокуса: подтверждает редактирование для естественного UX.
   */
  const handleBlur = React.useCallback(() => {
    commitEdit()
  }, [commitEdit])

  if (!editing) {
    // Режим просмотра: текст + небольшая иконка редактирования
    return (
      <Group gap={6} wrap="nowrap" align="center" style={style} className={className}>
        <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
          {value || placeholder || ''}
        </Text>
        <ActionIcon
          size="xs"
          variant="subtle"
          color="gray"
          onClick={beginEdit}
          aria-label="Редактировать"
        >
          <IconPencil size={14} />
        </ActionIcon>
      </Group>
    )
  }

  // Режим редактирования: текстовый инпут
  return (
    <TextInput
      ref={inputRef}
      value={draft}
      onChange={handleInputChange}
      onKeyDown={handleInputKeyDown}
      onBlur={handleBlur}
      size={size}
      placeholder={placeholder}
      aria-label={ariaLabel}
      styles={{ input: { height: 26, paddingTop: 2, paddingBottom: 2, minWidth: minInputWidth } }}
    />
  )
}

export default InlineEdit


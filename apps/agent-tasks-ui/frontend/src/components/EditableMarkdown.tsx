/**
 * Компонент для отображения Markdown контента с возможностью инлайн редактирования заголовков фаз
 */
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import {
  Title,
  Text,
  Box,
  Group,
  ActionIcon
} from '@mantine/core'
import {
  IconEdit
} from '@tabler/icons-react'
import { PhaseEditModal } from './PhaseEditModal'
import 'highlight.js/styles/atom-one-dark.css'

interface EditableMarkdownProps {
  /**
   * Markdown контент для отображения
   */
  children: string
  /**
   * Функция сохранения изменений фазы
   */
  onPhaseEdit: (phaseNumber: number, newText: string) => Promise<void>
}

/**
 * Компонент для редактирования фаз из Markdown
 */
export function EditableMarkdown({ children, onPhaseEdit }: EditableMarkdownProps) {
  const [editModal, setEditModal] = useState<{
    opened: boolean;
    phaseNumber: number;
    phaseTitle: string;
    phaseText: string;
  }>({
    opened: false,
    phaseNumber: 0,
    phaseTitle: '',
    phaseText: ''
  })

  /**
   * Извлечение текста фазы из Markdown контента
   */
  const extractPhaseText = (content: string, phaseNumber: number): string => {
    const lines = content.split('\n')
    const phasePatterns = [
      new RegExp(`###\\s+[⏳✅]\\s*Фаза\\s+${phaseNumber}(?:\\.\\d+)?\\s*:`, 'i'),
      new RegExp(`##\\s+[⏳✅]\\s*Фаза\\s+${phaseNumber}(?:\\.\\d+)?\\s*:`, 'i')
    ]
    
    let startIndex = -1
    let endIndex = lines.length
    
    // Находим начало фазы
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (phasePatterns.some(pattern => pattern.test(line))) {
        startIndex = i
        break
      }
    }
    
    if (startIndex === -1) return ''
    
    // Находим конец фазы (следующий заголовок фазы или секции)
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.match(/^##[#]?\s+[⏳✅]?\s*Фаза\s+\d+/i) || 
          line.match(/^##\s+[А-Яа-яA-Za-z]/)) {
        endIndex = i
        break
      }
    }
    
    return lines.slice(startIndex, endIndex).join('\n')
  }

  /**
   * Обработчик открытия модального окна редактирования фазы
   */
  const handleEditPhase = (phaseNumber: number, title: string) => {
    const phaseText = extractPhaseText(children, phaseNumber)
    setEditModal({
      opened: true,
      phaseNumber,
      phaseTitle: title,
      phaseText
    })
  }

  /**
   * Обработчик закрытия модального окна редактирования фазы
   */
  const handleCloseEditModal = () => {
    setEditModal({
      opened: false,
      phaseNumber: 0,
      phaseTitle: '',
      phaseText: ''
    })
  }

  /**
   * Кастомный рендерер для заголовков с кнопками редактирования
   */
  const createHeadingRenderer = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    return ({ children }: any) => {
      const headingText = typeof children === 'string' ? children : 
        Array.isArray(children) ? children.join('') : String(children)
      
      // Проверяем, является ли заголовок фазой
      const phaseMatch = headingText.match(/[⏳✅]\s*Фаза\s+(\d+(?:\.\d+)?)\s*:\s*(.+)/i)
      
      if (phaseMatch) {
        const phaseNumber = parseFloat(phaseMatch[1])
        const phaseTitle = phaseMatch[2]
        
        return (
          <Group gap="xs" mb="md" wrap="nowrap">
            <Title 
              order={level} 
              c="var(--mantine-color-gray-6)"
              style={{ flex: 1 }}
            >
              {headingText}
            </Title>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => handleEditPhase(phaseNumber, `Фаза ${phaseNumber}: ${phaseTitle}`)}
              title="Редактировать фазу"
            >
              <IconEdit size={14} />
            </ActionIcon>
          </Group>
        )
      }
      
      // Обычный заголовок
      return (
        <Title 
          order={level} 
          mb="md" 
          c="var(--mantine-color-gray-6)"
        >
          {children}
        </Title>
      )
    }
  }

  return (
    <>
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: createHeadingRenderer(1),
          h2: createHeadingRenderer(2),
          h3: createHeadingRenderer(3),
          h4: createHeadingRenderer(4),
          h5: createHeadingRenderer(5),
          h6: createHeadingRenderer(6),
          p: ({ children }) => <Text mb="md" c="var(--mantine-color-gray-7)">{children}</Text>,
          pre: ({ children }) => (
            <Box
              component="pre"
              style={{
                background: 'var(--mantine-color-dark-8)',
                color: 'var(--mantine-color-gray-0)',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}
              mb="md"
            >
              {children}
            </Box>
          ),
          code: ({ children, inline }: any) => {
            if (!inline) {
              return (
                <Box component="code" style={{ fontFamily: 'monospace' }}>
                  {children}
                </Box>
              )
            }
            return (
              <Box
                component="code"
                style={{
                  background: 'var(--mantine-color-gray-6)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  fontSize: '0.9em'
                }}
              >
                {children}
              </Box>
            )
          },
          ul: ({ children }) => <Box component="ul" mb="md" pl="md">{children}</Box>,
          ol: ({ children }) => <Box component="ol" mb="md" pl="md">{children}</Box>,
          li: ({ children }) => <Text component="li" mb="xs" c="var(--mantine-color-gray-7)">{children}</Text>,
          blockquote: ({ children }) => (
            <Box
              style={{
                borderLeft: '4px solid var(--mantine-color-blue-5)',
                paddingLeft: '16px',
                fontStyle: 'italic',
                background: 'var(--mantine-color-blue-0)',
                padding: '8px 16px',
                margin: '16px 0'
              }}
            >
              {children}
            </Box>
          )
        }}
      >
        {children}
      </ReactMarkdown>

      <PhaseEditModal
        opened={editModal.opened}
        onClose={handleCloseEditModal}
        phaseNumber={editModal.phaseNumber}
        phaseTitle={editModal.phaseTitle}
        phaseText={editModal.phaseText}
        onSave={onPhaseEdit}
      />
    </>
  )
}
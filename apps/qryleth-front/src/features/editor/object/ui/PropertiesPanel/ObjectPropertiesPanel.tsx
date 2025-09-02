import React from 'react'
import { Box, Stack, Text, TagsInput } from '@mantine/core'
import { useObjectMetaStore } from '../../model/objectMetaStore'

/**
 * Панель свойств объекта: редактирование тегов.
 *
 * Компонент редактирует локальный список тегов в ObjectMetaStore.
 * Сохранение в библиотеку выполняется на уровне страницы/кнопки «Сохранить»
 * вместе с остальными данными объекта (buildUpdatedObject дублирует теги в objectData).
 */
export const ObjectPropertiesPanel: React.FC = () => {
  const tags = useObjectMetaStore(s => s.tags)
  const setTags = useObjectMetaStore(s => s.setTags)

  return (
    <Box p="sm" style={{ height: '100%', overflow: 'auto' }}>
      <Stack gap="sm">
        <div>
          <Text size="sm" fw={600} mb={4}>Теги</Text>
          <TagsInput
            value={tags}
            onChange={setTags}
            placeholder="Введите тег и нажмите Enter"
            splitChars={[',']}
          />
          <Text size="xs" c="dimmed" mt={4}>
            Теги используются для поиска в библиотеке и скаттеринга биомов.
          </Text>
        </div>
      </Stack>
    </Box>
  )
}

export default ObjectPropertiesPanel


import React, { useState } from 'react'
import { Box, Image, Skeleton, Text } from '@mantine/core'
import { IconPhoto } from '@tabler/icons-react'
import type { ReactNode } from 'react'

export interface PreviewImageProps {
  /** URL изображения для отображения */
  src?: string
  /** Альтернативный текст для изображения */
  alt: string
  /** Размеры контейнера превью (если не указано, заполняет родительский контейнер) */
  size?: { width: number; height: number }
  /** Сохранять ли квадратную форму (width = height) */
  square?: boolean
  /** Состояние загрузки */
  loading?: boolean
  /** Обработчик успешной загрузки изображения */
  onLoad?: () => void
  /** Обработчик ошибки загрузки изображения */
  onError?: () => void
  /** Иконка для отображения при отсутствии изображения */
  fallbackIcon?: ReactNode
  /** Текст при отсутствии изображения */
  fallbackText?: string
  /** Overlay контент поверх изображения */
  overlay?: ReactNode
}

/**
 * Компонент для отображения превью изображения с fallback состояниями
 * Поддерживает скелетон при загрузке, fallback при ошибке, overlay контент
 */
export const PreviewImage: React.FC<PreviewImageProps> = ({
  src,
  alt,
  size,
   square = false,
  loading = false,
  onLoad,
  onError,
  fallbackIcon = <IconPhoto size={24} />,
  fallbackText = 'Нет превью',
  overlay
}) => {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  /**
   * Обработчик успешной загрузки изображения
   */
  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
    onLoad?.()
  }

  /**
   * Обработчик ошибки загрузки изображения
   */
  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
    onError?.()
  }

  /**
   * Вычисляет стили контейнера в зависимости от настроек
   */
  const getContainerStyle = () => {
    if (size) {
      return {
        position: 'relative' as const,
        width: size.width,
        height: size.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }

    if (square) {
      return {
        position: 'relative' as const,
        width: '100%',
        aspectRatio: '1 / 1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }

    return {
      position: 'relative' as const,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }

  return (
    <Box style={getContainerStyle()}>
      {src && !imageError ? (
        <>
          {imageLoading && (
            <Skeleton
              width="100%"
              height="100%"
              radius="sm"
              style={{ position: 'absolute' }}
            />
          )}
          <Image
            src={src}
            alt={alt}
            width="100%"
            height="100%"
            fit="cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              display: imageLoading ? 'none' : 'block',
              opacity: loading ? 0.5 : 1
            }}
          />
          {overlay}
        </>
      ) : (
        <Box
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--mantine-color-gray-1)',
            borderRadius: 'var(--mantine-radius-sm)',
            gap: 8
          }}
        >
          {fallbackIcon}
          <Text size="sm" c="dimmed" ta="center">
            {imageError ? 'Ошибка загрузки' : fallbackText}
          </Text>
        </Box>
      )}
    </Box>
  )
}
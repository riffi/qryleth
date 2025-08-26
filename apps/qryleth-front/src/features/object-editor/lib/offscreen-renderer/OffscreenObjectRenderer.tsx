import React from 'react'
import { createRoot, useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GfxObject } from '@/entities'
import { ObjectRendererR3F } from './ObjectRendererR3F'

/**
 * Конфигурация для offscreen рендеринга превью объектов
 */
export interface PreviewRenderConfig {
  /** Ширина превью в пикселях */
  width?: number
  /** Высота превью в пикселях */
  height?: number
  /** Прозрачность фона */
  transparent?: boolean
  /** Цвет фона (если не прозрачный) */
  backgroundColor?: string
  /** Качество рендеринга (pixel ratio) */
  pixelRatio?: number
  /** Включить anti-aliasing */
  antialias?: boolean
}

/**
 * Результат рендеринга превью объекта
 */
export interface PreviewRenderResult {
  /** Data URL изображения (base64) */
  dataUrl: string
  /** Blob изображения */
  blob: Blob
  /** Размеры изображения */
  width: number
  height: number
}

/**
 * Компонент для автоматической установки оптимальной позиции камеры
 */
const AutoFitCamera: React.FC<{ 
  gfxObject: GfxObject
  onReady?: () => void 
}> = ({ gfxObject, onReady }) => {
  const { camera, scene } = useThree()
  const [positioned, setPositioned] = React.useState(false)
  
  React.useLayoutEffect(() => {
    // Небольшая задержка чтобы дать объектам отрендериться
    const timeout = setTimeout(() => {
      // Находим все меши в сцене для вычисления bounding box
      const meshes: THREE.Mesh[] = []
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child)
        }
      })
      
      if (meshes.length === 0) {
        // Если нет мешей, устанавливаем камеру по умолчанию
        camera.position.set(2, 2, 2)
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
        setPositioned(true)
        onReady?.()
        return
      }
      
      // Вычисляем общий bounding box всех мешей
      const boundingBox = new THREE.Box3()
      meshes.forEach(mesh => {
        const box = new THREE.Box3().setFromObject(mesh)
        boundingBox.union(box)
      })
      
      if (boundingBox.isEmpty()) {
        camera.position.set(2, 2, 2)
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
        setPositioned(true)
        onReady?.()
        return
      }
      
      const center = boundingBox.getCenter(new THREE.Vector3())
      const size = boundingBox.getSize(new THREE.Vector3())
      
      // Вычисляем оптимальную дистанцию камеры
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
      const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2
      
      // Изометрический угол для консистентного вида
      const angle = Math.PI / 4 // 45 degrees
      const elevation = Math.PI / 6 // 30 degrees
      
      camera.position.set(
        center.x + distance * Math.cos(elevation) * Math.cos(angle),
        center.y + distance * Math.sin(elevation),
        center.z + distance * Math.cos(elevation) * Math.sin(angle)
      )
      
      camera.lookAt(center)
      camera.updateProjectionMatrix()
      setPositioned(true)
      onReady?.()
    }, 100) // Задержка для рендеринга объектов
    
    return () => clearTimeout(timeout)
  }, [gfxObject, camera, scene, onReady])
  
  return null
}

/**
 * Компонент для рендеринга превью объекта с освещением и камерой
 */
const PreviewScene: React.FC<{ 
  gfxObject: GfxObject
  onReady?: () => void 
}> = ({ gfxObject, onReady }) => {
  return (
    <>
      {/* Стандартное освещение для превью */}
      <ambientLight color="#89c8cf" intensity={0.4} />
      <directionalLight 
        position={[5, 10, 7]}
        color="#ffffff" 
        intensity={0.8}
      />
      <directionalLight 
        position={[-3, -5, -2]}
        color="#ffffff" 
        intensity={0.3}
      />
      
      {/* Сам объект, используя переиспользуемый компонент */}
      <ObjectRendererR3F 
        gfxObject={gfxObject}
        renderMode="solid"
      />
      
      {/* Автоматическая установка камеры */}
      <AutoFitCamera gfxObject={gfxObject} onReady={onReady} />
    </>
  )
}

/**
 * Утилита для offscreen рендеринга 3D объектов в превью изображения
 * с использованием React Three Fiber и переиспользования существующих компонентов.
 * 
 * Это решает проблемы:
 * - Дублирования логики рендеринга (переиспользуем R3F компоненты)
 * - Поддержки групп примитивов с их трансформациями
 * - Синхронизации с изменениями в основной системе рендеринга
 */
export class OffscreenObjectRenderer {
  private canvas: HTMLCanvasElement
  private root: ReturnType<typeof createRoot> | null = null
  private readonly config: Required<PreviewRenderConfig>
  
  /**
   * Инициализирует offscreen рендерер с заданными параметрами
   */
  constructor(config: PreviewRenderConfig = {}) {
    this.config = {
      width: 256,
      height: 256,
      transparent: true,
      backgroundColor: '#000000',
      pixelRatio: 1,
      antialias: true,
      ...config
    }
    
    // Создаем offscreen canvas
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.config.width * this.config.pixelRatio
    this.canvas.height = this.config.height * this.config.pixelRatio
    this.canvas.style.width = `${this.config.width}px`
    this.canvas.style.height = `${this.config.height}px`
  }
  
  /**
   * Рендерит превью объекта в base64 PNG изображение используя R3F
   */
  async renderPreview(gfxObject: GfxObject): Promise<PreviewRenderResult> {
    return new Promise((resolve, reject) => {
      try {
        // Создаем R3F root для offscreen canvas
        this.root = createRoot(this.canvas)
        
        // Настраиваем рендерер
        this.root.configure({
          gl: {
            antialias: this.config.antialias,
            alpha: this.config.transparent,
            preserveDrawingBuffer: true, // Необходимо для toDataURL
            powerPreference: 'high-performance',
            outputColorSpace: THREE.SRGBColorSpace
          },
          size: {
            width: this.config.width,
            height: this.config.height,
          },
          dpr: this.config.pixelRatio,
          camera: {
            position: [0, 0, 5], // Временная позиция, будет пересчитана
            fov: 45,
            near: 0.1,
            far: 1000
          }
        })
        
        // Настройка цвета фона
        const bgColor = this.config.transparent ? 0x000000 : this.config.backgroundColor
        
        // Callback когда камера установлена и сцена готова
        const handleReady = async () => {
          try {
            // Даем дополнительное время для финального рендеринга
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Получаем результат как data URL и blob
            const dataUrl = this.canvas.toDataURL('image/png')
            const blob = await this.canvasToBlob()
            
            resolve({
              dataUrl,
              blob,
              width: this.config.width,
              height: this.config.height
            })
          } catch (error) {
            reject(error)
          } finally {
            this.cleanup()
          }
        }
        
        // Рендерим сцену
        this.root.render(
          React.createElement(React.Fragment, {}, [
            React.createElement('color', { 
              key: 'bg',
              attach: 'background', 
              args: [bgColor] 
            }),
            React.createElement(PreviewScene, { 
              key: 'scene',
              gfxObject, 
              onReady: handleReady 
            })
          ])
        )
        
      } catch (error) {
        this.cleanup()
        console.error('Ошибка при рендеринге превью объекта:', error)
        reject(error)
      }
    })
  }
  
  /**
   * Конвертирует canvas в Blob асинхронно
   */
  private canvasToBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Не удалось создать blob из canvas'))
        }
      }, 'image/png')
    })
  }
  
  /**
   * Очистка ресурсов
   */
  private cleanup(): void {
    if (this.root) {
      // Получаем рендерер перед уничтожением root
      const renderer = this.root.getState().gl
      
      // Уничтожаем R3F root
      this.root.unmount()
      this.root = null
      
      // Очищаем WebGL ресурсы
      renderer.dispose()
    }
  }
  
  /**
   * Освобождает ресурсы рендерера
   */
  dispose(): void {
    this.cleanup()
    
    // Удаляем canvas из DOM если он был добавлен
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
  }
}
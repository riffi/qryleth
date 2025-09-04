import React, { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { SceneLighting } from './lighting/SceneLighting.tsx'
import { CameraControls } from './controls/CameraControls.tsx'
import { ObjectTransformGizmo } from './controls/ObjectTransformGizmo.tsx'
// Компонент окружения сцены: импортируем из shared через алиас, чтобы избежать проблем с относительными путями при перемещении фичи
import { Environment } from '@/shared/r3f/environment/Environment.tsx'
import { SceneObjects } from './objects/SceneObjects.tsx'
import { InstancedTransformProvider } from '@/shared/r3f/optimization/InstancedTransformContext'
import { LandscapeLayers } from './landscape/LandscapeLayers.tsx'
import { WaterLayers } from './landscape/WaterLayers.tsx'
import { useSceneStore, useGridVisible } from '../../model/sceneStore.ts'
import { UiMode, RenderProfile } from '@/shared/types/ui'
// Глобальные хоткеи сцены: импортируем из scene/lib через алиас
import { useKeyboardShortcuts } from '@/features/editor/scene/lib/hooks/useKeyboardShortcuts'
import { Sky } from '@react-three/drei'
import {EffectComposer, N8AO, SSAO} from "@react-three/postprocessing";
import { ViewportAxesHelper } from './controls/ViewportAxesHelper'

/**
 * Свойства компонента SceneContent.
 * renderProfile - профиль рендера для управления настройками отображения сцены.
 * В текущей реализации служит подготовкой для будущих отличий в настройках между режимами Edit и View.
 */
interface SceneContentProps {
  renderProfile: RenderProfile
}

/**
 * Компонент для обновления exposure рендерера при изменении настроек освещения.
 */
const ExposureUpdater: React.FC = () => {
  const { gl } = useThree()
  const lighting = useSceneStore(state => state.lighting)

  useEffect(() => {
    if (gl) {
      gl.toneMappingExposure = lighting.exposure ?? 1.0
    }
  }, [gl, lighting.exposure])

  return null
}

/**
 * Основной компонент содержимого 3D сцены.
 * Отвечает за рендер всех элементов сцены: освещение, объекты, контролы, эффекты.
 * Получает renderProfile для возможного различного поведения в режимах Edit/View.
 */
export const SceneContent: React.FC<SceneContentProps> = ({ renderProfile }) => {
  const lighting = useSceneStore(state => state.lighting)
  const gridVisible = useGridVisible()
  const uiMode = useSceneStore(state => state.uiMode)

  // Получаем позицию directional light для синхронизации с положением солнца
  const directionalPosition = lighting.directional?.position ?? [10, 10, 10]

  // renderProfile может использоваться для различения настроек рендера между режимами Edit/View.
  // На текущем этапе реализации служит флагом подготовки к будущим настройкам.
  // Возможные применения: различные настройки post-processing, качество теней, LOD и др.

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  // Если включён туман, фон сцены берём из цвета тумана,
  // чтобы на горизонте не было резкой границы между водой и небом.
  const fogEnabled = lighting.fog?.enabled ?? false
  const sceneBackground = fogEnabled
    ? (lighting.fog?.color || lighting.backgroundColor || '#87CEEB')
    : (lighting.backgroundColor || '#87CEEB')

  return (
    <>
      {/* Set scene background */}
      <color attach="background" args={[sceneBackground]} />

      {/* Update renderer exposure when lighting changes */}
      <ExposureUpdater />

      {/* Core scene components */}
      <SceneLighting />
      <CameraControls />
      <Environment gridVisible={gridVisible} />
      {/* Фиксированный экранный индикатор осей X/Y/Z */}
      {uiMode === UiMode.Edit && <ViewportAxesHelper />}

      {/* Scene objects and landscapes */}
      <InstancedTransformProvider>
        <SceneObjects />
        {/* Transform controls: показываем только в режиме редактирования (Edit).
            В режиме Play гизмо скрываются, чтобы они не мешали просмотру/управлению. */}
        {uiMode === UiMode.Edit && <ObjectTransformGizmo />}
      </InstancedTransformProvider>
      <LandscapeLayers />
      <WaterLayers />
      {/* При активном тумане скрываем скайбокс, чтобы убрать чёткую линию горизонта */}
      <Sky
        visible={!fogEnabled}
        distance={lighting.sky?.distance ?? 450000}
        sunPosition={directionalPosition}
        turbidity={lighting.sky?.turbidity ?? 0.1}
        rayleigh={lighting.sky?.rayleigh ?? 1.0}
        mieCoefficient={lighting.sky?.mieCoefficient ?? 0.005}
        mieDirectionalG={lighting.sky?.mieDirectionalG ?? 0.8}
        inclination={lighting.sky?.elevation ?? 0}
        azimuth={lighting.sky?.azimuth ?? 0.25}
      />

      <EffectComposer>
        <N8AO/>
      </EffectComposer>


    </>
  )
}

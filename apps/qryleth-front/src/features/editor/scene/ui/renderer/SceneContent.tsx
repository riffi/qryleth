import React from 'react'
import { SceneLighting } from './lighting/SceneLighting.tsx'
import { CameraControls } from './controls/CameraControls.tsx'
import { ObjectTransformGizmo } from './controls/ObjectTransformGizmo.tsx'
// Компонент окружения сцены: импортируем из shared через алиас, чтобы избежать проблем с относительными путями при перемещении фичи
import { Environment } from '@/shared/r3f/environment/Environment.tsx'
import { SceneObjects } from './objects/SceneObjects.tsx'
import { InstancedTransformProvider } from '@/shared/r3f/optimization/InstancedTransformContext'
import { LandscapeContentLayers } from './landscape/LandscapeContentLayers'
import { WaterContentLayers } from './landscape/WaterContentLayers'
import { useSceneStore, useGridVisible } from '../../model/sceneStore.ts'
import { UiMode, RenderProfile } from '@/shared/types/ui'
// Глобальные хоткеи сцены: импортируем из scene/lib через алиас
import { useKeyboardShortcuts } from '@/features/editor/scene/lib/hooks/useKeyboardShortcuts'
import { Sky, Environment as DreiEnvironment } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { EXRLoader } from 'three-stdlib'
import { EquirectangularReflectionMapping } from 'three'
import { EffectComposer, ToneMapping } from "@react-three/postprocessing";
import {ToneMappingMode, VignetteEffect} from 'postprocessing'
import { ViewportAxesHelper } from './controls/ViewportAxesHelper'
import { FpsCounter } from './controls/FpsCounter'
import { CloudLayers } from './environment/CloudLayers'
import { Exposure } from '@/shared/r3f/postprocessing/ExposureEffect'
import {AtmosphericTint} from "@/shared/r3f/postprocessing/AtmosphericTint.tsx";

/**
 * Свойства компонента SceneContent.
 * renderProfile - профиль рендера для управления настройками отображения сцены.
 * В текущей реализации служит подготовкой для будущих отличий в настройках между режимами Edit и View.
 */
interface SceneContentProps {
  renderProfile: RenderProfile
}

// Примечание: Ранее здесь обновлялся renderer.toneMappingExposure при изменении настроек освещения.
// После переноса тонемаппинга в EffectComposer это больше не требуется,
// так как экспозиция теперь применяется внутри эффекта ToneMapping.

/**
 * Основной компонент содержимого 3D сцены.
 * Отвечает за рендер всех элементов сцены: освещение, объекты, контролы, эффекты.
 * Получает renderProfile для возможного различного поведения в режимах Edit/View.
 */
/**
 * Компонент SceneContent рендерит всё содержимое 3D‑сцены.
 *
 * Дополнено поддержкой выбора «вида неба» (procedural | skybox):
 * - procedural: текущее процедурное небо drei Sky
 * - skybox (hdri): отображение skybox из EXR и использование его как источника env‑карты
 *
 * Источник HDRI: public/texture/sky/citrus_orchard_road_puresky_2k.exr
 * В режиме skybox env‑карта в <DreiEnvironment> берётся из EXR, а не из Sky.
 */
export const SceneContent: React.FC<SceneContentProps> = ({ renderProfile }) => {
  const lighting = useSceneStore(state => state.lighting)
  const environmentContent = useSceneStore(state => state.environmentContent)
  const gridVisible = useGridVisible()
  const uiMode = useSceneStore(state => state.uiMode)
  // Ссылка на EffectComposer для безопасного освобождения ресурсов при смене профиля рендера
  const composerRef = React.useRef<any>(null)

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

  const isViewProfile = renderProfile === RenderProfile.View

  // Тип неба из контейнера окружения: 'procedural' | 'hdri'
  const skyType = environmentContent?.sky?.type ?? 'procedural'
  // Путь к HDRI/EXR: если задан в настройках окружения — используем его, иначе дефолтный
  const hdriPath = environmentContent?.sky?.hdriRef || '/texture/sky/citrus_orchard_road_puresky_2k.exr'

  // Загружаем HDRI/EXR для skybox. Хук должен вызываться стабильно, поэтому загружаем всегда,
  // но используем текстуру только если выбран режим skybox. Mapping настраиваем для equirect.
  const skyboxTexture = useLoader(EXRLoader as any, hdriPath) as any
  if (skyboxTexture) {
    // Назначаем equirectangular mapping, чтобы текстура корректно проецировалась на фон и env.
    skyboxTexture.mapping = EquirectangularReflectionMapping
  }

  /**
   * Безопасная очистка (dispose) EffectComposer на смену профиля рендера.
   *
   * Учитываем StrictMode: React может вызывать cleanup сразу после mount (для dev),
   * поэтому не используем немедленный cleanup. Вместо этого отслеживаем предыдущий
   * инстанс и вызываем dispose только когда появился новый (key изменился).
   */
  const prevComposerRef = React.useRef<any>(null)
  React.useEffect(() => {
    const prev = prevComposerRef.current
    const curr = composerRef.current
    if (prev && prev !== curr) {
      try { prev.dispose?.() } catch {}
    }
    prevComposerRef.current = curr
  }, [renderProfile])

  // Мемоизированный блок постпроцессинга, чтобы его не пересоздавать при частых ре-рендерах SceneContent
  const PostFX = React.useMemo(() => {
    const Comp: React.FC<{ exposure: number; isViewProfile: boolean }> = React.memo(({ exposure, isViewProfile }) => (
      <EffectComposer ref={composerRef} multisampling={isViewProfile ? 8 : 0}>
        <Exposure exposure={exposure} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    ))
    Comp.displayName = 'PostFX'
    return Comp
  }, [])

  return (
    <>
      {/*
        Фон сцены:
        - при skybox (и отсутствии тумана) показываем EXR как фон (equirectangular)
        - иначе используем цвет фона/тумана
      */}
      {skyType === 'hdri' && !fogEnabled
        ? <primitive attach="background" object={skyboxTexture} />
        : <color attach="background" args={[sceneBackground]} />}


      {/* Core scene components */}
      <SceneLighting />
      <CameraControls />
      {/* Сетка никогда не показывается в Play-режиме, даже если включена в настройках */}
      <Environment gridVisible={uiMode !== UiMode.Play && gridVisible} />
      {/* Фиксированный экранный индикатор осей X/Y/Z — держим смонтированным всегда,
          скрываем в Play чтобы не плодить текстуры при ремоунте */}
      <ViewportAxesHelper visible={uiMode === UiMode.Edit} />
      {/* Счётчик FPS в углу viewport'а */}
      <FpsCounter />

      {/* Scene objects and landscapes */}
      <InstancedTransformProvider>
        <SceneObjects />
        {/* Transform controls: показываем только в режиме редактирования (Edit).
            В режиме Play гизмо скрываются, чтобы они не мешали просмотру/управлению. */}
        {uiMode === UiMode.Edit && <ObjectTransformGizmo />}
      </InstancedTransformProvider>
      {/* Рендер содержимого ландшафта по новой архитектуре (единый контейнер) */}
      <LandscapeContentLayers />
      <WaterContentLayers />
      {/* Небо: процедурное показываем при выбранном режиме (и без тумана). */}
      {skyType === 'procedural' && (
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
      )}

      {/*
        Источник env‑карты:
        - procedural: берём пробу с procedural Sky (как было ранее)
        - hdri/skybox: даём готовую карту из EXR, без детей <Sky>
      */}
      {skyType === 'procedural' ? (
        <DreiEnvironment background={false} frames={1} resolution={256}>
          {/* Этот Sky не обязателен к показу — он только источник env-карты */}
          <Sky
              sunPosition={directionalPosition}
              turbidity={lighting.sky?.turbidity ?? 0.1}
              rayleigh={lighting.sky?.rayleigh ?? 1.0}
              mieCoefficient={lighting.sky?.mieCoefficient ?? 0.005}
              mieDirectionalG={lighting.sky?.mieDirectionalG ?? 0.8}
          />
        </DreiEnvironment>
      ) : (
        <DreiEnvironment background={false} map={skyboxTexture} />
      )}

      {/* Слои облаков (процедурные): при отсутствии слоёв облаков рендер не выполняется */}
      <CloudLayers />


      {/* Постпроцессинг: вынесен в мемо-компонент, чтобы избежать переинициализации */}
      <PostFX exposure={lighting.exposure ?? 1.0} isViewProfile={isViewProfile} />
    </>
  )
}

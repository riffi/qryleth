import { createGfxHeightSampler } from '@/features/editor/scene/lib/terrain/GfxHeightSampler'
import type { GfxTerrainConfig } from '@/entities/terrain'
import type { TerrainSplatStats } from '../DebugTextureRegistry'
import { computeSplatBytes } from '../SplatmapCore'

/**
 * Воркёр генерации splatmap: создаёт локальный сэмплер по конфигурации террейна
 * и считает байты/статистику, не блокируя главный поток.
 */
self.onmessage = async (ev: MessageEvent) => {
  try {
    const { cfg, params } = ev.data as { cfg: GfxTerrainConfig; params: any }
    const sampler = createGfxHeightSampler(cfg)
    if (sampler.ready) await sampler.ready()
    const { bytes, stats } = computeSplatBytes(sampler as any, params)
    const ab = (bytes as Uint8Array).buffer
    // Отправляем ArrayBuffer с передачей права владения, чтобы избежать копии
    ;(self as unknown as Worker).postMessage({ ok: true, bytes: ab, stats: stats as TerrainSplatStats }, [ab])
  } catch (e: any) {
    ;(self as unknown as Worker).postMessage({ ok: false, error: String(e?.message || e) })
  }
}


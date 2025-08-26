# OffscreenObjectRenderer

Утилита offscreen‑рендеринга превью для `GfxObject` на базе React Three Fiber с переиспользованием внутренних рендер‑компонентов.

- Файл: `apps/qryleth-front/src/features/object-editor/lib/offscreen-renderer/OffscreenObjectRenderer.tsx`
- Связанный компонент: `ObjectRendererR3F.tsx` — отвечает за рендер примитивов/групп.

## Конфигурация

```ts
interface PreviewRenderConfig {
  width?: number
  height?: number
  transparent?: boolean
  backgroundColor?: string
  pixelRatio?: number
  antialias?: boolean
}
```

По умолчанию: 512×512, прозрачный фон, `antialias: true`, `pixelRatio: 1`.

## Результат

```ts
interface PreviewRenderResult {
  dataUrl: string   // base64 PNG
  blob: Blob        // PNG blob
  width: number
  height: number
}
```

## Публичные методы

- `constructor(config?: PreviewRenderConfig)` — создаёт offscreen‑canvas и настраивает R3F root.
- `renderPreview(gfxObject: GfxObject): Promise<PreviewRenderResult>` — рендерит PNG c автонастройкой камеры.
- `dispose(): void` — освобождает R3F и WebGL‑ресурсы, удаляет canvas из DOM (если был добавлен).

## Камера и свет

- Камера позиционируется автоматически по сфере охвата объекта (расстояние по max(FOVx,FOVy) с запасом).
- Фон сцены — светло‑голубой (#EAF4FF), совпадает с hover‑сценой для консистентности.
- Освещение: ambient + 2× directional; тени отключены для скорости и чистого силуэта.

## Использование

```ts
import { OffscreenObjectRenderer } from '@/features/object-editor/lib/offscreen-renderer'

const renderer = new OffscreenObjectRenderer({ width: 512, height: 512, transparent: true })
const { dataUrl } = await renderer.renderPreview(gfxObject)
renderer.dispose()
```

Для удобства используйте хелпер `generateObjectPreview()` из `saveUtils.ts` (включает кеширование и обработку ошибок).


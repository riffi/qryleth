import * as THREE from 'three'

export interface PatchBillboardMaterialOptions {
  /** Включить обводку прямоугольника по UV (0..1) */
  rectDebug?: boolean
  /** Цвет обводки */
  rectColor?: THREE.Color | string | number
  /** Толщина обводки в нормированных UV (по умолчанию 0.02) */
  rectWidth?: number
  /** Порог альфа‑отсечки (совместимо с material.alphaTest) */
  alphaThreshold?: number
}

/**
 * Патчит MeshStandardMaterial для билбордов деревьев: добавляет отладочную обводку
 * по границе прямоугольника UV без изменения геометрии/текстур.
 */
export function patchBillboardMaterial(mat: THREE.MeshStandardMaterial, opts?: PatchBillboardMaterialOptions): void {
  const rectDebug = !!opts?.rectDebug
  const rectColor = new THREE.Color(opts?.rectColor ?? 0xff00ff)
  const rectWidth = Number.isFinite(opts?.rectWidth as number) ? (opts?.rectWidth as number) : 0.02
  const alphaThreshold = Number.isFinite(opts?.alphaThreshold as number) ? (opts?.alphaThreshold as number) : (mat.alphaTest ?? 0.5)

  mat.onBeforeCompile = (shader) => {
    // Гарантируем собственный varying для UV независимо от USE_UV
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vBBUv;\n`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n  vBBUv = uv;\n`)

    // Внедряем униформы и перехватываем участок после выборки карты (map_fragment)
    const header = `#include <common>\nuniform float uBBRectDebug;\nuniform vec3 uBBRectColor;\nuniform float uBBRectWidth;\nuniform float uAlphaThreshold;\nvarying vec2 vBBUv;\n`
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', header)

    const mapHook = `#include <map_fragment>\n  // Рисуем прямоугольную обводку по краю UV (всегда используем vBBUv)\n  if (uBBRectDebug > 0.5) {\n    float d = min(min(vBBUv.x, vBBUv.y), min(1.0 - vBBUv.x, 1.0 - vBBUv.y));\n    float wr = max(uBBRectWidth, fwidth(d) * 2.0);\n    float edge = 1.0 - smoothstep(wr * 0.5, wr, d);\n    diffuseColor.a = max(diffuseColor.a, edge);\n    diffuseColor.rgb = mix(diffuseColor.rgb, uBBRectColor, clamp(edge, 0.0, 1.0));\n  }\n  // Альфа‑отсечка после модификации a\n  if (diffuseColor.a < uAlphaThreshold) discard;\n`
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', mapHook)

    // Инициализируем униформы и сохраняем ссылку для дальнейшего обновления
    shader.uniforms.uBBRectDebug = { value: rectDebug ? 1.0 : 0.0 }
    shader.uniforms.uBBRectColor = { value: rectColor }
    shader.uniforms.uBBRectWidth = { value: rectWidth }
    shader.uniforms.uAlphaThreshold = { value: alphaThreshold }
    ;(mat as any).userData = (mat as any).userData || {}
    ;(mat as any).userData.uniforms = shader.uniforms
  }
  mat.needsUpdate = true
}

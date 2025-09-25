/**
 * Глобальный флаг включения сценовой сегментации листвы по чанкам.
 *
 * true  — используется ChunkedInstancedLeaves (фрустум‑куллинг по чанкам),
 * false — рендер по-старому: InstancedLeaves/InstancedLeafSpheres на уровне объекта.
 */
export const SCENE_CHUNKED_LEAVES_ENABLED = true
// Показывать ли отладочную обводку у билбордов деревьев (LOD3) в SceneEditor
export const SCENE_BILLBOARD_BORDER_DEBUG = false
/**
 * Глобальный флаг включения сегментации единых стволов по чанкам.
 *
 * true  — используется ChunkedInstancedTrunks (исправляет проблемы фрустум‑куллинга у больших сетов);
 * false — стволы рендерятся через InstancedObjects/Instances без сегментации.
 */
export const SCENE_CHUNKED_TRUNKS_ENABLED = true

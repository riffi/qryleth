import { getSceneApiMethodList, getMethodDoc } from './methodDocs'
import { createStyledTooltip } from '../utils/tooltipUtils'

/**
 * Сгенерировать список пунктов автокомплита для методов SceneAPI
 * из единого источника документации (methodDocs.ts).
 */
export const getSceneApiCompletions = () => {
  return getSceneApiMethodList().map((name) => ({
    label: name,
    type: 'function',
    info: createStyledTooltip(getMethodDoc(name) || name)
  }))
}

export const getConsoleCompletions = () => [
  { label: 'log', type: 'function', info: createStyledTooltip('Описание: Вывести сообщение в консоль') },
  { label: 'error', type: 'function', info: createStyledTooltip('Описание: Вывести ошибку в консоль') },
  { label: 'warn', type: 'function', info: createStyledTooltip('Описание: Вывести предупреждение в консоль') },
  { label: 'info', type: 'function', info: createStyledTooltip('Описание: Вывести информацию в консоль') },
  { label: 'debug', type: 'function', info: createStyledTooltip('Описание: Вывести отладочную информацию в консоль') },
  { label: 'table', type: 'function', info: createStyledTooltip('Описание: Вывести данные в виде таблицы') },
  { label: 'clear', type: 'function', info: createStyledTooltip('Описание: Очистить консоль') }
]

export const getBaseCompletions = () => [
  { label: 'sceneApi', type: 'variable', info: createStyledTooltip('Описание: API для управления сценой') },
  { label: 'console', type: 'variable', info: createStyledTooltip('Описание: Консоль браузера (log, error, warn, info...)') },
  { label: 'Math', type: 'variable', info: createStyledTooltip('Описание: Математические функции и константы') },
  { label: 'Date', type: 'variable', info: createStyledTooltip('Описание: Работа с датой и временем') },
  { label: 'JSON', type: 'variable', info: createStyledTooltip('Описание: Парсинг и сериализация JSON') },
  { label: 'Array', type: 'variable', info: createStyledTooltip('Описание: Конструктор массивов') },
  { label: 'Object', type: 'variable', info: createStyledTooltip('Описание: Конструктор объектов') },
  { label: 'String', type: 'variable', info: createStyledTooltip('Описание: Конструктор строк') },
  { label: 'Number', type: 'variable', info: createStyledTooltip('Описание: Конструктор чисел') },
  // Подсказки для конфигурации размещения и PlaceAround metadata
  { label: 'strategy', type: 'property', info: createStyledTooltip("Описание: Стратегия размещения: 'Random' | 'RandomNoCollision' | 'PlaceAround'") },
  { label: 'metadata', type: 'property', info: createStyledTooltip('Описание: Объект метаданных для выбранной стратегии (обязателен для PlaceAround)') },
  { label: 'targetInstanceUuid', type: 'property', info: createStyledTooltip('Описание: UUID конкретного инстанса (приоритет 1 для PlaceAround)') },
  { label: 'targetObjectUuid', type: 'property', info: createStyledTooltip('Описание: UUID объекта — разместить вокруг всех его инстансов (приоритет 2)') },
  { label: 'minDistance', type: 'property', info: createStyledTooltip('Описание: Минимальное расстояние от грани до грани (>= 0)') },
  { label: 'maxDistance', type: 'property', info: createStyledTooltip('Описание: Максимальное расстояние от грани до грани (> minDistance)') },
  { label: 'angleOffset', type: 'property', info: createStyledTooltip('Описание: Начальный угол (радианы), по умолчанию 0') },
  { label: 'distributeEvenly', type: 'property', info: createStyledTooltip('Описание: Равномерное распределение по кругу (boolean, по умолчанию true)') },
  { label: 'onlyHorizontal', type: 'property', info: createStyledTooltip('Описание: Горизонтальное размещение по Y (boolean, по умолчанию true)') },

  // Параметры террейнов
  { label: 'world', type: 'property', info: createStyledTooltip('Описание: Размеры и настройки мира: { width, depth, edgeFade? }') },
  { label: 'base', type: 'property', info: createStyledTooltip('Описание: Базовый шум Perlin: { seed, octaveCount, amplitude, persistence, width, height, heightOffset? }') },
  { label: 'pool', type: 'property', info: createStyledTooltip('Описание: Пул операций рельефа: { global?: {intensityScale?, maxOps?}, recipes: [] }') },
  { label: 'recipes', type: 'property', info: createStyledTooltip('Описание: Массив рецептов рельефа (hill, valley, crater, plateau, ridge, basin, dune, terrace)') },
  { label: 'kind', type: 'property', info: createStyledTooltip('Описание: Тип рельефа: hill | valley | crater | plateau | ridge | basin | dune | terrace') },
  { label: 'placement', type: 'property', info: createStyledTooltip('Описание: Размещение: { type: uniform|poisson|ring|gridJitter, ...параметры }') },
  { label: 'falloff', type: 'property', info: createStyledTooltip('Описание: Затухание к краям: smoothstep | gauss | linear') },
  { label: 'bias', type: 'property', info: createStyledTooltip('Описание: Умные фильтры: { preferHeight?, preferSlope?, avoidOverlap? }') },
  { label: 'intensity', type: 'property', info: createStyledTooltip('Описание: Амплитуда изменения высоты (число или [min, max])') },
  { label: 'radius', type: 'property', info: createStyledTooltip('Описание: Базовый радиус по X (число или [min, max])') },
  { label: 'aspect', type: 'property', info: createStyledTooltip('Описание: Отношение радиусов Z/X (число или [min, max]), 1.0 = круглый') },
  { label: 'count', type: 'property', info: createStyledTooltip('Описание: Количество объектов (число или [min, max])') },
  { label: 'rotation', type: 'property', info: createStyledTooltip('Описание: Поворот в радианах (число или [min, max])') },
  { label: 'step', type: 'property', info: createStyledTooltip('Описание: Расстояние между штрихами для ridge/valley') },
  { label: 'seed', type: 'property', info: createStyledTooltip('Описание: Зерно для детерминированной генерации') },
  { label: 'octaveCount', type: 'property', info: createStyledTooltip('Описание: Количество слоев шума (1-8, рекомендуется 3-5)') },
  { label: 'amplitude', type: 'property', info: createStyledTooltip('Описание: Максимальная высота базового рельефа') },
  { label: 'persistence', type: 'property', info: createStyledTooltip('Описание: Затухание между слоями шума (0.1-0.8)') },
  { label: 'heightOffset', type: 'property', info: createStyledTooltip('Описание: Смещение базового уровня (может быть отрицательным)') },
  { label: 'edgeFade', type: 'property', info: createStyledTooltip('Описание: Затухание к краям мира (0.0-0.3)') },
  { label: 'intensityScale', type: 'property', info: createStyledTooltip('Описание: Глобальный множитель интенсивности операций') },
  { label: 'maxOps', type: 'property', info: createStyledTooltip('Описание: Максимальное количество операций') },
  { label: 'preferHeight', type: 'property', info: createStyledTooltip('Описание: Предпочтение по высоте: { min?, max?, weight? }') },
  { label: 'preferSlope', type: 'property', info: createStyledTooltip('Описание: Предпочтение по уклону: { min?, max?, weight? }') },
  { label: 'avoidOverlap', type: 'property', info: createStyledTooltip('Описание: Избегать пересечений (boolean)') },
  { label: 'minDistance', type: 'property', info: createStyledTooltip('Описание: Минимальная дистанция для poisson размещения') },
  { label: 'cell', type: 'property', info: createStyledTooltip('Описание: Размер ячейки для gridJitter размещения') },
  { label: 'jitter', type: 'property', info: createStyledTooltip('Описание: Дрожание для gridJitter (0.0-1.0)') },
  { label: 'rMin', type: 'property', info: createStyledTooltip('Описание: Минимальный радиус для ring размещения') },
  { label: 'rMax', type: 'property', info: createStyledTooltip('Описание: Максимальный радиус для ring размещения') },
  { label: 'center', type: 'property', info: createStyledTooltip('Описание: Центр для ring размещения: [x, z]') },
  { label: 'area', type: 'property', info: createStyledTooltip('Описание: Ограничение области: { kind: rect|circle, ...параметры }') }
]

// Подсказки TS-типов исключены: панель поддерживает только JavaScript

export const getJavaScriptKeywords = () => [
  { label: 'const', type: 'keyword', info: 'Объявление константы' },
  { label: 'let', type: 'keyword', info: 'Объявление переменной' },
  { label: 'var', type: 'keyword', info: 'Объявление переменной (устаревшее)' },
  { label: 'function', type: 'keyword', info: 'Объявление функции' },
  { label: 'return', type: 'keyword', info: 'Возврат значения из функции' },
  { label: 'if', type: 'keyword', info: 'Условное выражение' },
  { label: 'else', type: 'keyword', info: 'Альтернативная ветка условия' },
  { label: 'for', type: 'keyword', info: 'Цикл for' },
  { label: 'while', type: 'keyword', info: 'Цикл while' },
  { label: 'try', type: 'keyword', info: 'Блок обработки исключений' },
  { label: 'catch', type: 'keyword', info: 'Обработка исключений' },
  { label: 'async', type: 'keyword', info: 'Асинхронная функция' },
  { label: 'await', type: 'keyword', info: 'Ожидание асинхронной операции' },
  { label: 'true', type: 'keyword', info: 'Логическое значение true' },
  { label: 'false', type: 'keyword', info: 'Логическое значение false' },
  { label: 'null', type: 'keyword', info: 'Значение null' },
  { label: 'undefined', type: 'keyword', info: 'Значение undefined' }
]

export const getKeywords = () => getJavaScriptKeywords()

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
  { label: 'log', type: 'function', info: 'Вывести сообщение в консоль' },
  { label: 'error', type: 'function', info: 'Вывести ошибку в консоль' },
  { label: 'warn', type: 'function', info: 'Вывести предупреждение в консоль' },
  { label: 'info', type: 'function', info: 'Вывести информацию в консоль' },
  { label: 'debug', type: 'function', info: 'Вывести отладочную информацию в консоль' },
  { label: 'table', type: 'function', info: 'Вывести данные в виде таблицы' },
  { label: 'clear', type: 'function', info: 'Очистить консоль' }
]

export const getBaseCompletions = () => [
  { label: 'sceneApi', type: 'variable', info: 'API для управления сценой' },
  { label: 'console', type: 'variable', info: 'Консоль браузера' },
  { label: 'Math', type: 'variable', info: 'Математические функции и константы' },
  { label: 'Date', type: 'variable', info: 'Работа с датой и временем' },
  { label: 'JSON', type: 'variable', info: 'Парсинг и сериализация JSON' },
  { label: 'Array', type: 'variable', info: 'Конструктор массивов' },
  { label: 'Object', type: 'variable', info: 'Конструктор объектов' },
  { label: 'String', type: 'variable', info: 'Конструктор строк' },
  { label: 'Number', type: 'variable', info: 'Конструктор чисел' },
  // Подсказки для конфигурации размещения и PlaceAround metadata
  { label: 'strategy', type: 'property', info: "Стратегия размещения: 'Random' | 'RandomNoCollision' | 'PlaceAround'" },
  { label: 'metadata', type: 'property', info: 'Объект метаданных для выбранной стратегии (обязателен для PlaceAround)' },
  { label: 'targetInstanceUuid', type: 'property', info: 'UUID конкретного инстанса (приоритет 1 для PlaceAround)' },
  { label: 'targetObjectUuid', type: 'property', info: 'UUID объекта — разместить вокруг всех его инстансов (приоритет 2)' },
  { label: 'minDistance', type: 'property', info: 'Минимальное расстояние от грани до грани (>= 0)' },
  { label: 'maxDistance', type: 'property', info: 'Максимальное расстояние от грани до грани (> minDistance)' },
  { label: 'angleOffset', type: 'property', info: 'Начальный угол (радианы), по умолчанию 0' },
  { label: 'distributeEvenly', type: 'property', info: 'Равномерное распределение по кругу (boolean, по умолчанию true)' },
  { label: 'onlyHorizontal', type: 'property', info: 'Горизонтальное размещение по Y (boolean, по умолчанию true)' },
  
  // Параметры террейнов
  { label: 'world', type: 'property', info: 'Размеры и настройки мира: { width, depth, edgeFade? }' },
  { label: 'base', type: 'property', info: 'Базовый шум Perlin: { seed, octaveCount, amplitude, persistence, width, height, heightOffset? }' },
  { label: 'pool', type: 'property', info: 'Пул операций рельефа: { global?: {intensityScale?, maxOps?}, recipes: [] }' },
  { label: 'recipes', type: 'property', info: 'Массив рецептов рельефа (hill, valley, crater, plateau, ridge, basin, dune, terrace)' },
  { label: 'kind', type: 'property', info: 'Тип рельефа: hill | valley | crater | plateau | ridge | basin | dune | terrace' },
  { label: 'placement', type: 'property', info: 'Размещение: { type: uniform|poisson|ring|gridJitter, ...параметры }' },
  { label: 'falloff', type: 'property', info: 'Затухание к краям: smoothstep | gauss | linear' },
  { label: 'bias', type: 'property', info: 'Умные фильтры: { preferHeight?, preferSlope?, avoidOverlap? }' },
  { label: 'intensity', type: 'property', info: 'Амплитуда изменения высоты (число или [min, max])' },
  { label: 'radius', type: 'property', info: 'Базовый радиус по X (число или [min, max])' },
  { label: 'aspect', type: 'property', info: 'Отношение радиусов Z/X (число или [min, max]), 1.0 = круглый' },
  { label: 'count', type: 'property', info: 'Количество объектов (число или [min, max])' },
  { label: 'rotation', type: 'property', info: 'Поворот в радианах (число или [min, max])' },
  { label: 'step', type: 'property', info: 'Расстояние между штрихами для ridge/valley' },
  { label: 'seed', type: 'property', info: 'Зерно для детерминированной генерации' },
  { label: 'octaveCount', type: 'property', info: 'Количество слоев шума (1-8, рекомендуется 3-5)' },
  { label: 'amplitude', type: 'property', info: 'Максимальная высота базового рельефа' },
  { label: 'persistence', type: 'property', info: 'Затухание между слоями шума (0.1-0.8)' },
  { label: 'heightOffset', type: 'property', info: 'Смещение базового уровня (может быть отрицательным)' },
  { label: 'edgeFade', type: 'property', info: 'Затухание к краям мира (0.0-0.3)' },
  { label: 'intensityScale', type: 'property', info: 'Глобальный множитель интенсивности операций' },
  { label: 'maxOps', type: 'property', info: 'Максимальное количество операций' },
  { label: 'preferHeight', type: 'property', info: 'Предпочтение по высоте: { min?, max?, weight? }' },
  { label: 'preferSlope', type: 'property', info: 'Предпочтение по уклону: { min?, max?, weight? }' },
  { label: 'avoidOverlap', type: 'property', info: 'Избегать пересечений (boolean)' },
  { label: 'minDistance', type: 'property', info: 'Минимальная дистанция для poisson размещения' },
  { label: 'cell', type: 'property', info: 'Размер ячейки для gridJitter размещения' },
  { label: 'jitter', type: 'property', info: 'Дрожание для gridJitter (0.0-1.0)' },
  { label: 'rMin', type: 'property', info: 'Минимальный радиус для ring размещения' },
  { label: 'rMax', type: 'property', info: 'Максимальный радиус для ring размещения' },
  { label: 'center', type: 'property', info: 'Центр для ring размещения: [x, z]' },
  { label: 'area', type: 'property', info: 'Ограничение области: { kind: rect|circle, ...параметры }' }
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

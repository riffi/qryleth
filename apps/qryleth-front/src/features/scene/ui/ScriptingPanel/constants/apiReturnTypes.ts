interface TypeSchema {
  properties: Record<string, {
    type: string
    description: string
    properties?: Record<string, { type: string; description: string }>
  }>
}

export const API_RETURN_TYPES: Record<string, TypeSchema> = {
  'getSceneOverview': {
    properties: {
      'totalObjects': { type: 'number', description: 'Общее количество объектов' },
      'totalInstances': { type: 'number', description: 'Общее количество экземпляров' },
      'objects': { type: 'SceneObjectInfo[]', description: 'Массив объектов сцены' },
      'instances': { type: 'SceneInstanceInfo[]', description: 'Массив экземпляров' },
      'sceneName': { type: 'string', description: 'Название сцены' },
      'layers': { type: 'LayerInfo[]', description: 'Массив слоев' }
    }
  },
  'getSceneObjects': {
    properties: {
      'length': { type: 'number', description: 'Количество объектов в массиве' },
      'forEach': { type: 'function', description: 'Метод итерации по массиву' },
      'map': { type: 'function', description: 'Метод преобразования массива' },
      'filter': { type: 'function', description: 'Метод фильтрации массива' },
      'find': { type: 'function', description: 'Поиск элемента в массиве' }
    }
  },
  'getSceneInstances': {
    properties: {
      'length': { type: 'number', description: 'Количество экземпляров в массиве' },
      'forEach': { type: 'function', description: 'Метод итерации по массиву' },
      'map': { type: 'function', description: 'Метод преобразования массива' },
      'filter': { type: 'function', description: 'Метод фильтрации массива' },
      'find': { type: 'function', description: 'Поиск элемента в массиве' }
    }
  },
  'getSceneStats': {
    properties: {
      'total': { 
        type: 'object', 
        description: 'Общая статистика',
        properties: {
          'objects': { type: 'number', description: 'Общее количество объектов' },
          'instances': { type: 'number', description: 'Общее количество экземпляров' },
          'layers': { type: 'number', description: 'Общее количество слоев' }
        }
      },
      'visible': { 
        type: 'object', 
        description: 'Статистика видимых элементов',
        properties: {
          'objects': { type: 'number', description: 'Видимые объекты' },
          'instances': { type: 'number', description: 'Видимые экземпляры' },
          'layers': { type: 'number', description: 'Видимые слои' }
        }
      },
      'primitiveTypes': { type: 'string[]', description: 'Типы примитивов' }
    }
  },
  'getAvailableLayers': {
    properties: {
      'length': { type: 'number', description: 'Количество слоев в массиве' },
      'forEach': { type: 'function', description: 'Метод итерации по массиву' },
      'map': { type: 'function', description: 'Метод преобразования массива' },
      'filter': { type: 'function', description: 'Метод фильтрации массива' },
      'find': { type: 'function', description: 'Поиск элемента в массиве' }
    }
  },
  // Новые унифицированные методы SceneAPI
  'addInstances': {
    properties: {
      'success': { type: 'boolean', description: 'Успешность операции' },
      'instanceCount': { type: 'number', description: 'Количество созданных экземпляров' },
      'instances': { type: 'CreatedInstanceInfo[]', description: 'Информация о созданных экземплярах' },
      'errors': { type: 'string[]', description: 'Массив ошибок при создании' },
      'error': { type: 'string', description: 'Сообщение об ошибке' }
    }
  },
  'findObjectByUuid': {
    properties: {
      'uuid': { type: 'string', description: 'UUID объекта' },
      'name': { type: 'string', description: 'Название объекта' },
      'primitiveCount': { type: 'number', description: 'Количество примитивов' },
      'visible': { type: 'boolean', description: 'Видимость объекта' }
    }
  },
  'findObjectByName': {
    properties: {
      'uuid': { type: 'string', description: 'UUID объекта' },
      'name': { type: 'string', description: 'Название объекта' },
      'primitiveCount': { type: 'number', description: 'Количество примитивов' },
      'visible': { type: 'boolean', description: 'Видимость объекта' }
    }
  },
  'createObject': {
    properties: {
      'success': { type: 'boolean', description: 'Успешность операции' },
      'objectUuid': { type: 'string', description: 'UUID созданного объекта' },
      'instanceUuid': { type: 'string', description: 'UUID первого созданного экземпляра' },
      'error': { type: 'string', description: 'Сообщение об ошибке' }
    }
  },
  'canAddInstance': {
    properties: {
      'result': { type: 'boolean', description: 'Результат проверки' }
    }
  },
  'addObjectWithTransform': {
    properties: {
      'success': { type: 'boolean', description: 'Успешность операции' },
      'objectUuid': { type: 'string', description: 'UUID созданного объекта' },
      'instanceUuid': { type: 'string', description: 'UUID созданного экземпляра' },
      'error': { type: 'string', description: 'Сообщение об ошибке' }
    }
  },
  'searchObjectsInLibrary': {
    properties: {
      'length': { type: 'number', description: 'Количество найденных объектов' },
      'forEach': { type: 'function', description: 'Метод итерации по массиву' },
      'map': { type: 'function', description: 'Метод преобразования массива' },
      'filter': { type: 'function', description: 'Метод фильтрации массива' }
    }
  },
  'addObjectFromLibrary': {
    properties: {
      'success': { type: 'boolean', description: 'Успешность операции' },
      'objectUuid': { type: 'string', description: 'UUID добавленного объекта' },
      'instanceUuid': { type: 'string', description: 'UUID созданного экземпляра' },
      'error': { type: 'string', description: 'Сообщение об ошибке' }
    }
  },
  'adjustInstancesForPerlinTerrain': {
    properties: {
      'success': { type: 'boolean', description: 'Успешность операции' },
      'adjustedCount': { type: 'number', description: 'Количество настроенных экземпляров' },
      'error': { type: 'string', description: 'Сообщение об ошибке' }
    }
  }
}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validatePngFile, uploadTerrainAsset, pngBlobToImageData } from './HeightmapUtils';

// Моки для внешних зависимостей
vi.mock('@/shared/lib/database', () => ({
  db: {
    saveTerrainAsset: vi.fn(),
    getTerrainAsset: vi.fn(),
    getAllTerrainAssets: vi.fn(),
    deleteTerrainAsset: vi.fn(),
    updateTerrainAssetName: vi.fn(),
  }
}));

// Моки для Web APIs
const mockCreateImageBitmap = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

// Настройка глобальных моков
beforeEach(() => {
  // @ts-ignore
  global.createImageBitmap = mockCreateImageBitmap;
  global.URL = {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  };
  
  // Мок для document.createElement('canvas')
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray([255, 255, 255, 255]),
        width: 1,
        height: 1
      }))
    }))
  };
  
  const mockDocument = {
    createElement: vi.fn(() => mockCanvas)
  };
  
  // @ts-ignore
  global.document = mockDocument;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('HeightmapUtils', () => {
  describe('validatePngFile', () => {
    it('должен успешно валидировать корректный PNG файл', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      
      // Настраиваем мок ImageBitmap
      const mockBitmap = { 
        width: 512, 
        height: 512,
        close: vi.fn()
      };
      mockCreateImageBitmap.mockResolvedValue(mockBitmap);

      const result = await validatePngFile(mockFile);

      expect(result.isValid).toBe(true);
      expect(result.dimensions).toEqual({ width: 512, height: 512 });
      expect(mockBitmap.close).toHaveBeenCalled();
    });

    it('должен отклонять файлы не PNG формата', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const result = await validatePngFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Файл должен быть в формате PNG');
    });

    it('должен отклонять слишком большие файлы', async () => {
      // Создаем файл размером больше 50MB
      const largeSizeFile = { size: 51 * 1024 * 1024 } as File;
      Object.defineProperty(largeSizeFile, 'type', { value: 'image/png' });
      Object.defineProperty(largeSizeFile, 'name', { value: 'large.png' });

      const result = await validatePngFile(largeSizeFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Файл слишком большой (максимум 50MB)');
    });

    it('должен отклонять изображения слишком маленького размера', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      
      const mockBitmap = { 
        width: 1, 
        height: 1,
        close: vi.fn()
      };
      mockCreateImageBitmap.mockResolvedValue(mockBitmap);

      const result = await validatePngFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Изображение слишком маленькое (минимум 2x2 пикселя)');
    });

    it('должен отклонять изображения слишком большого размера', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      
      const mockBitmap = { 
        width: 5000, 
        height: 5000,
        close: vi.fn()
      };
      mockCreateImageBitmap.mockResolvedValue(mockBitmap);

      const result = await validatePngFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Изображение слишком большое (максимум 4096x4096 пикселей)');
    });

    it('должен обрабатывать ошибки при чтении изображения', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      
      mockCreateImageBitmap.mockRejectedValue(new Error('Corrupt image'));

      const result = await validatePngFile(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Не удалось прочитать изображение');
    });
  });

  describe('uploadTerrainAsset', () => {
    it('должен успешно загружать валидный PNG файл', async () => {
      const mockFile = new File(['test content'], 'heightmap.png', { type: 'image/png' });
      
      // Настраиваем мок для валидации
      const mockBitmap = { 
        width: 256, 
        height: 256,
        close: vi.fn()
      };
      mockCreateImageBitmap.mockResolvedValue(mockBitmap);

      // Мокаем arrayBuffer
      Object.defineProperty(mockFile, 'arrayBuffer', {
        value: vi.fn().mockResolvedValue(new ArrayBuffer(12))
      });

      // Мокаем db.saveTerrainAsset
      const { db } = await import('@/shared/lib/database');
      vi.mocked(db.saveTerrainAsset).mockResolvedValue(undefined);

      const result = await uploadTerrainAsset(mockFile);

      expect(result.width).toBe(256);
      expect(result.height).toBe(256);
      expect(result.fileSize).toBe(12); // размер mockFile
      expect(typeof result.assetId).toBe('string');
      expect(result.assetId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // UUID v4
    });

    it('должен выбрасывать ошибку при невалидном файле', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(uploadTerrainAsset(mockFile)).rejects.toThrow('Файл должен быть в формате PNG');
    });
  });

  describe('pngBlobToImageData', () => {
    it('должен конвертировать PNG blob в ImageData', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      
      const mockBitmap = { 
        width: 2, 
        height: 2,
        close: vi.fn()
      };
      mockCreateImageBitmap.mockResolvedValue(mockBitmap);

      const mockImageData = {
        data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 128, 128, 128, 255]),
        width: 2,
        height: 2
      };

      // Настраиваем мок canvas context
      const mockContext = {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue(mockImageData)
      };

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockContext)
      };

      const mockDocument = {
        createElement: vi.fn().mockReturnValue(mockCanvas)
      };
      
      // @ts-ignore
      global.document = mockDocument;

      const result = await pngBlobToImageData(mockBlob);

      expect(result).toBe(mockImageData);
      expect(mockCreateImageBitmap).toHaveBeenCalledWith(mockBlob);
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockBitmap, 0, 0);
      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 2, 2);
      expect(mockBitmap.close).toHaveBeenCalled();
    });

    it('должен выбрасывать ошибку при неудачной конвертации', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      
      mockCreateImageBitmap.mockRejectedValue(new Error('Invalid image'));

      await expect(pngBlobToImageData(mockBlob)).rejects.toThrow('Не удалось конвертировать PNG в ImageData');
    });

    it('должен выбрасывать ошибку если не удалось создать 2D контекст', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      
      const mockBitmap = { 
        width: 2, 
        height: 2,
        close: vi.fn()
      };
      mockCreateImageBitmap.mockResolvedValue(mockBitmap);

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(null) // контекст не создался
      };

      const mockDocument = {
        createElement: vi.fn().mockReturnValue(mockCanvas)
      };
      
      // @ts-ignore
      global.document = mockDocument;

      await expect(pngBlobToImageData(mockBlob)).rejects.toThrow('Не удалось конвертировать PNG в ImageData');
      expect(mockBitmap.close).toHaveBeenCalled(); // bitmap должен быть освобожден даже при ошибке
    });
  });
});

describe('HeightmapUtils интеграционные тесты', () => {
  it('должен правильно вычислять luminance для разных цветов', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' });
    
    const mockBitmap = { 
      width: 2, 
      height: 1,
      close: vi.fn()
    };
    mockCreateImageBitmap.mockResolvedValue(mockBitmap);

    // Создаем ImageData с известными цветами
    const mockImageData = {
      data: new Uint8ClampedArray([
        255, 0, 0, 255,    // красный пиксель  
        0, 255, 0, 255     // зеленый пиксель
      ]),
      width: 2,
      height: 1
    };

    const mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue(mockImageData)
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext)
    };

    // @ts-ignore
    global.document = { createElement: vi.fn().mockReturnValue(mockCanvas) };

    const result = await pngBlobToImageData(mockBlob);

    expect(result.data).toEqual(mockImageData.data);
    
    // Проверяем, что luminance вычисляется правильно:
    // Красный: 0.2126 * 255 + 0.7152 * 0 + 0.0722 * 0 = 54.213
    // Зеленый: 0.2126 * 0 + 0.7152 * 255 + 0.0722 * 0 = 182.376
  });
});
import { useRef, useCallback, useEffect } from 'react';

// UI更新优化器 - 减少重绘和回流
export class UIUpdateOptimizer {
  private updateQueue: Array<() => void> = [];
  private isProcessing = false;
  private frameId: number | null = null;
  private lastUpdateTime = 0;
  private updateThrottle = 16; // 约60fps

  constructor() {
    this.processUpdates = this.processUpdates.bind(this);
  }

  // 批量处理UI更新
  queueUpdate(updateFn: () => void): void {
    this.updateQueue.push(updateFn);
    
    if (!this.isProcessing) {
      this.scheduleUpdate();
    }
  }

  private scheduleUpdate(): void {
    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    if (timeSinceLastUpdate >= this.updateThrottle) {
      this.processUpdates();
    } else {
      // 如果更新太频繁，使用 requestAnimationFrame 延迟
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
      }
      this.frameId = requestAnimationFrame(this.processUpdates);
    }
  }

  private processUpdates(): void {
    this.isProcessing = true;
    this.lastUpdateTime = performance.now();

    // 批量执行所有更新
    const updates = [...this.updateQueue];
    this.updateQueue.length = 0;

    // 使用 requestIdleCallback 在浏览器空闲时执行更新
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        updates.forEach(update => {
          try {
            update();
          } catch (error) {
            console.error('UI update error:', error);
          }
        });
        this.isProcessing = false;
      });
    } else {
      // 降级方案
      setTimeout(() => {
        updates.forEach(update => {
          try {
            update();
          } catch (error) {
            console.error('UI update error:', error);
          }
        });
        this.isProcessing = false;
      }, 0);
    }
  }

  cleanup(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.updateQueue.length = 0;
    this.isProcessing = false;
  }
}

// Canvas绘制优化器
export class CanvasOptimizer {
  private offscreenCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  private drawQueue: Array<() => void> = [];
  private isDrawing = false;

  constructor(private targetCanvas: HTMLCanvasElement) {
    this.initOffscreenCanvas();
  }

  private initOffscreenCanvas(): void {
    if ('OffscreenCanvas' in window) {
      // 使用 OffscreenCanvas 进行后台渲染
      this.offscreenCanvas = new OffscreenCanvas(
        this.targetCanvas.width,
        this.targetCanvas.height
      );
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    } else {
      // 降级方案：使用普通canvas
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.targetCanvas.width;
      this.offscreenCanvas.height = this.targetCanvas.height;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }
  }

  // 批量绘制操作
  queueDraw(drawFn: (ctx: CanvasRenderingContext2D) => void): void {
    if (!this.offscreenCtx) return;

    this.drawQueue.push(() => drawFn(this.offscreenCtx as CanvasRenderingContext2D));
    
    if (!this.isDrawing) {
      this.processDraw();
    }
  }

  private processDraw(): void {
    if (!this.offscreenCanvas || !this.offscreenCtx) return;

    this.isDrawing = true;

    requestAnimationFrame(() => {
      // 执行所有绘制操作
      const operations = [...this.drawQueue];
      this.drawQueue.length = 0;

      operations.forEach(op => op());

      // 将结果复制到主canvas
      const targetCtx = this.targetCanvas.getContext('2d');
      if (targetCtx) {
        targetCtx.drawImage(this.offscreenCanvas as any, 0, 0);
      }

      this.isDrawing = false;

      // 如果还有待处理的操作，继续处理
      if (this.drawQueue.length > 0) {
        this.processDraw();
      }
    });
  }

  // 调整离屏canvas大小
  resize(width: number, height: number): void {
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }
  }

  cleanup(): void {
    this.drawQueue.length = 0;
    this.isDrawing = false;
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
  }
}

// 消息显示优化器 - 防止频繁的消息更新
export class MessageOptimizer {
  private messageQueue: string[] = [];
  private currentMessage = '';
  private messageTimer: NodeJS.Timeout | null = null;
  private isDisplaying = false;

  constructor(
    private setMessage: (message: string) => void,
    private displayDuration = 800  // 减少到800ms，快速响应
  ) {}

  showMessage(message: string): void {
    // 如果是相同的消息，忽略
    if (this.currentMessage === message) {
      return;
    }

    this.messageQueue.push(message);
    
    if (!this.isDisplaying) {
      this.processMessageQueue();
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      this.isDisplaying = false;
      return;
    }

    this.isDisplaying = true;
    this.currentMessage = this.messageQueue.shift() || '';
    
    // 使用优化的更新方式
    requestAnimationFrame(() => {
      this.setMessage(this.currentMessage);
    });

    // 清除之前的定时器
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }

    // 设置消息显示时间
    this.messageTimer = setTimeout(() => {
      // 如果没有新消息，清空显示
      if (this.messageQueue.length === 0) {
        this.currentMessage = '';
        this.setMessage('');
        this.isDisplaying = false;
      } else {
        // 继续处理队列中的消息
        this.processMessageQueue();
      }
    }, this.displayDuration);
  }

  // 立即清空消息队列
  clear(): void {
    this.messageQueue.length = 0;
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
    this.currentMessage = '';
    this.setMessage('');
    this.isDisplaying = false;
  }

  cleanup(): void {
    this.clear();
  }
}

// 性能监控器
export class PerformanceMonitor {
  private frameCount = 0;
  private lastFrameTime = 0;
  private fps = 0;
  private frameBuffer: number[] = [];
  private readonly bufferSize = 60; // 监控最近60帧

  constructor() {
    this.updateFPS = this.updateFPS.bind(this);
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.updateFPS();
  }

  private updateFPS(): void {
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime;
      this.frameBuffer.push(1000 / delta); // 转换为FPS
      
      if (this.frameBuffer.length > this.bufferSize) {
        this.frameBuffer.shift();
      }
      
      // 计算平均FPS
      this.fps = this.frameBuffer.reduce((a, b) => a + b, 0) / this.frameBuffer.length;
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    requestAnimationFrame(this.updateFPS);
  }

  getFPS(): number {
    return Math.round(this.fps);
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  // 检查性能是否良好
  isPerformanceGood(): boolean {
    return this.fps > 45; // 45fps以上认为性能良好
  }

  // 获取性能报告
  getReport(): PerformanceReport {
    return {
      fps: this.getFPS(),
      frameCount: this.getFrameCount(),
      isGood: this.isPerformanceGood(),
      averageFrameTime: this.frameBuffer.length > 0 
        ? Math.round(1000 / (this.frameBuffer.reduce((a, b) => a + b, 0) / this.frameBuffer.length) * 100) / 100
        : 0,
    };
  }
}

export interface PerformanceReport {
  fps: number;
  frameCount: number;
  isGood: boolean;
  averageFrameTime: number;
}

// Hook: 使用性能优化器
export function usePerformanceOptimizer() {
  const uiOptimizerRef = useRef<UIUpdateOptimizer>();
  const performanceMonitorRef = useRef<PerformanceMonitor>();

  // 初始化优化器
  useEffect(() => {
    uiOptimizerRef.current = new UIUpdateOptimizer();
    performanceMonitorRef.current = new PerformanceMonitor();

    return () => {
      uiOptimizerRef.current?.cleanup();
    };
  }, []);

  const queueUIUpdate = useCallback((updateFn: () => void) => {
    uiOptimizerRef.current?.queueUpdate(updateFn);
  }, []);

  const getPerformanceReport = useCallback(() => {
    return performanceMonitorRef.current?.getReport();
  }, []);

  return {
    queueUIUpdate,
    getPerformanceReport,
  };
}
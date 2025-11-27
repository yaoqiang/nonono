import { useRef, useCallback } from 'react';

// 语音控制优化器
export class VoiceControlOptimizer {
  private commandQueue: string[] = [];
  private isProcessing = false;
  private lastCommandTime = 0;
  private confidenceThreshold = 0.6; // 降低阈值，提高响应性
  private commandCooldown = 200; // 减少到200ms，更快响应
  private processedCommands = new Set<string>();
  private commandHistory: Array<{ command: string, timestamp: number }> = [];
  
  // 预编译正则表达式以提高匹配速度
  private static readonly COMMAND_PATTERNS = {
    clear: /清空|清除|clear|clean/i,
    save: /保存|下载|save|拍照/i,
    colors: {
      red: /红色|red/i,
      blue: /蓝色|blue/i,
      green: /绿色|green/i,
      white: /白色|white/i,
      yellow: /黄色|yellow/i,
      purple: /紫色|purple/i,
      pink: /粉色|pink/i,
    },
    brushTypes: {
      glow: /发光|glow/i,
      neon: /霓虹|neon/i,
      particle: /粒子|particle/i,
      rainbow: /彩虹|rainbow/i,
      spray: /喷雾|spray/i,
      normal: /普通|normal/i,
      '3d': /3d/i,
    },
    tools: {
      eraser: /橡皮|擦除|eraser/i,
      brush: /画笔|brush/i,
    },
    size: {
      bigger: /大|bigger|增大/i,
      smaller: /小|smaller|减小/i,
    },
    background: /背景|画布|template|换|切换/i,
    help: /帮助|help/i,
  };

  // 颜色映射表，避免重复查找
  private static readonly COLOR_MAP = {
    红色: '#ff0040',
    蓝色: '#00ffff',
    绿色: '#39ff14',
    白色: '#ffffff',
    黄色: '#ffff00',
    紫色: '#b000ff',
    粉色: '#ff10f0',
    red: '#ff0040',
    blue: '#00ffff',
    green: '#39ff14',
    white: '#ffffff',
    yellow: '#ffff00',
    purple: '#b000ff',
    pink: '#ff10f0',
  };

  constructor(
    private onCommand: (command: VoiceCommand) => void,
    private showMessage: (message: string) => void
  ) {}

  // 优化的语音结果处理
  processVoiceResult = (transcript: string, confidence: number, isFinal: boolean): void => {
    const now = Date.now();
    
    // 跳过低置信度和重复命令
    if (confidence < this.confidenceThreshold) {
      return;
    }

    // 防抖处理 - 避免短时间内重复命令
    if (now - this.lastCommandTime < this.commandCooldown) {
      return;
    }

    // 对于高置信度的中间结果，也可以处理以减少延迟
    if (!isFinal) {
      const cleanTranscript = transcript.trim().toLowerCase();
      // 如果是短命令且置信度高，立即处理
      if (cleanTranscript.length <= 4 && confidence > 0.8 && this.isQuickCommand(cleanTranscript)) {
        this.processCommand(cleanTranscript, now);
        return;
      }
      // 对于常见命令，即使是中间结果也可以处理
      if (confidence > 0.7 && this.isCommonCommand(cleanTranscript)) {
        this.processCommand(cleanTranscript, now);
        return;
      }
      return;
    }

    this.processCommand(transcript.trim().toLowerCase(), now);
  };

  // 检查是否为快速命令（可以提前执行）
  private isQuickCommand(command: string): boolean {
    const quickCommands = ['清空', '保存', '红色', '蓝色', '绿色'];
    return quickCommands.includes(command);
  }

  // 检查是否为常见命令（高频使用）
  private isCommonCommand(command: string): boolean {
    const commonCommands = ['清空', '保存', '红色', '蓝色', '绿色', '白色', '黄色', '发光', '霓虹', '背景', '画笔', '橡皮'];
    return commonCommands.some(common => command.includes(common));
  }

  // 命令处理主逻辑
  private processCommand(command: string, timestamp: number): void {
    // 避免重复处理相同命令
    const commandKey = `${command}_${Math.floor(timestamp / 1000)}`;
    if (this.processedCommands.has(commandKey)) {
      return;
    }
    this.processedCommands.add(commandKey);
    
    // 清理旧的命令记录（保持内存效率）
    if (this.processedCommands.size > 50) {
      this.processedCommands.clear();
    }

    this.lastCommandTime = timestamp;
    
    // 记录命令历史
    this.commandHistory.push({ command, timestamp });
    if (this.commandHistory.length > 20) {
      this.commandHistory.shift();
    }

    // 使用优化的命令匹配
    const voiceCommand = this.parseCommand(command);
    if (voiceCommand) {
      // 使用 requestAnimationFrame 确保UI更新不阻塞
      requestAnimationFrame(() => {
        this.onCommand(voiceCommand);
      });
    }
  };

  // 优化的命令解析 - 使用预编译正则表达式
  private parseCommand(command: string): VoiceCommand | null {
    const patterns = VoiceControlOptimizer.COMMAND_PATTERNS;

    // 清空命令
    if (patterns.clear.test(command)) {
      this.showMessage('🎤 已清空画布');
      return { type: 'clear' };
    }

    // 保存命令
    if (patterns.save.test(command)) {
      return { type: 'save' };
    }

    // 颜色命令 - 优化查找
    for (const [colorKey, pattern] of Object.entries(patterns.colors)) {
      if (pattern.test(command)) {
        const colorValue = VoiceControlOptimizer.COLOR_MAP[colorKey] || 
                          VoiceControlOptimizer.COLOR_MAP[colorKey as keyof typeof VoiceControlOptimizer.COLOR_MAP];
        if (colorValue) {
          this.showMessage(`🎤 ${colorKey}画笔`);
          return { type: 'color', value: colorValue };
        }
      }
    }

    // 画笔类型命令
    for (const [brushKey, pattern] of Object.entries(patterns.brushTypes)) {
      if (pattern.test(command)) {
        const brushNames: Record<string, string> = {
          glow: '发光',
          neon: '霓虹',
          '3d': '3D',
          particle: '粒子',
          rainbow: '彩虹',
          spray: '喷雾',
          normal: '普通'
        };
        this.showMessage(`🎤 ${brushNames[brushKey]}画笔`);
        return { type: 'brushType', value: brushKey as any };
      }
    }

    // 工具命令
    for (const [toolKey, pattern] of Object.entries(patterns.tools)) {
      if (pattern.test(command)) {
        const toolNames = { eraser: '橡皮擦', brush: '画笔' };
        this.showMessage(`🎤 ${toolNames[toolKey as keyof typeof toolNames]}工具`);
        return { type: 'tool', value: toolKey as 'eraser' | 'brush' };
      }
    }

    // 尺寸命令
    if (patterns.size.bigger.test(command)) {
      this.showMessage('🎤 画笔变大');
      return { type: 'size', value: 'bigger' };
    }
    if (patterns.size.smaller.test(command)) {
      this.showMessage('🎤 画笔变小');
      return { type: 'size', value: 'smaller' };
    }

    // 背景命令
    if (patterns.background.test(command)) {
      this.showMessage('🎤 切换背景');
      return { type: 'background' };
    }

    // 帮助命令
    if (patterns.help.test(command)) {
      this.showMessage('🎤 支持: 颜色/画笔/背景/清空/保存');
      return { type: 'help' };
    }

    return null;
  }

  // 获取命令统计信息
  getStats() {
    return {
      totalCommands: this.commandHistory.length,
      recentCommands: this.commandHistory.slice(-5),
      averageInterval: this.calculateAverageInterval(),
    };
  }

  private calculateAverageInterval(): number {
    if (this.commandHistory.length < 2) return 0;
    
    let totalInterval = 0;
    for (let i = 1; i < this.commandHistory.length; i++) {
      totalInterval += this.commandHistory[i].timestamp - this.commandHistory[i-1].timestamp;
    }
    
    return totalInterval / (this.commandHistory.length - 1);
  }

  // 清理资源
  cleanup() {
    this.commandQueue = [];
    this.processedCommands.clear();
    this.commandHistory = [];
  }
}

// 语音命令类型定义
export interface VoiceCommand {
  type: 'clear' | 'save' | 'color' | 'brushType' | 'tool' | 'size' | 'background' | 'help';
  value?: any;
}

// 语音控制Hook
export function useOptimizedVoiceControl(
  isEnabled: boolean,
  onCommand: (command: VoiceCommand) => void,
  showMessage: (message: string) => void
) {
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const optimizerRef = useRef<VoiceControlOptimizer>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // 初始化优化器
  if (!optimizerRef.current) {
    optimizerRef.current = new VoiceControlOptimizer(onCommand, showMessage);
  }

  const startRecognition = useCallback(() => {
    if (isListeningRef.current || !isEnabled) return;
    
    // 清除任何待处理的重连
    clearTimeout(reconnectTimeoutRef.current);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      showMessage('❌ 浏览器不支持语音控制');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // 优化的配置 - 减少延迟
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;
    
    // 移除可能导致网络错误的语法约束设置

    recognition.onresult = (event: any) => {
      try {
        const lastResult = event.results[event.results.length - 1];
        if (!lastResult) return;

        const transcript = lastResult[0].transcript;
        const confidence = lastResult[0].confidence || 1.0;
        const isFinal = lastResult.isFinal;

        // 使用优化器处理结果
        optimizerRef.current?.processVoiceResult(transcript, confidence, isFinal);

      } catch (error) {
        console.error('Voice processing error:', error);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      isListeningRef.current = false;

      switch (event.error) {
        case 'not-allowed':
          showMessage('❌ 请允许麦克风权限');
          break;
        case 'network':
          // 网络错误很常见，静默处理，让onend自动重启
          console.log('Network error, will restart automatically');
          break;
        case 'no-speech':
          // 忽略无语音错误
          console.log('No speech detected');
          break;
        case 'aborted':
          // 正常中止，通常是重启过程的一部分
          console.log('Recognition aborted');
          break;
        default:
          console.log('Recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      console.log('Recognition ended, will restart if enabled');
      
      // 简单的自动重启，只要语音控制仍然启用
      if (isEnabled) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isEnabled && !isListeningRef.current) {
            console.log('Restarting recognition...');
            startRecognition();
          }
        }, 500);
      }
    };

    let isFirstStart = !recognition.hasEverStarted;
    
    recognition.onstart = () => {
      isListeningRef.current = true;
      
      // 只在第一次启动时显示消息
      if (isFirstStart) {
        showMessage('🎤 语音控制已开启');
        recognition.hasEverStarted = true;
        isFirstStart = false;
      }
      
      console.log('Recognition started');
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      showMessage('❌ 语音启动失败');
    }
  }, [isEnabled, onCommand, showMessage]);

  const stopRecognition = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current);
    
    if (recognitionRef.current && isListeningRef.current) {
      try {
        // 重置启动标志，下次启用时可以再次显示消息
        recognitionRef.current.hasEverStarted = false;
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Failed to stop recognition:', error);
      }
    }
    
    isListeningRef.current = false;
    optimizerRef.current?.cleanup();
    console.log('Voice recognition stopped');
  }, []);

  // 返回控制函数
  return {
    startRecognition,
    stopRecognition,
    isListening: isListeningRef.current,
    getStats: () => optimizerRef.current?.getStats(),
  };
}
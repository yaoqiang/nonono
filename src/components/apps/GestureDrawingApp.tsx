import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Camera,
  Trash2,
  Download,
  Palette,
  Eraser,
  Sparkles,
  Brush,
  Circle,
  Square,
  Triangle,
  Minus,
  X,
  ThumbsUp,
  Hand,
  RotateCcw,
  Mic,
  MicOff,
  Image as ImageIcon
} from 'lucide-react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

interface GestureDrawingAppProps {
  onBack: () => void;
}

type BrushType = 'normal' | 'glow' | 'spray' | 'neon' | 'rainbow' | '3d' | 'particle';
type ToolType = 'brush' | 'eraser' | 'line' | 'circle' | 'rectangle';
type GestureType = 'none' | 'point' | 'pinch' | 'fist' | 'peace' | 'thumbsup' | 'palm' | 'ok' | 'rock' | 'frame' | 'wiping' | 'shaka' | 'snapshot';

export function GestureDrawingApp({ onBack }: GestureDrawingAppProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('none');
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number>();
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Drawing settings
  const [currentColor, setCurrentColor] = useState('#39ff14');
  const [brushSize, setBrushSize] = useState(5);
  const [brushType, setBrushType] = useState<BrushType>('glow');
  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [showControls, setShowControls] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  // Gesture feedback
  const [gestureMessage, setGestureMessage] = useState('');
  const gestureTimeoutRef = useRef<NodeJS.Timeout>();

  // Shape drawing
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Undo functionality
  const lastUndoTimeRef = useRef<number>(0);
  const undoFrameCountRef = useRef<number>(0);
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  const maxHistoryLength = 20;

  // Preset templates
  const [currentTemplate, setCurrentTemplate] = useState(0);
  const presetImages = [
    '#000000', // Dark Mode
    'WHITEBOARD', // Light Mode
  ];
  const templateNames = [
    '暗黑模式',
    '白板模式'
  ];

  const colors = [
    { name: 'Neon Green', value: '#39ff14' },
    { name: 'Hot Pink', value: '#ff10f0' },
    { name: 'Electric Blue', value: '#00ffff' },
    { name: 'Laser Red', value: '#ff0040' },
    { name: 'Toxic Yellow', value: '#ffff00' },
    { name: 'Purple Haze', value: '#b000ff' },
    { name: 'White', value: '#ffffff' },
  ];

  const brushTypes: BrushType[] = ['normal', 'glow', 'neon', 'spray', 'rainbow', '3d', 'particle'];

  // Show gesture message with auto-hide
  const showGestureMessage = (message: string) => {
    setGestureMessage(message);
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }
    gestureTimeoutRef.current = setTimeout(() => {
      setGestureMessage('');
    }, 2000);
  };

  // Save current canvas state to history
  const saveToHistory = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setDrawingHistory((prev: ImageData[]) => {
        const newHistory = [...prev, imageData];
        return newHistory.slice(-maxHistoryLength);
      });
    } catch (error) {
      console.error('Failed to save history:', error);
      // If canvas is tainted, we can't save history, but we shouldn't crash
    }
  };

  // Undo last action
  const undo = () => {
    if (drawingHistory.length === 0) {
      showGestureMessage('❌ 没有可撤销的操作');
      return;
    }

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Remove last state and get previous one
    setDrawingHistory((prev: ImageData[]) => {
      const newHistory = [...prev];
      newHistory.pop(); // Remove current state

      if (newHistory.length > 0) {
        const previousState = newHistory[newHistory.length - 1];
        ctx.putImageData(previousState, 0, 0);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      return newHistory;
    });

    showGestureMessage('↩️ 撤销成功');
    showGestureMessage('↩️ 撤销成功');
  };

  // Save canvas as image
  const saveCanvas = () => {
    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!canvas || !drawingCanvas) return;

    // Create a temporary canvas to combine video/background and drawing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    if (presetImages[currentTemplate] === 'WHITEBOARD') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    } else {
      // Draw the current video frame (which has the background overlay)
      // Note: We can't easily get the background image directly if it's tainted, 
      // but we can try drawing the main canvas which has the video feed + background overlay
      ctx.drawImage(canvas, 0, 0);
    }

    // Draw drawing layer
    ctx.drawImage(drawingCanvas, 0, 0);

    // Download
    try {
      const dataUrl = tempCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `gesture-art-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showGestureMessage('📸 作品已保存！');
    } catch (error) {
      console.error('Save failed:', error);
      showGestureMessage('❌ 保存失败 (可能是跨域限制)');
    }
  };

  // Detect gesture type from hand landmarks
  // Detect gesture type from hand landmarks
  const detectGesture = (landmarks: any[], lastGesture: GestureType): GestureType => {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Helper to check if a finger is curled (tip closer to wrist than PIP)
    const isCurled = (tipIdx: number, pipIdx: number) => {
      const tip = landmarks[tipIdx];
      const pip = landmarks[pipIdx];
      const tipDist = Math.sqrt((tip.x - wrist.x) ** 2 + (tip.y - wrist.y) ** 2);
      const pipDist = Math.sqrt((pip.x - wrist.x) ** 2 + (pip.y - wrist.y) ** 2);
      return tipDist < pipDist;
    };

    // Check finger states
    const indexCurled = isCurled(8, 6);
    const middleCurled = isCurled(12, 10);
    const ringCurled = isCurled(16, 14);
    const pinkyCurled = isCurled(20, 18);

    // Calculate thumb-index distance for pinch
    const thumbIndexDist = Math.sqrt(
      (thumbTip.x - indexTip.x) ** 2 + (thumbTip.y - indexTip.y) ** 2
    );

    // Calculate Hand Size (Wrist to Middle MCP) for normalization
    // This makes detection robust to distance and hand size (children vs adults)
    const middleMCP = landmarks[9];
    const handSize = Math.sqrt((wrist.x - middleMCP.x) ** 2 + (wrist.y - middleMCP.y) ** 2) || 0.1; // Fallback to 0.1 to avoid div by 0

    // Priority 1: PINCH (Draw) - Most important
    // HYSTERESIS:
    // Enter Pinch: dist < 0.3 * handSize
    // Exit Pinch: dist > 0.5 * handSize
    const pinchThreshold = (lastGesture === 'pinch' ? 0.5 : 0.3) * handSize;

    // SKELETAL CHECK: Opposition. Thumb tip should be facing Index tip.
    // FIX: Removed !indexCurled check to allow natural pinching at angles.
    if (thumbIndexDist < pinchThreshold) {
      return 'pinch';
    }

    // Priority 2: PALM (Eraser/Clear) - 🖐️
    // Logic: Wide spread of fingers relative to hand size.
    // We calculate spread factor regardless of curl state to be more robust.
    const indexMiddleDist = Math.sqrt((indexTip.x - middleTip.x) ** 2 + (indexTip.y - middleTip.y) ** 2);
    const middleRingDist = Math.sqrt((middleTip.x - ringTip.x) ** 2 + (middleTip.y - ringTip.y) ** 2);
    const ringPinkyDist = Math.sqrt((ringTip.x - pinkyTip.x) ** 2 + (ringTip.y - pinkyTip.y) ** 2);
    const spreadFactor = indexMiddleDist + middleRingDist + ringPinkyDist;

    // Palm Condition:
    // 1. Spread is wide (> 0.8 * handSize)
    // 2. Thumb and Index are NOT pinching (dist > 0.5 * handSize)
    if (spreadFactor > 0.8 * handSize && thumbIndexDist > 0.5 * handSize) {
      return 'palm';
    }

    // Hysteresis for Palm
    if (lastGesture === 'palm' && spreadFactor > 0.6 * handSize && thumbIndexDist > 0.5 * handSize) {
      return 'palm';
    }

    // Priority 3: PEACE (Snapshot/Template)
    // Index and Middle open. Ring and Pinky curled.
    if (!indexCurled && !middleCurled && ringCurled && pinkyCurled) {
      return 'peace';
    }

    // Priority 4: SHAKA (Undo) - 🤙
    // Thumb and Pinky extended. Index, Middle, Ring curled.
    if (indexCurled && middleCurled && ringCurled && !pinkyCurled) {
      // Check thumb extension (distance from index MCP)
      const thumbTipToIndexMCP = Math.sqrt(
        (thumbTip.x - landmarks[5].x) ** 2 + (thumbTip.y - landmarks[5].y) ** 2
      );
      if (thumbTipToIndexMCP > 0.1) {
        return 'shaka';
      }
    }

    // Priority 5: FIST (Clear)
    if (indexCurled && middleCurled && ringCurled && pinkyCurled) {
      return 'fist';
    }

    return 'none';
  };

  // Handle gesture actions
  const handleGestureAction = (gesture: GestureType, prevGesture: GestureType) => {
    if (gesture === prevGesture) return;

    switch (gesture) {
      case 'ok':
        // Cycle through colors
        const currentIndex = colors.findIndex(c => c.value === currentColor);
        const nextColor = colors[(currentIndex + 1) % colors.length];
        setCurrentColor(nextColor.value);
        showGestureMessage(`🎨 ${nextColor.name}`);
        break;

      case 'peace':
        // Cycle through brush types
        const currentBrushIndex = brushTypes.indexOf(brushType);
        const nextBrush = brushTypes[(currentBrushIndex + 1) % brushTypes.length];
        setBrushType(nextBrush);
        const brushNames = {
          normal: '普通画笔',
          glow: '发光画笔',
          neon: '霓虹画笔',
          spray: '喷雾画笔',
          rainbow: '彩虹画笔',
          '3d': '3D画笔',
          particle: '粒子画笔'
        };
        showGestureMessage(`✨ ${brushNames[nextBrush]}`);
        break;

      case 'shaka':
        // Undo
        // undo(); // Handled in loop with cooldown
        break;

      case 'palm':
        if (currentTool === 'eraser') {
          showGestureMessage('🖐️ 橡皮擦模式');
        }
        break;

      case 'fist':
        showGestureMessage('✊ 保持3秒清空画布');
        break;

      case 'pinch':
        saveToHistory();
        showGestureMessage('✏️ 绘画中...');
        break;

      case 'thumbsup':
        if (currentTool === 'eraser') {
          showGestureMessage('👍 橡皮擦模式');
        }
        break;
    }
  };



  // Voice Control
  useEffect(() => {
    if (!isVoiceEnabled) return;

    // @ts-ignore
    if (!('webkitSpeechRecognition' in window)) {
      alert('您的浏览器不支持语音控制，请使用 Chrome。');
      setIsVoiceEnabled(false);
      return;
    }

    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Enable interim results for better feedback
    recognition.lang = 'zh-CN';

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim().toLowerCase();
      const isFinal = lastResult.isFinal;

      if (!isFinal) {
        // Show interim feedback
        showGestureMessage(`👂 正在听: ${transcript}...`);
        return;
      }

      const command = transcript;
      console.log('Voice command:', command);

      if (command.includes('清空') || command.includes('clear')) {
        clearCanvas();
        showGestureMessage('🎤 已清空画布');
      } else if (command.includes('保存') || command.includes('save') || command.includes('拍照')) {
        saveCanvas();
      } else if (command.includes('红色') || command.includes('red')) {
        setCurrentColor('#ff0040');
        showGestureMessage('🎤 红色');
      } else if (command.includes('蓝色') || command.includes('blue')) {
        setCurrentColor('#00ffff');
        showGestureMessage('🎤 蓝色');
      } else if (command.includes('绿色') || command.includes('green')) {
        setCurrentColor('#39ff14');
        showGestureMessage('🎤 绿色');
      } else if (command.includes('白色') || command.includes('white')) {
        setCurrentColor('#ffffff');
        showGestureMessage('🎤 白色');
      } else if (command.includes('3d')) {
        setBrushType('3d');
        showGestureMessage('🎤 3D画笔');
      } else if (command.includes('粒子') || command.includes('particle')) {
        setBrushType('particle');
        showGestureMessage('🎤 粒子画笔');
      } else if (command.includes('背景') || command.includes('画布') || command.includes('background') || command.includes('template')) {
        setCurrentTemplate((prev: number) => (prev + 1) % presetImages.length);
        showGestureMessage('🎤 切换背景');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('请允许麦克风权限以使用语音控制。');
        setIsVoiceEnabled(false);
      }
    };

    try {
      recognition.start();
      showGestureMessage('🎤 语音控制已开启');
    } catch (e) {
      console.error('Voice recognition start failed:', e);
      setIsVoiceEnabled(false);
    }

    return () => {
      try {
        recognition.stop();
      } catch (e) { }
    };
  }, [isVoiceEnabled]);

  // Palm hold timer for clearing canvas
  const palmHoldStartRef = useRef<number | null>(null);
  const PALM_HOLD_DURATION = 3000; // 3 seconds

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 1280, height: 720 },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsVideoReady(true);
          };
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('无法访问摄像头，请确保已授予权限！');
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const [isModelReady, setIsModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Initialize MediaPipe Hand Landmarker
  useEffect(() => {
    const initHandLandmarker = async () => {
      try {
        console.log('Initializing HandLandmarker...');
        const vision = await FilesetResolver.forVisionTasks(
          '/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        handLandmarkerRef.current = handLandmarker;
        setIsModelReady(true);
        console.log('HandLandmarker initialized successfully');
      } catch (error) {
        console.error('Error initializing hand landmarker:', error);
        setModelError('AI模型加载失败 (可能是网络原因)');
      }
    };

    initHandLandmarker();
  }, []);

  // Main detection and drawing loop
  useEffect(() => {
    if (!isVideoReady) return;

    const detectHands = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const drawingCanvas = drawingCanvasRef.current;

      if (!video || !canvas || !drawingCanvas) return;

      const ctx = canvas.getContext('2d');
      const drawCtx = drawingCanvas.getContext('2d');
      if (!ctx || !drawCtx) return;

      // Match canvas size to video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawingCanvas.width = video.videoWidth;
        drawingCanvas.height = video.videoHeight;
      }

      // Clear and draw video
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Detect hands
      let results: HandLandmarkerResult | null = null;
      if (handLandmarkerRef.current) {
        results = handLandmarkerRef.current.detectForVideo(video, performance.now());
      }

      // State for this frame
      let activePinchHand: any = null;
      let activePalmHand: any = null;
      let activeFistHand: any = null;
      let activeShakaHand: any = null;
      let peaceCount = 0;

      if (results && results.landmarks) {
        for (const landmarks of results.landmarks) {
          const gesture = detectGesture(landmarks, currentGesture);

          // Draw cursor/feedback for this hand
          const indexTip = landmarks[8];
          const x = (1 - indexTip.x) * canvas.width;
          const y = indexTip.y * canvas.height;

          // Visual feedback
          ctx.beginPath();
          const cursorSize = gesture === 'palm' ? 50 : (gesture === 'pinch' ? 5 : 10);
          const cursorColor = gesture === 'palm' ? 'rgba(255, 255, 255, 0.5)' : currentColor;
          ctx.arc(x, y, cursorSize, 0, 2 * Math.PI);
          ctx.strokeStyle = cursorColor;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Icon
          let icon = '';
          if (gesture === 'pinch') icon = '✏️';
          else if (gesture === 'palm') icon = '🖐️';
          else if (gesture === 'fist') icon = '✊';
          else if (gesture === 'peace') icon = '✌️';
          else if (gesture === 'shaka') icon = '🤙';

          if (icon) {
            ctx.font = '30px Arial';
            ctx.fillText(icon, x + 20, y - 20);
          }

          // Collect states
          // Collect states
          if (gesture === 'pinch') {
            if (!activePinchHand) activePinchHand = { landmarks, x, y };
          } else if (gesture === 'palm') {
            if (!activePalmHand) activePalmHand = { landmarks, x, y };
          } else if (gesture === 'fist') {
            activeFistHand = true;
          } else if (gesture === 'peace') {
            peaceCount++;
          } else if (gesture === 'shaka') {
            activeShakaHand = true;
          }
        }
      }

      // --- LOGIC AGGREGATION ---

      // 1. Double Peace -> Snapshot
      if (peaceCount >= 2) {
        if (currentGesture !== 'snapshot') {
          showGestureMessage('📸 3..2..1..');
          setTimeout(saveCanvas, 1000);
          setCurrentGesture('snapshot');
        }
      }
      // 2. Fist -> Clear (Hold)
      else if (activeFistHand) {
        if (palmHoldStartRef.current === null) {
          palmHoldStartRef.current = Date.now();
          showGestureMessage('✊ 保持3秒清空画布');
        } else {
          const holdTime = Date.now() - palmHoldStartRef.current;
          const progress = Math.min(holdTime / PALM_HOLD_DURATION, 1);

          // Show progress
          if (progress < 1) {
            ctx.save();
            ctx.strokeStyle = '#ff0040';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 50, -Math.PI / 2, -Math.PI / 2 + (progress * Math.PI * 2));
            ctx.stroke();
            ctx.restore();
          } else {
            clearCanvas();
            showGestureMessage('🗑️ 画布已清空！');
            palmHoldStartRef.current = null;
          }
        }
      }
      // 3. Pinch -> Draw (Priority over Fist)
      else if (activePinchHand) {
        palmHoldStartRef.current = null;
        const { x, y, landmarks } = activePinchHand;

        if (currentGesture !== 'pinch') {
          saveToHistory();
          // If tool is shape, start shape
          if (['line', 'circle', 'rectangle'].includes(currentTool)) {
            shapeStartRef.current = { x, y };
            showGestureMessage('📐 绘制图形...');
          } else {
            showGestureMessage('✏️ 绘画中...');
          }
          setCurrentGesture('pinch');
        }

        if (['line', 'circle', 'rectangle'].includes(currentTool)) {
          // Draw preview shape on overlay canvas (ctx)
          if (shapeStartRef.current) {
            // Clear previous preview (handled by loop clearing ctx)
            drawShape(ctx, shapeStartRef.current.x, shapeStartRef.current.y, x, y);
          }
        } else {
          draw(drawCtx, x, y);
        }

        // Draw connection line
        const thumbTip = landmarks[4];
        const thumbX = (1 - thumbTip.x) * canvas.width;
        const thumbY = thumbTip.y * canvas.height;
        ctx.beginPath();
        ctx.moveTo(thumbX, thumbY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // 4. Palm -> Erase (Global Shortcut)
      // Now works regardless of selected tool for better UX
      else if (activePalmHand) {
        palmHoldStartRef.current = null;
        const { x, y } = activePalmHand;

        if (currentGesture !== 'palm') {
          showGestureMessage('🖐️ 橡皮擦模式');
          setCurrentGesture('palm');
        }
        erase(drawCtx, x, y);
        lastPositionRef.current = null;
      }
      // 5. Shaka -> Undo
      else if (activeShakaHand) {
        palmHoldStartRef.current = null;
        lastPositionRef.current = null;

        // Increment frame counter
        undoFrameCountRef.current++;

        // Check if held long enough (e.g., 5 frames) AND cooldown passed
        if (undoFrameCountRef.current > 5 && Date.now() - lastUndoTimeRef.current > 1000) {
          if (currentGesture !== 'shaka') {
            undo();
            lastUndoTimeRef.current = Date.now();
            undoFrameCountRef.current = 0; // Reset counter
            setCurrentGesture('shaka');
          }
        }
      }
      // Nothing active
      else {
        // If we were pinching and now stopped, commit shape if needed
        if (currentGesture === 'pinch' && ['line', 'circle', 'rectangle'].includes(currentTool) && shapeStartRef.current && lastPositionRef.current) {
          // Commit shape to drawing canvas
          drawShape(drawCtx, shapeStartRef.current.x, shapeStartRef.current.y, lastPositionRef.current.x, lastPositionRef.current.y);
          shapeStartRef.current = null;
        }

        palmHoldStartRef.current = null;
        lastPositionRef.current = null;
        undoFrameCountRef.current = 0; // Reset undo counter if gesture lost
        if (currentGesture !== 'none' && currentGesture !== 'snapshot') {
          setCurrentGesture('none');
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectHands);
    };

    detectHands();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVideoReady, currentColor, brushSize, brushType, currentTool, currentGesture]);

  const draw = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    if (lastPositionRef.current) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (brushType) {
        case 'glow':
          ctx.shadowBlur = 20;
          ctx.shadowColor = currentColor;
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = brushSize;
          break;
        case 'neon':
          ctx.shadowBlur = 30;
          ctx.shadowColor = currentColor;
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = brushSize * 0.5;
          break;
        case 'spray':
          // Spray effect
          for (let i = 0; i < 10; i++) {
            const offsetX = (Math.random() - 0.5) * brushSize * 2;
            const offsetY = (Math.random() - 0.5) * brushSize * 2;
            ctx.fillStyle = currentColor + '40';
            ctx.fillRect(x + offsetX, y + offsetY, 2, 2);
          }
          return;
        case 'rainbow':
          const hue = (Date.now() / 10) % 360;
          ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
          ctx.shadowBlur = 15;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.lineWidth = brushSize;
          break;
        case '3d':
          ctx.shadowBlur = 2;
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = brushSize;
          ctx.strokeStyle = currentColor;
          // Draw shadow offset
          ctx.beginPath();
          ctx.moveTo(lastPositionRef.current.x + 4, lastPositionRef.current.y + 4);
          ctx.lineTo(x + 4, y + 4);
          ctx.stroke();
          // Reset for main line
          ctx.shadowBlur = 0;
          break;
        case 'particle':
          // Draw particles along path
          for (let i = 0; i < 3; i++) {
            const px = x + (Math.random() - 0.5) * brushSize * 3;
            const py = y + (Math.random() - 0.5) * brushSize * 3;
            ctx.fillStyle = currentColor;
            ctx.beginPath();
            ctx.arc(px, py, Math.random() * brushSize / 3, 0, Math.PI * 2);
            ctx.fill();
          }
          return; // Skip default stroke
        default:
          ctx.shadowBlur = 0;
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = brushSize;
      }

      ctx.beginPath();
      ctx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPositionRef.current = { x, y };
  };

  const erase = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    // Make eraser bigger for Palm
    const radius = currentGesture === 'palm' ? 50 : brushSize * 5;
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  const drawShape = (ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) => {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.shadowBlur = brushType === 'glow' || brushType === 'neon' ? 20 : 0;
    ctx.shadowColor = currentColor;

    switch (currentTool) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        break;
      case 'circle':
        const radius = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'rectangle':
        ctx.beginPath();
        ctx.rect(startX, startY, endX - startX, endY - startY);
        ctx.stroke();
        break;
    }
  };

  const clearCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const downloadDrawing = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `nonono-art-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const loadTemplate = (index: number) => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (presetImages[index] === 'WHITEBOARD') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (presetImages[index].startsWith('#')) {
          ctx.fillStyle = presetImages[index];
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = presetImages[index];
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
        }
      }
    }
  };

  // Load template when currentTemplate changes
  useEffect(() => {
    loadTemplate(currentTemplate);

    // Auto-switch color for Whiteboard
    if (presetImages[currentTemplate] === 'WHITEBOARD') {
      setCurrentColor('#000000');
      showGestureMessage('⚫️ 已切换黑色画笔');
    } else {
      // Switch back to neon if coming from whiteboard (optional, but good UX)
      if (currentColor === '#000000') {
        setCurrentColor('#39ff14');
        showGestureMessage('🟢 已切换霓虹画笔');
      }
    }
  }, [currentTemplate]);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Video and Canvas Container */}
      <div className="relative w-full h-screen flex items-center justify-center">
        <video
          ref={videoRef}
          className="hidden"
          playsInline
        />

        {/* Overlay canvas (video + hand tracking) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ transform: 'scaleX(1)' }}
        />

        {/* Drawing canvas */}
        <canvas
          ref={drawingCanvasRef}
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Loading state */}
        {(!isVideoReady || !isModelReady) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
            <div className="text-center">
              {modelError ? (
                <>
                  <div className="text-red-500 text-4xl mb-4">⚠️</div>
                  <p className="text-xl text-red-500 font-bold">{modelError}</p>
                  <p className="text-sm text-gray-400 mt-2">请检查网络连接或开启代理</p>
                </>
              ) : (
                <>
                  <Camera className="w-16 h-16 mb-4 mx-auto animate-pulse text-[#39ff14]" />
                  <p className="text-xl text-white">
                    {!isVideoReady ? '正在启动摄像头...' : '正在加载AI模型...'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">首次加载可能需要一点时间...</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Drawing indicator */}
        <AnimatePresence>
          {currentGesture === 'pinch' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-[#39ff14] text-black px-6 py-3 font-bold"
            >
              ✨ DRAWING ✨
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls Panel */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            className="fixed left-0 top-0 h-full w-80 bg-black/90 backdrop-blur-md border-r-2 border-[#39ff14] p-6 overflow-y-auto z-50"
          >
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-white hover:text-[#39ff14] transition-colors mb-4"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </button>

              <h2 className="text-3xl mb-2" style={{ fontFamily: 'Impact, sans-serif' }}>
                GESTURE DRAW
              </h2>
              <p className="text-sm text-gray-400">用拇指和食指捏合来画画</p>
            </div>

            {/* Tool Selection */}
            <div className="mb-6">
              <label className="block text-sm mb-3 text-gray-400">工具</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'brush' as ToolType, icon: Brush, label: '画笔' },
                  { type: 'eraser' as ToolType, icon: Eraser, label: '橡皮' },
                  { type: 'line' as ToolType, icon: Minus, label: '直线' },
                  { type: 'circle' as ToolType, icon: Circle, label: '圆形' },
                  { type: 'rectangle' as ToolType, icon: Square, label: '矩形' },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setCurrentTool(type)}
                    className={`p-3 border-2 transition-all ${currentTool === type
                      ? 'border-[#39ff14] bg-[#39ff14]/20'
                      : 'border-white/20 hover:border-white/40'
                      }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs block">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brush Type */}
            {currentTool === 'brush' && (
              <div className="mb-6">
                <label className="block text-sm mb-3 text-gray-400">画笔类型</label>
                <div className="space-y-2">
                  {[
                    { type: 'normal' as BrushType, label: '普通', icon: Brush },
                    { type: 'glow' as BrushType, label: '发光', icon: Sparkles },
                    { type: 'neon' as BrushType, label: '霓虹', icon: Sparkles },
                    { type: 'spray' as BrushType, label: '喷雾', icon: Circle },
                    { type: 'rainbow' as BrushType, label: '彩虹', icon: Palette },
                    { type: '3d' as BrushType, label: '3D', icon: Square },
                    { type: 'particle' as BrushType, label: '粒子', icon: Sparkles },
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => setBrushType(type)}
                      className={`w-full p-3 border-2 flex items-center gap-3 transition-all ${brushType === type
                        ? 'border-[#ff10f0] bg-[#ff10f0]/20'
                        : 'border-white/20 hover:border-white/40'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Background Selection - MOVED OUTSIDE */}
            <div className="mb-6">
              <label className="block text-sm mb-3 text-gray-400">画布风格</label>
              <div className="grid grid-cols-2 gap-2">
                {templateNames.map((name, index) => (
                  <button
                    key={name}
                    onClick={() => setCurrentTemplate(index)}
                    className={`p-2 border-2 text-xs transition-all ${currentTemplate === index
                      ? 'border-[#39ff14] bg-[#39ff14]/20'
                      : 'border-white/20 hover:border-white/40'
                      }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div className="mb-6">
              <label className="block text-sm mb-3 text-gray-400">颜色</label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setCurrentColor(color.value)}
                    className={`w-full aspect-square border-2 transition-all ${currentColor === color.value
                      ? 'border-white scale-110'
                      : 'border-white/20 hover:scale-105'
                      }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Brush Size */}
            <div className="mb-6">
              <label className="block text-sm mb-3 text-gray-400">
                画笔大小: {brushSize}px
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBrushSize(Number(e.target.value))}
                className="w-full"
                style={{
                  accentColor: currentColor,
                }}
              />
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={clearCanvas}
                className="w-full bg-red-500/20 border-2 border-red-500 hover:bg-red-500/40 p-3 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                清空画布
              </button>

              <button
                onClick={downloadDrawing}
                className="w-full bg-[#39ff14]/20 border-2 border-[#39ff14] hover:bg-[#39ff14]/40 p-3 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                下载作品
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Controls Button */}
      <div className="fixed left-4 bottom-4 z-50 flex flex-col gap-3">
        <button
          onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
          className={`p-4 rounded-full transition-all ${isVoiceEnabled ? 'bg-[#ff10f0] text-white' : 'bg-gray-800 text-gray-400'}`}
          title="语音控制"
        >
          {isVoiceEnabled ? (
            <div className="relative">
              <Mic className="w-6 h-6 relative z-10" />
              <span className="absolute inset-0 bg-white rounded-full animate-ping opacity-50"></span>
            </div>
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={() => setShowControls(!showControls)}
          className="bg-[#39ff14] text-black p-4 rounded-full hover:bg-[#ff10f0] transition-all"
        >
          {showControls ? <X className="w-6 h-6" /> : <Palette className="w-6 h-6" />}
        </button>

        <button
          onClick={() => setCurrentTemplate((prev: number) => (prev + 1) % presetImages.length)}
          className="bg-white text-black p-4 rounded-full hover:bg-gray-200 transition-all"
          title="切换画布"
        >
          <ImageIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Instructions */}
      <div className="fixed right-4 bottom-4 bg-black/80 backdrop-blur-md border-2 border-white/20 p-4 max-w-sm rounded-xl">
        <h3 className="font-bold mb-3 text-[#39ff14] text-lg">🎨 极简手势指南 (v2.1)</h3>

        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-2">【通用手势 - 左右手均可】</p>
          <ul className="text-sm space-y-2 text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-xl">🤏</span>
              <span><strong>捏合</strong> = 画画</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-xl">🖐️</span>
              <span><strong>张开手掌(橡皮)</strong> = 擦除</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-xl">✊</span>
              <span><strong>握拳 (3秒)</strong> = 清空</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-xl">🤙</span>
              <span><strong>六六六(Shaka)</strong> = 撤销</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-white/20 pt-3">
          <p className="text-xs text-gray-400 mb-2">【特殊功能】</p>
          <ul className="text-sm space-y-2 text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-xl">✌️✌️</span>
              <span><strong>双手比耶</strong> = 拍照保存</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-xl">🎤</span>
              {/* 4. Add voice commands for background switching */}
              <span><strong>语音</strong>: "红色", "清空", "换背景"</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Gesture Feedback */}
      <AnimatePresence>
        {gestureMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-16 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-md border-2 border-[#39ff14] p-4 max-w-xs text-center"
          >
            {gestureMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
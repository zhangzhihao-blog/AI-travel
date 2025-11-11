// 语音识别服务 - 集成科大讯飞Web SDK
// 需要在.env文件中配置以下环境变量：
// VITE_IFLYTEK_APP_ID: 科大讯飞应用ID
// VITE_IFLYTEK_API_KEY: 科大讯飞API密钥
// VITE_IFLYTEK_SECRET_KEY: 科大讯飞密钥

class SpeechService {
  private isRecording = false;
  private recognition: any = null;

  // 检查浏览器是否支持语音识别
  isSupported(): boolean {
    // 检查浏览器是否支持语音识别
    return !!(window as any).webkitSpeechRecognition || !!(window as any).SpeechRecognition;
  }

  // 开始录音
  startRecording(onResult: (text: string) => void, onError?: (error: string) => void): void {
    if (this.isRecording) {
      console.warn('录音已经在进行中');
      return;
    }

    try {
      // 检查是否在安全上下文中运行（HTTPS 或 localhost）
      if (!window.isSecureContext) {
        throw new Error('语音识别需要在安全上下文（HTTPS 或 localhost）中运行');
      }

      // 使用浏览器原生的语音识别API
      if ((window as any).webkitSpeechRecognition) {
        this.recognition = new (window as any).webkitSpeechRecognition();
      } else if ((window as any).SpeechRecognition) {
        this.recognition = new (window as any).SpeechRecognition();
      } else {
        throw new Error('浏览器不支持语音识别功能');
      }

      this.recognition.lang = 'zh-CN';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        console.log('语音识别结果:', event);
        const transcript = event.results[0][0].transcript;
        console.log('识别文本:', transcript);
        onResult(transcript);
        this.isRecording = false;
      };

      this.recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        onError?.(event.error);
        this.isRecording = false;
      };

      this.recognition.onend = () => {
        console.log('语音识别结束');
        this.isRecording = false;
      };

      this.recognition.onstart = () => {
        console.log('语音识别开始');
      };

      this.recognition.start();
      this.isRecording = true;
      console.log('开始录音...');
    } catch (error) {
      console.error('启动录音失败:', error);
      onError?.('启动录音失败: ' + (error as Error).message);
    }
  }

  // 停止录音
  stopRecording(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
      console.log('停止录音');
    }
  }
  
  getMockSpeechResult(): string {
    const mockResults = [
      "我想去北京旅行，时间是下个月，预算5000元",
      "计划去上海迪士尼游玩，时间三天两夜，和家人一起",
      "需要一个关于杭州西湖的旅游计划，喜欢自然景观和美食",
      "我要去成都吃火锅，顺便游览市区景点，预算3000元"
    ];
    
    const randomIndex = Math.floor(Math.random() * mockResults.length);
    return mockResults[randomIndex];
  }
}

export default new SpeechService();
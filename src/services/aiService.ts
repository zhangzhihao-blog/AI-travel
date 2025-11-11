// 集成阿里云百炼平台大语言模型API
// 通过应用ID调用API

export interface ItineraryRequest {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelers: number;
  preferences: string;
  specialRequests?: string;
}

export interface ItineraryItem {
  day: number;
  date: string;
  activities: Activity[];
}

export interface Activity {
  time: string;
  title: string;
  description: string;
  location: string;
  duration: string;
  cost?: number;
}

export interface ItineraryResponse {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  estimatedCost: number;
  itinerary: ItineraryItem[];
}

class AIService {
  private apiKey: string;
  private appId: string;

  constructor() {
    // 从环境变量获取API密钥和应用ID
    this.apiKey = import.meta.env.VITE_ALIYUN_DASHSCOPE_API_KEY || '';
    this.appId = import.meta.env.VITE_ALIYUN_DASHSCOPE_APP_ID || '';
    
    if (!this.apiKey) {
      console.warn('未找到阿里云百炼平台API密钥，请在.env文件中设置VITE_ALIYUN_DASHSCOPE_API_KEY');
    }
    
    if (!this.appId) {
      console.warn('未找到阿里云百炼平台应用ID，请在.env文件中设置VITE_ALIYUN_DASHSCOPE_APP_ID');
    }
  }

  // 调用大语言模型API生成行程（流式输出版本）
  async generateItineraryStream(request: ItineraryRequest, onChunkReceived: (chunk: string) => void): Promise<void> {
    // 检查API密钥和应用ID是否配置
    if (!this.apiKey) {
      console.warn('未配置阿里云百炼平台API密钥，无法使用流式输出');
      throw new Error('未配置API密钥');
    }
    
    if (!this.appId) {
      console.warn('未配置阿里云百炼平台应用ID，无法使用流式输出');
      throw new Error('未配置应用ID');
    }

    // 调用大语言模型API生成行程
    try {
      // 构造提示词
      const prompt = this.buildPrompt(request);
      
      // 调用阿里云百炼平台API（流式）
      const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/apps/${this.appId}/completion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable' // 启用流式输出
        },
        body: JSON.stringify({
          input: {
            prompt: prompt
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 2000,
            incremental_output: true // 启用增量输出
          },
          debug: {}
        })
      });

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          // 解码接收到的数据
          const chunk = decoder.decode(value, { stream: true });
          
          // 处理SSE数据格式
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim(); // 移除"data:"前缀
              if (data) {
                try {
                  const parsedData = JSON.parse(data);
                  // 只传递text字段内容
                  const text = parsedData.output?.text || '';
                  onChunkReceived(text);
                } catch (e) {
                  // 如果不是有效的JSON，记录但不传递
                  console.debug('无法解析JSON数据:', line);
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('调用大语言模型API失败:', error);
      throw error;
    }
  }

  // 调用大语言模型API生成行程
  async generateItinerary(request: ItineraryRequest): Promise<ItineraryResponse> {
    // 检查API密钥和应用ID是否配置
    if (!this.apiKey) {
      console.warn('未配置阿里云百炼平台API密钥，使用静态数据');
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 返回静态数据用于地图调试
      return {
        id: 'itinerary_' + Date.now(),
        title: `${request.destination}旅行计划`,
        destination: request.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        budget: request.budget,
        estimatedCost: Math.round(request.budget * 0.8),
        itinerary: this.generateStaticItinerary()
      };
    }
    
    if (!this.appId) {
      console.warn('未配置阿里云百炼平台应用ID，使用静态数据');
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 返回静态数据用于地图调试
      return {
        id: 'itinerary_' + Date.now(),
        title: `${request.destination}旅行计划`,
        destination: request.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        budget: request.budget,
        estimatedCost: Math.round(request.budget * 0.8),
        itinerary: this.generateStaticItinerary()
      };
    }

    // 调用大语言模型API生成行程
    try {
      // 构造提示词
      const prompt = this.buildPrompt(request);
      
      // 调用阿里云百炼平台API
      const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/apps/${this.appId}/completion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            prompt: prompt
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 2000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // 解析响应
      const content = result.output?.text || '{}';
      let itineraryData;
      
      try {
        itineraryData = JSON.parse(content);
      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        // 如果解析失败，使用备用方案
        itineraryData = this.generateFallbackItineraryData(request);
      }
      
      return {
        id: 'itinerary_' + Date.now(),
        title: `${request.destination}旅行计划`,
        destination: request.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        budget: request.budget,
        estimatedCost: itineraryData.estimatedCost || request.budget,
        itinerary: itineraryData.itinerary || this.generateFallbackItinerary(request)
      };
    } catch (error) {
      console.error('调用大语言模型API失败:', error);
      // 出错时返回模拟数据
      return {
        id: 'itinerary_' + Date.now(),
        title: `${request.destination}旅行计划`,
        destination: request.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        budget: request.budget,
        estimatedCost: Math.round(request.budget * 0.8),
        itinerary: this.generateFallbackItinerary(request)
      };
    }
  }

  // 生成静态行程数据用于地图调试
  private generateStaticItinerary(): ItineraryItem[] {
    return [
      {
        day: 1,
        date: '2025-11-10',
        activities: [
          {
            time: '09:00',
            title: '天安门广场',
            description: '参观世界上最大的城市广场，感受历史的厚重',
            location: '天安门广场',
            duration: '2小时',
            cost: 0
          },
          {
            time: '12:00',
            title: '故宫博物院',
            description: '游览明清两代的皇家宫殿，了解中国古代文化',
            location: '故宫博物院',
            duration: '3小时',
            cost: 60
          }
        ]
      },
      {
        day: 2,
        date: '2025-11-11',
        activities: [
          {
            time: '09:30',
            title: '颐和园',
            description: '游览皇家园林，欣赏昆明湖和万寿山美景',
            location: '颐和园',
            duration: '4小时',
            cost: 30
          },
          {
            time: '15:00',
            title: '北京动物园',
            description: '参观熊猫馆和其他珍稀动物',
            location: '北京动物园',
            duration: '2小时',
            cost: 50
          }
        ]
      },
      {
        day: 3,
        date: '2025-11-12',
        activities: [
          {
            time: '10:00',
            title: '长城',
            description: '登临万里长城，体验世界文化遗产的雄伟',
            location: '慕田峪长城',
            duration: '4小时',
            cost: 45
          },
          {
            time: '16:00',
            title: '798艺术区',
            description: '欣赏当代艺术作品，感受创意文化氛围',
            location: '798艺术区',
            duration: '2小时',
            cost: 0
          }
        ]
      }
    ];
  }

  // 构造提示词
  private buildPrompt(request: ItineraryRequest): string {
    return `请为用户规划一个详细的旅行行程，具体要求如下：
目的地：${request.destination}
出行日期：${request.startDate} 至 ${request.endDate}
预算：${request.budget}元
出行人数：${request.travelers}人
旅行偏好：${request.preferences}
特殊要求：${request.specialRequests || '无'}

请按照以下JSON格式返回结果：
{
  "estimatedCost": 3000,
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "09:00",
          "title": "活动标题",
          "description": "活动详细描述",
          "location": "活动地点",
          "duration": "活动时长",
          "cost": 100
        }
      ]
    }
  ]
}

注意事项：
1. 行程安排要合理，符合时间逻辑
2. 活动内容要与用户偏好匹配
3. 费用估算要尽量准确
4. 只返回JSON格式数据，不要包含其他内容，不要使用Markdown格式`;
  }

  // 生成备用行程数据（当API调用失败时使用）
  private generateFallbackItinerary(request: ItineraryRequest): ItineraryItem[] {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const itinerary: ItineraryItem[] = [];
    
    for (let i = 0; i < daysDiff; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      itinerary.push({
        day: i + 1,
        date: currentDate.toISOString().split('T')[0],
        activities: this.generateFallbackActivities(request.preferences)
      });
    }
    
    return itinerary;
  }

  // 生成备用行程数据对象
  private generateFallbackItineraryData(request: ItineraryRequest): any {
    return {
      estimatedCost: Math.round(request.budget * 0.8),
      itinerary: this.generateFallbackItinerary(request)
    };
  }

  // 生成备用活动数据
  private generateFallbackActivities(preferences: string): Activity[] {
    const activities: Activity[] = [];
    
    // 根据偏好生成不同的活动
    if (preferences.includes('美食')) {
      activities.push({
        time: '12:00',
        title: '当地特色餐厅',
        description: '品尝当地特色美食',
        location: '市中心美食街',
        duration: '1.5小时',
        cost: 150
      });
    }
    
    if (preferences.includes('文化') || preferences.includes('历史')) {
      activities.push({
        time: '10:00',
        title: '博物馆参观',
        description: '了解当地历史文化',
        location: '市立博物馆',
        duration: '2小时',
        cost: 80
      });
    }
    
    if (preferences.includes('自然') || preferences.includes('风景')) {
      activities.push({
        time: '14:00',
        title: '自然公园游览',
        description: '欣赏自然美景',
        location: '城市公园',
        duration: '2小时',
        cost: 0
      });
    }
    
    // 默认活动
    if (activities.length === 0) {
      activities.push({
        time: '09:00',
        title: '城市观光',
        description: '开始一天的城市探索',
        location: '市中心',
        duration: '1小时',
        cost: 0
      });
    }
    
    return activities;
  }
}

export default new AIService();
import React, { useState, useRef } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Button, Card, Typography, Space, message, Switch, Spin, Modal, Input as AntdInput } from 'antd';
import { AudioOutlined, AudioFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import aiService, { type ItineraryRequest, type ItineraryResponse } from '../services/aiService';
import speechService from '../services/speechService';
import storageService from '../services/storageService';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = AntdInput;

const Planner: React.FC = () => {
  const [form] = Form.useForm();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [useVoiceInput, setUseVoiceInput] = useState(false);
  const [streamVisible, setStreamVisible] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [showViewDetails, setShowViewDetails] = useState(false); // 控制是否显示"查看详细计划"按钮
  const [accumulatedText, setAccumulatedText] = useState(''); // 保存累积的文本
  const [voiceRecognitionText, setVoiceRecognitionText] = useState(''); // 保存语音识别结果
  const listeningTimeout = useRef<any>(null);

  const startListening = () => {
    if (!speechService.isSupported()) {
      message.error('当前浏览器不支持语音识别功能');
      console.log('当前浏览器不支持语音识别功能');
      return;
    }

    setIsListening(true);
    console.log('开始语音识别');
    
    // 设置5秒后自动停止录音
    if (listeningTimeout.current) {
      clearTimeout(listeningTimeout.current);
    }
    listeningTimeout.current = setTimeout(() => {
      console.log('自动停止录音');
      stopListening();
    }, 5000);

    speechService.startRecording(
      (text) => {
        // 成功识别语音
        console.log('语音识别成功，结果：', text);
        message.success(`语音识别成功: ${text}`);
        
        // 解析识别结果并自动填入表单
        parseAndFillForm(text);
        
        stopListening();
      },
      (error) => {
        // 识别出错
        console.error('语音识别失败:', error);
        message.error(`语音识别失败: ${error}`);
        stopListening();
      }
    );
  };

  // 解析语音识别结果并自动填入表单
  const parseAndFillForm = (text: string) => {
    // 将文本转换为小写以便匹配
    const lowerText = text.toLowerCase();
    
    // 解析目的地
    const destinationKeywords = ['去', '到', '旅行', '旅游', '玩'];
    let destination = '';
    
    // 简单的关键词匹配逻辑
    if (lowerText.includes('北京')) destination = '北京';
    else if (lowerText.includes('上海')) destination = '上海';
    else if (lowerText.includes('杭州')) destination = '杭州';
    else if (lowerText.includes('成都')) destination = '成都';
    else if (lowerText.includes('西安')) destination = '西安';
    else if (lowerText.includes('广州')) destination = '广州';
    else if (lowerText.includes('深圳')) destination = '深圳';
    else if (lowerText.includes('厦门')) destination = '厦门';
    else if (lowerText.includes('青岛')) destination = '青岛';
    else if (lowerText.includes('大连')) destination = '大连';
    else if (lowerText.includes('三亚')) destination = '三亚';
    
    // 解析预算
    let budget = 0;
    const budgetMatch = text.match(/(\d+)(?:元|块|块钱)?/);
    if (budgetMatch) {
      budget = parseInt(budgetMatch[1]);
    }
    
    // 解析出行人数
    let travelers = 1;
    if (text.includes('一个人') || text.includes('我自己') || text.includes('我一人')) {
      travelers = 1;
    } else if (text.includes('两个人') || text.includes('两人') || text.includes('我和')) {
      travelers = 2;
    } else if (text.includes('三个人') || text.includes('三人')) {
      travelers = 3;
    } else if (text.includes('四个人') || text.includes('四人')) {
      travelers = 4;
    }
    
    // 解析特殊要求
    const specialRequests = text;
    
    // 填入表单
    const formValues: any = {};
    if (destination) formValues.destination = destination;
    if (budget > 0) formValues.budget = budget;
    if (travelers > 0) formValues.travelers = travelers;
    formValues.specialRequests = specialRequests;
    
    form.setFieldsValue(formValues);
    
    message.info('已自动填入表单信息');
  };

  const stopListening = () => {
    setIsListening(false);
    speechService.stopRecording();
    
    // 移除了定时器清理逻辑，因为不再使用自动停止功能
  };

  // 处理单个活动项
  const formatActivity = (activitySection: string): string => {
    const timeMatch = activitySection.match(/"time"\s*:\s*"([^"]+)"/);
    const titleMatch = activitySection.match(/"title"\s*:\s*"([^"]+)"/);
    const descriptionMatch = activitySection.match(/"description"\s*:\s*"([^"]+)"/);
    const locationMatch = activitySection.match(/"location"\s*:\s*"([^"]+)"/);
    const durationMatch = activitySection.match(/"duration"\s*:\s*"([^"]+)"/);
    const costMatch = activitySection.match(/"cost"\s*:\s*(\d+)/);
    
    if (timeMatch && titleMatch && descriptionMatch && locationMatch && durationMatch) {
      const time = timeMatch[1];
      const title = titleMatch[1];
      const description = descriptionMatch[1];
      const location = locationMatch[1];
      const duration = durationMatch[1];
      const cost = costMatch ? costMatch[1] : undefined;
      
      let activityText = `  ${time} ${title}\n`;
      activityText += `    ${description}\n`;
      activityText += `    地点: ${location} 时长: ${duration}\n`;
      if (cost !== undefined) {
        activityText += `    费用: ¥${cost}\n`;
      }
      activityText += '\n';
      
      return activityText;
    }
    
    return '';
  };

  const onFinish = async (values: any) => {
    console.log('表单提交，values:', values);
    setLoading(true);
    setStreamContent('');
    setStreamVisible(true);
    setAccumulatedText(''); // 重置累积文本
    setShowViewDetails(false); // 初始时不显示"查看详细计划"按钮
    try {
      const [startDate, endDate] = values.dateRange;
      
      const request: ItineraryRequest = {
        destination: values.destination,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        budget: values.budget,
        travelers: values.travelers,
        preferences: values.preferences,
        specialRequests: values.specialRequests
      };
      
      console.log('准备调用AI服务生成行程，request:', request);
      
      let accumulatedTextLocal = '';
      let displayContent = ''; // 显示内容
      
      // 调用AI服务生成行程（流式）
      await aiService.generateItineraryStream(
        request,
        (chunk) => {
          console.log('收到AI流式响应chunk:', chunk);
          accumulatedTextLocal += chunk;
          setAccumulatedText(accumulatedTextLocal); // 更新状态中的累积文本
          
          try {
            // 按照指定逻辑重构：循环（匹配到day，输出value，然后循环匹配title直至匹配到下一个day）
            let newContent = '';
            
            // 提取estimatedCost（如果存在）
            const costMatch = accumulatedTextLocal.match(/"estimatedCost"\s*:\s*(\d+)/);
            if (costMatch) {
              newContent += `预估费用: ¥${costMatch[1]}\n\n`;
            }
            
            // 循环匹配day和title
            const dayPattern = /"day"\s*:\s*(\d+)[\s\S]*?"date"\s*:\s*"([^"]+)"/g;
            let dayMatch;
            let lastIndex = 0;
            
            while ((dayMatch = dayPattern.exec(accumulatedTextLocal)) !== null) {
              const day = dayMatch[1];
              const date = dayMatch[2];
              
              // 输出day信息
              newContent += `第${day}天 (${date})\n`;
              
              // 更新lastIndex为当前day匹配的结束位置
              lastIndex = dayMatch.index + dayMatch[0].length;
              
              // 查找下一个day的位置
              const nextDayPattern = /"day"\s*:\s*(\d+)[\s\S]*?"date"\s*:\s*"([^"]+)"/g;
              nextDayPattern.lastIndex = lastIndex;
              const nextDayMatch = nextDayPattern.exec(accumulatedTextLocal);
              const nextDayIndex = nextDayMatch ? nextDayMatch.index : accumulatedTextLocal.length;
              
              // 在当前day和下一个day之间循环匹配title
              const dayContent = accumulatedTextLocal.substring(lastIndex, nextDayIndex);
              const titlePattern = /"title"\s*:\s*"([^"]+)"/g;
              let titleMatch;
              let hasTitles = false;
              
              while ((titleMatch = titlePattern.exec(dayContent)) !== null) {
                const title = titleMatch[1];
                newContent += `  - ${title}\n`;
                hasTitles = true;
              }
              
              // 如果没有title，显示正在生成提示
              if (!hasTitles) {
                newContent += '  正在生成活动安排...\n';
              }
              
              newContent += '\n';
            }
            
            // 如果没有任何内容，显示正在生成提示
            if (!newContent.trim()) {
              newContent = '正在生成行程计划...';
            }
            
            displayContent = newContent;
            setStreamContent(newContent);
          } catch (error) {
            // 出错时保持当前内容
            console.error('处理流式内容出错:', error);
            setStreamContent(displayContent || '正在生成行程计划...');
          }
        }
      );
      
      // 显示成功消息
      console.log('行程规划生成完成');
      message.success('行程规划生成成功！');
      
      // 显示"查看详细计划"按钮
      setShowViewDetails(true);
    } catch (error) {
      console.error('创建行程失败:', error);
      message.error('行程规划生成失败，请重试');
      setStreamContent('生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 查看详细计划
  const handleViewDetails = async () => {
    console.log('点击了查看详细计划按钮');
    setStreamVisible(false);
    
    // 从累积的文本中提取行程数据并传递给Itinerary页面
    try {
      console.log('开始处理行程数据');
      // 清理文本，移除可能的额外字符
      let cleanText = accumulatedText.trim();
      console.log('清理后的文本:', cleanText);
      
      // 尝试直接解析整个文本
      let jsonData = null;
      try {
        jsonData = JSON.parse(cleanText);
        console.log('成功直接解析JSON数据:', jsonData);
      } catch (e) {
        console.log('直接解析JSON失败，尝试提取JSON部分');
        // 如果直接解析失败，尝试提取JSON部分
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            jsonData = JSON.parse(jsonMatch[0]);
            console.log('成功提取并解析JSON数据:', jsonData);
          } catch (parseError) {
            console.error('JSON解析失败:', parseError);
          }
        }
      }
      
      // 构造基本行程数据
      console.log('开始构造基本行程数据');
      const destination = form.getFieldValue('destination');
      const dateRange = form.getFieldValue('dateRange');
      const budget = form.getFieldValue('budget');
      
      console.log('表单数据 - 目的地:', destination, '日期范围:', dateRange, '预算:', budget);
      
      // 安全地处理日期范围
      let startDate = '';
      let endDate = '';
      if (dateRange && dateRange[0] && dateRange[1]) {
        // 检查是否是Moment对象
        if (typeof dateRange[0].format === 'function') {
          startDate = dateRange[0].format('YYYY-MM-DD');
        } else {
          startDate = String(dateRange[0]);
        }
        
        if (typeof dateRange[1].format === 'function') {
          endDate = dateRange[1].format('YYYY-MM-DD');
        } else {
          endDate = String(dateRange[1]);
        }
      }
      
      const itineraryData: any = {
        id: 'itinerary_' + Date.now(),
        title: `${destination || '我的'}旅行计划`,
        destination: destination || '',
        startDate: startDate,
        endDate: endDate,
        budget: budget || 0,
        estimatedCost: 0,
        itinerary: []
      };
      
      // 如果成功解析JSON数据，更新行程数据
      if (jsonData) {
        console.log('使用解析的JSON数据更新行程');
        itineraryData.estimatedCost = jsonData.estimatedCost || budget || 0;
        itineraryData.itinerary = jsonData.itinerary || [];
      }
      
      console.log('最终行程数据:', itineraryData);
      
      console.log('准备跳转到行程详情页面');
      navigate('/itinerary', { state: { itinerary: itineraryData } });
      console.log('跳转完成');
    } catch (error) {
      console.error('处理行程数据失败:', error);
      message.error('处理行程数据失败');
      // 出错时直接跳转（将使用Itinerary页面的默认数据）
      console.log('出现错误，仍然尝试跳转到行程详情页面');
      navigate('/itinerary');
    }
  };

  const handleVoiceRecognition = () => {
    if (!speechService.isSupported()) {
      message.error('当前浏览器不支持语音识别功能');
      console.log('当前浏览器不支持语音识别功能');
      return;
    }

    // 检查是否在安全上下文中运行
    if (!window.isSecureContext) {
      message.error('语音识别需要在安全上下文（HTTPS 或 localhost）中运行');
      console.log('语音识别需要在安全上下文（HTTPS 或 localhost）中运行');
      return;
    }

    setIsListening(true);
    
    speechService.startRecording(
      (text) => {
        // 成功识别语音
        console.log('语音识别成功，结果：', text);
        message.success(`语音识别成功: ${text}`);
        
        // 将识别结果保存到状态中
        setVoiceRecognitionText(text);
        
        // 不再自动停止录音，让用户手动控制
        // stopListening();
      },
      (error) => {
        // 识别出错
        console.error('语音识别失败:', error);
        message.error(`语音识别失败: ${error}`);
        if (error === 'not-allowed') {
          message.info('请确保您已授予麦克风权限，并在安全环境（HTTPS 或 localhost）下运行应用');
        }
        stopListening();
      }
    );
  };
  
  // 将语音识别结果填充到表单
  const fillFormWithVoiceText = () => {
    if (voiceRecognitionText) {
      parseAndFillForm(voiceRecognitionText);
    } else {
      message.info('请先进行语音识别');
    }
  };

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (listeningTimeout.current) {
        clearTimeout(listeningTimeout.current);
      }
    };
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100%',
      width: '100%',
      padding: '24px'
    }}>
      <Card style={{ 
        maxWidth: 600, 
        width: '100%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px'
      }}>
        <Title level={2} style={{ textAlign: 'center' }}>
          创建新行程
        </Title>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            name="destination"
            label="目的地"
            rules={[{ required: true, message: '请输入目的地' }]}
          >
            <Input placeholder="例如：北京、上海、杭州..." />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="出行日期"
            rules={[{ required: true, message: '请选择出行日期' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="budget"
            label="预算（元）"
            rules={[{ required: true, message: '请输入预算' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入预算金额"
              min={0}
            />
          </Form.Item>

          <Form.Item
            name="travelers"
            label="出行人数"
            rules={[{ required: true, message: '请输入出行人数' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入出行人数"
              min={1}
            />
          </Form.Item>

          <Form.Item
            name="preferences"
            label="旅行偏好"
            rules={[{ required: true, message: '请输入您的旅行偏好' }]}
          >
            <Input.TextArea 
              placeholder="请描述您的旅行偏好，如：喜欢自然风光、对历史文化感兴趣、享受美食体验等"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="specialRequests"
            label="特殊要求"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.TextArea 
                placeholder="例如：有儿童同行、需要无障碍设施、饮食禁忌等"
                rows={3}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>使用语音输入:</span>
                <Switch 
                  checked={useVoiceInput}
                  onChange={setUseVoiceInput}
                />
                {useVoiceInput && (
                  <>
                    <Button 
                      icon={isListening ? <AudioFilled /> : <AudioOutlined />} 
                      onClick={isListening ? stopListening : handleVoiceRecognition}
                      type={isListening ? 'primary' : 'default'}
                    >
                      {isListening ? '停止录音' : '语音识别'}
                    </Button>
                    <Input.TextArea
                      value={voiceRecognitionText}
                      onChange={(e) => setVoiceRecognitionText(e.target.value)}
                      placeholder="语音识别结果"
                      style={{ flex: 1 }}
                      autoSize={{ minRows: 3, maxRows: 6 }}
                    />
                    <Button onClick={fillFormWithVoiceText}>
                      填充表单
                    </Button>
                  </>
                )}
              </div>
            </Space>
          </Form.Item>

          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                style={{ width: '100%' }}
                loading={loading}
              >
                {loading ? <span><Spin size="small" style={{ marginRight: 8 }} /> 生成行程计划中...</span> : '生成行程计划'}
              </Button>
              <Button 
                size="large" 
                style={{ width: '100%' }}
                onClick={() => navigate('/')}
              >
                返回首页
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 流式输出模态框 */}
      <Modal
        title="行程计划生成中"
        open={streamVisible}
        onCancel={() => {
          setStreamVisible(false);
          setLoading(false);
        }}
        footer={showViewDetails ? [
          <Button key="back" onClick={() => setStreamVisible(false)}>
            关闭
          </Button>,
          <Button key="submit" type="primary" onClick={handleViewDetails}>
            查看详细计划
          </Button>
        ] : null}
        width={800}
        maskClosable={false}
      >
        <div style={{ marginBottom: 16 }}>
          {!showViewDetails && <Spin />} 
          <span style={{ marginLeft: 8 }}>
            {showViewDetails ? '行程计划生成完成！' : 'AI正在生成您的行程计划...'}
          </span>
        </div>
        <TextArea
          rows={15}
          value={streamContent}
          readOnly
          style={{ 
            fontFamily: 'monospace',
            fontSize: '14px',
            backgroundColor: '#f5f5f5'
          }}
        />
      </Modal>
    </div>
  );
};

export default Planner;
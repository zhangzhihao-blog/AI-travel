import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  List, 
  Button, 
  Space, 
  message, 
  Empty, 
  Spin,
  Tag,
  Divider
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  PlusOutlined, 
  EyeOutlined, 
  DeleteOutlined,
  CloudUploadOutlined,
  CloudOutlined
} from '@ant-design/icons';
import storageService, { type StoredItinerary } from '../services/storageService';

const { Title, Text } = Typography;

const MyItineraries: React.FC = () => {
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<StoredItinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItineraries();
  }, []);

  const loadItineraries = async () => {
    try {
      setLoading(true);
      const data = await storageService.getItineraries();
      setItineraries(data);
    } catch (error) {
      console.error('加载行程失败:', error);
      message.error('加载行程失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await storageService.deleteItinerary(id);
      message.success('行程已删除');
      // 重新加载列表
      loadItineraries();
    } catch (error) {
      console.error('删除行程失败:', error);
      message.error('删除行程失败');
    }
  };

  const handleSaveToCloud = async (itinerary: StoredItinerary) => {
    try {
      // 从本地行程创建云端行程（移除id以便创建新文档）
      const { id, ...itineraryData } = itinerary;
      const newId = await storageService.saveItinerary(itineraryData);
      
      message.success('行程已保存到云端');
      
      // 更新列表中的状态
      setItineraries(prev => 
        prev.map(item => 
          item.id === id ? { ...item, id: newId } : item
        )
      );
    } catch (error) {
      console.error('保存行程到云端失败:', error);
      message.error('保存行程到云端失败');
    }
  };

  const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
      return date;
    }
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%', 
        minHeight: 300 
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24 
        }}>
          <Title level={2} style={{ margin: 0 }}>
            我的行程
          </Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            size="large"
            onClick={() => navigate('/planner')}
          >
            创建新行程
          </Button>
        </div>

        {itineraries.length === 0 ? (
          <Empty 
            description="暂无行程" 
            imageStyle={{ height: 120 }}
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => navigate('/planner')}
            >
              创建第一个行程
            </Button>
          </Empty>
        ) : (
          <List
            dataSource={itineraries}
            renderItem={itinerary => {
              // 检查是否为本地行程（以local_开头的ID）
              const isLocal = itinerary.id?.startsWith('local_') || itinerary.id?.startsWith('itinerary_');
              
              return (
                <List.Item
                  actions={[
                    <Button 
                      icon={<EyeOutlined />} 
                      onClick={() => navigate('/itinerary', { state: { itinerary } })}
                    >
                      查看详情
                    </Button>,
                    isLocal ? (
                      <Button 
                        icon={<CloudUploadOutlined />}
                        onClick={() => handleSaveToCloud(itinerary)}
                      >
                        保存到云端
                      </Button>
                    ) : null,
                    <Button 
                      icon={<DeleteOutlined />} 
                      danger
                      onClick={() => itinerary.id && handleDelete(itinerary.id)}
                    >
                      删除
                    </Button>
                  ]}
                  style={{ 
                    flexDirection: 'column', 
                    alignItems: 'stretch',
                    padding: '16px 0'
                  }}
                >
                  <List.Item.Meta
                    title={
                      <Space size="middle">
                        <span>{itinerary.title}</span>
                        {isLocal ? (
                          <Tag icon={<CloudOutlined />} color="default">
                            本地
                          </Tag>
                        ) : (
                          <Tag color="success">
                            已同步
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div style={{ marginTop: 8 }}>
                        <Space direction="vertical" size="small">
                          <Text>
                            目的地: {itinerary.destination} | 
                            日期: {formatDate(itinerary.startDate)} 至 {formatDate(itinerary.endDate)}
                          </Text>
                          <Text>
                            预算: ¥{itinerary.budget} | 
                            预估费用: ¥{itinerary.estimatedCost}
                          </Text>
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default MyItineraries;
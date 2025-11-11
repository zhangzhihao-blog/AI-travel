import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, 
  Typography, 
  List, 
  Space, 
  Button, 
  Tag, 
  Descriptions, 
  message, 
  Spin, 
  Collapse,
  InputNumber,
  Progress
} from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import mapService, { type MapLocation } from '../services/mapService';
import type { ItineraryResponse, ItineraryItem, Activity } from '../services/aiService';
import storageService from '../services/storageService';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// 计算总预估费用的辅助函数
const calculateEstimatedCost = (itineraryData: ItineraryResponse) => {
  if (!itineraryData.itinerary) return 0;
  
  return itineraryData.itinerary.reduce((total, day) => {
    const dayCost = day.activities.reduce((dayTotal, activity) => {
      return dayTotal + (activity.cost || 0);
    }, 0);
    return total + dayCost;
  }, 0);
};

const Itinerary: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeDay, setActiveDay] = useState(0);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationsCache, setLocationsCache] = useState<Record<string, MapLocation>>({});
  const [editingCost, setEditingCost] = useState<{[key: string]: number | null}>({});
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const renderAttemptRef = useRef(0);
  const isRenderingRef = useRef(false);
  const renderTimeoutRef = useRef<number | null>(null);
  const shouldRenderMapRef = useRef(true); // 控制是否需要渲染地图

  // 从location.state获取行程数据，如果没有则使用模拟数据
  useEffect(() => {
    console.log('Itinerary组件挂载，location.state:', location.state);
    const locationState: any = location.state;
    if (locationState?.itinerary) {
      console.log('使用传入的行程数据:', locationState.itinerary);
      // 确保预估费用是最新的
      const updatedItinerary = {
        ...locationState.itinerary,
        estimatedCost: calculateEstimatedCost(locationState.itinerary)
      };
      setItinerary(updatedItinerary);
      setLoading(false);
    } else {
      console.log('使用模拟行程数据');
      // 使用模拟数据
      const mockItinerary: ItineraryResponse = {
        id: 'itinerary_12345',
        title: '北京三日游',
        destination: '北京',
        startDate: '2025-11-10',
        endDate: '2025-11-12',
        budget: 5000,
        estimatedCost: 0, // 初始设为0，后面会重新计算
        itinerary: [
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
        ]
      };
      
      // 计算预估费用
      mockItinerary.estimatedCost = calculateEstimatedCost(mockItinerary);
      setItinerary(mockItinerary);
      setLoading(false);
    }
  }, [location.state]);

  // 获取地点坐标
  const fetchLocation = useCallback(async (locationName: string): Promise<MapLocation | null> => {
    console.log('获取地点坐标:', locationName);
    if (locationsCache[locationName]) {
      console.log('从缓存中获取地点坐标:', locationsCache[locationName]);
      return locationsCache[locationName];
    }

    try {
      const locations = await mapService.searchPlaces(locationName);
      console.log('搜索地点结果:', locations);
      if (locations.length > 0) {
        const location = locations[0];
        setLocationsCache(prev => ({ ...prev, [locationName]: location }));
        return location;
      }
    } catch (error) {
      console.error('地点搜索失败:', error);
    }
    return null;
  }, [locationsCache]);

  // 初始化地图服务
  useEffect(() => {
    console.log('开始地图初始化useEffect');
    const initMap = async () => {
      try {
        console.log('开始初始化地图服务');
        const result = await mapService.initialize();
        console.log('地图服务初始化结果:', result);
        if (result) {
          setMapInitialized(true);
        }
      } catch (error) {
        console.error('地图初始化失败:', error);
        message.error('地图服务初始化失败');
      }
    };

    initMap();
    
    // 清理函数
    return () => {
      console.log('清理Itinerary组件');
      // 清理定时器
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      
      // 重置渲染尝试计数器
      renderAttemptRef.current = 0;
      isRenderingRef.current = false;
    };
  }, []);

  // 当地图初始化完成且有行程数据时，渲染当前天的行程地图
  useEffect(() => {
    console.log('地图初始化状态变化:', mapInitialized, '行程数据:', !!itinerary, '活动日:', activeDay);
    if (mapInitialized && itinerary?.itinerary[activeDay]) {
      console.log('满足地图渲染条件，准备渲染地图');
      // 清理之前的定时器
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      
      // 如果不需要渲染地图，则跳过
      if (!shouldRenderMapRef.current) {
        shouldRenderMapRef.current = true; // 重置标志
        return;
      }
      
      // 增加延迟确保DOM完全渲染后再渲染地图
      console.log('设置300ms延迟后渲染地图');
      renderTimeoutRef.current = window.setTimeout(() => {
        renderDayOnMap(activeDay);
      }, 300);
      
      return () => {
        if (renderTimeoutRef.current) {
          clearTimeout(renderTimeoutRef.current);
        }
      };
    }
  }, [mapInitialized, itinerary, activeDay]);

  // 在地图上渲染指定天的行程
  const renderDayOnMap = async (dayIndex: number) => {
    console.log('开始渲染地图，日期索引:', dayIndex);
    
    // 防止重复渲染
    if (isRenderingRef.current) {
      console.log('地图正在渲染中，跳过本次渲染请求');
      return;
    }
    
    isRenderingRef.current = true;
    
    if (!mapInitialized || !itinerary) {
      console.log('地图未初始化或无行程数据，取消渲染');
      isRenderingRef.current = false;
      return;
    }

    try {
      console.log('开始渲染第', dayIndex, '天的行程');
      
      // 显示地图加载动画
      const loadingOverlay = document.getElementById('map-loading-overlay');
      if (loadingOverlay) {
        console.log('显示地图加载动画');
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
      }

      const dayItinerary = itinerary.itinerary[dayIndex];
      console.log('当天行程:', dayItinerary);
      const locations: MapLocation[] = [];
      
      // 获取所有地点的坐标
      console.log('开始获取地点坐标');
      for (const activity of dayItinerary.activities) {
        console.log('获取活动地点坐标:', activity.location);
        const location = await fetchLocation(activity.location);
        if (location) {
          locations.push({
            ...location,
            title: activity.title,
            description: activity.description
          });
        }
      }
      
      console.log('获取到地点坐标:', locations);
      
      // 如果没有获取到任何地点坐标，则不渲染地图
      if (locations.length === 0) {
        console.log('未获取到任何地点坐标，取消地图渲染');
        message.warning('无法获取地点信息，地图渲染已取消');
        
        // 隐藏地图加载动画
        setTimeout(() => {
          const loadingOverlay = document.getElementById('map-loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
              loadingOverlay.style.display = 'none';
            }, 300);
          }
        }, 500);
        
        isRenderingRef.current = false;
        return;
      }
      
      // 检查地图容器
      console.log('检查地图容器:', mapContainerRef.current);
      if (mapContainerRef.current) {
        console.log('地图容器尺寸 - 宽度:', mapContainerRef.current.offsetWidth, '高度:', mapContainerRef.current.offsetHeight);
        // 检查容器尺寸，如果为0则重试
        if (renderAttemptRef.current < 3 && 
            (mapContainerRef.current.offsetWidth === 0 || mapContainerRef.current.offsetHeight === 0)) {
          renderAttemptRef.current++;
          console.log(`地图容器尺寸为0，第${renderAttemptRef.current}次重试`);
          // 清理之前的定时器
          if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
          }
          renderTimeoutRef.current = window.setTimeout(() => {
            isRenderingRef.current = false;
            renderDayOnMap(dayIndex);
          }, 300);
          return;
        }
        
        renderAttemptRef.current = 0;
      } else {
        console.log('地图容器不存在');
      }
      
      console.log('开始调用地图服务渲染地图');
      // 渲染地图，显示标记和路线
      mapService.renderMapWithRoute('map-container', locations);
    } catch (error) {
      console.error('地图渲染失败:', error);
      message.error('地图渲染失败');
      
      // 隐藏地图加载动画
      setTimeout(() => {
        const loadingOverlay = document.getElementById('map-loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.style.opacity = '0';
          setTimeout(() => {
            loadingOverlay.style.display = 'none';
          }, 300);
        }
      }, 500);
    } finally {
      isRenderingRef.current = false;
    }
  };

  // 处理地点点击事件
  const handleLocationClick = async (locationName: string) => {
    console.log('点击地点:', locationName);
    if (!mapInitialized) {
      console.log('地图未初始化，无法聚焦到地点');
      message.warning('地图正在初始化，请稍后再试');
      return;
    }

    try {
      const location = await fetchLocation(locationName);
      if (location) {
        mapService.focusOnLocation('map-container', location);
      } else {
        message.warning('无法获取地点信息');
      }
    } catch (error) {
      console.error('定位地点失败:', error);
      message.error('定位地点失败');
    }
  };

  // 保存行程到云端
  const handleSaveToCloud = async () => {
    if (!itinerary) return;
    
    try {
      const itineraryId = await storageService.saveItinerary(itinerary);
      message.success('行程已保存到云端');
      // 更新行程ID
      setItinerary(prev => prev ? { ...prev, id: itineraryId } : null);
    } catch (error) {
      console.error('保存行程失败:', error);
      message.error('行程保存失败');
    }
  };

  // 开始编辑费用
  const startEditingCost = (activityKey: string, currentCost: number) => {
    setEditingCost(prev => ({
      ...prev,
      [activityKey]: currentCost
    }));
  };

  // 更新费用
  const updateCost = (activityKey: string, dayIndex: number, activityIndex: number, newCost: number | null) => {
    if (newCost === null) return;
    
    // 设置为不需要重新渲染地图
    shouldRenderMapRef.current = false;
    
    setItinerary(prev => {
      if (!prev) return prev;
      
      const updatedItinerary = {...prev};
      updatedItinerary.itinerary = [...prev.itinerary];
      updatedItinerary.itinerary[dayIndex] = {...updatedItinerary.itinerary[dayIndex]};
      updatedItinerary.itinerary[dayIndex].activities = [...updatedItinerary.itinerary[dayIndex].activities];
      updatedItinerary.itinerary[dayIndex].activities[activityIndex] = {
        ...updatedItinerary.itinerary[dayIndex].activities[activityIndex],
        cost: newCost
      };
      
      // 更新预估费用
      updatedItinerary.estimatedCost = calculateEstimatedCost(updatedItinerary);
      
      return updatedItinerary;
    });
    
    // 退出编辑状态
    setEditingCost(prev => {
      const updated = {...prev};
      delete updated[activityKey];
      return updated;
    });
    
    message.success('费用已更新');
  };

  // 取消编辑费用
  const cancelEditingCost = (activityKey: string) => {
    setEditingCost(prev => {
      const updated = {...prev};
      delete updated[activityKey];
      return updated;
    });
  };

  // 渲染活动列表
  const renderActivities = (activities: Activity[], dayIndex: number) => {
    return (
      <List
        dataSource={activities}
        renderItem={(activity, activityIndex) => {
          const activityKey = `${dayIndex}-${activityIndex}-${activity.time}`;
          const isEditing = editingCost.hasOwnProperty(activityKey);
          
          return (
            <List.Item
              key={activity.time}
              style={{ 
                flexDirection: 'column',
                alignItems: 'flex-start',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleLocationClick(activity.location);
              }}
            >
              <Space>
                <Tag color="blue">{activity.time}</Tag>
                <Text strong>{activity.title}</Text>
              </Space>
              <Text type="secondary" style={{ marginTop: 8 }}>
                {activity.description}
              </Text>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <Text type="secondary">地点: {activity.location}</Text>
                <Text type="secondary">时长: {activity.duration}</Text>
                {isEditing ? (
                  <Space>
                    <InputNumber
                      defaultValue={activity.cost || 0}
                      min={0}
                      step={0.01}
                      formatter={value => `¥ ${value}`}
                      parser={value => parseFloat(value!.replace(/¥\s?|(,*)/g, '') || '0') as any}
                      onChange={(value) => updateCost(activityKey, dayIndex, activityIndex, value as number)}
                    />
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateCost(activityKey, dayIndex, activityIndex, editingCost[activityKey]);
                      }}
                    >
                      确定
                    </Button>
                    <Button 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEditingCost(activityKey);
                      }}
                    >
                      取消
                    </Button>
                  </Space>
                ) : (
                  <Space>
                    {activity.cost !== undefined && (
                      <Text type="danger">费用: ¥{activity.cost}</Text>
                    )}
                    <Button 
                      type="link" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingCost(activityKey, activity.cost || 0);
                      }}
                    >
                      编辑费用
                    </Button>
                  </Space>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="加载行程中..." />
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>未找到行程数据</div>
      </div>
    );
  }

  // 计算当前预估费用
  const currentEstimatedCost = calculateEstimatedCost(itinerary);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部标题和基本信息 */}
      <Card style={{ borderRadius: 0 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 0 }}>
          {itinerary.title}
        </Title>
        
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 4 }} style={{ marginBottom: 0 }}>
          <Descriptions.Item label="目的地">{itinerary.destination}</Descriptions.Item>
          <Descriptions.Item label="出行日期">
            {itinerary.startDate} 至 {itinerary.endDate}
          </Descriptions.Item>
          <Descriptions.Item label="预算与预估" span={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span>预算: ¥{itinerary.budget}</span>
              <Progress 
                percent={Math.round((currentEstimatedCost / itinerary.budget) * 100)}
                status={
                  (currentEstimatedCost / itinerary.budget) >= 0.9 
                    ? 'exception' 
                    : (currentEstimatedCost / itinerary.budget) >= 0.7 
                      ? 'normal' 
                      : 'success'
                }
                style={{ flex: 1 }}
              />
              <span>预估费用: ¥{currentEstimatedCost.toFixed(2)}</span>
            </div>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 主体部分 - 左侧行程详情，右侧地图 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* 左侧行程详情 - 固定宽度 */}
        <div style={{ width: 350, overflowY: 'auto', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>行程安排</Text>
            </div>
            
            {itinerary.itinerary.map((day, index) => (
              <Collapse 
                key={day.day}
                activeKey={activeDay === index ? String(index) : undefined}
                onChange={() => setActiveDay(index)}
                style={{ marginBottom: 8 }}
                items={[
                  {
                    key: index.toString(),
                    label: (
                      <Space>
                        <Text strong>第{day.day}天</Text>
                        <Tag>{day.date}</Tag>
                      </Space>
                    ),
                    children: renderActivities(day.activities, index)
                  }
                ]}
              />
            ))}
          </div>
          
          {/* 底部操作按钮 */}
          <div style={{ padding: '0 16px 16px', position: 'sticky', bottom: 0, backgroundColor: '#fff' }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate('/')}>
                返回首页
              </Button>
              <Button type="primary" onClick={handleSaveToCloud}>
                保存行程
              </Button>
            </Space>
          </div>
        </div>

        {/* 右侧地图区域 - 占据剩余空间并向下铺满 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 0, height: '100%' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 16
            }}>
              <Text strong style={{ fontSize: 16 }}>
                行程地图 - 第{itinerary.itinerary[activeDay]?.day}天 ({itinerary.itinerary[activeDay]?.date})
              </Text>
            </div>
            
            <div 
              id="map-container" 
              ref={mapContainerRef}
              style={{ 
                flex: 1,
                backgroundColor: '#f0f0f0',
                borderRadius: 4,
                minHeight: '100%',
                position: 'relative'
              }}
            >
              {!mapInitialized ? (
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <div>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>地图加载中...</div>
                  </div>
                </div>
              ) : null}
              {/* 地图加载动画遮罩 */}
              {mapInitialized && (
                <div 
                  id="map-loading-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    borderRadius: 4,
                    transition: 'opacity 0.3s ease'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>正在渲染地图...</div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Itinerary;
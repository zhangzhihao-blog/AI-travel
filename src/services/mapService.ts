// 地图服务 - 集成高德地图API
// 需要在.env文件中配置以下环境变量：
// VITE_AMAP_API_KEY: 高德地图API密钥
// VITE_AMAP_SECURITY_CODE: 高德地图安全密钥

export interface MapLocation {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  title?: string;
  description?: string;
}

class MapService {
  private isInitialized = false;
  private isInitializing = false;
  private initializePromise: Promise<boolean> | null = null;
  private mapInstance: any = null;
  private markers: any[] = [];
  private polyline: any = null;
  private resizeObserver: ResizeObserver | null = null;
  private pendingRenders: { containerId: string; locations: MapLocation[] }[] = [];
  private mapLoadRetryCount = 0;
  private maxMapLoadRetries = 3;

  // 初始化地图服务
  async initialize(): Promise<boolean> {
    console.log('地图服务初始化开始');
    // 如果正在初始化，返回正在等待的Promise
    if (this.isInitializing && this.initializePromise) {
      console.log('地图服务正在初始化中，返回现有Promise');
      return this.initializePromise;
    }

    // 如果已经初始化完成，直接返回true
    if (this.isInitialized) {
      console.log('地图服务已初始化完成，直接返回true');
      return Promise.resolve(true);
    }

    // 设置初始化状态
    this.isInitializing = true;

    // 创建初始化Promise
    this.initializePromise = new Promise<boolean>(async (resolve) => {
      try {
        console.log('开始地图服务初始化逻辑');
        
        // 获取API密钥和安全密钥
        const apiKey = import.meta.env.VITE_AMAP_API_KEY;
        const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;
        console.log('API密钥存在:', !!apiKey, '安全密钥存在:', !!securityCode);
        
        if (!apiKey) {
          console.warn('未找到高德地图API密钥，请在.env文件中设置VITE_AMAP_API_KEY');
          // 使用模拟数据
          this.isInitialized = true;
          this.isInitializing = false;
          resolve(true);
          return;
        }
        
        // 设置安全密钥
        if (securityCode) {
          (window as any)._AMapSecurityConfig = {
            securityJsCode: securityCode
          };
          console.log('已设置高德地图安全密钥');
        }
        
        // 检查是否已经加载了高德地图API
        if ((window as any).AMap) {
          console.log('高德地图API已存在，直接使用');
          this.isInitialized = true;
          this.isInitializing = false;
          // 处理待处理的地图渲染请求
          this.processPendingRenders();
          resolve(true);
          return;
        }
        
        // 动态加载高德地图API
        console.log('开始加载高德地图API脚本');
        this.loadAMapScript(apiKey, resolve);
      } catch (error) {
        console.error('地图服务初始化失败:', error);
        // 出错时仍然标记为已初始化，使用模拟数据
        this.isInitialized = true;
        this.isInitializing = false;
        resolve(true);
      }
    });
    
    return this.initializePromise;
  }

  // 加载高德地图脚本
  private loadAMapScript(apiKey: string, resolve: (value: boolean) => void) {
    console.log('检查是否已存在高德地图脚本');
    // 检查是否已经存在相同src的script标签
    const existingScript = document.querySelector(`script[src^="https://webapi.amap.com/maps"]`);
    if (existingScript) {
      console.log('发现已存在的高德地图脚本');
      // 如果已存在，等待其加载完成
      if ((window as any).AMap) {
        console.log('高德地图API已加载完成');
        this.isInitialized = true;
        this.isInitializing = false;
        this.processPendingRenders();
        resolve(true);
      } else {
        console.log('高德地图API仍在加载中，添加事件监听器');
        existingScript.addEventListener('load', () => {
          console.log('高德地图脚本加载完成');
          this.isInitialized = true;
          this.isInitializing = false;
          this.processPendingRenders();
          resolve(true);
        });
        
        existingScript.addEventListener('error', () => {
          console.error('高德地图脚本加载失败');
          this.isInitialized = true;
          this.isInitializing = false;
          resolve(true);
        });
      }
      return;
    }

    console.log('创建新的高德地图脚本标签');
    // 创建新的script标签
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('高德地图脚本加载成功');
      this.isInitialized = true;
      this.isInitializing = false;
      
      // 处理待处理的地图渲染请求
      this.processPendingRenders();
      
      resolve(true);
    };
    
    script.onerror = () => {
      console.error('高德地图脚本加载失败');
      // 即使加载失败也标记为已初始化，使用模拟数据
      this.isInitialized = true;
      this.isInitializing = false;
      resolve(true);
    };
    
    document.head.appendChild(script);
    console.log('已添加高德地图脚本到页面');
  }

  // 处理待处理的地图渲染请求
  private processPendingRenders() {
    console.log('处理待处理的地图渲染请求，数量:', this.pendingRenders.length);
    if (this.pendingRenders.length > 0) {
      console.log(`处理${this.pendingRenders.length}个待处理的地图渲染请求`);
      this.pendingRenders.forEach(({ containerId, locations }) => {
        console.log('处理待渲染请求:', containerId, locations);
        this.renderMapWithRoute(containerId, locations);
      });
      this.pendingRenders = [];
    }
  }

  // 搜索地点
  async searchPlaces(keyword: string): Promise<MapLocation[]> {
    console.log('开始搜索地点:', keyword);
    // 等待地图初始化完成
    await this.initialize();
    
    if (!this.isInitialized) {
      console.log('地图服务未初始化');
      throw new Error('地图服务未初始化');
    }

    // 检查是否加载了高德地图API
    if (!(window as any).AMap) {
      // 如果没有真实的高德地图API，使用模拟数据
      console.warn('高德地图API未加载，使用模拟数据');
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockLocations: Record<string, MapLocation[]> = {
        '北京': [
          { name: '天安门广场', latitude: 39.9087, longitude: 116.3975 },
          { name: '故宫博物院', latitude: 39.9162, longitude: 116.3972 },
          { name: '颐和园', latitude: 39.9999, longitude: 116.2755 },
          { name: '长城', latitude: 40.4341, longitude: 116.5720 },
          { name: '北京动物园', latitude: 39.9391, longitude: 116.3424 },
          { name: '慕田峪长城', latitude: 40.4341, longitude: 116.5720 },
          { name: '798艺术区', latitude: 39.9896, longitude: 116.4895 }
        ],
        '上海': [
          { name: '外滩', latitude: 31.2363, longitude: 121.4903 },
          { name: '东方明珠', latitude: 31.2396, longitude: 121.4997 },
          { name: '豫园', latitude: 31.2274, longitude: 121.4922 },
          { name: '迪士尼乐园', latitude: 31.1439, longitude: 121.6579 }
        ],
        '杭州': [
          { name: '西湖', latitude: 30.2429, longitude: 120.1447 },
          { name: '灵隐寺', latitude: 30.2442, longitude: 120.0944 },
          { name: '千岛湖', latitude: 29.8575, longitude: 118.9386 },
          { name: '宋城', latitude: 30.1762, longitude: 120.1160 }
        ]
      };

      // 返回匹配的地点或默认地点
      const result = mockLocations[keyword] || [
        { name: keyword, latitude: 39.9042, longitude: 116.4074 }
      ];
      console.log('模拟地点搜索结果:', result);
      return result;
    }

    // 使用真实的高德地图API进行地点搜索
    console.log('使用高德地图API搜索地点');
    try {
      // 确保PlaceSearch插件已加载
      return new Promise((resolve, reject) => {
        (window as any).AMap.plugin('AMap.PlaceSearch', () => {
          try {
            console.log('AMap.PlaceSearch插件加载完成');
            const placeSearch = new (window as any).AMap.PlaceSearch({
              pageSize: 10,
              pageIndex: 1,
              city: keyword === '北京' || keyword === '上海' || keyword === '杭州' ? keyword : '全国',
              extensions: 'base'
            });

            placeSearch.search(keyword, (status: string, result: any) => {
              console.log('地点搜索完成，状态:', status, '结果:', result);
              if (status === 'complete' && result.info === 'OK') {
                const locations: MapLocation[] = result.poiList.pois.map((poi: any) => ({
                  name: poi.name,
                  latitude: poi.location.lat,
                  longitude: poi.location.lng,
                  address: poi.address
                }));
                console.log('地点搜索成功，结果:', locations);
                resolve(locations);
              } else {
                // 如果搜索失败，返回默认地点
                console.warn('高德地图地点搜索失败，使用默认地点:', status, result);
                resolve([{ name: keyword, latitude: 39.9042, longitude: 116.4074 }]);
              }
            });
          } catch (pluginError) {
            console.error('高德地图插件初始化失败:', pluginError);
            // 插件初始化失败，使用默认地点
            resolve([{ name: keyword, latitude: 39.9042, longitude: 116.4074 }]);
          }
        });
      });
    } catch (error) {
      console.error('地点搜索失败:', error);
      // 出错时返回默认地点
      const result = [{ name: keyword, latitude: 39.9042, longitude: 116.4074 }];
      console.log('返回默认地点:', result);
      return result;
    }
  }

  // 获取地点间的路线
  async getDirections(from: MapLocation, to: MapLocation): Promise<any> {
    console.log('获取路线信息，从:', from, '到:', to);
    await this.initialize();
    
    if (!this.isInitialized) {
      console.log('地图服务未初始化');
      throw new Error('地图服务未初始化');
    }

    // 在实际应用中，这里会调用高德地图的路径规划API
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // 返回模拟路线数据
      const result = {
        distance: '10公里',
        duration: '30分钟',
        steps: [
          { instruction: '沿当前道路行驶1公里', distance: '1公里' },
          { instruction: '左转进入主干道', distance: '3公里' },
          { instruction: '直行5公里', distance: '5公里' },
          { instruction: '右转到达目的地', distance: '1公里' }
        ]
      };
      console.log('模拟路线数据:', result);
      return result;
    } catch (error) {
      console.error('路线规划失败:', error);
      // 出错时返回默认路线数据
      const result = {
        distance: '未知',
        duration: '未知',
        steps: [
          { instruction: '无法获取路线信息', distance: '未知' }
        ]
      };
      console.log('返回默认路线数据:', result);
      return result;
    }
  }

  // 清除地图上的标记和路线
  private clearMap() {
    console.log('清除地图标记和路线');
    // 清除标记
    this.markers.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null);
      }
    });
    this.markers = [];

    // 清除路线
    if (this.polyline && this.polyline.setMap) {
      this.polyline.setMap(null);
      this.polyline = null;
    }
  }

  // 渲染地图并显示路线和标记
  renderMapWithRoute(containerId: string, locations: MapLocation[]): void {
    console.log(`尝试渲染地图: ${containerId}`, locations);
    
    // 如果地图服务正在初始化，将渲染请求加入待处理队列
    if (this.isInitializing && !this.isInitialized) {
      console.log(`地图正在初始化，将渲染请求加入待处理队列: ${containerId}`);
      this.pendingRenders.push({ containerId, locations });
      return;
    }

    // 等待地图初始化完成
    if (!this.isInitialized) {
      console.log(`地图未初始化，等待初始化后再渲染: ${containerId}`);
      this.initialize().then(() => {
        this.renderMapWithRoute(containerId, locations);
      });
      return;
    }

    // 检查高德地图API是否已加载
    if (!(window as any).AMap) {
      // 如果API未加载，尝试重新初始化
      if (this.mapLoadRetryCount < this.maxMapLoadRetries) {
        console.log(`高德地图API未加载，尝试重新初始化 (${this.mapLoadRetryCount + 1}/${this.maxMapLoadRetries})`);
        this.mapLoadRetryCount++;
        this.isInitialized = false;
        this.initialize().then(() => {
          this.renderMapWithRoute(containerId, locations);
        });
        return;
      } else {
        console.error('高德地图API加载失败，已达到最大重试次数');
        this.renderFallbackMap(containerId, locations);
        return;
      }
    }

    const container = document.getElementById(containerId);
    console.log('获取地图容器:', container);
    if (!container) {
      console.error('地图容器不存在');
      return;
    }

    // 显示加载动画
    this.showMapLoadingOverlay();

    // 清除之前的标记和路线
    this.clearMap();

    // 清除之前的ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    try {
      // 如果没有地点，直接返回
      if (locations.length === 0) {
        console.log('没有地点数据，渲染占位符');
        this.renderMapPlaceholder(container, { latitude: 39.9042, longitude: 116.4074 });
        this.hideMapLoadingOverlay();
        return;
      }

      // 计算中心点
      const centerLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
      const centerLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;
      console.log('计算地图中心点:', centerLat, centerLng);

      // 创建或更新地图实例
      if (!this.mapInstance) {
        console.log('创建新的地图实例');
        this.mapInstance = new (window as any).AMap.Map(containerId, {
          zoom: 12,
          center: [centerLng, centerLat],
          resizeEnable: true // 启用地图容器尺寸变化时自动调整地图
        });
        console.log('地图实例创建完成:', this.mapInstance);
      } else {
        // 更新地图中心和缩放级别
        console.log('更新现有地图实例');
        this.mapInstance.setCenter([centerLng, centerLat]);
        this.mapInstance.setZoom(12);
      }

      // 添加ResizeObserver监听容器大小变化
      this.resizeObserver = new ResizeObserver(() => {
        if (this.mapInstance) {
          // 延迟执行resize，确保容器尺寸已经稳定
          setTimeout(() => {
            if (this.mapInstance) {
              console.log('调整地图大小');
              this.mapInstance.resize();
            }
          }, 100);
        }
      });
      this.resizeObserver.observe(container);
      console.log('添加ResizeObserver监听');

      // 添加标记
      console.log('开始添加标记');
      locations.forEach((location, index) => {
        console.log('添加标记:', location);
        const marker = new (window as any).AMap.Marker({
          position: new (window as any).AMap.LngLat(location.longitude, location.latitude),
          title: location.title || location.name,
          label: {
            content: `${index + 1}`,
            offset: new (window as any).AMap.Pixel(-5, -5)
          },
          map: this.mapInstance
        });

        // 添加信息窗口
        if (location.description) {
          const infoWindow = new (window as any).AMap.InfoWindow({
            content: `<div><strong>${location.title || location.name}</strong><br/>${location.description}</div>`,
            offset: new (window as any).AMap.Pixel(0, -20)
          });

          marker.on('click', () => {
            infoWindow.open(this.mapInstance, marker.getPosition());
          });
        }

        this.markers.push(marker);
      });

      // 绘制路线（如果有多个地点）
      if (locations.length > 1) {
        console.log('绘制路线');
        const path = locations.map(loc => 
          new (window as any).AMap.LngLat(loc.longitude, loc.latitude)
        );

        this.polyline = new (window as any).AMap.Polyline({
          path: path,
          strokeColor: "#3366FF",
          strokeWeight: 4,
          strokeOpacity: 0.8,
          isOutline: true,
          outlineColor: '#FFFFFF',
          borderWeight: 1
        });

        this.polyline.setMap(this.mapInstance);

        // 调整地图视野以包含所有标记
        this.mapInstance.setFitView(this.markers);
      } else if (locations.length === 1) {
        // 如果只有一个地点，将地图中心设置为该地点
        console.log('设置单个地点为中心');
        this.mapInstance.setCenter([locations[0].longitude, locations[0].latitude]);
      }

      console.log('高德地图路线渲染完成');
      // 隐藏加载动画
      this.hideMapLoadingOverlay();
      // 重置重试计数
      this.mapLoadRetryCount = 0;
    } catch (error) {
      console.error('高德地图路线渲染失败:', error);
      this.hideMapLoadingOverlay();
      this.renderFallbackMap(containerId, locations);
      // 重置重试计数
      this.mapLoadRetryCount = 0;
    }
  }

  // 渲染备用地图（当高德地图加载失败时）
  private renderFallbackMap(containerId: string, locations: MapLocation[]) {
    console.log('渲染备用地图', containerId, locations);
    const container = document.getElementById(containerId);
    if (container) {
      const center = locations.length > 0 
        ? { latitude: locations[0].latitude, longitude: locations[0].longitude }
        : { latitude: 39.9042, longitude: 116.4074 };
      this.renderMapPlaceholder(container, center);
    }
  }

  // 聚焦到指定位置
  focusOnLocation(containerId: string, location: MapLocation): void {
    console.log(`尝试聚焦到位置: ${location.name}`, location);
    
    // 等待地图初始化完成
    if (!this.isInitialized) {
      console.log('地图未初始化，等待初始化');
      this.initialize().then(() => {
        this.focusOnLocation(containerId, location);
      });
      return;
    }
    
    // 检查高德地图API是否已加载
    if (!(window as any).AMap) {
      console.warn('高德地图API未加载，无法聚焦到指定位置');
      return;
    }
    
    if (!this.mapInstance) {
      console.warn('地图服务未初始化或地图实例不存在');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error('地图容器不存在');
      return;
    }

    // 显示加载动画
    this.showMapLoadingOverlay();

    try {
      // 设置地图中心到指定位置
      console.log('设置地图中心到指定位置');
      this.mapInstance.setCenter([location.longitude, location.latitude]);
      // 增大缩放级别以更清楚地显示位置
      this.mapInstance.setZoom(16);
      
      // 如果存在该位置的标记，可以额外高亮显示
      const targetMarker = this.markers.find(marker => {
        const position = marker.getPosition();
        return position.lng === location.longitude && position.lat === location.latitude;
      });
      
      if (targetMarker) {
        // 可以添加额外的高亮效果
        console.log('聚焦到标记:', location.name);
      }

      console.log('地图聚焦到位置:', location.name);
    } catch (error) {
      console.error('聚焦位置失败:', error);
    } finally {
      // 隐藏加载动画
      this.hideMapLoadingOverlay();
    }
  }

  // 显示地图加载动画
  private showMapLoadingOverlay(): void {
    console.log('显示地图加载动画');
    const loadingOverlay = document.getElementById('map-loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
      loadingOverlay.style.opacity = '1';
    }
  }

  // 隐藏地图加载动画
  private hideMapLoadingOverlay(): void {
    console.log('隐藏地图加载动画');
    setTimeout(() => {
      const loadingOverlay = document.getElementById('map-loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
        }, 300);
      }
    }, 500);
  }

  // 渲染地图
  renderMap(containerId: string, center: { latitude: number; longitude: number }): void {
    console.log(`尝试渲染地图: ${containerId}`, center);
    
    // 等待地图初始化完成
    if (!this.isInitialized) {
      console.log('地图未初始化，等待初始化');
      this.initialize().then(() => {
        this.renderMap(containerId, center);
      });
      return;
    }

    // 检查高德地图API是否已加载
    if (!(window as any).AMap) {
      console.warn('高德地图API未加载，无法渲染地图');
      const container = document.getElementById(containerId);
      if (container) {
        this.renderMapPlaceholder(container, center);
      }
      return;
    }

    // 在实际应用中，这里会使用高德地图API渲染地图
    const container = document.getElementById(containerId);
    if (container) {
      try {
        // 创建高德地图实例
        console.log('创建高德地图实例');
        this.mapInstance = new (window as any).AMap.Map(containerId, {
          zoom: 12,
          center: [center.longitude, center.latitude]
        });
        
        // 添加标记
        new (window as any).AMap.Marker({
          position: new (window as any).AMap.LngLat(center.longitude, center.latitude),
          title: '当前位置',
          map: this.mapInstance
        });
        
        console.log('高德地图渲染完成');
      } catch (error) {
        console.error('高德地图渲染失败:', error);
        this.renderMapPlaceholder(container, center);
      }
    }
  }
  
  // 渲染地图占位符
  private renderMapPlaceholder(container: HTMLElement, center: { latitude: number; longitude: number }): void {
    console.log('渲染地图占位符', center);
    container.innerHTML = `
      <div style="
        width: 100%; 
        height: 100%; 
        background: linear-gradient(135deg, #7ec6e9 0%, #2ba7df 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
        border-radius: 4px;
      ">
        <div>
          <div>高德地图</div>
          <div style="font-size: 14px; margin-top: 10px;">中心点: ${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}</div>
        </div>
      </div>
    `;
  }
}

export default new MapService();
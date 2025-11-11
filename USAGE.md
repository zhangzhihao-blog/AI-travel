# 使用说明

## 获取并运行开发环境镜像

### 1. 拉取镜像
```bash
docker pull registry.cn-hangzhou.aliyuncs.com/<your-namespace>/ai-traveller-dev:latest
```

### 2. 创建 .env 文件
在本地创建一个 .env 文件，配置您自己的 API 密钥：

```env
# Firebase配置
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# 阿里云百炼平台配置（用于大语言模型API）
VITE_ALIYUN_DASHSCOPE_API_KEY=your_aliyun_dashscope_api_key
VITE_ALIYUN_DASHSCOPE_APP_ID=your_aliyun_dashscope_app_id

# 科大讯飞配置（用于语音识别）
VITE_IFLYTEK_APP_ID=your_iflytek_app_id
VITE_IFLYTEK_API_KEY=your_iflytek_api_key
VITE_IFLYTEK_SECRET_KEY=your_iflytek_secret_key

# 高德地图配置
VITE_AMAP_API_KEY=your_amap_api_key
VITE_AMAP_SECURITY_CODE=your_amap_security_code
```

### 3. 运行容器
```bash
docker run -v $(pwd)/.env:/app/.env -p 5173:5173 registry.cn-hangzhou.aliyuncs.com/<your-namespace>/ai-traveller-dev:latest
```

### 4. 访问应用
打开浏览器访问 http://localhost:5173

## 本地开发

如果您希望在本地进行开发，可以执行以下步骤：

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd ai-traveller-web
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置 .env 文件
复制 .env.example 文件并重命名为 .env，然后配置您的 API 密钥：

```bash
cp .env.example .env
```

### 4. 启动开发服务器
```bash
pnpm dev
```

## 构建生产版本
```bash
pnpm build
```
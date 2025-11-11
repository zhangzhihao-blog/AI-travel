# AI 旅行规划师

AI 旅行规划师是一款基于 Web 的智能旅行规划应用程序，旨在简化用户的旅行规划流程。通过集成人工智能技术，该应用能够理解用户的旅行需求，自动生成个性化的旅行路线和建议，并提供实时的旅行辅助功能。

## 功能特性

- 智能行程规划：基于用户需求自动生成个性化旅行路线
- 语音识别功能：支持语音输入旅行需求
- 费用预算与管理：预算分析和实际开销记录
- 用户管理系统：注册登录和数据同步
- 地理位置服务：地图展示和导航功能

## 技术架构

- 前端：React 19 + TypeScript + Vite
- UI 组件库：Ant Design
- 路由：React Router v7
- 状态管理：React Context API
- 用户认证：Firebase Authentication
- 数据存储：Firestore
- AI 服务：阿里云百炼平台大语言模型
- 语音识别：科大讯飞语音识别 SDK
- 地图服务：高德地图 API

## 环境要求

- Node.js 20.19+ 或 22.12+
- pnpm 8.0+
- 现代浏览器（Chrome、Firefox、Edge等）

## 安装与运行

1. 克隆项目：
   ```bash
   git clone <项目地址>
   ```

2. 安装依赖：
   ```bash
   pnpm install
   ```

3. 配置环境变量（见下文）

4. 启动开发服务器：
   ```bash
   pnpm dev
   ```

5. 构建生产版本：
   ```bash
   pnpm build
   ```

## API 配置说明

在使用应用的各项功能之前，需要配置相应的 API 密钥。请参考 `.env` 文件中的说明进行配置。

### 1. 阿里云百炼平台（大语言模型）

用于生成智能旅行行程。

**获取方式：**
1. 访问 [阿里云百炼平台](https://help.aliyun.com/zh/bailian)
2. 注册/登录阿里云账号
3. 创建应用并获取 API 密钥和应用ID
4. 将 API 密钥填入 `.env` 文件中的 `VITE_ALIYUN_DASHSCOPE_API_KEY` 字段
5. 将应用ID填入 `.env` 文件中的 `VITE_ALIYUN_DASHSCOPE_APP_ID` 字段

### 2. 科大讯飞（语音识别）

用于语音输入功能。

**获取方式：**
1. 访问 [科大讯飞开放平台](https://www.xfyun.cn/)
2. 注册账号并创建应用
3. 获取 APPID、API Key 和 Secret Key
4. 将对应信息填入 `.env` 文件中的以下字段：
   - `VITE_IFLYTEK_APP_ID`
   - `VITE_IFLYTEK_API_KEY`
   - `VITE_IFLYTEK_SECRET_KEY`

### 3. 高德地图

用于地图展示和位置服务。

**获取方式：**
1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册账号并创建应用
3. 获取 Web 服务 API 密钥
4. 将 API 密钥填入 `.env` 文件中的 `VITE_AMAP_API_KEY` 字段

## Firebase 配置

项目已预配置 Firebase，如需使用自己的 Firebase 项目，请替换 `.env` 文件中的 Firebase 配置信息。

## 目录结构

```
src/
├── assets/              # 静态资源
├── components/          # 可复用组件
├── contexts/            # React Context
├── hooks/               # 自定义 Hooks
├── pages/               # 页面组件
├── routes/              # 路由配置
├── services/            # API 服务
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
├── App.tsx              # 根组件
└── main.tsx             # 入口文件
```

## 开发指南

### 添加新功能

1. 在 `src/pages/` 目录下创建新页面组件
2. 在 `src/routes/index.tsx` 中添加路由配置
3. 如需新服务，在 `src/services/` 目录下创建服务文件

### 代码规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 和 Prettier 规范
- 组件使用函数式写法
- 使用 Ant Design 组件库

## 部署

1. 构建项目：
   ```bash
   pnpm build
   ```

2. 将 `dist/` 目录部署到服务器或静态网站托管服务

## 常见问题

### 1. API 调用失败

请检查：
- API 密钥是否正确配置
- 网络连接是否正常
- 对应服务是否可用

### 2. 地图无法显示

请检查：
- 高德地图 API 密钥是否正确
- 浏览器是否允许加载外部资源

### 3. 语音识别不工作

请检查：
- 浏览器是否支持语音识别
- 科大讯飞配置是否正确
- 是否授予麦克风权限

## 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。

## 许可证

MIT
# 使用 Node.js 作为基础镜像
FROM node:20-alpine

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 package 文件和 dockerignore 文件
COPY package.json pnpm-lock.yaml .dockerignore ./

# 安装依赖
RUN pnpm install

# 复制源代码（除了 .env 文件，由 .dockerignore 控制）
COPY . .

# 作为额外保障，显式移除可能存在的 .env 文件，确保镜像中不包含敏感配置
RUN rm -f .env

# 暴露开发服务器端口
EXPOSE 5173

# 设置默认命令
CMD ["pnpm", "dev", "--host"]
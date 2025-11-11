import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import routes from './routes'
import { AuthProvider } from './contexts/AuthContext'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN';
import App from './App'

const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfigProvider>
  </StrictMode>,
)

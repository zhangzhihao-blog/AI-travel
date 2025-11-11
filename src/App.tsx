import { useState } from 'react';
import { Layout } from 'antd';
import Header from './components/Header';
import { Outlet } from 'react-router-dom';
import './App.css';

const { Content, Footer } = Layout;

function App() {
  const [current, setCurrent] = useState('home');

  const handleMenuClick = (e: any) => {
    setCurrent(e.key);
  };

  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Header current={current} onClick={handleMenuClick} />
      
      <Content style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="site-layout-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </Content>
      
      <Footer style={{ textAlign: 'center' }}>
        AI 旅行规划师 ©2025 Created by AI Travel Team
      </Footer>
    </Layout>
  );
}

export default App;
import React from 'react';
import { Layout, Menu, Dropdown, Avatar, message } from 'antd';
import { HomeOutlined, LoginOutlined, FormOutlined, UserOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  current?: string;
  onClick?: (e: any) => void;
}

const Header: React.FC<HeaderProps> = ({ current = 'home', onClick }) => {
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();

  const handleMenuClick = (e: any) => {
    if (onClick) {
      onClick(e);
    }
    
    switch (e.key) {
      case 'home':
        navigate('/');
        break;
      case 'login':
        navigate('/login');
        break;
      case 'register':
        navigate('/register');
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      message.success('登出成功');
      navigate('/login');
    } catch (error: any) {
      message.error('登出失败: ' + error.message);
    }
  };

  const userMenuItems = [
    {
      key: 'logout',
      label: '登出',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader style={{ padding: '0 24px', display: 'flex', alignItems: 'center' }}>
      <div className="logo" style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', flex: 1 }}>
        AI 旅行规划师
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        onClick={handleMenuClick}
        selectedKeys={[current]}
        items={[
          {
            key: 'home',
            icon: <HomeOutlined />,
            label: '首页',
          },
          currentUser
            ? {
                key: 'user',
                label: (
                  <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                    <span style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <Avatar icon={<UserOutlined />} size="small" style={{ marginRight: 8 }} />
                      <span>{currentUser.email || '用户'}</span>
                      <DownOutlined style={{ fontSize: '12px', marginLeft: 4 }} />
                    </span>
                  </Dropdown>
                ),
              }
            : {
                key: 'auth',
                label: '认证',
                children: [
                  {
                    key: 'login',
                    icon: <LoginOutlined />,
                    label: '登录',
                  },
                  {
                    key: 'register',
                    icon: <FormOutlined />,
                    label: '注册',
                  },
                ],
              },
        ]}
        style={{ minWidth: 0, background: 'transparent' }}
      />
    </AntHeader>
  );
};

export default Header;
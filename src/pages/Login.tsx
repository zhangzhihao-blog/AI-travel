import React, { useState } from 'react';
import { Button, Card, Form, Input, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await signIn(values.username, values.password);
      message.success('登录成功');
      navigate('/');
    } catch (error: any) {
      console.error('登录错误:', error);
      message.error('登录失败: ' + (error.code === 'auth/invalid-credential' ? '用户名或密码错误' : error.message));
    } finally {
      setLoading(false);
    }
  };

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
        maxWidth: 400, 
        width: '100%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px'
      }}>
        <Title level={3} style={{ textAlign: 'center' }}>用户登录</Title>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入邮箱地址!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="邮箱地址" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>

          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                style={{ width: '100%' }}
                size="large"
              >
                登录
              </Button>
              <Button 
                style={{ width: '100%' }}
                size="large"
                onClick={() => navigate('/register')}
              >
                注册账户
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
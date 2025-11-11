import { useState, useEffect } from 'react';

interface AuthInfo {
  isAuthenticated: boolean;
  user: any;
}

const useAuth = (): AuthInfo => {
  const [authInfo, setAuthInfo] = useState<AuthInfo>({
    isAuthenticated: false,
    user: null
  });

  // 模拟认证检查
  useEffect(() => {
    // 这里可以检查本地存储的token或者调用认证API
    const token = localStorage.getItem('authToken');
    if (token) {
      // 模拟用户信息
      setAuthInfo({
        isAuthenticated: true,
        user: { name: '示例用户' }
      });
    }
  }, []);

  return authInfo;
};

export default useAuth;
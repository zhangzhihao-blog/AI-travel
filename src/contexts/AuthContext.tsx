import { useState, useEffect, createContext, useContext } from 'react';
import { Spin, Layout } from 'antd';
import { auth } from '../services/firebase';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = async (email: string, password: string) => {
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth') as any;
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      console.error('登录错误:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth') as any;
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      console.error('注册错误:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { signOut: firebaseSignOut } = await import('firebase/auth') as any;
      return firebaseSignOut(auth);
    } catch (error) {
      console.error('登出错误:', error);
      throw error;
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initAuthStateListener = async () => {
      try {
        const { onAuthStateChanged } = await import('firebase/auth') as any;
        unsubscribe = onAuthStateChanged(auth, (user: any) => {
          setCurrentUser(user || null);
          setLoading(false);
        });
      } catch (error) {
        console.error('认证状态监听错误:', error);
        setLoading(false);
      }
    };

    initAuthStateListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    currentUser,
    loading,
    signIn,
    signUp,
    signOut
  };

  // 显示加载状态而不是空白页面
  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
      </Layout>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
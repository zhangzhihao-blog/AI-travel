import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  type DocumentData
} from 'firebase/firestore';
import { type ItineraryResponse } from './aiService';
import { auth } from './firebase';
import { message } from 'antd';

// 定义费用接口
interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
}

// 定义数据模型接口
export interface UserData {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  createdAt: Date;
}

export interface StoredItinerary extends Omit<ItineraryResponse, 'id'> {
  id?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreference {
  userId: string;
  preferences: string[];
  budgetRange: { min: number; max: number };
  travelCompanions: string[];
  specialRequests: string;
  updatedAt: Date;
}

export interface StoredExpense extends Omit<Expense, 'id'> {
  id?: string;
  userId: string;
  itineraryId: string;
  createdAt: Date;
}

class StorageService {
  // 用户相关操作
  async createUserProfile(userData: UserData): Promise<void> {
    try {
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        ...userData,
        createdAt: userData.createdAt || new Date()
      });
    } catch (error) {
      console.error('创建用户档案失败:', error);
      throw error;
    }
  }

  // 行程相关操作
  async saveItinerary(itinerary: Omit<ItineraryResponse, 'id'>): Promise<string> {
    try {
      console.log('开始保存行程到Firestore');
      // 检查用户是否登录
      if (!auth.currentUser) {
        console.warn('用户未登录，行程将不会保存到云端');
        message.warning('请先登录，行程将不会保存到云端');
        // 生成一个模拟的ID
        const mockId = 'itinerary_' + Date.now();
        console.log('生成模拟ID:', mockId);
        return mockId;
      }

      console.log('用户已登录，用户ID:', auth.currentUser.uid);
      
      // 清理数据，确保只包含可序列化的字段
      const cleanedData: any = {};
      
      // 手动复制字段以避免不可序列化的对象
      Object.keys(itinerary).forEach(key => {
        const value = (itinerary as any)[key];
        // 跳过函数和复杂对象
        if (typeof value !== 'function') {
          // 特殊处理数组和对象
          if (Array.isArray(value)) {
            cleanedData[key] = value.map(item => {
              if (typeof item === 'object' && item !== null) {
                // 递归处理对象
                const cleanedItem: any = {};
                Object.keys(item).forEach(itemKey => {
                  const itemValue = (item as any)[itemKey];
                  if (typeof itemValue !== 'function') {
                    cleanedItem[itemKey] = itemValue;
                  }
                });
                return cleanedItem;
              }
              return item;
            });
          } else if (typeof value === 'object' && value !== null) {
            // 处理对象
            const cleanedObj: any = {};
            Object.keys(value).forEach(objKey => {
              const objValue = (value as any)[objKey];
              if (typeof objValue !== 'function') {
                cleanedObj[objKey] = objValue;
              }
            });
            cleanedData[key] = cleanedObj;
          } else {
            // 基本类型直接赋值
            cleanedData[key] = value;
          }
        }
      });
      
      // 添加用户特定字段
      cleanedData.userId = auth.currentUser.uid;
      cleanedData.createdAt = new Date();
      cleanedData.updatedAt = new Date();

      console.log('准备保存的行程数据:', cleanedData);
      console.log('准备调用addDoc');
      const docRef = await addDoc(collection(db, 'itineraries'), cleanedData);
      console.log('addDoc调用完成，文档引用:', docRef);
      console.log('行程保存成功，文档ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('保存行程失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，行程将不会保存到云端');
        message.warning('网络连接问题，行程将不会保存到云端');
      } else {
        message.error('保存行程到云端失败');
      }
      // 不抛出错误，而是返回一个模拟的ID
      const mockId = 'itinerary_' + Date.now();
      console.log('保存失败，返回模拟ID:', mockId);
      return mockId;
    }
  }

  async getItineraries(): Promise<StoredItinerary[]> {
    try {
      console.log('开始获取行程列表');
      // 检查用户是否登录
      if (!auth.currentUser) {
        console.warn('用户未登录，无法获取行程列表');
        message.warning('请先登录，无法获取行程列表');
        return [];
      }

      console.log('用户已登录，用户ID:', auth.currentUser.uid);
      const q = query(
        collection(db, 'itineraries'),
        where('userId', '==', auth.currentUser.uid)
      );
      
      console.log('准备执行查询');
      const querySnapshot = await getDocs(q);
      console.log('查询执行完成，文档数量:', querySnapshot.docs.length);
      const result = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('文档数据:', data);
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as StoredItinerary;
      });
      console.log('处理后的行程列表:', result);
      return result;
    } catch (error: any) {
      console.error('获取行程列表失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，无法获取行程列表');
        message.warning('网络连接问题，无法获取行程列表');
      } else {
        message.error('获取行程列表失败');
      }
      return []; // 返回空数组而不是抛出错误
    }
  }

  async getItinerary(id: string): Promise<StoredItinerary | null> {
    try {
      console.log('开始获取行程，ID:', id);
      const docRef = doc(db, 'itineraries', id);
      console.log('准备获取文档');
      const docSnap = await getDoc(docRef);
      console.log('文档获取完成，是否存在:', docSnap.exists());
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('获取到行程数据:', data);
        const result = {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as StoredItinerary;
        console.log('处理后的行程数据:', result);
        return result;
      }
      
      console.log('未找到指定ID的行程');
      return null;
    } catch (error: any) {
      console.error('获取行程失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，无法获取行程');
        message.warning('网络连接问题，无法获取行程');
      } else {
        message.error('获取行程失败');
      }
      return null; // 返回null而不是抛出错误
    }
  }

  async updateItinerary(id: string, itinerary: Partial<StoredItinerary>): Promise<void> {
    try {
      console.log('开始更新行程，ID:', id, '数据:', itinerary);
      const docRef = doc(db, 'itineraries', id);
      console.log('准备更新文档');
      await updateDoc(docRef, {
        ...itinerary,
        updatedAt: new Date()
      });
      console.log('行程更新成功');
    } catch (error: any) {
      console.error('更新行程失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，行程将不会更新到云端');
        message.warning('网络连接问题，行程将不会更新到云端');
      } else {
        message.error('更新行程失败');
      }
      // 不抛出错误
    }
  }

  async deleteItinerary(id: string): Promise<void> {
    try {
      console.log('开始删除行程，ID:', id);
      console.log('准备删除文档');
      await deleteDoc(doc(db, 'itineraries', id));
      console.log('行程删除成功');
    } catch (error: any) {
      console.error('删除行程失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，行程将不会从云端删除');
        message.warning('网络连接问题，行程将不会从云端删除');
      } else {
        message.error('删除行程失败');
      }
      // 不抛出错误
    }
  }

  // 用户偏好相关操作
  async saveUserPreferences(preferences: Omit<UserPreference, 'userId' | 'updatedAt'>): Promise<void> {
    try {
      console.log('开始保存用户偏好设置');
      // 检查用户是否登录
      if (!auth.currentUser) {
        console.warn('用户未登录，偏好设置将不会保存到云端');
        message.warning('请先登录，偏好设置将不会保存到云端');
        return;
      }

      console.log('用户已登录，用户ID:', auth.currentUser.uid);
      
      // 清理数据，确保只包含可序列化的字段
      const cleanedData: any = {};
      
      // 手动复制字段以避免不可序列化的对象
      Object.keys(preferences).forEach(key => {
        const value = (preferences as any)[key];
        // 跳过函数和复杂对象
        if (typeof value !== 'function') {
          cleanedData[key] = value;
        }
      });
      
      // 添加用户特定字段
      cleanedData.userId = auth.currentUser.uid;
      cleanedData.updatedAt = new Date();

      console.log('准备保存的偏好设置数据:', cleanedData);
      const q = query(
        collection(db, 'userPreferences'),
        where('userId', '==', auth.currentUser.uid)
      );

      console.log('准备执行查询');
      const querySnapshot = await getDocs(q);
      console.log('查询执行完成，文档数量:', querySnapshot.docs.length);
      
      if (!querySnapshot.empty) {
        // 更新现有偏好
        const docRef = querySnapshot.docs[0].ref;
        console.log('准备更新现有偏好设置文档');
        await updateDoc(docRef, {
          ...cleanedData
        } as Partial<DocumentData>);
      } else {
        // 创建新偏好
        console.log('准备创建新的偏好设置文档');
        await addDoc(collection(db, 'userPreferences'), cleanedData);
      }
      console.log('偏好设置保存成功');
    } catch (error: any) {
      console.error('保存用户偏好失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，偏好设置将不会保存到云端');
        message.warning('网络连接问题，偏好设置将不会保存到云端');
      } else {
        message.error('保存用户偏好设置失败');
      }
      // 不抛出错误
    }
  }

  async getUserPreferences(): Promise<UserPreference | null> {
    try {
      console.log('开始获取用户偏好设置');
      // 检查用户是否登录
      if (!auth.currentUser) {
        console.warn('用户未登录，无法获取偏好设置');
        message.warning('请先登录，无法获取偏好设置');
        return null;
      }

      console.log('用户已登录，用户ID:', auth.currentUser.uid);
      const q = query(
        collection(db, 'userPreferences'),
        where('userId', '==', auth.currentUser.uid)
      );

      console.log('准备执行查询');
      const querySnapshot = await getDocs(q);
      console.log('查询执行完成，文档数量:', querySnapshot.docs.length);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        console.log('获取到偏好设置数据:', data);
        const result = {
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as UserPreference;
        console.log('处理后的偏好设置数据:', result);
        return result;
      }
      
      console.log('未找到用户偏好设置');
      return null;
    } catch (error: any) {
      console.error('获取用户偏好失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，无法获取用户偏好设置');
        message.warning('网络连接问题，无法获取用户偏好设置');
      } else {
        message.error('获取用户偏好设置失败');
      }
      return null; // 返回null而不是抛出错误
    }
  }

  // 费用相关操作
  async saveExpense(expense: Omit<StoredExpense, 'id'>): Promise<string> {
    try {
      console.log('开始保存费用记录');
      // 检查用户是否登录
      if (!auth.currentUser) {
        console.warn('用户未登录，费用记录将不会保存到云端');
        message.warning('请先登录，费用记录将不会保存到云端');
        // 生成一个模拟的ID
        const mockId = 'expense_' + Date.now();
        console.log('生成模拟ID:', mockId);
        return mockId;
      }

      console.log('用户已登录，用户ID:', auth.currentUser.uid);
      
      // 清理数据，确保只包含可序列化的字段
      const cleanedData: any = {};
      
      // 手动复制字段以避免不可序列化的对象
      Object.keys(expense).forEach(key => {
        const value = (expense as any)[key];
        // 跳过函数和复杂对象
        if (typeof value !== 'function') {
          cleanedData[key] = value;
        }
      });
      
      // 添加用户特定字段
      cleanedData.userId = auth.currentUser.uid;
      cleanedData.createdAt = new Date();

      console.log('准备保存的费用数据:', cleanedData);
      console.log('准备调用addDoc');
      const docRef = await addDoc(collection(db, 'expenses'), cleanedData);
      console.log('addDoc调用完成，文档引用:', docRef);
      console.log('费用记录保存成功，文档ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('保存费用记录失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，费用记录将不会保存到云端');
        message.warning('网络连接问题，费用记录将不会保存到云端');
      } else {
        message.error('保存费用记录到云端失败');
      }
      // 不抛出错误，而是返回一个模拟的ID
      const mockId = 'expense_' + Date.now();
      console.log('保存失败，返回模拟ID:', mockId);
      return mockId;
    }
  }

  async getExpenses(itineraryId: string): Promise<StoredExpense[]> {
    try {
      console.log('开始获取费用记录，行程ID:', itineraryId);
      // 检查用户是否登录
      if (!auth.currentUser) {
        console.warn('用户未登录，无法获取费用记录');
        message.warning('请先登录，无法获取费用记录');
        return [];
      }

      console.log('用户已登录，用户ID:', auth.currentUser.uid);
      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', auth.currentUser.uid),
        where('itineraryId', '==', itineraryId)
      );
      
      console.log('准备执行查询');
      const querySnapshot = await getDocs(q);
      console.log('查询执行完成，文档数量:', querySnapshot.docs.length);
      const result = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('费用文档数据:', data);
        return {
          ...data,
          id: doc.id,
          amount: Number(data.amount),
          createdAt: data.createdAt?.toDate() || new Date()
        } as StoredExpense;
      });
      console.log('处理后的费用记录:', result);
      return result;
    } catch (error: any) {
      console.error('获取费用记录失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，无法获取费用记录');
        message.warning('网络连接问题，无法获取费用记录');
      } else {
        message.error('获取费用记录失败');
      }
      return []; // 返回空数组而不是抛出错误
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      console.log('开始删除费用记录，ID:', id);
      console.log('准备删除文档');
      await deleteDoc(doc(db, 'expenses', id));
      console.log('费用记录删除成功');
    } catch (error: any) {
      console.error('删除费用记录失败:', error);
      // 检查是否是网络错误
      if (error instanceof Error && 
          (error.name === 'FirebaseError' || 
           error.message.includes('net::ERR_CONNECTION_TIMED_OUT') ||
           error.message.includes('Network Error') ||
           error.message.includes('firestore.googleapis.com'))) {
        console.warn('网络连接问题，费用记录将不会从云端删除');
        message.warning('网络连接问题，费用记录将不会从云端删除');
      } else {
        message.error('删除费用记录失败');
      }
      // 不抛出错误
    }
  }
}

export default new StorageService();
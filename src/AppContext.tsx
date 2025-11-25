import { createContext, useContext, useState, useEffect } from 'react';
import type { User, Transaction, TransactionsByMonth, Template, Tag } from './types';

type AppContextType = {
  users: User[];
  setUsers: (users: User[]) => void;
  selectedUser: string;
  setSelectedUser: (name: string) => void;
  mainUser: string;
  setMainUser: (name: string) => void;
  transactionsByMonth: TransactionsByMonth;
  setTransactionsByMonth: (transactions: TransactionsByMonth) => void;
  templates: Template[];
  setTemplates: (templates: Template[]) => void;
  tags: Tag[];
  setTags: (tags: Tag[]) => void;
  alertMessage: string;
  setAlertMessage: (message: string) => void;
};

// ==================== Context ====================

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

// ==================== Provider ====================

// ユーザーごとのデータキー
const getUserKey = (user: string, key: string) => `${user}_${key}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : [];
  });
  const [mainUser, setMainUser] = useState(() => {
    return localStorage.getItem('mainUser') || '';
  });
  const [selectedUser, setSelectedUser] = useState('');
  const [transactionsByMonth, setTransactionsByMonth] = useState<TransactionsByMonth>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [alertMessage, setAlertMessage] = useState('');

  // ユーザーが変更されたらデータを読み込む
  useEffect(() => {
    if (selectedUser) {
      const savedTransactions = localStorage.getItem(getUserKey(selectedUser, 'transactions'));
      const savedTemplates = localStorage.getItem(getUserKey(selectedUser, 'templates'));
      const savedTags = localStorage.getItem(getUserKey(selectedUser, 'tags'));
      setTransactionsByMonth(savedTransactions ? JSON.parse(savedTransactions) : {});
      setTemplates(savedTemplates ? JSON.parse(savedTemplates) : []);
      setTags(savedTags ? JSON.parse(savedTags) : []);
    } else {
      setTransactionsByMonth({});
      setTemplates([]);
      setTags([]);
    }
  }, [selectedUser]);

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('mainUser', mainUser);
  }, [mainUser]);

  // 収支をユーザーごとに保存
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem(getUserKey(selectedUser, 'transactions'), JSON.stringify(transactionsByMonth));
    }
  }, [transactionsByMonth, selectedUser]);

  // テンプレートをユーザーごとに保存
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem(getUserKey(selectedUser, 'templates'), JSON.stringify(templates));
    }
  }, [templates, selectedUser]);

  // タグをユーザーごとに保存
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem(getUserKey(selectedUser, 'tags'), JSON.stringify(tags));
    }
  }, [tags, selectedUser]);

  const value: AppContextType = {
    users, setUsers,
    selectedUser, setSelectedUser,
    mainUser, setMainUser,
    transactionsByMonth, setTransactionsByMonth,
    templates, setTemplates,
    tags, setTags,
    alertMessage, setAlertMessage,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ==================== 共通型定義 ====================

export type User = {
  name: string;
  balance: number;
};

export type Transaction = {
  id: number;
  type: 'income' | 'expense';
  date: number;
  item: string;
  amount: number;
  tag?: string;
};

export type TransactionsByMonth = {
  [yearMonth: string]: Transaction[];
};

export type Template = {
  type: 'income' | 'expense';
  item: string;
  amount: number;
  tag?: string;
};

export type Tag = {
  name: string;
  color: string;
};

export type TransactionType = 'income' | 'expense';

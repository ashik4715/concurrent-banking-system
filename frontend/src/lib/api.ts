import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export interface Account {
  _id: string;
  accountId: string;
  holderName: string;
  balance: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  fromAccount: string | null;
  toAccount: string | null;
  amount: number;
  status: 'success' | 'failed';
  errorMessage: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export const accountApi = {
  create: (data: { accountId: string; holderName: string; balance?: number }) =>
    api.post<ApiResponse<Account>>('/accounts', data),
  getAll: () => api.get<ApiResponse<Account[]>>('/accounts'),
  getOne: (id: string) => api.get<ApiResponse<Account>>(`/accounts/${id}`),
  getTransactions: (id: string) =>
    api.get<ApiResponse<Transaction[]>>(`/accounts/${id}/transactions`),
};

export const transactionApi = {
  create: (data: {
    type: 'deposit' | 'withdraw' | 'transfer';
    fromAccount?: string | null;
    toAccount?: string | null;
    amount: number;
  }) => api.post<ApiResponse<any>>('/transactions', data),
  getAll: () => api.get<ApiResponse<Transaction[]>>('/transactions'),
};

export default api;

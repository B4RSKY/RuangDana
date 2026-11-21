export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  description: string;
  transactionDate: string;
  categoryId: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TransactionPage {
  data: Transaction[];
  meta: PaginationMeta;
}

export interface FindAllTransactionsQuery {
  page?: number;
  limit?: number;
  type?: TransactionType;
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface TransactionDateRange {
  from?: string;
  to?: string;
}

export interface CreateCategoryPayload {
  name: string;
  type: TransactionType;
}

export interface UpdateCategoryPayload {
  name?: string;
  type?: TransactionType;
}

export interface CreateTransactionPayload {
  title: string;
  amount: number;
  type: TransactionType;
  description?: string;
  transactionDate: string;
  categoryId: number;
}

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>;

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
}
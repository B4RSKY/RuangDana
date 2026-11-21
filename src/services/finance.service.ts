import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiFetch, buildQueryString } from '@/lib/api-client';
import type {
  Category,
  CreateCategoryPayload,
  CreateTransactionPayload,
  FinanceSummary,
  FindAllTransactionsQuery,
  PaginationMeta,
  Transaction,
  TransactionDateRange,
  TransactionPage,
  TransactionType,
  UpdateCategoryPayload,
  UpdateTransactionPayload,
} from '@/types/finance';

const CATEGORIES_ENDPOINT = '/v1/categories';
const TRANSACTIONS_ENDPOINT = '/v1/transactions';
const SUMMARY_ENDPOINT = '/v1/summary';

type ApiEnvelope<T> = {
  data?: T;
  meta?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Format respons API tidak valid.');
  }
  return value as Record<string, unknown>;
}

function unwrapData(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  return 'data' in record ? record.data : value;
}

function normalizeCategory(value: unknown): Category {
  const record = asRecord(value);
  return {
    id: String(record.id),
    name: String(record.name ?? ''),
    type: record.type as TransactionType,
  };
}

function normalizeTransaction(value: unknown): Transaction {
  const record = asRecord(value);
  const category = record.category ? asRecord(record.category) : undefined;
  const rawDate = record.transactionDate ?? record.transaction_date ?? '';
  const transactionDate = String(rawDate).slice(0, 10);

  return {
    id: String(record.id),
    title: String(record.title ?? ''),
    amount: Number(record.amount ?? 0),
    type: record.type as TransactionType,
    description: String(record.description ?? ''),
    transactionDate,
    categoryId: String(
      record.categoryId ?? record.category_id ?? category?.id ?? '',
    ),
  };
}

function normalizePageMeta(
  value: unknown,
  dataLength: number,
  page: number,
  limit: number,
): PaginationMeta {
  const record = value && typeof value === 'object' ? asRecord(value) : {};
  const totalItems = Number(record.totalItems ?? record.total ?? dataLength);
  const totalPages = Number(
    record.totalPages ?? Math.ceil(totalItems / Math.max(1, limit)),
  );
  return {
    page: Number(record.page ?? page),
    limit: Number(record.limit ?? limit),
    totalItems,
    totalPages,
    hasNextPage: Boolean(record.hasNextPage ?? page < totalPages),
    hasPreviousPage: Boolean(record.hasPreviousPage ?? page > 1),
  };
}

function normalizeSummary(value: unknown): FinanceSummary {
  const record = asRecord(unwrapData(value));
  const income = Number(record.income ?? record.totalIncome ?? record.total_income ?? 0);
  const expense = Number(record.expense ?? record.totalExpense ?? record.total_expense ?? 0);
  return {
    income,
    expense,
    balance: Number(record.balance ?? record.totalBalance ?? income - expense),
  };
}

async function invalidateFinanceData(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: financeKeys.categories }),
    queryClient.invalidateQueries({ queryKey: financeKeys.transactions }),
    queryClient.invalidateQueries({ queryKey: financeKeys.summaries }),
  ]);
}

export const financeKeys = {
  categories: ['finance', 'categories'] as const,
  category: (id: string) => ['finance', 'categories', id] as const,
  transactions: ['finance', 'transactions'] as const,
  transactionList: (query: FindAllTransactionsQuery = {}) =>
    [...financeKeys.transactions, query] as const,
  transaction: (id: string) => ['finance', 'transaction', id] as const,
  summaries: ['finance', 'summary'] as const,
  summary: (range: TransactionDateRange = {}) =>
    [...financeKeys.summaries, range] as const,
  monthlySummaries: (ranges: TransactionDateRange[]) =>
    [...financeKeys.summaries, 'monthly', ranges] as const,
};

export const financeService = {
  async findCategories(signal?: AbortSignal): Promise<Category[]> {
    const response = await apiFetch<ApiEnvelope<unknown> | unknown[]>(
      CATEGORIES_ENDPOINT,
      { method: 'GET', signal },
    );
    const data = unwrapData(response);
    if (!Array.isArray(data)) throw new Error('Daftar kategori dari API tidak valid.');
    return data.map(normalizeCategory);
  },

  async findCategoryById(id: string, signal?: AbortSignal): Promise<Category> {
    const response = await apiFetch<unknown>(
      `${CATEGORIES_ENDPOINT}/${encodeURIComponent(id)}`,
      { method: 'GET', signal },
    );
    return normalizeCategory(unwrapData(response));
  },

  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    const response = await apiFetch<unknown>(CATEGORIES_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeCategory(unwrapData(response));
  },

  async updateCategory(
    id: string,
    payload: UpdateCategoryPayload,
  ): Promise<Category> {
    const response = await apiFetch<unknown>(
      `${CATEGORIES_ENDPOINT}/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    );
    return normalizeCategory(unwrapData(response));
  },

  removeCategory(id: string): Promise<unknown> {
    return apiFetch(`${CATEGORIES_ENDPOINT}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async findTransactions(
    query: FindAllTransactionsQuery = {},
    signal?: AbortSignal,
  ): Promise<TransactionPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = buildQueryString({
      page,
      limit,
      type: query.type,
      categoryId: query.categoryId,
      from: query.from,
      to: query.to,
      search: query.search?.trim() || undefined,
    });
    const response = await apiFetch<unknown>(`${TRANSACTIONS_ENDPOINT}${search}`, {
      method: 'GET',
      signal,
    });
    const envelope = Array.isArray(response) ? undefined : asRecord(response);
    const data = Array.isArray(response) ? response : envelope?.data;
    if (!Array.isArray(data)) throw new Error('Daftar transaksi dari API tidak valid.');
    return {
      data: data.map(normalizeTransaction),
      meta: normalizePageMeta(envelope?.meta, data.length, page, limit),
    };
  },

  async findTransactionById(id: string, signal?: AbortSignal): Promise<Transaction> {
    const response = await apiFetch<unknown>(
      `${TRANSACTIONS_ENDPOINT}/${encodeURIComponent(id)}`,
      { method: 'GET', signal },
    );
    return normalizeTransaction(unwrapData(response));
  },

  async createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
    const response = await apiFetch<unknown>(TRANSACTIONS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeTransaction(unwrapData(response));
  },

  async updateTransaction(
    id: string,
    payload: UpdateTransactionPayload,
  ): Promise<Transaction> {
    const response = await apiFetch<unknown>(
      `${TRANSACTIONS_ENDPOINT}/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    );
    return normalizeTransaction(unwrapData(response));
  },

  removeTransaction(id: string): Promise<unknown> {
    return apiFetch(`${TRANSACTIONS_ENDPOINT}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async getSummary(
    range: TransactionDateRange = {},
    signal?: AbortSignal,
  ): Promise<FinanceSummary> {
    const query = buildQueryString({ from: range.from, to: range.to });
    const response = await apiFetch<unknown>(`${SUMMARY_ENDPOINT}${query}`, {
      method: 'GET',
      signal,
    });
    return normalizeSummary(response);
  },
};

export const financeQueryOptions = {
  categories: () =>
    queryOptions({
      queryKey: financeKeys.categories,
      queryFn: ({ signal }) => financeService.findCategories(signal),
    }),
  transactions: (query: FindAllTransactionsQuery = {}) =>
    queryOptions({
      queryKey: financeKeys.transactionList(query),
      queryFn: ({ signal }) => financeService.findTransactions(query, signal),
      placeholderData: keepPreviousData,
    }),
  summary: (range: TransactionDateRange = {}) =>
    queryOptions({
      queryKey: financeKeys.summary(range),
      queryFn: ({ signal }) => financeService.getSummary(range, signal),
    }),
  monthlySummaries: (ranges: TransactionDateRange[]) =>
    queryOptions({
      queryKey: financeKeys.monthlySummaries(ranges),
      queryFn: ({ signal }) =>
        Promise.all(ranges.map((range) => financeService.getSummary(range, signal))),
      enabled: ranges.length > 0,
    }),
};

export function useCategoriesQuery() {
  return useQuery(financeQueryOptions.categories());
}

export function useTransactionsQuery(query: FindAllTransactionsQuery = {}) {
  return useQuery(financeQueryOptions.transactions(query));
}

export function useFinanceSummaryQuery(range: TransactionDateRange = {}) {
  return useQuery(financeQueryOptions.summary(range));
}

export function useMonthlySummariesQuery(ranges: TransactionDateRange[]) {
  return useQuery(financeQueryOptions.monthlySummaries(ranges));
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => financeService.createCategory(payload),
    onSuccess: () => invalidateFinanceData(queryClient),
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) =>
      financeService.updateCategory(id, payload),
    onSuccess: () => invalidateFinanceData(queryClient),
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeService.removeCategory(id),
    onSuccess: () => invalidateFinanceData(queryClient),
  });
}

export function useCreateTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) => financeService.createTransaction(payload),
    onSuccess: () => invalidateFinanceData(queryClient),
  });
}

export function useUpdateTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTransactionPayload }) =>
      financeService.updateTransaction(id, payload),
    onSuccess: () => invalidateFinanceData(queryClient),
  });
}

export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeService.removeTransaction(id),
    onSuccess: () => invalidateFinanceData(queryClient),
  });
}
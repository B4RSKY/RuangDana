'use client';

import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  Ellipsis,
  LayoutDashboard,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  financeService,
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateTransactionMutation,
  useDeleteCategoryMutation,
  useDeleteTransactionMutation,
  useFinanceSummaryQuery,
  useMonthlySummariesQuery,
  useTransactionsQuery,
  useUpdateCategoryMutation,
  useUpdateTransactionMutation,
} from '@/services/finance.service';
import type {
  Category,
  Transaction,
  TransactionType,
} from '@/types/finance';

type View = 'overview' | 'transactions' | 'categories';

interface TransactionDraft {
  title: string;
  amount: string;
  type: TransactionType;
  description: string;
  transactionDate: string;
  categoryId: string;
}

const EMPTY_DRAFT: TransactionDraft = {
  title: '',
  amount: '',
  type: 'expense',
  description: '',
  transactionDate: toDateInputValue(new Date()),
  categoryId: '',
};

function toDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export function FinanceWorkspace() {
  const [view, setView] = useState<View>('overview');
  const [editor, setEditor] = useState<'transaction' | 'category' | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [draft, setDraft] = useState<TransactionDraft>(EMPTY_DRAFT);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<TransactionType>('expense');
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const transactionQuery = useTransactionsQuery({
    page: view === 'overview' ? 1 : page,
    limit: view === 'overview' ? 5 : 10,
    type: typeFilter === 'all' ? undefined : typeFilter,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    search: search.trim() || undefined,
  });
  const categoryQuery = useCategoriesQuery();
  const summaryQuery = useFinanceSummaryQuery({
    from: dateFrom || undefined,
    to: dateTo || undefined,
  });
  const [monthlyAnchor] = useState(() => new Date());
  const monthlyRanges = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const month = new Date(
          monthlyAnchor.getFullYear(),
          monthlyAnchor.getMonth() - 5 + index,
          1,
        );
        const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        return {
          from: toDateInputValue(month),
          to: toDateInputValue(nextMonth),
        };
      }),
    [monthlyAnchor],
  );
  const monthlySummaryQuery = useMonthlySummariesQuery(monthlyRanges);
  const createCategoryMutation = useCreateCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const createTransactionMutation = useCreateTransactionMutation();
  const updateTransactionMutation = useUpdateTransactionMutation();
  const deleteTransactionMutation = useDeleteTransactionMutation();

  const categories = categoryQuery.data ?? [];
  const transactions = transactionQuery.data?.data ?? [];
  const pageMeta = transactionQuery.data?.meta;
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const totals = summaryQuery.data ?? { income: 0, expense: 0, balance: 0 };
  const filteredTransactions = transactions;

  const monthlyData = monthlyRanges.map((range, index) => {
    const date = new Date(`${range.from}T00:00:00`);
    const summary = monthlySummaryQuery.data?.[index];
    return {
      key: range.from,
      label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
      income: summary?.income ?? 0,
      expense: summary?.expense ?? 0,
    };
  });

  const chartMaximum = Math.max(1, ...monthlyData.map((item) => Math.max(item.income, item.expense)));
  const apiError =
    transactionQuery.error ??
    categoryQuery.error ??
    summaryQuery.error ??
    monthlySummaryQuery.error;

  async function openTransactionEditor(transaction?: Transaction) {
    setFormError('');
    setEditingTransaction(transaction ?? null);
    setDraft(
      transaction
        ? {
            title: transaction.title,
            amount: String(transaction.amount),
            type: transaction.type,
            description: transaction.description,
            transactionDate: transaction.transactionDate,
            categoryId: transaction.categoryId,
          }
        : { ...EMPTY_DRAFT, transactionDate: toDateInputValue(new Date()) },
    );
    setEditor('transaction');
    if (transaction) {
      try {
        const latestTransaction = await financeService.findTransactionById(transaction.id);
        setEditingTransaction(latestTransaction);
        setDraft({
          title: latestTransaction.title,
          amount: String(latestTransaction.amount),
          type: latestTransaction.type,
          description: latestTransaction.description,
          transactionDate: latestTransaction.transactionDate,
          categoryId: latestTransaction.categoryId,
        });
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Gagal memuat transaksi.');
      }
    }
  }

  async function openCategoryEditor(category?: Category) {
    setFormError('');
    setEditingCategory(category ?? null);
    setCategoryName(category?.name ?? '');
    setCategoryType(category?.type ?? 'expense');
    setEditor('category');
    if (category) {
      try {
        const latestCategory = await financeService.findCategoryById(category.id);
        setEditingCategory(latestCategory);
        setCategoryName(latestCategory.name);
        setCategoryType(latestCategory.type);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Gagal memuat kategori.');
      }
    }
  }

  async function saveTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(draft.amount);
    const category = categoryById.get(draft.categoryId);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Nominal harus lebih besar dari 0.');
      return;
    }
    if (!category || category.type !== draft.type) {
      setFormError('Pilih kategori yang sesuai dengan jenis transaksi.');
      return;
    }

    const categoryId = Number(draft.categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setFormError('ID kategori dari backend tidak valid.');
      return;
    }

    const payload = {
      title: draft.title.trim(),
      amount,
      type: draft.type,
      description: draft.description.trim(),
      transactionDate: draft.transactionDate,
      categoryId,
    };
    try {
      if (editingTransaction) {
        await updateTransactionMutation.mutateAsync({
          id: editingTransaction.id,
          payload,
        });
      } else {
        await createTransactionMutation.mutateAsync(payload);
      }
      setEditor(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gagal menyimpan transaksi.');
    }
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          payload: { name, type: categoryType },
        });
      } else {
        await createCategoryMutation.mutateAsync({ name, type: categoryType });
      }
      setEditor(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gagal menyimpan kategori.');
    }
  }

  async function removeTransaction(transaction: Transaction) {
    if (!window.confirm(`Hapus transaksi “${transaction.title}”?`)) return;
    try {
      await deleteTransactionMutation.mutateAsync(transaction.id);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gagal menghapus transaksi.');
    }
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`Hapus kategori “${category.name}”?`)) return;
    try {
      await deleteCategoryMutation.mutateAsync(category.id);
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gagal menghapus kategori.');
    }
  }

  const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: ArrowDownLeft },
    { id: 'categories', label: 'Kategori', icon: Ellipsis },
  ];

  return (
    <div className="min-h-dvh bg-[#f4f6f2] text-[#202923]">
      <header className="border-b border-[#e1e7df] bg-white">
        <div className="mx-auto flex max-w-330 flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#main" className="flex items-center gap-3" aria-label="RuangDana beranda">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#173f32] text-[#d9f36a]">
              <Wallet className="size-5" aria-hidden="true" />
            </span>
            <span className="text-[19px] font-bold tracking-[0.01em]">RuangDana</span>
          </a>
          <nav aria-label="Navigasi utama" className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  aria-current={view === item.id ? 'page' : undefined}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${view === item.id ? 'bg-[#eaf2e8] text-[#173f32]' : 'text-[#6b756d] hover:bg-[#f4f6f2] hover:text-[#202923]'}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <Button size="sm" onClick={() => openTransactionEditor()}>
            <Plus aria-hidden="true" />
            <span>Tambah transaksi</span>
          </Button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-330 px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.12em] text-[#718078] uppercase">
              {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date())}
            </p>
            <h1 className="text-3xl leading-tight font-semibold sm:text-[38px]">
              {view === 'overview' ? 'Ringkasan keuangan' : view === 'transactions' ? 'Transaksi' : 'Kategori'}
            </h1>
            <p className="mt-2 text-sm text-[#68746c]">
              {view === 'overview'
                ? 'Pantau arus uang masuk dan keluar.'
                : view === 'transactions'
                  ? 'Catat dan telusuri semua aktivitas keuangan.'
                  : 'Atur kelompok untuk setiap pemasukan dan pengeluaran.'}
            </p>
          </div>
          <p className="text-xs text-[#7b857d]">Data dari backend API</p>
        </div>

        {apiError && (
          <p role="alert" className="mb-5 rounded-lg border border-[#e7b6ac] bg-[#fff4f1] px-4 py-3 text-sm text-[#9f4638]">
            {apiError instanceof Error ? apiError.message : 'Gagal memuat data dari backend.'}
          </p>
        )}
        {!editor && formError && (
          <p role="alert" className="mb-5 rounded-lg border border-[#e7b6ac] bg-[#fff4f1] px-4 py-3 text-sm text-[#9f4638]">
            {formError}
          </p>
        )}

        {view !== 'categories' && (
          <section aria-label="Ringkasan saldo" className="mb-7 grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Saldo saat ini"
              amount={totals.balance}
              icon={<Wallet className="size-5" aria-hidden="true" />}
              className="bg-[#173f32] text-white"
              detail="Pemasukan dikurangi pengeluaran"
            />
            <SummaryCard
              label="Total pemasukan"
              amount={totals.income}
              icon={<ArrowDownLeft className="size-5" aria-hidden="true" />}
              className="bg-white text-[#202923]"
              detail="Akumulasi seluruh transaksi masuk"
              amountClassName="text-[#217a57]"
            />
            <SummaryCard
              label="Total pengeluaran"
              amount={totals.expense}
              icon={<ArrowUpRight className="size-5" aria-hidden="true" />}
              className="bg-white text-[#202923]"
              detail="Akumulasi seluruh transaksi keluar"
              amountClassName="text-[#c05a48]"
            />
          </section>
        )}

        {view === 'overview' && (
          <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-xl border border-[#e1e7df] bg-white p-5 sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Arus kas bulanan</h2>
                  <p className="mt-1 text-sm text-[#78827a]">Perbandingan pemasukan dan pengeluaran</p>
                </div>
                <ChartNoAxesColumnIncreasing className="size-5 text-[#6c7d72]" aria-hidden="true" />
              </div>
              <div className="grid h-52 grid-cols-6 items-end gap-3 border-b border-[#e9ede8] pb-2 sm:gap-6">
                {monthlyData.map((month) => (
                  <div key={month.key} className="flex h-full flex-col items-center justify-end gap-2">
                    <div className="flex h-41.25 w-full items-end justify-center gap-1.5">
                      <div
                        title={`Pemasukan ${formatCurrency(month.income)}`}
                        className="w-3 rounded-t-sm bg-[#8dc9a3] sm:w-5"
                        style={{ height: `${month.income ? Math.max(3, (month.income / chartMaximum) * 100) : 0}%` }}
                      />
                      <div
                        title={`Pengeluaran ${formatCurrency(month.expense)}`}
                        className="w-3 rounded-t-sm bg-[#e7a08e] sm:w-5"
                        style={{ height: `${month.expense ? Math.max(3, (month.expense / chartMaximum) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#78827a]">{month.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-5 text-xs text-[#69756d]">
                <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[#8dc9a3]" />Pemasukan</span>
                <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-[#e7a08e]" />Pengeluaran</span>
              </div>
            </section>

            <section className="rounded-xl border border-[#e1e7df] bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Transaksi terbaru</h2>
                  <p className="mt-1 text-sm text-[#78827a]">Aktivitas terakhir yang dicatat</p>
                </div>
                <button type="button" onClick={() => setView('transactions')} className="text-sm font-semibold text-[#28634d] hover:underline">Lihat semua</button>
              </div>
              {transactionQuery.isLoading ? (
                <EmptyState title="Memuat transaksi" detail="Mengambil data terbaru dari backend." />
              ) : transactions.length ? (
                <TransactionList
                  transactions={[...transactions].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)).slice(0, 5)}
                  categories={categoryById}
                  onEdit={openTransactionEditor}
                  onDelete={removeTransaction}
                />
              ) : (
                <EmptyState title="Belum ada transaksi" detail="Catat pemasukan atau pengeluaran pertama untuk mulai mengisi ringkasan." />
              )}
            </section>
          </div>
        )}

        {view === 'transactions' && (
          <section className="overflow-hidden rounded-xl border border-[#e1e7df] bg-white">
            <div className="grid gap-3 border-b border-[#e8ece7] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(190px,1fr)_150px_180px_155px_155px]">
              <label className="relative">
                <span className="sr-only">Cari transaksi</span>
                <Search className="absolute top-3 left-3 size-4 text-[#89938b]" aria-hidden="true" />
                <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari transaksi..." className="h-10 w-full rounded-lg border border-[#dfe5de] bg-white pr-3 pl-9 text-sm outline-none focus:border-[#3e7d5f]" />
              </label>
              <label>
                <span className="sr-only">Jenis transaksi</span>
                <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as 'all' | TransactionType); setCategoryFilter('all'); setPage(1); }} className="h-10 w-full rounded-lg border border-[#dfe5de] bg-white px-3 text-sm">
                  <option value="all">Semua jenis</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Kategori</span>
                <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-[#dfe5de] bg-white px-3 text-sm">
                  <option value="all">Semua kategori</option>
                  {categories.filter((category) => typeFilter === 'all' || category.type === typeFilter).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="relative">
                <span className="sr-only">Dari tanggal</span>
                <CalendarDays className="pointer-events-none absolute top-3 left-3 size-4 text-[#89938b]" aria-hidden="true" />
                <input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} aria-label="Dari tanggal" className="h-10 w-full rounded-lg border border-[#dfe5de] bg-white px-3 pl-9 text-xs" />
              </label>
              <label className="relative">
                <span className="sr-only">Sampai tanggal</span>
                <CalendarDays className="pointer-events-none absolute top-3 left-3 size-4 text-[#89938b]" aria-hidden="true" />
                <input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} aria-label="Sampai tanggal" className="h-10 w-full rounded-lg border border-[#dfe5de] bg-white px-3 pl-9 text-xs" />
              </label>
            </div>
            {transactionQuery.isLoading ? (
              <EmptyState title="Memuat transaksi" detail="Mengambil data dari backend." />
            ) : filteredTransactions.length ? (
              <TransactionList transactions={filteredTransactions} categories={categoryById} onEdit={openTransactionEditor} onDelete={removeTransaction} />
            ) : (
              <EmptyState title="Transaksi tidak ditemukan" detail={transactions.length ? 'Coba ubah kata pencarian atau filter yang dipilih.' : 'Transaksi yang kamu tambahkan akan muncul di sini.'} />
            )}
            {pageMeta && pageMeta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#e8ece7] px-4 py-3 sm:px-5">
                <p className="text-xs text-[#78827a]">
                  Halaman {pageMeta.page} dari {pageMeta.totalPages} · {pageMeta.totalItems} transaksi
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="compact" variant="outline" disabled={!pageMeta.hasPreviousPage || transactionQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Sebelumnya</Button>
                  <Button type="button" size="compact" variant="outline" disabled={!pageMeta.hasNextPage || transactionQuery.isFetching} onClick={() => setPage((current) => current + 1)}>Berikutnya</Button>
                </div>
              </div>
            )}
          </section>
        )}

        {view === 'categories' && (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {(['income', 'expense'] as const).map((type) => {
              const items = categories.filter((category) => category.type === type);
              return (
                <section key={type} className="rounded-xl border border-[#e1e7df] bg-white">
                  <div className="flex items-center justify-between border-b border-[#e8ece7] px-5 py-4">
                    <div>
                      <h2 className="font-semibold">{type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</h2>
                      <p className="mt-1 text-xs text-[#78827a]">{items.length} kategori</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { openCategoryEditor(); setCategoryType(type); }}>
                      <Plus aria-hidden="true" /><span>Tambah</span>
                    </Button>
                  </div>
                  {categoryQuery.isLoading ? (
                    <EmptyState title="Memuat kategori" detail="Mengambil data dari backend." />
                  ) : items.length ? items.map((category) => {
                    return (
                      <div key={category.id} className="flex items-center justify-between gap-3 border-b border-[#edf0ec] px-5 py-4 last:border-b-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${type === 'income' ? 'bg-[#e6f3e8] text-[#28714d]' : 'bg-[#fbece7] text-[#b55b45]'}`}><CircleDollarSign className="size-4" aria-hidden="true" /></span>
                          <div className="min-w-0"><p className="truncate text-sm font-semibold">{category.name}</p><p className="mt-0.5 text-xs text-[#89938b]">{type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p></div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" title="Ubah kategori" aria-label={`Ubah kategori ${category.name}`} onClick={() => openCategoryEditor(category)} className="flex size-9 items-center justify-center rounded-lg text-[#68746c] hover:bg-[#f1f4ef]"><Pencil className="size-4" /></button>
                          <button type="button" title="Hapus kategori" aria-label={`Hapus kategori ${category.name}`} onClick={() => removeCategory(category)} className="flex size-9 items-center justify-center rounded-lg text-[#ad5144] hover:bg-[#fbece7]"><Trash2 className="size-4" /></button>
                        </div>
                      </div>
                    );
                  }) : <EmptyState title="Belum ada kategori" detail="Tambahkan kategori untuk mengelompokkan transaksi." />}
                </section>
              );
            })}
            {formError && <p role="alert" className="text-sm text-[#ad5144] lg:col-span-2">{formError}</p>}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-[#879188]">Data keuangan dikelola melalui backend Finance Management.</p>
      </main>

      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open) setEditor(null); }}>
        <DialogContent>
          {editor === 'transaction' ? (
            <form onSubmit={saveTransaction}>
              <DialogHeader>
                <div><DialogTitle>{editingTransaction ? 'Ubah transaksi' : 'Transaksi baru'}</DialogTitle><DialogDescription>Isi informasi transaksi keuangan.</DialogDescription></div>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <fieldset className="grid grid-cols-2 gap-2">
                  <legend className="mb-2 text-sm font-medium">Jenis transaksi</legend>
                  {(['income', 'expense'] as const).map((type) => (
                    <button key={type} type="button" onClick={() => setDraft((current) => ({ ...current, type, categoryId: '' }))} aria-pressed={draft.type === type} className={`min-h-11 rounded-lg border text-sm font-semibold ${draft.type === type ? 'border-[#28634d] bg-[#eaf2e8] text-[#173f32]' : 'border-[#dfe5de] text-[#68746c]'}`}>{type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</button>
                  ))}
                </fieldset>
                <FormField label="Nama transaksi"><input required maxLength={150} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Contoh: Belanja mingguan" className="form-control" /></FormField>
                <FormField label="Nominal (Rp)"><input required type="number" min="1" step="0.01" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0" className="form-control" /></FormField>
                <FormField label="Kategori"><select required value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))} className="form-control"><option value="">Pilih kategori</option>{categories.filter((category) => category.type === draft.type).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormField>
                <FormField label="Tanggal"><input required type="date" value={draft.transactionDate} onChange={(event) => setDraft((current) => ({ ...current, transactionDate: event.target.value }))} className="form-control" /></FormField>
                <FormField label="Keterangan (opsional)"><textarea maxLength={1000} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Tambahkan detail transaksi" className="form-control resize-y" /></FormField>
                {formError && <p role="alert" className="text-sm text-[#ad5144]">{formError}</p>}
              </DialogBody>
              <DialogFooter><DialogClose render={<Button type="button" variant="outline">Batal</Button>} /><Button type="submit">{editingTransaction ? 'Simpan perubahan' : 'Simpan transaksi'}</Button></DialogFooter>
            </form>
          ) : (
            <form onSubmit={saveCategory}>
              <DialogHeader><div><DialogTitle>{editingCategory ? 'Ubah kategori' : 'Kategori baru'}</DialogTitle><DialogDescription>Kelompokkan transaksi berdasarkan jenisnya.</DialogDescription></div></DialogHeader>
              <DialogBody className="space-y-4">
                <FormField label="Nama kategori"><input required maxLength={100} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Contoh: Kesehatan" className="form-control" /></FormField>
                <FormField label="Jenis"><select value={categoryType} onChange={(event) => setCategoryType(event.target.value as TransactionType)} className="form-control"><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select></FormField>
                {formError && <p role="alert" className="text-sm text-[#ad5144]">{formError}</p>}
              </DialogBody>
              <DialogFooter><DialogClose render={<Button type="button" variant="outline">Batal</Button>} /><Button type="submit">{editingCategory ? 'Simpan perubahan' : 'Simpan kategori'}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  icon,
  className,
  detail,
  amountClassName,
}: {
  label: string;
  amount: number;
  icon: React.ReactNode;
  className: string;
  detail: string;
  amountClassName?: string;
}) {
  return (
    <article className={`rounded-xl border border-[#e1e7df] p-5 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-black/5">{icon}</span>
      </div>
      <p className={`mt-5 wrap-break-word text-[27px] leading-tight font-semibold ${amountClassName ?? ''}`}>{formatCurrency(amount)}</p>
      <p className="mt-2 text-xs opacity-65">{detail}</p>
    </article>
  );
}

function TransactionList({
  transactions,
  categories,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  categories: Map<string, Category>;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  return (
    <div className="divide-y divide-[#edf0ec]">
      {transactions.map((transaction) => {
        const isIncome = transaction.type === 'income';
        return (
          <div key={transaction.id} className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isIncome ? 'bg-[#e6f3e8] text-[#28714d]' : 'bg-[#fbece7] text-[#b55b45]'}`}>
              {isIncome ? <ArrowDownLeft className="size-5" aria-hidden="true" /> : <ArrowDownRight className="size-5" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{transaction.title}</p>
              <p className="mt-1 truncate text-xs text-[#818b83]">{categories.get(transaction.categoryId)?.name ?? 'Tanpa kategori'} · {formatDate(transaction.transactionDate)}</p>
            </div>
            <p className={`shrink-0 text-right text-sm font-semibold ${isIncome ? 'text-[#28714d]' : 'text-[#b55b45]'}`}>
              {isIncome ? '+' : '−'}{formatCurrency(transaction.amount)}
            </p>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" title="Ubah transaksi" aria-label={`Ubah ${transaction.title}`} onClick={() => onEdit(transaction)} className="flex size-8 items-center justify-center rounded-lg text-[#68746c] hover:bg-[#f1f4ef]"><Pencil className="size-4" /></button>
              <button type="button" title="Hapus transaksi" aria-label={`Hapus ${transaction.title}`} onClick={() => onDelete(transaction)} className="flex size-8 items-center justify-center rounded-lg text-[#ad5144] hover:bg-[#fbece7]"><Trash2 className="size-4" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#f0f3ef] text-[#66766c]"><CircleDollarSign className="size-5" aria-hidden="true" /></span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[#7c877f]">{detail}</p>
    </div>
  );
}

function FormField({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="block space-y-1.5 text-sm font-medium">{label}{children}</label>;
}
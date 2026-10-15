export type Language = 'en' | 'uz';
export type DisplayCurrency = 'UZS' | 'USD';
export type LoanTransactionKind = 'GIVE' | 'RETURN';
export type ExpectedIncomeStatus = 'UPCOMING' | 'OVERDUE' | 'PARTIAL' | 'RECEIVED';

export type AppSettings = {
  language: Language;
  displayCurrency: DisplayCurrency;
  usdRateUzs: number;
  openingBalance: number;
  openingDate: string;
  quickEntryOnUnlock: boolean;
  lockTimeoutMinutes: 0 | 1 | 5 | 15;
  biometricEnabled: boolean;
  onboardingCompleted: boolean;
  lastBackupAt: string | null;
  changesSinceBackup: number;
  lastUsedCategoryId: string | null;
};

export type Category = {
  id: string;
  nameEn: string;
  nameUz: string;
  descriptionEn: string | null;
  descriptionUz: string | null;
  color: string;
  useCount: number;
  createdAt: string;
};

export type Expense = {
  id: string;
  amount: number;
  title: string;
  note: string | null;
  date: string;
  categoryId: string | null;
  categoryNameEn: string | null;
  categoryNameUz: string | null;
  categoryColor: string | null;
  createdAt: string;
};

export type Income = {
  id: string;
  amount: number;
  title: string;
  note: string | null;
  date: string;
  projectId: string | null;
  createdAt: string;
};

export type LoanPerson = {
  id: string;
  name: string;
  note: string | null;
  balance: number;
  createdAt: string;
};

export type LoanTransaction = {
  id: string;
  personId: string;
  kind: LoanTransactionKind;
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
};

export type LoanProject = {
  id: string;
  name: string;
  borrower: string | null;
  note: string | null;
  upcomingAmount: number;
  overdueAmount: number;
  createdAt: string;
};

export type ExpectedIncome = {
  id: string;
  projectId: string;
  amount: number;
  dueDate: string;
  status: ExpectedIncomeStatus;
  note: string | null;
  createdAt: string;
};

export type Dashboard = {
  wallet: number;
  income: number;
  expenses: number;
  loansGiven: number;
  loansReturned: number;
  upcoming: number;
  overdue: number;
  recent: {
    id: string;
    kind: 'expense' | 'income' | 'give' | 'return';
    title: string;
    amount: number;
    date: string;
  }[];
  breakdown: { key: string; label: string; income: number; expenses: number }[];
};

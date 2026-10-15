import type { Language } from '@/domain/types';

const en = {
  overview: 'Overview', expenses: 'Expenses', income: 'Income', loans: 'Loans', settings: 'Settings',
  walletBalance: 'Wallet balance', quickExpense: 'Quick expense', amount: 'Amount', category: 'Category',
  saveExpense: 'Save expense', moreDetails: 'More details', title: 'Title', note: 'Note', date: 'Date',
  search: 'Search', all: 'All', addIncome: 'Add income', people: 'People', projects: 'Projects',
  give: 'Give', returned: 'Returned', upcoming: 'Upcoming', overdue: 'Overdue', partial: 'Partial',
  received: 'Received', emptyExpenses: 'No expenses yet', emptyIncome: 'No income yet',
  emptyLoans: 'No loans yet', categories: 'Categories', security: 'Security', backups: 'Backup & restore',
  language: 'Language', currency: 'Display currency', usdRate: 'USD rate in UZS', openingBalance: 'Opening balance',
  quickAfterUnlock: 'Open quick expense after unlock', lockTimeout: 'Background lock', appInfo: 'App information',
  exportEncrypted: 'Encrypted backup', exportJson: 'Plain JSON export', importBackup: 'Import backup',
  privacyTitle: 'Private by design', privacyBody: 'Your records stay on this phone. There is no account, cloud sync, analytics, or runtime backend.',
  createPin: 'Create a 4-digit PIN', confirmPin: 'Confirm PIN', currentWallet: 'Current wallet balance',
  continue: 'Continue', useBiometrics: 'Use phone unlock', unlock: 'Unlock My Money Manager', wrongPin: 'Incorrect PIN',
  useFingerprint: 'Use phone unlock', recent: 'Recent activity', thisMonth: 'This month', totalIncome: 'Income',
  totalExpenses: 'Expenses', activeLoans: 'Loans out', add: 'Add', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
  name: 'Name', borrower: 'Borrower', dueDate: 'Due date', recordPayment: 'Record payment', paymentAmount: 'Payment amount',
  undo: 'Undo', saved: 'Expense saved', backupReminder: 'Your data has changed. Make a backup to keep it safe.',
  daily: 'Day', weekly: 'Week', monthly: 'Month', custom: 'Custom', from: 'From', to: 'To',
  previousPeriod: 'Previous period', nextPeriod: 'Next period', periodSummary: 'Period summary', net: 'Net',
  categoryEnglish: 'English title', categoryUzbek: 'Uzbek title', descriptionEnglish: 'English description', descriptionUzbek: 'Uzbek description',
  optional: 'Optional', uses: 'uses', done: 'Done', changePin: 'Change PIN', phoneUnlockHelp: 'Fingerprint, face, or your Android screen lock',
};

const uz: typeof en = {
  overview: 'Umumiy', expenses: 'Xarajatlar', income: 'Kirim', loans: 'Qarzlar', settings: 'Sozlamalar',
  walletBalance: 'Hamyon balansi', quickExpense: 'Tez xarajat', amount: 'Miqdor', category: 'Kategoriya',
  saveExpense: 'Xarajatni saqlash', moreDetails: 'Batafsil', title: 'Nomi', note: 'Izoh', date: 'Sana',
  search: 'Qidirish', all: 'Barchasi', addIncome: 'Kirim qo‘shish', people: 'Odamlar', projects: 'Loyihalar',
  give: 'Berildi', returned: 'Qaytarildi', upcoming: 'Kutilmoqda', overdue: 'Kechikkan', partial: 'Qisman',
  received: 'Olindi', emptyExpenses: 'Hozircha xarajat yo‘q', emptyIncome: 'Hozircha kirim yo‘q',
  emptyLoans: 'Hozircha qarz yo‘q', categories: 'Kategoriyalar', security: 'Xavfsizlik', backups: 'Nusxa va tiklash',
  language: 'Til', currency: 'Ko‘rsatish valyutasi', usdRate: 'USD kursi (UZS)', openingBalance: 'Boshlang‘ich balans',
  quickAfterUnlock: 'Qulf ochilganda tez xarajat', lockTimeout: 'Fon qulfi', appInfo: 'Ilova haqida',
  exportEncrypted: 'Shifrlangan nusxa', exportJson: 'Oddiy JSON eksport', importBackup: 'Nusxani import qilish',
  privacyTitle: 'Maxfiylik birinchi o‘rinda', privacyBody: 'Barcha ma’lumotlar shu telefonda qoladi. Hisob, bulut sinxronizatsiyasi, analitika yoki server yo‘q.',
  createPin: '4 xonali PIN yarating', confirmPin: 'PINni tasdiqlang', currentWallet: 'Joriy hamyon balansi',
  continue: 'Davom etish', useBiometrics: 'Telefon qulfi bilan ochish', unlock: 'My Money Manager’ni ochish', wrongPin: 'PIN noto‘g‘ri',
  useFingerprint: 'Telefon qulfi bilan ochish', recent: 'So‘nggi harakatlar', thisMonth: 'Bu oy', totalIncome: 'Kirim',
  totalExpenses: 'Xarajat', activeLoans: 'Berilgan qarz', add: 'Qo‘shish', cancel: 'Bekor qilish', delete: 'O‘chirish', edit: 'Tahrirlash',
  name: 'Nomi', borrower: 'Qarz oluvchi', dueDate: 'To‘lov sanasi', recordPayment: 'To‘lovni qayd etish', paymentAmount: 'To‘lov miqdori',
  undo: 'Bekor qilish', saved: 'Xarajat saqlandi', backupReminder: 'Ma’lumotlar o‘zgardi. Xavfsizlik uchun nusxa yarating.',
  daily: 'Kun', weekly: 'Hafta', monthly: 'Oy', custom: 'Oraliq', from: 'Boshlanish', to: 'Tugash',
  previousPeriod: 'Oldingi davr', nextPeriod: 'Keyingi davr', periodSummary: 'Davr hisoboti', net: 'Farq',
  categoryEnglish: 'Inglizcha nomi', categoryUzbek: 'O‘zbekcha nomi', descriptionEnglish: 'Inglizcha tavsif', descriptionUzbek: 'O‘zbekcha tavsif',
  optional: 'Ixtiyoriy', uses: 'ishlatilgan', done: 'Tayyor', changePin: 'PINni almashtirish', phoneUnlockHelp: 'Barmoq izi, yuz yoki Android ekran qulfi',
};

export type TranslationKey = keyof typeof en;
export const translations = { en, uz } satisfies Record<Language, typeof en>;

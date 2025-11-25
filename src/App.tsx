import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { UserDropdown, DateDropdowns } from './components/Dropdown';
import { UserModal, SettingsModal, TransactionModal, AlertModal } from './components/Modal';
import { useAppContext } from './AppContext';
import type { Transaction } from './types';

function App() {
  const { users, selectedUser, setSelectedUser, mainUser, transactionsByMonth, tags } = useAppContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // 選択された年月のキーを生成
  const getMonthKey = (year: number, month: number) => `${year}-${month.toString().padStart(2, '0')}`;

  // 選択された月の収支を取得
  const transactions = transactionsByMonth[getMonthKey(selectedYear, selectedMonth)] || [];
  const [displayPeriod, setDisplayPeriod] = useState<'thisMonth' | 'selectedMonth' | 'selectedYear'>('thisMonth');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // 今月のキー
  const thisMonthKey = getMonthKey(new Date().getFullYear(), new Date().getMonth() + 1);

  // タグでフィルターする関数（カスタムタグのみ、支出/収入は除外）
  const filterByCustomTag = (txns: Transaction[], tag: string | null) => {
    if (tag === null || tag === 'expense' || tag === 'income') return txns;
    return txns.filter(t => t.tag === tag);
  };

  // 今月の集計を計算
  const thisMonthTotals = useMemo(() => {
    const monthTransactions = filterByCustomTag(transactionsByMonth[thisMonthKey] || [], filterTag);
    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    return { expense, income, balance: income - expense };
  }, [transactionsByMonth, thisMonthKey, filterTag]);

  // 選択月の集計を計算
  const selectedMonthTotals = useMemo(() => {
    const monthTransactions = filterByCustomTag(transactions, filterTag);
    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    return { expense, income, balance: income - expense };
  }, [transactions, filterTag]);

  // 選択年の集計を計算
  const selectedYearTotals = useMemo(() => {
    const yearPrefix = `${selectedYear}-`;
    const yearTransactions = filterByCustomTag(
      Object.entries(transactionsByMonth)
        .filter(([key]) => key.startsWith(yearPrefix))
        .flatMap(([, txns]) => txns),
      filterTag
    );
    const expense = yearTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const income = yearTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    return { expense, income, balance: income - expense };
  }, [transactionsByMonth, selectedYear, filterTag]);

  // 表示期間に応じた集計を取得
  const displayTotals = useMemo(() => {
    switch (displayPeriod) {
      case 'thisMonth': return thisMonthTotals;
      case 'selectedMonth': return selectedMonthTotals;
      case 'selectedYear': return selectedYearTotals;
    }
  }, [displayPeriod, thisMonthTotals, selectedMonthTotals, selectedYearTotals]);

  // 現在の残高を計算（初期残高 + 全収支の合計）
  const currentBalance = useMemo(() => {
    const user = users.find(u => u.name === selectedUser);
    const initialBalance = user?.balance || 0;
    const allTransactions = Object.values(transactionsByMonth).flat();
    const totalBalance = allTransactions.reduce((sum, t) => {
      return t.type === 'income' ? sum + t.amount : sum - t.amount;
    }, 0);
    return initialBalance + totalBalance;
  }, [users, selectedUser, transactionsByMonth]);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

  const handleAddTransaction = () => {
    setEditingTransaction(undefined);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(undefined);
  };

  // フィルター済みのトランザクション
  const filteredTransactions = useMemo(() => {
    if (filterTag === null) return transactions;
    if (filterTag === 'expense' || filterTag === 'income') {
      return transactions.filter(t => !t.tag && t.type === filterTag);
    }
    return transactions.filter(t => t.tag === filterTag);
  }, [transactions, filterTag]);

  // タグをクリックしてフィルター
  const handleTagClick = (e: React.MouseEvent, tagName: string | undefined, type: 'expense' | 'income') => {
    e.stopPropagation();
    const clickedTag = tagName || type;
    setFilterTag(prev => prev === clickedTag ? null : clickedTag);
  };

  const cyclePeriod = () => {
    setDisplayPeriod(prev => {
      if (prev === 'thisMonth') return 'selectedMonth';
      if (prev === 'selectedMonth') return 'selectedYear';
      return 'thisMonth';
    });
  };

  const getPeriodLabel = () => {
    let period = '';
    switch (displayPeriod) {
      case 'thisMonth': period = '今月'; break;
      case 'selectedMonth': period = '選択月'; break;
      case 'selectedYear': period = '選択年'; break;
    }
    // タグでフィルター中で、支出/収入以外の場合はタグ名を追加
    if (filterTag && filterTag !== 'expense' && filterTag !== 'income') {
      return `${period}の${filterTag}`;
    }
    return period;
  };

  useEffect(() => {
    if (users.length === 0) {
      setIsModalOpen(true);
    } else if (mainUser && users.some(u => u.name === mainUser)) {
      setSelectedUser(mainUser);
    }
  }, []);

  return (
    <div>
      <header className="header">
        <img src="/favicon.svg" alt="Logo" width="32" height="32" />
        <span className="header-title">Money Tracker</span>
        <div className="header-controls">
          <UserDropdown users={users} value={selectedUser} onChange={setSelectedUser} />
          <button onClick={() => setIsModalOpen(true)} className="create-button">
            新規作成
          </button>
          <button className="settings-button" onClick={() => setIsSettingsOpen(true)}>設定</button>
        </div>
      </header>

      <main className="main-content">
        {!selectedUser && users.length > 0 && (
          <p className="select-user-message">ユーザーを選択するか新規作成してください</p>
        )}
        {selectedUser && (
          <>
            <div className="balance-row">
              <div className="balance-display">
                <p className="balance-label">現在の残高</p>
                <p className="balance-amount">{currentBalance.toLocaleString()}</p>
                <span className="currency-unit">円</span>
              </div>
              <div className="balance-display clickable" onClick={cyclePeriod}>
                <p className="balance-label">{getPeriodLabel()}の支出</p>
                <p className="balance-amount expense">{displayTotals.expense.toLocaleString()}</p>
                <span className="currency-unit">円</span>
              </div>
              <div className="balance-display clickable" onClick={cyclePeriod}>
                <p className="balance-label">{getPeriodLabel()}の収入</p>
                <p className="balance-amount income">{displayTotals.income.toLocaleString()}</p>
                <span className="currency-unit">円</span>
              </div>
              <div className="balance-display clickable" onClick={cyclePeriod}>
                <p className="balance-label">{getPeriodLabel()}の収支</p>
                <p className={`balance-amount ${displayTotals.balance < 0 ? 'expense' : displayTotals.balance > 0 ? 'income' : ''}`}>
                  {displayTotals.balance.toLocaleString()}
                </p>
                <span className="currency-unit">円</span>
              </div>
            </div>
            <div className="table-wrapper">
              <div className="date-row">
                <div className="date-selector">
                  <DateDropdowns year={selectedYear} month={selectedMonth} onYearChange={setSelectedYear} onMonthChange={setSelectedMonth} />
                </div>
                <button className="add-button" onClick={handleAddTransaction}>追加</button>
              </div>
              <div className="table-header-row">
                <table className="transaction-table">
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>項目名</th>
                      <th>金額</th>
                      <th>
                        タグ
                        {filterTag && (
                          <button className="filter-clear-button" onClick={() => setFilterTag(null)}>×</button>
                        )}
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              <div className="table-body-scroll">
                <table className="transaction-table">
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="no-data">{filterTag ? 'フィルター結果がありません' : 'データがありません'}</td>
                      </tr>
                    ) : (
                      (() => {
                        const sorted = [...filteredTransactions].sort((a, b) => a.date - b.date || a.id - b.id);
                        let lastDate = -1;
                        return sorted.map(t => {
                          const showDate = t.date !== lastDate;
                          lastDate = t.date;
                          const tagData = t.tag ? tags.find(tag => tag.name === t.tag) : null;
                          const isFiltered = filterTag === (t.tag || t.type);
                          return (
                            <tr key={t.id} className="clickable" onClick={() => handleEditTransaction(t)}>
                              <td>{showDate ? `${t.date}日` : ''}</td>
                              <td>{t.item}</td>
                              <td className={t.type === 'expense' ? 'expense' : 'income'}>
                                {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()}
                              </td>
                              <td>
                                {tagData ? (
                                  <span
                                    className={`tag clickable-tag ${isFiltered ? 'filtered' : ''}`}
                                    style={{ backgroundColor: tagData.color, color: 'white' }}
                                    onClick={(e) => handleTagClick(e, t.tag, t.type)}
                                  >
                                    {tagData.name}
                                  </span>
                                ) : (
                                  <span
                                    className={`tag ${t.type} clickable-tag ${isFiltered ? 'filtered' : ''}`}
                                    onClick={(e) => handleTagClick(e, t.tag, t.type)}
                                  >
                                    {t.type === 'expense' ? '支出' : '収入'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <TransactionModal isOpen={isTransactionModalOpen} onClose={handleCloseTransactionModal} year={selectedYear} month={selectedMonth} editingTransaction={editingTransaction} />
      <AlertModal />
    </div>
  );
}

export default App;

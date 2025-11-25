import { useState, useRef, useEffect } from 'react';

// ==================== 型定義 ====================

type Option = { value: string | number; label: string };

type DropdownProps = {
  value: string | number;
  options: Option[];
  onChange: (value: string | number) => void;
  className?: string;
};

type UserDropdownProps = {
  users: { name: string }[];
  value: string;
  onChange: (name: string) => void;
};

type DateDropdownsProps = {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
};

// ==================== ヘルパー関数 ====================

// 指定した数のオプションを生成する
const createOptions = (length: number, fn: (i: number) => Option) =>
  Array.from({ length }, (_, i) => fn(i));

// 現在の年月を取得する
const now = () => ({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

// ==================== コンポーネント ====================

// ユーザー選択用ドロップダウン
export function UserDropdown({ users, value, onChange }: UserDropdownProps) {
  // ユーザー一覧からオプションを生成
  const options = users.map(u => ({ value: u.name, label: u.name }));
  return <Dropdown value={value} options={options} onChange={(v) => onChange(v as string)} />;
}

// 年月選択用ドロップダウン
export function DateDropdowns({ year, month, onYearChange, onMonthChange }: DateDropdownsProps) {
  const { year: currentYear, month: currentMonth } = now();

  // 今年から2000年までの年オプションを生成
  const yearOptions = createOptions(currentYear - 2000 + 1, i => ({ value: currentYear - i, label: `${currentYear - i}年` }));

  // 月オプションを生成
  const maxMonth = year === currentYear ? currentMonth : 12;
  const monthOptions = createOptions(maxMonth, i => ({ value: maxMonth - i, label: `${maxMonth - i}月` }));

  // 年を変更したときの処理
  const handleYearChange = (newYear: number) => {
    onYearChange(newYear);
    // 今年を選択したときに、選択中の月が未来だったら今月に戻す
    if (newYear === currentYear && month > currentMonth) {
      onMonthChange(currentMonth);
    }
  };

  // 前の月へ移動
  const handlePrevMonth = () => {
    if (month === 1) {
      if (year > 2000) {
        onYearChange(year - 1);
        onMonthChange(12);
      }
    } else {
      onMonthChange(month - 1);
    }
  };

  // 次の月へ移動
  const handleNextMonth = () => {
    const isCurrentYearMonth = year === currentYear && month === currentMonth;
    if (isCurrentYearMonth) return;

    if (month === 12) {
      onYearChange(year + 1);
      onMonthChange(1);
    } else {
      onMonthChange(month + 1);
    }
  };

  // 次の月ボタンを無効にするか
  const isNextDisabled = year === currentYear && month === currentMonth;
  // 前の月ボタンを無効にするか
  const isPrevDisabled = year === 2000 && month === 1;

  return (
    <>
      <button onClick={handlePrevMonth} disabled={isPrevDisabled} className="month-nav-button">◀</button>
      <Dropdown value={year} options={yearOptions} onChange={(v) => handleYearChange(v as number)} />
      <Dropdown value={month} options={monthOptions} onChange={(v) => onMonthChange(v as number)} />
      <button onClick={handleNextMonth} disabled={isNextDisabled} className="month-nav-button">▶</button>
    </>
  );
}

// 汎用ドロップダウン
export function Dropdown({ value, options, onChange, className = '' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ドロップダウンの外側をクリックしたら閉じる
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // 現在選択中のオプションを取得
  const selected = options.find(o => o.value === value);

  // ドロップダウンを開くときにメニューの位置を計算
  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setIsOpen(!isOpen);
  };

  // オプションを選択したときの処理
  const handleSelect = (opt: Option) => {
    onChange(opt.value);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className={`dropdown-container ${className}`}>
      {/* ドロップダウンボタン */}
      <button ref={buttonRef} onClick={handleToggle} className="dropdown-button">
        <span>{selected?.label || '\u00A0'}</span>
        <span className="dropdown-arrow">▼</span>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div
          className="dropdown-menu"
          style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
        >
          {options.map(opt => (
            <div key={opt.value} onClick={() => handleSelect(opt)} className={`dropdown-item ${value === opt.value ? 'selected' : ''}`}>
              {value === opt.value && <span className="dropdown-check">✓</span>}
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

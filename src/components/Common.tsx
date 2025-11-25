import type { TransactionType } from '../types';

// ==================== ヘルパー関数 ====================

// 金額のバリデーション
export const validateAmount = (
  amount: string,
  setAlertMessage: (message: string) => void
): number | null => {
  const amountNum = parseFloat(amount);
  if (!amountNum || amountNum <= 0) {
    setAlertMessage('金額を正しく入力してください');
    return null;
  }
  return amountNum;
};

// 小数点を除去
export const removeDecimal = (value: string) => value.replace(/\./g, '');

// 小数点入力を防止
export const preventDecimalInput = (e: React.KeyboardEvent) => {
  if (e.key === '.') e.preventDefault();
};

// ==================== 共通コンポーネント ====================

// 種類選択ボタン（支出/収入）
type TypeSelectorProps = {
  type: TransactionType;
  setType: (type: TransactionType) => void;
};

export function TypeSelector({ type, setType }: TypeSelectorProps) {
  return (
    <div className="type-selector">
      <button
        className={`type-button ${type === 'expense' ? 'active expense' : ''}`}
        onClick={() => setType('expense')}
      >
        支出
      </button>
      <button
        className={`type-button ${type === 'income' ? 'active income' : ''}`}
        onClick={() => setType('income')}
      >
        収入
      </button>
    </div>
  );
}

// 金額入力フィールド
type AmountInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function AmountInput({ value, onChange, placeholder = '0' }: AmountInputProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(removeDecimal(e.target.value))}
      onKeyDown={preventDecimalInput}
      className="modal-input"
      placeholder={placeholder}
    />
  );
}

// テキスト入力フィールド
type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
};

export function TextInput({ value, onChange, placeholder, maxLength }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="modal-input"
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
}

// モーダルフィールド（ラベル付き）
type ModalFieldProps = {
  label: string;
  children: React.ReactNode;
};

export function ModalField({ label, children }: ModalFieldProps) {
  return (
    <div className="modal-field">
      <label className="modal-label">{label}</label>
      {children}
    </div>
  );
}

// モーダルボタン
type ModalButtonsProps = {
  onCancel: () => void;
  onSubmit: () => void;
  cancelText?: string;
  submitText?: string;
};

export function ModalButtons({ onCancel, onSubmit, cancelText = 'キャンセル', submitText = '作成' }: ModalButtonsProps) {
  return (
    <div className="modal-buttons">
      <button onClick={onCancel} className="modal-button secondary">{cancelText}</button>
      <button onClick={onSubmit} className="modal-button primary">{submitText}</button>
    </div>
  );
}

// カラープリセット
const PRESET_COLORS = [
  '#e74c3c', // 赤
  '#e67e22', // 橙
  '#f1c40f', // 黄
  '#2ecc71', // 緑
  '#3498db', // 青
  '#2c3e50', // 藍
  '#9b59b6', // 紫
];

type ColorPresetProps = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPreset({ value, onChange }: ColorPresetProps) {
  return (
    <div className="color-preset">
      {PRESET_COLORS.map(color => (
        <button
          key={color}
          className={`color-preset-item ${value === color ? 'selected' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          type="button"
        />
      ))}
    </div>
  );
}

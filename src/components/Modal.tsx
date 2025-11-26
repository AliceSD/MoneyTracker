import { useState, useEffect } from 'react';
import { Dropdown } from './Dropdown';
import { TypeSelector, AmountInput, TextInput, ModalField, ModalButtons, ColorPreset, validateAmount } from './Common';
import { useAppContext } from '../AppContext';
import type { Transaction, Template, Tag, TransactionType, TransactionsByMonth } from '../types';

// ==================== ヘルパー関数 ====================

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const getMonthKey = (year: number, month: number) => `${year}-${month.toString().padStart(2, '0')}`;

// ==================== バリデーション ====================

// 戻り値を統一してエラーハンドリングを明確化
type ValidationResult = { success: true } | { success: false; message: string };

const validateName = (name: string, users: { name: string }[]): ValidationResult => {
  if (!name) return { success: false, message: '名前を入力してください' };
  if (name.length > 8) return { success: false, message: '名前は8文字以内で入力してください' };
  if (users.some(u => u.name === name)) return { success: false, message: '同じ名前のユーザーが既に存在します' };
  return { success: true };
};

const validateItem = (item: string): ValidationResult => {
  if (!item) return { success: false, message: '項目名を入力してください' };
  if (item.length > 12) return { success: false, message: '項目名は12文字以内で入力してください' };
  return { success: true };
};

const validateTagName = (name: string): ValidationResult => {
  if (!name) return { success: false, message: 'タグ名を入力してください' };
  if (name.length > 4) return { success: false, message: 'タグ名は4文字以内で入力してください' };
  if (name === '支出' || name === '収入') return { success: false, message: '「支出」「収入」はタグ名に使用できません' };
  return { success: true };
};

// ==================== 型定義 ====================

type ModalProps = { isOpen: boolean; onClose: () => void };
type TransactionModalProps = ModalProps & { year: number; month: number; editingTransaction?: Transaction };

// ==================== 共通コンポーネント ====================

function ModalBase({ children, title, isAlert = false }: {
  children: React.ReactNode; title: string; isAlert?: boolean;
}) {
  return (
    <div className={`modal-overlay ${isAlert ? 'alert-overlay' : ''}`}>
      <div className="modal">
        <h2 className="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function useConfirmModal(onConfirm: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  return {
    open: () => setIsOpen(true),
    ConfirmModal: () => isOpen ? (
      <div className="modal-overlay alert-overlay">
        <div className="modal alert-modal">
          <p className="alert-message">削除してもよろしいですか？</p>
          <div className="modal-buttons">
            <button onClick={() => setIsOpen(false)} className="modal-button secondary">キャンセル</button>
            <button onClick={() => { onConfirm(); setIsOpen(false); }} className="modal-button danger">削除</button>
          </div>
        </div>
      </div>
    ) : null
  };
}

function TagDisplay({ tag, type, tags }: { tag?: string; type: TransactionType; tags: Tag[] }) {
  const tagData = tag ? tags.find(t => t.name === tag) : null;
  if (tagData) {
    return <span className="tag" style={{ backgroundColor: tagData.color, color: 'white' }}>{tagData.name}</span>;
  }
  return <span className={`tag ${type}`}>{type === 'expense' ? '支出' : '収入'}</span>;
}

function DateDropdown({ value, year, month, onChange }: {
  value: number; year: number; month: number; onChange: (v: number) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  return (
    <Dropdown
      value={value}
      options={Array.from({ length: daysInMonth }, (_, i) => ({ value: i + 1, label: `${i + 1}日` }))}
      onChange={(v) => onChange(v as number)}
      className="full-width"
    />
  );
}

function TagDropdown({ value, tags, onChange }: { value: string; tags: Tag[]; onChange: (v: string) => void }) {
  return (
    <Dropdown
      value={value}
      options={[{ value: '', label: 'なし' }, ...tags.map(t => ({ value: t.name, label: t.name }))]}
      onChange={(v) => onChange(v as string)}
      className="full-width"
    />
  );
}

// ==================== 各モーダル ====================

export function UserModal({ isOpen, onClose }: ModalProps) {
  const { users, setUsers, setSelectedUser, setMainUser, setAlertMessage } = useAppContext();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  if (!isOpen) return null;

  const handleClose = () => { setName(''); setBalance(''); onClose(); };

  const handleSubmit = () => {
    const result = validateName(name, users);
    if (!result.success) {
      setAlertMessage(result.message);
      return;
    }
    const isFirstUser = users.length === 0;
    setUsers([...users, { name, balance: parseFloat(balance) || 0 }]);
    setSelectedUser(name);
    if (isFirstUser) setMainUser(name);
    handleClose();
  };

  return (
    <ModalBase title="新規ユーザー作成">
      <ModalField label="名前">
        <TextInput value={name} onChange={setName} placeholder="名前を入力" />
      </ModalField>
      <ModalField label="初期残高">
        <AmountInput value={balance} onChange={setBalance} />
      </ModalField>
      <ModalButtons onCancel={handleClose} onSubmit={handleSubmit} submitText="作成" />
    </ModalBase>
  );
}

type ImportData = {
  user: { name: string; balance: number };
  transactions: TransactionsByMonth;
  templates?: Template[];
  tags?: Tag[];
  exportedAt?: string;
};

export function SettingsModal({ isOpen, onClose }: ModalProps) {
  const { users, setUsers, selectedUser, setSelectedUser, mainUser, setMainUser, transactionsByMonth, setTransactionsByMonth, templates, setTemplates, tags, setTags, setAlertMessage } = useAppContext();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  // エクスポート機能（Base64）
  const handleExport = () => {
    if (!selectedUser) return;
    const data = {
      user: users.find(u => u.name === selectedUser),
      transactions: transactionsByMonth,
      templates,
      tags,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const blob = new Blob([base64], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money-tracker-${selectedUser}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setAlertMessage('エクスポートが完了しました');
  };

  // インポート実行
  const executeImport = (data: ImportData) => {
    const existingUser = users.find(u => u.name === data.user.name);
    if (existingUser) {
      setTransactionsByMonth(data.transactions);
      if (data.templates) setTemplates(data.templates);
      if (data.tags) setTags(data.tags);
      setSelectedUser(data.user.name);
    } else {
      setUsers([...users, data.user]);
      setSelectedUser(data.user.name);
      setTimeout(() => {
        setTransactionsByMonth(data.transactions);
        if (data.templates) setTemplates(data.templates);
        if (data.tags) setTags(data.tags);
      }, 100);
    }
    setAlertMessage('インポートが完了しました');
  };

  // インポート機能（Base64）
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const base64 = event.target?.result as string;
          const jsonStr = decodeURIComponent(escape(atob(base64.trim())));
          const data = JSON.parse(jsonStr) as ImportData;
          // データの検証
          if (!data.user || !data.transactions) {
            setAlertMessage('無効なファイル形式です');
            return;
          }
          // 既存ユーザーかチェック
          const existingUser = users.find(u => u.name === data.user.name);
          if (existingUser) {
            // 既存データを取得して比較
            const existingTransactions = localStorage.getItem(`${data.user.name}_transactions`);
            const existingTemplates = localStorage.getItem(`${data.user.name}_templates`);
            const existingTags = localStorage.getItem(`${data.user.name}_tags`);

            const hasTransactionsDiff = existingTransactions && JSON.stringify(data.transactions) !== existingTransactions;
            const hasTemplatesDiff = existingTemplates && data.templates && JSON.stringify(data.templates) !== existingTemplates;
            const hasTagsDiff = existingTags && data.tags && JSON.stringify(data.tags) !== existingTags;

            if (hasTransactionsDiff || hasTemplatesDiff || hasTagsDiff) {
              // 差分がある場合は確認画面を表示
              setImportData(data);
              setIsImportConfirmOpen(true);
              return;
            }
          }
          // 差分がない、または新規ユーザーの場合はそのままインポート
          executeImport(data);
        } catch {
          setAlertMessage('ファイルの読み込みに失敗しました');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // インポート確認後の処理
  const handleImportConfirm = () => {
    if (importData) {
      executeImport(importData);
    }
    setIsImportConfirmOpen(false);
    setImportData(null);
  };

  const handleImportCancel = () => {
    setIsImportConfirmOpen(false);
    setImportData(null);
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    setUsers(users.filter(u => u.name !== selectedUser));
    setSelectedUser(mainUser);
    onClose();
  };

  const { open: openConfirm, ConfirmModal } = useConfirmModal(handleDeleteUser);

  if (!isOpen) return null;

  const isMainUser = selectedUser === mainUser;

  const handleDeleteClick = () => {
    if (isMainUser) { setAlertMessage('メインユーザーは削除できません'); return; }
    openConfirm();
  };

  const settingsItems = [
    { label: '名前を変更する', action: () => { setNewName(selectedUser); setIsRenameOpen(true); }, text: '変更' },
    { label: 'メインユーザーにする', action: () => setMainUser(selectedUser), text: isMainUser ? '設定済み' : '設定', disabled: isMainUser },
    { label: 'テンプレートを編集', action: () => setIsTemplateOpen(true), text: '編集' },
    { label: 'タグを編集', action: () => setIsTagOpen(true), text: '編集' },
    { label: 'データをエクスポート', action: handleExport, text: '保存' },
    { label: '削除する', action: handleDeleteClick, text: '削除', danger: true },
  ];

  return (
    <>
      <ModalBase title="設定">
        {selectedUser && (
          <div className="settings-section">
            <h3 className="settings-subtitle">選択中のユーザー設定</h3>
            {settingsItems.map(({ label, action, text, disabled, danger }) => (
              <div key={label} className="modal-field">
                <div className="settings-row">
                  <span className="settings-label">{label}</span>
                  <button
                    onClick={action}
                    className={`settings-action-button ${disabled ? 'disabled' : ''} ${danger ? 'danger' : ''}`}
                    disabled={disabled}
                  >
                    {text}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="settings-section">
          <h3 className="settings-subtitle">データ管理</h3>
          <div className="modal-field">
            <div className="settings-row">
              <span className="settings-label">データをインポート</span>
              <button onClick={handleImport} className="settings-action-button">読込</button>
            </div>
          </div>
        </div>
        <div className="modal-buttons">
          <button onClick={onClose} className="modal-button primary">閉じる</button>
        </div>
      </ModalBase>
      <RenameModal isOpen={isRenameOpen} onClose={() => setIsRenameOpen(false)} name={newName} setName={setNewName} />
      <TemplateModal isOpen={isTemplateOpen} onClose={() => setIsTemplateOpen(false)} />
      <TagModal isOpen={isTagOpen} onClose={() => setIsTagOpen(false)} />
      <ConfirmModal />
      {isImportConfirmOpen && (
        <div className="modal-overlay alert-overlay">
          <div className="modal alert-modal">
            <p className="alert-message">
              「{importData?.user.name}」のデータが既に存在します。<br />
              上書きしてもよろしいですか？
            </p>
            <div className="modal-buttons">
              <button onClick={handleImportCancel} className="modal-button secondary">キャンセル</button>
              <button onClick={handleImportConfirm} className="modal-button primary">上書き</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RenameModal({ isOpen, onClose, name, setName }: ModalProps & { name: string; setName: (n: string) => void }) {
  const { users, setUsers, selectedUser, setSelectedUser, mainUser, setMainUser, setAlertMessage } = useAppContext();

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (name === selectedUser) { onClose(); return; }
    const result = validateName(name, users);
    if (!result.success) {
      setAlertMessage(result.message);
      return;
    }
    setUsers(users.map(u => u.name === selectedUser ? { ...u, name } : u));
    if (mainUser === selectedUser) setMainUser(name);
    setSelectedUser(name);
    onClose();
  };

  return (
    <ModalBase title="名前を変更" isAlert>
      <ModalField label="新しい名前">
        <TextInput value={name} onChange={setName} placeholder="名前を入力" />
      </ModalField>
      <ModalButtons onCancel={onClose} onSubmit={handleSubmit} submitText="変更" />
    </ModalBase>
  );
}

export function TransactionModal({ isOpen, onClose, year, month, editingTransaction }: TransactionModalProps) {
  const { transactionsByMonth, setTransactionsByMonth, templates, tags, setAlertMessage } = useAppContext();
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(new Date().getDate());
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [tag, setTag] = useState('');
  const [isTemplateMode, setIsTemplateMode] = useState(false);

  const isEditing = !!editingTransaction;
  const monthKey = getMonthKey(year, month);
  const transactions = transactionsByMonth[monthKey] || [];

  const resetForm = () => {
    setType('expense');
    setDate(new Date().getDate());
    setItem('');
    setAmount('');
    setTag('');
    setIsTemplateMode(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleDelete = () => {
    if (!editingTransaction) return;
    const updated = transactions.filter(t => t.id !== editingTransaction.id);
    if (updated.length === 0) {
      const { [monthKey]: _, ...rest } = transactionsByMonth;
      setTransactionsByMonth(rest);
    } else {
      setTransactionsByMonth({ ...transactionsByMonth, [monthKey]: updated });
    }
    handleClose();
  };

  const { open: openConfirm, ConfirmModal } = useConfirmModal(handleDelete);

  // ✅ 修正: レンダリング中のsetStateをuseEffectに移動
  useEffect(() => {
    if (isOpen && editingTransaction) {
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setItem(editingTransaction.item);
      setAmount(editingTransaction.amount.toString());
      setTag(editingTransaction.tag || '');
    }
  }, [isOpen, editingTransaction]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const itemResult = validateItem(item);
    if (!itemResult.success) {
      setAlertMessage(itemResult.message);
      return;
    }
    const amountNum = validateAmount(amount, setAlertMessage);
    if (amountNum === null) return;

    const transactionData = { type, date, item, amount: amountNum, tag: tag || undefined };

    if (isEditing) {
      setTransactionsByMonth({
        ...transactionsByMonth,
        [monthKey]: transactions.map(t => t.id === editingTransaction.id ? { ...t, ...transactionData } : t)
      });
    } else {
      setTransactionsByMonth({
        ...transactionsByMonth,
        [monthKey]: [...transactions, { id: Date.now(), ...transactionData }]
      });
    }
    handleClose();
  };

  const handleTemplateSelect = (templateItem: string) => {
    const template = templates.find(t => t.item === templateItem);
    if (!template) return;
    setType(template.type);
    setItem(template.item);
    setAmount(template.amount.toString());
    setTag(template.tag || '');
    setIsTemplateMode(true);
  };

  return (
    <ModalBase title={isEditing ? "収支を編集" : "収支を追加"}>
      {isTemplateMode ? (
        <>
          <ModalField label="テンプレート">
            <div className="template-info">
              <span className="edit-list-item-name">{item}</span>
              <span className="edit-list-item-amount">{type === 'expense' ? '-' : '+'}{Number(amount).toLocaleString()}円</span>
              <TagDisplay tag={tag} type={type} tags={tags} />
            </div>
            <button onClick={resetForm} className="template-cancel-button">キャンセル</button>
          </ModalField>
          <ModalField label="日付">
            <DateDropdown value={date} year={year} month={month} onChange={setDate} />
          </ModalField>
        </>
      ) : (
        <>
          <ModalField label="種類">
            <TypeSelector type={type} setType={setType} />
            <Dropdown
              value=""
              options={[{ value: '', label: 'テンプレートを使用' }, ...templates.map(t => ({ value: t.item, label: t.item }))]}
              onChange={(v) => handleTemplateSelect(v as string)}
              className="full-width"
            />
          </ModalField>
          <ModalField label="項目名">
            <TextInput value={item} onChange={setItem} placeholder="項目名を入力" />
          </ModalField>
          <ModalField label="金額">
            <AmountInput value={amount} onChange={setAmount} />
          </ModalField>
          <ModalField label="日付">
            <DateDropdown value={date} year={year} month={month} onChange={setDate} />
          </ModalField>
          <ModalField label="タグ">
            <TagDropdown value={tag} tags={tags} onChange={setTag} />
          </ModalField>
        </>
      )}
      {isEditing && <button onClick={openConfirm} className="modal-button danger full-width">削除</button>}
      <ModalButtons onCancel={handleClose} onSubmit={handleSubmit} submitText={isEditing ? "保存" : "追加"} />
      <ConfirmModal />
    </ModalBase>
  );
}

function TemplateModal({ isOpen, onClose }: ModalProps) {
  const { templates, setTemplates, tags, setAlertMessage } = useAppContext();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [tag, setTag] = useState('');

  const isEditing = editingItem !== null;
  const isAdding = editingItem === '';

  const resetForm = () => { setEditingItem(null); setType('expense'); setItem(''); setAmount(''); setTag(''); };

  const handleDelete = () => {
    if (editingItem) { setTemplates(templates.filter(t => t.item !== editingItem)); resetForm(); }
  };

  const { open: openConfirm, ConfirmModal } = useConfirmModal(handleDelete);

  if (!isOpen) return null;

  const handleEdit = (template: Template) => {
    setEditingItem(template.item);
    setType(template.type);
    setItem(template.item);
    setAmount(template.amount.toString());
    setTag(template.tag || '');
  };

  const handleSubmit = () => {
    const itemResult = validateItem(item);
    if (!itemResult.success) {
      setAlertMessage(itemResult.message);
      return;
    }
    const amountNum = validateAmount(amount, setAlertMessage);
    if (amountNum === null) return;
    if (templates.some(t => t.item === item && t.item !== editingItem)) {
      setAlertMessage('同じ項目名のテンプレートが既に存在します');
      return;
    }

    const templateData = { type, item, amount: amountNum, tag: tag || undefined };
    if (isAdding) {
      setTemplates([...templates, templateData]);
    } else {
      setTemplates(templates.map(t => t.item === editingItem ? templateData : t));
    }
    resetForm();
  };

  if (isEditing) {
    return (
      <ModalBase title={isAdding ? "テンプレート追加" : "テンプレート編集"} isAlert>
        <ModalField label="種類"><TypeSelector type={type} setType={setType} /></ModalField>
        <ModalField label="項目名"><TextInput value={item} onChange={setItem} placeholder="項目名を入力" /></ModalField>
        <ModalField label="金額"><AmountInput value={amount} onChange={setAmount} /></ModalField>
        <ModalField label="タグ"><TagDropdown value={tag} tags={tags} onChange={setTag} /></ModalField>
        {!isAdding && <button onClick={openConfirm} className="modal-button danger full-width">削除</button>}
        <ModalButtons onCancel={resetForm} onSubmit={handleSubmit} submitText={isAdding ? "追加" : "保存"} />
        <ConfirmModal />
      </ModalBase>
    );
  }

  return (
    <ModalBase title="テンプレート編集" isAlert>
      <div className="edit-modal-header">
        <button onClick={() => setEditingItem('')} className="add-text-button">追加</button>
      </div>
      <div className="edit-list">
        {templates.length === 0 ? (
          <p className="no-data">テンプレートがありません</p>
        ) : (
          templates.map(t => (
            <div key={t.item} className="edit-list-item clickable" onClick={() => handleEdit(t)}>
              <span className="edit-list-item-name">{t.item}</span>
              <span className="edit-list-item-amount">{t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()}円</span>
              <TagDisplay tag={t.tag} type={t.type} tags={tags} />
            </div>
          ))
        )}
      </div>
      <div className="modal-buttons">
        <button onClick={() => { resetForm(); onClose(); }} className="modal-button primary">閉じる</button>
      </div>
    </ModalBase>
  );
}

function TagModal({ isOpen, onClose }: ModalProps) {
  const { tags, setTags, transactionsByMonth, setTransactionsByMonth, templates, setTemplates, setAlertMessage } = useAppContext();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('');

  const isEditing = editingName !== null;
  const isAdding = editingName === '';

  const resetForm = () => { setEditingName(null); setName(''); setColor(''); };

  const handleDelete = () => {
    if (editingName) { setTags(tags.filter(t => t.name !== editingName)); resetForm(); }
  };

  const { open: openConfirm, ConfirmModal } = useConfirmModal(handleDelete);

  if (!isOpen) return null;

  const handleEdit = (tag: Tag) => { setEditingName(tag.name); setName(tag.name); setColor(tag.color); };

  const handleSubmit = () => {
    const nameResult = validateTagName(name);
    if (!nameResult.success) {
      setAlertMessage(nameResult.message);
      return;
    }
    if (!color) { setAlertMessage('色を選択してください'); return; }
    if (tags.some(t => t.name === name && t.name !== editingName)) {
      setAlertMessage('同じ名前のタグが既に存在します');
      return;
    }

    const tagData = { name, color };
    if (isAdding) {
      setTags([...tags, tagData]);
    } else {
      setTags(tags.map(t => t.name === editingName ? tagData : t));
      // タグ名が変更された場合、トランザクションとテンプレートのタグ名も更新
      if (editingName !== name) {
        const updatedTransactions = Object.fromEntries(
          Object.entries(transactionsByMonth).map(([key, txns]) => [
            key,
            txns.map(t => t.tag === editingName ? { ...t, tag: name } : t)
          ])
        );
        setTransactionsByMonth(updatedTransactions);
        setTemplates(templates.map(t => t.tag === editingName ? { ...t, tag: name } : t));
      }
    }
    resetForm();
  };

  if (isEditing) {
    return (
      <ModalBase title={isAdding ? "タグ追加" : "タグ編集"} isAlert>
        <ModalField label="タグ名"><TextInput value={name} onChange={setName} placeholder="タグ名を入力" /></ModalField>
        <ModalField label="色"><ColorPreset value={color} onChange={setColor} /></ModalField>
        {!isAdding && <button onClick={openConfirm} className="modal-button danger full-width">削除</button>}
        <ModalButtons onCancel={resetForm} onSubmit={handleSubmit} submitText={isAdding ? "追加" : "保存"} />
        <ConfirmModal />
      </ModalBase>
    );
  }

  return (
    <ModalBase title="タグ編集" isAlert>
      <div className="edit-modal-header">
        <button onClick={() => setEditingName('')} className="add-text-button">追加</button>
      </div>
      <div className="edit-list">
        {tags.length === 0 ? (
          <p className="no-data">タグがありません</p>
        ) : (
          tags.map(t => (
            <div key={t.name} className="edit-list-item clickable" onClick={() => handleEdit(t)}>
              <span className="tag-color" style={{ backgroundColor: t.color }}></span>
              <span className="edit-list-item-name">{t.name}</span>
            </div>
          ))
        )}
      </div>
      <div className="modal-buttons">
        <button onClick={() => { resetForm(); onClose(); }} className="modal-button primary">閉じる</button>
      </div>
    </ModalBase>
  );
}

export function AlertModal() {
  const { alertMessage, setAlertMessage } = useAppContext();
  if (!alertMessage) return null;

  return (
    <div className="modal-overlay alert-overlay">
      <div className="modal alert-modal">
        <p className="alert-message">{alertMessage}</p>
        <div className="modal-buttons">
          <button onClick={() => setAlertMessage('')} className="modal-button primary">OK</button>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { accountApi, transactionApi, Account, Transaction } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [createForm, setCreateForm] = useState({ accountId: '', holderName: '', balance: '' });
  const [txForm, setTxForm] = useState({
    type: 'deposit' as 'deposit' | 'withdraw' | 'transfer',
    fromAccount: '',
    toAccount: '',
    amount: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { connected, balanceUpdates, recentTransactions, failedTransactions } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        accountApi.getAll(),
        transactionApi.getAll(),
      ]);
      if (accRes.data.success) setAccounts(accRes.data.data);
      if (txRes.data.success) setTransactions(txRes.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getBalanceForAccount = (accountId: string) => {
    const update = balanceUpdates.find((u) => u.accountId === accountId);
    if (update) return update.balance;
    const account = accounts.find((a) => a.accountId === accountId);
    return account?.balance ?? 0;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await accountApi.create({
        accountId: createForm.accountId,
        holderName: createForm.holderName,
        balance: createForm.balance ? parseFloat(createForm.balance) : 0,
      });
      setCreateForm({ accountId: '', holderName: '', balance: '' });
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await transactionApi.create({
        type: txForm.type,
        fromAccount: txForm.fromAccount || null,
        toAccount: txForm.toAccount || null,
        amount: parseFloat(txForm.amount),
      });
      setTxForm({ type: 'deposit', fromAccount: '', toAccount: '', amount: '' });
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          WebSocket: {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">x</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Create Account</h2>
          <form onSubmit={handleCreateAccount} className="space-y-3">
            <input
              type="text"
              placeholder="Account ID (e.g., ACC1001)"
              value={createForm.accountId}
              onChange={(e) => setCreateForm({ ...createForm, accountId: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              type="text"
              placeholder="Holder Name"
              value={createForm.holderName}
              onChange={(e) => setCreateForm({ ...createForm, holderName: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              type="number"
              placeholder="Initial Balance (optional)"
              value={createForm.balance}
              onChange={(e) => setCreateForm({ ...createForm, balance: e.target.value })}
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">New Transaction</h2>
          <form onSubmit={handleTransaction} className="space-y-3">
            <select
              value={txForm.type}
              onChange={(e) => setTxForm({ ...txForm, type: e.target.value as any })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="deposit">Deposit</option>
              <option value="withdraw">Withdraw</option>
              <option value="transfer">Transfer</option>
            </select>
            {(txForm.type === 'withdraw' || txForm.type === 'transfer') && (
              <input
                type="text"
                placeholder="From Account ID"
                value={txForm.fromAccount}
                onChange={(e) => setTxForm({ ...txForm, fromAccount: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            )}
            {(txForm.type === 'deposit' || txForm.type === 'transfer') && (
              <input
                type="text"
                placeholder="To Account ID"
                value={txForm.toAccount}
                onChange={(e) => setTxForm({ ...txForm, toAccount: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            )}
            <input
              type="number"
              placeholder="Amount"
              value={txForm.amount}
              onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
              required
              min="0.01"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Processing...' : 'Submit Transaction'}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Accounts ({accounts.length})</h2>
        {accounts.length === 0 ? (
          <p className="text-gray-500">No accounts yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Account ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Holder</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Balance</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Version</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => {
                  const liveBalance = getBalanceForAccount(acc.accountId);
                  const liveUpdate = balanceUpdates.find((u) => u.accountId === acc.accountId);
                  return (
                    <tr key={acc._id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-mono text-blue-600">{acc.accountId}</td>
                      <td className="py-3 px-4">{acc.holderName}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        ${liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {liveUpdate && (
                          <span className="ml-2 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            live
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        v{liveUpdate?.version ?? acc.version}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...recentTransactions.map((t) => ({ ...t, _source: 'live' as const })), ...transactions.map((t) => ({ ...t, _source: 'db' as const }))].slice(0, 50).map((tx, i) => (
              <div key={tx._id + '-' + i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 text-sm">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    tx.type === 'deposit' ? 'bg-green-100 text-green-700' :
                    tx.type === 'withdraw' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {tx.type}
                  </span>
                  {tx._source === 'live' && (
                    <span className="ml-1 text-xs text-green-600">live</span>
                  )}
                </div>
                <span className="font-medium">${tx.amount.toFixed(2)}</span>
              </div>
            ))}
            {transactions.length === 0 && recentTransactions.length === 0 && (
              <p className="text-gray-400 text-sm">No transactions yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 text-green-700">Successful Transactions</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentTransactions.map((tx, i) => (
              <div key={tx._id + '-' + i} className="py-2 px-3 rounded-lg bg-green-50 text-sm">
                <span className="font-medium">{tx.type}</span> ${tx.amount.toFixed(2)}
                <div className="text-xs text-gray-500 mt-1">
                  {tx.fromAccount && `From: ${tx.fromAccount}`}
                  {tx.toAccount && ` To: ${tx.toAccount}`}
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <p className="text-gray-400 text-sm">No real-time successful events yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-700">Failed Transactions</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {failedTransactions.map((tx, i) => (
              <div key={tx._id + '-' + i} className="py-2 px-3 rounded-lg bg-red-50 text-sm">
                <span className="font-medium">{tx.type}</span> ${tx.amount.toFixed(2)}
                <div className="text-xs text-red-500 mt-1">{tx.errorMessage}</div>
              </div>
            ))}
            {failedTransactions.length === 0 && (
              <p className="text-gray-400 text-sm">No failures</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

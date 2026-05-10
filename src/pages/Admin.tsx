import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Settings, RefreshCw, Layers } from 'lucide-react';

interface Order {
  id: string;
  customerName: string;
  items: any[];
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  totalAmount: number;
  createdAt: any;
}

export function Admin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'completed'>('pending');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(fetched);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const seedMenu = async () => {
    setIsSeeding(true);
    const mockMenu = [
      { nameZh: '綠豆沙', nameEn: 'Mung Bean Smoothie', priceM: 40, priceL: 50, category: 'Smoothie', isAvailable: true },
      { nameZh: '綠豆沙黑糖珍珠', nameEn: 'Mung Bean Smoothie with Brown Sugar Bubble', priceM: 50, priceL: 60, category: 'Smoothie', isAvailable: true },
      { nameZh: '綠豆沙牛奶', nameEn: 'Mung Bean Milk Shake', priceM: 0, priceL: 60, category: 'Smoothie', isAvailable: true },
      { nameZh: '綠豆沙牛奶黑糖珍珠', nameEn: 'Mung Bean Milk Shake with Brown Sugar Bubble', priceM: 0, priceL: 70, category: 'Smoothie', isAvailable: true },
      { nameZh: '白雪奶霜葡萄', nameEn: 'Sea salt cream on Champagne Grape Smoothie', priceM: 0, priceL: 60, category: 'Smoothie', isAvailable: true },
      { nameZh: '香檳牛奶冰沙', nameEn: 'Ice cream Milk Shake', priceM: 45, priceL: 55, category: 'Smoothie', isAvailable: true },
      { nameZh: '黑糖珍珠奶茶冰沙', nameEn: 'Brown Sugar Bubble Tea Smoothie', priceM: 50, priceL: 60, category: 'Smoothie', isAvailable: true },
    ];

    try {
      for (const item of mockMenu) {
        await addDoc(collection(db, 'menuItems'), {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      alert('Menu seeded successfully!');
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'menuItems');
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredOrders = orders.filter(o => o.status === activeTab);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-teal-400" />
            <span className="text-xl font-bold tracking-tight">後台管理 (Admin)</span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={seedMenu}
              disabled={isSeeding}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
            >
              <Layers className="w-4 h-4" />
              <span>{isSeeding ? 'Seeding...' : '建立/重置菜單 (Seed Menu)'}</span>
            </button>
            <Link to="/" className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-sm font-bold rounded-lg transition">
              回前台
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex space-x-2 border-b border-gray-200">
          {(['pending', 'processing', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-teal-500 text-teal-700 bg-white' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab === 'pending' && '待處理 (Pending)'}
              {tab === 'processing' && '製作中 (Processing)'}
              {tab === 'completed' && '已完成 (Completed)'}
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-800 rounded-full">
                {orders.filter(o => o.status === tab).length}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-gray-200 border-dashed">
              目前沒有訂單
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:px-6 bg-gray-50 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{order.customerName}</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">ID: {order.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'processing')}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-sm"
                      >
                        開始製作 (Start)
                      </button>
                    )}
                    {order.status === 'processing' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition shadow-sm"
                      >
                        完成 (Complete)
                      </button>
                    )}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="px-4 py-2 bg-red-100 text-red-700 text-sm font-bold rounded-lg hover:bg-red-200 transition"
                      >
                        取消 (Cancel)
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-4 sm:px-6">
                  <ul className="divide-y divide-gray-100">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="py-3 flex justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-gray-800">{item.quantity}x</span>
                          <div>
                            <p className="font-medium text-gray-900">{item.nameZh}</p>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded mt-1">
                              Size {item.size}
                            </span>
                          </div>
                        </div>
                        <div className="text-gray-900 font-medium">
                          ${item.price * item.quantity}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <span className="text-lg font-bold text-gray-900">總計: ${order.totalAmount}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

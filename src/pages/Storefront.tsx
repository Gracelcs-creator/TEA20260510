import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ShoppingCart, CheckCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MenuItem {
  id: string;
  nameZh: string;
  nameEn: string;
  priceM: number;
  priceL: number;
  category: string;
  isAvailable: boolean;
}

interface CartItem {
  menuItem: MenuItem;
  size: 'M' | 'L';
  quantity: number;
}

export function Storefront() {
  const isAdmin = true;
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'menuItems'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      setMenuItems(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'menuItems');
    });

    return () => unsubscribe();
  }, []);

  const addToCart = (menuItem: MenuItem, size: 'M' | 'L') => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id && item.size === size);
      if (existing) {
        return prev.map(item => item.menuItem.id === menuItem.id && item.size === size 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, { menuItem, size, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItem: MenuItem, size: 'M' | 'L') => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id && item.size === size);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.menuItem.id === menuItem.id && item.size === size 
          ? { ...item, quantity: item.quantity - 1 } 
          : item
        );
      }
      return prev.filter(item => !(item.menuItem.id === menuItem.id && item.size === size));
    });
  };

  const cartTotal = cart.reduce((total, item) => {
    const price = item.size === 'M' ? item.menuItem.priceM : item.menuItem.priceL;
    return total + price * item.quantity;
  }, 0);

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      alert("請輸入您的姓名 (Please enter your name)");
      return;
    }
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderData = {
        customerName: customerName.trim(),
        items: cart.map(item => ({
          menuItemId: item.menuItem.id,
          nameZh: item.menuItem.nameZh,
          size: item.size,
          quantity: item.quantity,
          price: item.size === 'M' ? item.menuItem.priceM : item.menuItem.priceL
        })),
        status: 'pending',
        totalAmount: cartTotal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);
      setCart([]);
      setIsCartOpen(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 5000);
    } catch (error) {
      console.error(error);
      alert("Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const seedMenu = async () => {
    setIsSubmitting(true);
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
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'menuItems');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group by category, but here we just have 'Smoothie' mostly. Let's just list them simply.
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tight text-teal-800">清涼冰沙</span>
            <span className="text-sm text-gray-500 hidden sm:inline-block">Smoothie Drink</span>
          </div>

          <div className="flex items-center space-x-4">
            {isAdmin && (
              <Link to="/admin" className="text-sm font-medium text-teal-600 hover:text-teal-800">
                後台管理
              </Link>
            )}
            
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"
            >
              <ShoppingCart size={24} />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {orderSuccess && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-3 text-green-800">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">點單成功！(Order Placed!)</h3>
              <p className="text-sm mt-1">我們已收到您的訂單，店員將盡快為您準備。</p>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">此系列只能做冰飲品，甜度固定</h2>
          <div className="flex items-center space-x-4 text-sm font-bold text-gray-700 bg-gray-200 px-4 py-2 rounded-lg">
            <span>M : 16oz</span>
            <span>L : 22oz</span>
          </div>
        </div>

        {menuItems.length === 0 ? (
          <div className="text-center py-20 text-gray-500 flex flex-col items-center border-2 border-dashed border-gray-200 rounded-2xl bg-white max-w-xl mx-auto mt-10">
            <Info className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-700">目前沒有可用的飲品 (No drinks available)</p>
            
            {isAdmin && (
              <div className="mt-6 flex flex-col items-center">
                <p className="text-sm text-gray-500 mb-3">您可以點擊下方按鈕，直接將預設菜單寫入資料庫：</p>
                <button 
                  onClick={seedMenu}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-bold disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? '正在寫入資料庫...' : '一鍵載入預設菜單 (Seed Menu)'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {menuItems.filter(item => item.isAvailable).map(item => (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{item.nameZh}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.nameEn}</p>
                </div>
                
                <div className="flex justify-end space-x-3 mt-auto">
                  {item.priceM > 0 && (
                    <button 
                      onClick={() => addToCart(item, 'M')}
                      className="flex flex-col items-center px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 transition border border-teal-100"
                    >
                      <span className="font-bold text-sm">M</span>
                      <span className="text-lg font-black">${item.priceM}</span>
                    </button>
                  )}
                  {item.priceL > 0 && (
                    <button 
                      onClick={() => addToCart(item, 'L')}
                      className="flex flex-col items-center px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition shadow-sm"
                    >
                      <span className="font-bold text-sm">L</span>
                      <span className="text-lg font-black">${item.priceL}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-xl flex flex-col transform transition-transform duration-300">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold">購物車 (Cart)</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500 hover:text-gray-800 p-2 text-xl font-bold">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">購物車是空的</div>
              ) : (
                <ul className="space-y-4">
                  {cart.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div>
                        <div className="font-medium text-gray-800">{item.menuItem.nameZh}</div>
                        <div className="text-sm text-gray-500">
                          {item.size} • ${(item.size === 'M' ? item.menuItem.priceM : item.menuItem.priceL)} 
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 bg-white px-2 py-1 rounded-lg border border-gray-200">
                        <button 
                          onClick={() => removeFromCart(item.menuItem, item.size)}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black font-bold"
                        >-</button>
                        <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => addToCart(item.menuItem, item.size)}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black font-bold"
                        >+</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 border-t bg-white">
              <div className="space-y-4 mb-4">
                <div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="請輸入您的姓名 (Your Name)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>總計 (Total):</span>
                  <span>${cartTotal}</span>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting || !customerName.trim()}
                className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex justify-center items-center"
              >
                {isSubmitting ? '處理中...' : '確認結帳 (Checkout)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

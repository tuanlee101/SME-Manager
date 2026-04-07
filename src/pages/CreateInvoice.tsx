import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getCustomers, getProducts, createInvoice } from "../services/firebaseService";
import { cn } from "../lib/utils";
import { Plus, Trash2, Search, User, Package, ShoppingCart, ChevronLeft, Save, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

export default function CreateInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = React.useState("");
  const [items, setItems] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState("paid");
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);

  React.useEffect(() => {
    const unsubscribe = getCustomers(null, (data) => setCustomers(data));
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const unsubscribe = getProducts(null, null, (data) => setProducts(data));
    return () => unsubscribe();
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: any) => createInvoice(data),
    onSuccess: () => {
      navigate("/invoices");
    },
  });

  const addItem = (product: any) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { productId: product.id, name: product.name, price: product.sellPrice, quantity: 1, unit: product.unit }]);
    }
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(productId);
    setItems(items.map(i => i.productId === productId ? { ...i, quantity } : i));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) return;
    createMutation.mutate({ customerId, items, status });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/invoices")}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Tạo hóa đơn</h2>
          <p className="text-gray-500 mt-1">Lập hóa đơn bán hàng mới cho khách hàng.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Customer Selection */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User size={20} className="text-blue-600" /> Thông tin khách hàng
            </h3>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none font-medium"
                required
              >
                <option value="">Chọn khách hàng...</option>
                {customers?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Package size={20} className="text-blue-600" /> Chọn sản phẩm
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products?.filter((p: any) => p.stock > 0).map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => addItem(product)}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-gray-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-blue-600 transition-all">
                    <Package size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm line-clamp-1">{product.name}</p>
                    <p className="text-xs text-blue-600 font-bold">{formatCurrency(product.sellPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Kho</p>
                    <p className="text-xs font-bold text-gray-900">{product.stock}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50 sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-600" /> Chi tiết đơn hàng
            </h3>
            
            <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                    <ShoppingCart size={32} />
                  </div>
                  <p className="text-sm text-gray-400">Chưa có sản phẩm nào</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 group">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between text-gray-500">
                <span>Tạm tính</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>Thuế (0%)</span>
                <span>0 ₫</span>
              </div>
              <div className="flex items-center justify-between text-xl font-bold text-gray-900 pt-2">
                <span>Tổng cộng</span>
                <span className="text-blue-600">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Trạng thái</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStatus("paid")}
                    className={cn(
                      "py-2 rounded-xl text-sm font-bold transition-all",
                      status === "paid" ? "bg-green-600 text-white shadow-lg shadow-green-100" : "bg-gray-50 text-gray-500"
                    )}
                  >
                    Đã thanh toán
                  </button>
                  <button
                    onClick={() => setStatus("pending")}
                    className={cn(
                      "py-2 rounded-xl text-sm font-bold transition-all",
                      status === "pending" ? "bg-orange-500 text-white shadow-lg shadow-orange-100" : "bg-gray-50 text-gray-500"
                    )}
                  >
                    Chờ xử lý
                  </button>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!customerId || items.length === 0 || createMutation.isPending}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={20} /> {createMutation.isPending ? "Đang lưu..." : "Lưu hóa đơn"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

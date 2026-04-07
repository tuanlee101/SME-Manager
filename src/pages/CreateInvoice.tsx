import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getCustomers, getProducts, createInvoice } from "../services/firebaseService";
import { cn } from "../lib/utils";
import { Plus, Trash2, Search, User, Package, ShoppingCart, ChevronLeft, Save, X, Phone } from "lucide-react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

export default function CreateInvoice() {
  const navigate = useNavigate();

  // --- Data ---
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);

  React.useEffect(() => {
    const u1 = getCustomers(null, setCustomers);
    const u2 = getProducts(null, null, setProducts);
    return () => { u1(); u2(); };
  }, []);

  // --- Customer search ---
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = React.useState(false);
  const customerRef = React.useRef<HTMLDivElement>(null);

  const customerSuggestions = React.useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter(c =>
      c.phone?.includes(q) ||
      c.name?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [customers, customerQuery]);

  const selectCustomer = (c: any) => {
    setSelectedCustomer(c);
    setCustomerQuery("");
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery("");
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- Product search ---
  const [productQuery, setProductQuery] = React.useState("");

  const filteredProducts = React.useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter(p => p.stock > 0 && (!q || p.name.toLowerCase().includes(q)));
  }, [products, productQuery]);

  // --- Cart ---
  const [items, setItems] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState("paid");

  const addItem = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, price: product.sellPrice, quantity: 1, unit: product.unit }];
    });
  };

  const removeItem = (productId: string) => setItems(prev => prev.filter(i => i.productId !== productId));

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(productId);
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity } : i));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // --- Submit ---
  const createMutation = useMutation({
    mutationFn: (data: any) => createInvoice(data),
    onSuccess: () => navigate("/invoices"),
  });

  const handleSubmit = () => {
    if (!selectedCustomer || items.length === 0) return;
    createMutation.mutate({ customerId: selectedCustomer.id, items, status });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
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

          {/* Customer Search */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User size={20} className="text-blue-600" /> Thông tin khách hàng
            </h3>

            {selectedCustomer ? (
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{selectedCustomer.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {selectedCustomer.phone && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={12} /> {selectedCustomer.phone}
                      </span>
                    )}
                    {selectedCustomer.email && (
                      <span className="text-xs text-gray-500">{selectedCustomer.email}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={clearCustomer}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div ref={customerRef} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => { setCustomerQuery(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Tìm theo tên hoặc số điện thoại..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all border border-transparent focus:border-blue-200"
                />
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 z-50 overflow-hidden">
                    {customerSuggestions.map((c) => (
                      <button
                        key={c.id}
                        onMouseDown={() => selectCustomer(c)}
                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                          {c.phone && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone size={10} /> {c.phone}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showCustomerDropdown && customerQuery && customerSuggestions.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 px-4 py-6 text-center text-sm text-gray-400">
                    Không tìm thấy khách hàng
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Search + Grid */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Package size={20} className="text-blue-600" /> Chọn sản phẩm
            </h3>

            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full pl-12 pr-10 py-3 bg-gray-50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all border border-transparent focus:border-blue-200"
              />
              {productQuery && (
                <button onClick={() => setProductQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">Không tìm thấy sản phẩm nào</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
                {filteredProducts.map((product: any) => {
                  const inCart = items.find(i => i.productId === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addItem(product)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                        inCart
                          ? "border-blue-200 bg-blue-50/50"
                          : "border-gray-100 hover:border-blue-100 hover:bg-blue-50/30"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
                        inCart ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-400 group-hover:bg-white group-hover:text-blue-600"
                      )}>
                        {product.image
                          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                          : <Package size={22} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{product.name}</p>
                        <p className="text-xs text-blue-600 font-bold">{formatCurrency(product.sellPrice)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {inCart ? (
                          <span className="px-2 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">×{inCart.quantity}</span>
                        ) : (
                          <>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Kho</p>
                            <p className="text-xs font-bold text-gray-900">{product.stock}</p>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50 sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-600" /> Chi tiết đơn hàng
            </h3>

            <div className="space-y-4 mb-8 max-h-[360px] overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                    <ShoppingCart size={32} />
                  </div>
                  <p className="text-sm text-gray-400">Chưa có sản phẩm nào</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-sm"
                      >−</button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-sm"
                      >+</button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Tạm tính</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
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
                disabled={!selectedCustomer || items.length === 0 || createMutation.isPending}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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

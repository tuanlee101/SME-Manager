import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct, bulkCreateProducts } from "../services/firebaseService";
import { cn } from "../lib/utils";
import { Plus, Search, Edit2, Trash2, X, Package, AlertTriangle, Filter, ChevronDown, Image as ImageIcon, Download, Upload, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

export default function Products() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<any>(null);
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [products, setProducts] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    buyPrice: 0,
    sellPrice: 0,
    stock: 0,
    unit: "cái",
    categoryId: "",
    image: "",
  });

  React.useEffect(() => {
    const unsubscribe = getProducts(categoryId || null, search || null, (data) => {
      setProducts(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [categoryId, search]);

  React.useEffect(() => {
    const unsubscribe = getCategories((data) => {
      setCategories(data);
    });
    return () => unsubscribe();
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: any) => createProduct(data),
    onSuccess: () => closeModal(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateProduct(editingProduct.id, data),
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data: any) => bulkCreateProducts(data),
    onSuccess: () => {
      alert("Đã nhập dữ liệu thành công!");
    },
    onError: (err) => {
      console.error(err);
      alert("Lỗi khi nhập dữ liệu Excel. Hãy kiểm tra lại định dạng file.");
    }
  });

  const handleExport = () => {
    if (!products || products.length === 0) return;
    
    const data = products.map((p: any) => ({
      "Tên sản phẩm": p.name,
      "Danh mục": p.category?.name,
      "Giá nhập": p.buyPrice,
      "Giá bán": p.sellPrice,
      "Tồn kho": p.stock,
      "Đơn vị": p.unit,
      "Mô tả": p.description || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sản phẩm");
    XLSX.writeFile(workbook, "danh_sach_san_pham.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      // Map Excel columns to database fields
      // Assuming headers match export exactly or are similar
      const mappedData = data.map((row: any) => {
        // Find category by name or use a default
        const catName = row["Danh mục"] || row["Category"];
        const category = categories?.find((c: any) => c.name === catName);
        
        return {
          name: row["Tên sản phẩm"] || row["Name"],
          buyPrice: Number(row["Giá nhập"] || row["Buy Price"] || 0),
          sellPrice: Number(row["Giá bán"] || row["Sell Price"] || 0),
          stock: Number(row["Tồn kho"] || row["Stock"] || 0),
          unit: row["Đơn vị"] || row["Unit"] || "cái",
          description: row["Mô tả"] || row["Description"] || "",
          categoryId: category?.id || categories?.[0]?.id, // Default to first category if not found
        };
      }).filter(p => p.name); // Filter out empty rows

      if (mappedData.length > 0) {
        if (confirm(`Bạn có muốn nhập ${mappedData.length} sản phẩm từ file Excel?`)) {
          bulkCreateMutation.mutate(mappedData);
        }
      }
      
      // Reset input
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const openModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        buyPrice: product.buyPrice,
        sellPrice: product.sellPrice,
        stock: product.stock,
        unit: product.unit,
        categoryId: product.categoryId,
        image: product.image || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        buyPrice: 0,
        sellPrice: 0,
        stock: 0,
        unit: "cái",
        categoryId: categories?.[0]?.id || "",
        image: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      buyPrice: Number(formData.buyPrice),
      sellPrice: Number(formData.sellPrice),
      stock: Number(formData.stock),
    };
    if (editingProduct) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Sản phẩm</h2>
          <p className="text-gray-500 mt-1">Quản lý kho hàng và giá bán của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-2xl font-semibold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2 cursor-pointer">
            <Upload size={20} /> Nhập Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
          </label>
          <button
            onClick={handleExport}
            className="bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-2xl font-semibold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Download size={20} /> Xuất Excel
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> Thêm sản phẩm
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full md:w-48 pl-12 pr-10 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none font-medium"
              >
                <option value="">Tất cả danh mục</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-8 py-4">Sản phẩm</th>
                <th className="px-8 py-4">Danh mục</th>
                <th className="px-8 py-4">Giá bán</th>
                <th className="px-8 py-4">Tồn kho</th>
                <th className="px-8 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products?.map((product: any) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <Package size={24} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">Đơn vị: {product.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold">
                      {product.category?.name}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-gray-900">{formatCurrency(product.sellPrice)}</p>
                    <p className="text-xs text-gray-400 line-through">{formatCurrency(product.buyPrice)}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold",
                        product.stock <= 10 ? "text-orange-600" : "text-gray-900"
                      )}>
                        {product.stock}
                      </span>
                      {product.stock <= 10 && (
                        <AlertTriangle size={16} className="text-orange-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(product)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 py-2">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tên sản phẩm</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Nhập tên sản phẩm..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Danh mục</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    >
                      <option value="">Chọn danh mục</option>
                      {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Đơn vị</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Cái, hộp, kg..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Giá nhập</label>
                    <input
                      type="number"
                      value={formData.buyPrice}
                      onChange={(e) => setFormData({ ...formData, buyPrice: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Giá bán</label>
                    <input
                      type="number"
                      value={formData.sellPrice}
                      onChange={(e) => setFormData({ ...formData, sellPrice: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng tồn kho</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">URL Hình ảnh</label>
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
                      placeholder="Mô tả chi tiết sản phẩm..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {editingProduct ? "Cập nhật" : "Tạo mới"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

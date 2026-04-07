import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories, createCategory, updateCategory, deleteCategory, bulkDeleteCategories } from "../services/firebaseService";
import { Plus, Search, Edit2, Trash2, X, Tags } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Pagination from "../components/Pagination";

export default function Categories() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<any>(null);
  const [formData, setFormData] = React.useState({ name: "", description: "" });
  const [categories, setCategories] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const paginatedCategories = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = paginatedCategories.length > 0 && paginatedCategories.every(c => selected.has(c.id));
  const toggleAll = () => setSelected(allSelected ? new Set([...selected].filter(id => !paginatedCategories.find(c => c.id === id))) : new Set([...selected, ...paginatedCategories.map(c => c.id)]));
  const toggleOne = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  React.useEffect(() => {
    const unsubscribe = getCategories((data) => {
      setCategories(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: any) => createCategory(data),
    onSuccess: () => closeModal(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateCategory(editingCategory.id, data),
    onSuccess: () => closeModal(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteCategories(ids),
    onSuccess: () => setSelected(new Set()),
  });

  const openModal = (category?: any) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description || "" });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", description: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl"></div>)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Danh mục</h2>
          <p className="text-gray-500 mt-1">Quản lý các nhóm sản phẩm của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              onClick={() => {
                if (confirm(`Xóa ${selected.size} danh mục đã chọn?`)) {
                  bulkDeleteMutation.mutate(Array.from(selected));
                }
              }}
              className="bg-red-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-red-200 hover:bg-red-600 transition-all flex items-center gap-2"
            >
              <Trash2 size={18} /> Xóa {selected.size} mục
            </button>
          )}
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> Thêm danh mục
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm kiếm danh mục..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                </th>
                <th className="px-8 py-4">Tên danh mục</th>
                <th className="px-8 py-4">Mô tả</th>
                <th className="px-8 py-4 text-center">Sản phẩm</th>
                <th className="px-8 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCategories?.map((category: any) => (
                <tr key={category.id} className={`hover:bg-gray-50/50 transition-colors group ${selected.has(category.id) ? "bg-blue-50/50" : ""}`}>
                  <td className="px-6 py-5">
                    <input type="checkbox" checked={selected.has(category.id)} onChange={() => toggleOne(category.id)} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Tags size={20} />
                      </div>
                      <span className="font-bold text-gray-900">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-gray-500 max-w-xs truncate">
                    {category.description || "Không có mô tả"}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                      {category._count?.products ?? 0} sản phẩm
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(category)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Bạn có chắc chắn muốn xóa danh mục này?")) {
                            deleteMutation.mutate(category.id);
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
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
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
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingCategory ? "Sửa danh mục" : "Thêm danh mục mới"}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tên danh mục</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Ví dụ: Điện thoại, Phụ kiện..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-none"
                    placeholder="Nhập mô tả cho danh mục này..."
                  />
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
                    {editingCategory ? "Cập nhật" : "Tạo mới"}
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

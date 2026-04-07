import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getInvoices, bulkDeleteInvoices } from "../services/firebaseService";
import { cn } from "../lib/utils";
import { Plus, Search, FileText, Download, Eye, Calendar, User, Trash2 } from "lucide-react";
import Pagination from "../components/Pagination";
import { format } from "date-fns";
import { motion } from "motion/react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

import { useMutation } from "@tanstack/react-query";

export default function Invoices() {
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const filtered = invoices.filter(inv =>
    inv.number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const paginatedInvoices = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = paginatedInvoices.length > 0 && paginatedInvoices.every(i => selected.has(i.id));
  const toggleAll = () => setSelected(allSelected ? new Set([...selected].filter(id => !paginatedInvoices.find(i => i.id === id))) : new Set([...selected, ...paginatedInvoices.map(i => i.id)]));
  const toggleOne = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteInvoices(ids),
    onSuccess: () => setSelected(new Set()),
  });

  React.useEffect(() => {
    const unsubscribe = getInvoices((data) => {
      setInvoices(data);
      setIsLoading(false);
      setPage(1);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Hóa đơn</h2>
          <p className="text-gray-500 mt-1">Quản lý các giao dịch bán hàng của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              onClick={() => {
                if (confirm(`Xóa ${selected.size} hóa đơn đã chọn?`)) {
                  bulkDeleteMutation.mutate(Array.from(selected));
                }
              }}
              className="bg-red-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-red-200 hover:bg-red-600 transition-all flex items-center gap-2"
            >
              <Trash2 size={18} /> Xóa {selected.size} mục
            </button>
          )}
          <Link
            to="/invoices/create"
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> Tạo hóa đơn mới
          </Link>
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
              placeholder="Tìm kiếm hóa đơn..."
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
                <th className="px-8 py-4">Số hóa đơn</th>
                <th className="px-8 py-4">Khách hàng</th>
                <th className="px-8 py-4">Ngày tạo</th>
                <th className="px-8 py-4">Tổng tiền</th>
                <th className="px-8 py-4">Trạng thái</th>
                <th className="px-8 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedInvoices.map((invoice: any) => (
                <tr key={invoice.id} className={`hover:bg-gray-50/50 transition-colors group ${selected.has(invoice.id) ? "bg-blue-50/50" : ""}`}>
                  <td className="px-6 py-5">
                    <input type="checkbox" checked={selected.has(invoice.id)} onChange={() => toggleOne(invoice.id)} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <FileText size={20} />
                      </div>
                      <span className="font-bold text-gray-900">{invoice.number}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{invoice.customer.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar size={14} />
                      {invoice.createdAt ? format(invoice.createdAt.toDate ? invoice.createdAt.toDate() : new Date(invoice.createdAt), "dd/MM/yyyy") : "—"}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      invoice.status === "paid" ? "bg-green-50 text-green-600" :
                      invoice.status === "pending" ? "bg-orange-50 text-orange-600" :
                      "bg-red-50 text-red-600"
                    )}>
                      {invoice.status === "paid" ? "Đã thanh toán" :
                       invoice.status === "pending" ? "Chờ thanh toán" : "Đã hủy"}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all">
                        <Download size={18} />
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
    </div>
  );
}

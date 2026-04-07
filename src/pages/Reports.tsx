import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getReports } from "../services/firebaseService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, TrendingUp, Users, Package, ShoppingBag, Calendar, Filter, ChevronDown } from "lucide-react";
import { motion } from "motion/react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

const COLORS = ["#2563eb", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

export default function Reports() {
  const [stats, setStats] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = getReports((data) => {
      setStats(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const exportToCSV = () => {
    if (!stats?.topProducts) return;
    const headers = ["Sản phẩm", "Số lượng", "Doanh thu"];
    const rows = stats.topProducts.map((p: any) => [
      p.product?.name,
      p._sum.quantity,
      p._sum.total
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map((e: any) => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bao_cao_doanh_thu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className="animate-pulse space-y-8">
    <div className="h-96 bg-gray-200 rounded-3xl"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="h-80 bg-gray-200 rounded-3xl"></div>
      <div className="h-80 bg-gray-200 rounded-3xl"></div>
    </div>
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Báo cáo & Thống kê</h2>
          <p className="text-gray-500 mt-1">Phân tích chi tiết hoạt động kinh doanh của bạn.</p>
        </div>
        <button
          onClick={exportToCSV}
          className="bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-2xl font-semibold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"
        >
          <Download size={20} /> Xuất báo cáo (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">Doanh thu theo tháng</h3>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Năm 2024</span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Tháng 1", value: 45000000 },
                { name: "Tháng 2", value: 52000000 },
                { name: "Tháng 3", value: 48000000 },
                { name: "Tháng 4", value: 61000000 },
                { name: "Tháng 5", value: 55000000 },
                { name: "Tháng 6", value: 67000000 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(val) => `${val/1000000}M`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: "#fff", borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
          <h3 className="text-xl font-bold text-gray-900 mb-8">Phân bổ danh mục</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Điện thoại", value: 65 },
                    { name: "Phụ kiện", value: 25 },
                    { name: "Dịch vụ", value: 10 },
                  ]}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-4">
            {["Điện thoại", "Phụ kiện", "Dịch vụ"].map((item, idx) => (
              <div key={item} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                  <span className="text-sm font-medium text-gray-600">{item}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{idx === 0 ? "65%" : idx === 1 ? "25%" : "10%"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Package size={20} className="text-blue-600" /> Thống kê sản phẩm
          </h3>
          <div className="space-y-6">
            {stats?.topProducts?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-bold shadow-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.product?.name}</p>
                    <p className="text-xs text-gray-500">{item._sum.quantity} đơn vị đã bán</p>
                  </div>
                </div>
                <p className="font-bold text-blue-600">{formatCurrency(item._sum.total)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Users size={20} className="text-blue-600" /> Xếp hạng khách hàng
          </h3>
          <div className="space-y-6">
            {[
              { name: "Nguyễn Văn A", total: 45000000, count: 12 },
              { name: "Trần Thị B", total: 32000000, count: 8 },
              { name: "Lê Văn C", total: 28000000, count: 6 },
              { name: "Phạm Thị D", total: 15000000, count: 4 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-bold shadow-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.count} hóa đơn</p>
                  </div>
                </div>
                <p className="font-bold text-blue-600">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

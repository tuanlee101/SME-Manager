import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../services/firebaseService";
import { TrendingUp, ShoppingBag, AlertCircle, Users, Package, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion } from "motion/react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50 flex flex-col gap-4"
  >
    <div className="flex items-center justify-between">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} bg-opacity-10 text-${color.split("-")[1]}-600`}>
        <Icon size={24} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
          {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [stats, setStats] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = getDashboardStats((data) => {
      setStats(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-3xl"></div>)}
    </div>
    <div className="h-96 bg-gray-200 rounded-3xl"></div>
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Tổng quan</h2>
          <p className="text-gray-500 mt-1">Chào mừng bạn quay trở lại hệ thống quản lý.</p>
        </div>
        <button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
          Tạo báo cáo <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Doanh thu"
          value={formatCurrency(stats?.revenue)}
          icon={TrendingUp}
          color="bg-blue-500"
          trend={12.5}
        />
        <StatCard
          title="Đơn hàng"
          value={stats?.orders}
          icon={ShoppingBag}
          color="bg-purple-500"
          trend={8.2}
        />
        <StatCard
          title="Sắp hết hàng"
          value={stats?.lowStock}
          icon={AlertCircle}
          color="bg-orange-500"
          trend={-2.4}
        />
        <StatCard
          title="Khách hàng mới"
          value="124"
          icon={Users}
          color="bg-green-500"
          trend={15.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">Doanh thu 7 ngày qua</h3>
            <select className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium outline-none">
              <option>Tuần này</option>
              <option>Tuần trước</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: "T2", value: 4000 },
                { name: "T3", value: 3000 },
                { name: "T4", value: 2000 },
                { name: "T5", value: 2780 },
                { name: "T6", value: 1890 },
                { name: "T7", value: 2390 },
                { name: "CN", value: 3490 },
              ]}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Sản phẩm bán chạy</h3>
          <div className="space-y-6">
            {stats?.topProducts?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 group cursor-pointer">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Package size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.product?.name}</p>
                  <p className="text-xs text-gray-500">{item._sum.quantity} {item.product?.unit} đã bán</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(item._sum.total)}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
            Xem tất cả <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

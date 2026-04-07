import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Package, FileText, ShoppingBag, DollarSign, Download, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { getReportData } from "../services/firebaseService";
import * as XLSX from "xlsx";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
};

const toDate = (ts: any): Date =>
  ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);

const pct = (curr: number, prev: number) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / Math.abs(prev)) * 100);
};

const MONTH_LABELS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

// ─── Compute helpers ─────────────────────────────────────────────────────────

function computePeriodStats(
  invoices: any[], invoiceItems: any[], productMap: Record<string, any>,
  year: number, month: number          // month=0 → full year
) {
  const filtered = invoices.filter(inv => {
    if (!inv.createdAt) return false;
    const d = toDate(inv.createdAt);
    return d.getFullYear() === year && (month === 0 || d.getMonth() + 1 === month);
  });
  const ids = new Set(filtered.map(i => i.id));
  const items = invoiceItems.filter(i => ids.has(i.invoiceId));
  const revenue = filtered.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
  const cost = items.reduce((s, item) => {
    const buy = productMap[item.productId]?.buyPrice ?? 0;
    return s + buy * (item.quantity || 0);
  }, 0);
  return {
    revenue,
    cost,
    profit: revenue - cost,
    invoiceCount: filtered.length,
    unitsSold: items.reduce((s, i) => s + (i.quantity || 0), 0),
  };
}

function computeMonthlyChart(
  invoices: any[], invoiceItems: any[], productMap: Record<string, any>, year: number
) {
  return MONTH_LABELS.map((label, i) => {
    const s = computePeriodStats(invoices, invoiceItems, productMap, year, i + 1);
    return { label, ...s };
  });
}

function computeProductStats(
  invoices: any[], invoiceItems: any[], productMap: Record<string, any>,
  year: number, month: number
) {
  const filtered = invoices.filter(inv => {
    if (!inv.createdAt) return false;
    const d = toDate(inv.createdAt);
    return d.getFullYear() === year && (month === 0 || d.getMonth() + 1 === month);
  });
  const ids = new Set(filtered.map(i => i.id));
  const items = invoiceItems.filter(i => ids.has(i.invoiceId));

  const map: Record<string, any> = {};
  items.forEach(item => {
    const prod = productMap[item.productId];
    if (!map[item.productId]) {
      map[item.productId] = {
        id: item.productId,
        name: item.name || prod?.name || "Không tên",
        unitsSold: 0, revenue: 0, cost: 0,
      };
    }
    map[item.productId].unitsSold += item.quantity || 0;
    map[item.productId].revenue += (item.price || prod?.sellPrice || 0) * (item.quantity || 0);
    map[item.productId].cost += (prod?.buyPrice || 0) * (item.quantity || 0);
  });

  return Object.values(map).map(p => ({
    ...p,
    profit: p.revenue - p.cost,
    margin: p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400">
      <Minus size={12} /> 0%
    </span>
  );
  const up = value > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold", up ? "text-green-600" : "text-red-500")}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}{value}%
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, trend, color }: any) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50 p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">{label}</span>
        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", color)}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <div className="flex items-center gap-2">
        <TrendBadge value={trend} />
        <span className="text-xs text-gray-400">so với {sub}</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-4 min-w-[160px]">
      <p className="text-xs font-bold text-gray-500 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill || p.stroke }} />
            {p.name}
          </span>
          <span className="text-xs font-bold text-gray-900">{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Reports() {
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;

  const [rawData, setRawData] = React.useState<any>({ invoices: [], invoiceItems: [], productMap: {} });
  const [isLoading, setIsLoading] = React.useState(true);
  const [year, setYear] = React.useState(curYear);
  const [month, setMonth] = React.useState(0);          // 0 = full year
  const [sortKey, setSortKey] = React.useState<"revenue" | "profit" | "margin" | "unitsSold">("revenue");
  const [sortAsc, setSortAsc] = React.useState(false);

  React.useEffect(() => {
    const unsub = getReportData((data) => { setRawData(data); setIsLoading(false); });
    return () => unsub();
  }, []);

  // ── Computed data ──
  const { invoices, invoiceItems, productMap } = rawData;

  const current = React.useMemo(
    () => computePeriodStats(invoices, invoiceItems, productMap, year, month),
    [invoices, invoiceItems, productMap, year, month]
  );

  const previous = React.useMemo(() => {
    if (month === 0) return computePeriodStats(invoices, invoiceItems, productMap, year - 1, 0);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    return computePeriodStats(invoices, invoiceItems, productMap, prevYear, prevMonth);
  }, [invoices, invoiceItems, productMap, year, month]);

  const prevLabel = month === 0 ? `năm ${year - 1}` : month === 1 ? `T12/${year - 1}` : `T${month - 1}`;

  const monthlyThis = React.useMemo(
    () => computeMonthlyChart(invoices, invoiceItems, productMap, year),
    [invoices, invoiceItems, productMap, year]
  );
  const monthlyPrev = React.useMemo(
    () => computeMonthlyChart(invoices, invoiceItems, productMap, year - 1),
    [invoices, invoiceItems, productMap, year]
  );

  // Merge for chart
  const chartData = monthlyThis.map((m, i) => ({
    label: m.label,
    [`DT ${year}`]: m.revenue,
    [`LN ${year}`]: m.profit,
    [`DT ${year - 1}`]: monthlyPrev[i].revenue,
    [`LN ${year - 1}`]: monthlyPrev[i].profit,
    [`HĐ ${year}`]: m.invoiceCount,
    [`SP ${year}`]: m.unitsSold,
    [`HĐ ${year - 1}`]: monthlyPrev[i].invoiceCount,
    [`SP ${year - 1}`]: monthlyPrev[i].unitsSold,
  }));

  const productStats = React.useMemo(
    () => computeProductStats(invoices, invoiceItems, productMap, year, month),
    [invoices, invoiceItems, productMap, year, month]
  );

  const sortedProducts = React.useMemo(() => {
    return [...productStats].sort((a, b) => sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);
  }, [productStats, sortKey, sortAsc]);

  const years = React.useMemo(() => {
    const ys = new Set<number>();
    invoices.forEach((inv: any) => {
      if (inv.createdAt) ys.add(toDate(inv.createdAt).getFullYear());
    });
    ys.add(curYear);
    return [...ys].sort((a, b) => b - a);
  }, [invoices, curYear]);

  // ── Export ──
  const handleExport = () => {
    const rows = sortedProducts.map((p, i) => ({
      "STT": i + 1,
      "Sản phẩm": p.name,
      "Số lượng bán": p.unitsSold,
      "Doanh thu (VNĐ)": p.revenue,
      "Giá vốn (VNĐ)": p.cost,
      "Lợi nhuận (VNĐ)": p.profit,
      "Biên lợi nhuận (%)": p.margin,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sản phẩm");
    XLSX.writeFile(wb, `bao_cao_${year}${month ? `_T${month}` : ""}.xlsx`);
  };

  // ── Sort handler ──
  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey !== k ? <span className="text-gray-300 ml-1">↕</span> :
    sortAsc ? <span className="text-blue-500 ml-1">↑</span> :
    <span className="text-blue-500 ml-1">↓</span>;

  if (isLoading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-12 bg-gray-200 rounded-2xl w-64" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-3xl" />)}</div>
      <div className="h-80 bg-gray-200 rounded-3xl" />
      <div className="h-64 bg-gray-200 rounded-3xl" />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Báo cáo & Thống kê</h2>
          <p className="text-gray-500 mt-1">Doanh thu, lợi nhuận và hiệu suất sản phẩm.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year picker */}
          <div className="relative">
            <select
              value={year}
              onChange={e => { setYear(Number(e.target.value)); setMonth(0); }}
              className="appearance-none pl-4 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={handleExport}
            className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Download size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Month tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[{ label: "Cả năm", value: 0 }, ...MONTH_LABELS.map((l, i) => ({ label: l, value: i + 1 }))].map(tab => (
          <button
            key={tab.value}
            onClick={() => setMonth(tab.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              month === tab.value
                ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-200 hover:text-blue-600"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Doanh thu"
          value={fmtShort(current.revenue)}
          sub={prevLabel}
          trend={pct(current.revenue, previous.revenue)}
          color="bg-blue-50 text-blue-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="Lợi nhuận gộp"
          value={fmtShort(current.profit)}
          sub={prevLabel}
          trend={pct(current.profit, previous.profit)}
          color="bg-green-50 text-green-600"
        />
        <KpiCard
          icon={FileText}
          label="Số hóa đơn"
          value={current.invoiceCount.toString()}
          sub={prevLabel}
          trend={pct(current.invoiceCount, previous.invoiceCount)}
          color="bg-purple-50 text-purple-600"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Sản phẩm tiêu thụ"
          value={current.unitsSold.toString()}
          sub={prevLabel}
          trend={pct(current.unitsSold, previous.unitsSold)}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Revenue & Profit Chart */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Doanh thu & Lợi nhuận theo tháng</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> DT {year}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> LN {year}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-blue-300 inline-block" /> DT {year - 1}</span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={fmtShort} width={52} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={`DT ${year}`} fill="#3b82f6" radius={[5, 5, 0, 0]} barSize={14} />
              <Bar dataKey={`LN ${year}`} fill="#22c55e" radius={[5, 5, 0, 0]} barSize={14} />
              <Bar dataKey={`DT ${year - 1}`} fill="#bfdbfe" radius={[5, 5, 0, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Invoice & Units Chart */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Hóa đơn & Sản phẩm tiêu thụ theo tháng</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> HĐ {year}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-400 inline-block" /> SP {year}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 border-b-2 border-dashed border-blue-300 inline-block" /> HĐ {year - 1}</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey={`HĐ ${year}`} stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey={`SP ${year}`} stroke="#f97316" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey={`HĐ ${year - 1}`} stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey={`SP ${year - 1}`} stroke="#fed7aa" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product Performance Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm shadow-gray-200/50 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package size={20} className="text-blue-600" /> Hiệu suất sản phẩm
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {month === 0 ? `Năm ${year}` : `Tháng ${month}/${year}`} · {sortedProducts.length} sản phẩm
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/60 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4 w-10">#</th>
                <th className="px-6 py-4">Sản phẩm</th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort("unitsSold")}>
                  Số lượng <SortIcon k="unitsSold" />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort("revenue")}>
                  Doanh thu <SortIcon k="revenue" />
                </th>
                <th className="px-6 py-4 text-right">Giá vốn</th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort("profit")}>
                  Lợi nhuận <SortIcon k="profit" />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort("margin")}>
                  Biên LN <SortIcon k="margin" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedProducts.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">Chưa có dữ liệu</td></tr>
              ) : sortedProducts.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <span className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                      i === 0 ? "bg-yellow-100 text-yellow-700" :
                      i === 1 ? "bg-gray-100 text-gray-600" :
                      i === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-gray-50 text-gray-400"
                    )}>{i + 1}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-700">{p.unitsSold.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{fmtShort(p.revenue)}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">{fmtShort(p.cost)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn("text-sm font-bold", p.profit >= 0 ? "text-green-600" : "text-red-500")}>
                      {fmtShort(p.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold",
                      p.margin >= 30 ? "bg-green-50 text-green-700" :
                      p.margin >= 15 ? "bg-blue-50 text-blue-700" :
                      p.margin >= 0  ? "bg-orange-50 text-orange-700" :
                      "bg-red-50 text-red-600"
                    )}>
                      {p.margin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary row */}
        {sortedProducts.length > 0 && (
          <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Tổng doanh thu: </span>
              <span className="font-bold text-gray-900">{fmt(current.revenue)}</span>
            </div>
            <div>
              <span className="text-gray-500">Tổng lợi nhuận: </span>
              <span className={cn("font-bold", current.profit >= 0 ? "text-green-600" : "text-red-500")}>
                {fmt(current.profit)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Biên LN trung bình: </span>
              <span className="font-bold text-blue-600">
                {current.revenue > 0 ? Math.round(((current.revenue - current.cost) / current.revenue) * 100) : 0}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

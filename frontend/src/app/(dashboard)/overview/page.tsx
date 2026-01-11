"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  Shield,
  AlertTriangle,
  FolderKanban,
  ChevronDown,
  Info,
  Zap,
  Cpu,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DailyData {
  day: string;
  runs: number;
  findings: number;
  actions: number;
}

interface HourlyData {
  hour: string;
  runs: number;
  findings: number;
  actions: number;
}

interface OverviewStats {
  total_runs: number;
  total_findings: number;
  total_projects: number;
  active_projects: number;
  total_actions: number;
}

interface RecentRun {
  id: string;
  project_id: string;
  project_name: string;
  task: string | null;
  status: string;
  start_time: string;
  finding_count: number;
}

const CustomTooltip = ({ active, payload, label, isHourly }: any) => {
  if (active && payload && payload.length) {
    const formatDate = (str: string) => {
      try {
        if (isHourly) {
          return format(parseISO(str + ":00:00"), "MMM d, h:mm a");
        }
        return format(parseISO(str), "MMM d, yyyy");
      } catch (e) {
        return str;
      }
    };
    return (
      <div className="bg-[#121216] border border-white/10 p-3 rounded-lg shadow-2xl">
        <p className="text-textSecondary text-xs mb-2">
          {label ? formatDate(label) : ""}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-textPrimary">
              {entry.value.toLocaleString()}
            </span>
            <span className="text-[10px] text-textSecondary uppercase tracking-wider">
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (timeRange === "1d") {
      fetchHourlyStats();
    } else {
      fetchDailyStats();
    }
  }, [timeRange]);

  async function fetchStats() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const [overviewRes, dailyRes, recentRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/stats/daily`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/runs/recent?limit=4`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (overviewRes.ok) {
        setStats(await overviewRes.json());
      }
      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setChartData(data.data);
      }
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentRuns(recentData);
      } else {
        console.error(
          "Failed to fetch recent runs:",
          recentRes.status,
          recentRes.statusText
        );
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDailyStats() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/stats/daily`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChartData(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch daily stats:", e);
    }
  }

  async function fetchHourlyStats() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/stats/hourly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHourlyData(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch hourly stats:", e);
    }
  }

  const filteredData =
    timeRange === "1d"
      ? hourlyData
      : chartData.slice(timeRange === "7d" ? -7 : 0);

  return (
    <div className="px-12 py-10">
      {loading ? (
        <div className="py-20 text-center animate-pulse">
          <div className="w-12 h-12 border-2 border-white/5 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-textSecondary text-sm">
            Aggregating system logs...
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Main Analytics Section */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-semibold text-white font-display mb-1">
                  Overview
                </h2>
                <div className="flex items-center gap-2 text-textSecondary text-xs">
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    {format(
                      subDays(
                        new Date(),
                        timeRange === "30d" ? 30 : timeRange === "7d" ? 7 : 1
                      ),
                      "MMM d"
                    )}{" "}
                    - {format(new Date(), "MMM d, yyyy")}
                  </span>
                  <ChevronDown size={14} className="opacity-40" />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/[0.03] p-1 rounded-xl border border-white/5 shadow-inner">
                {["1d", "7d", "30d"].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      timeRange === range
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-textSecondary hover:text-white"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/[0.03] border border-white/5 p-8 rounded-2xl group/metric shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-textSecondary uppercase tracking-widest font-medium opacity-80">
                    Agent Executions
                  </span>
                  <Info
                    size={14}
                    className="text-textSecondary opacity-30 cursor-help hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-semibold text-white tracking-tight">
                    {(stats?.total_runs ?? 0).toLocaleString()}
                  </span>
                  <span className="text-sm text-textSecondary opacity-30">
                    Runs
                  </span>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/5 p-8 rounded-2xl group/metric shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-textSecondary uppercase tracking-widest font-medium opacity-80">
                    Actions Taken
                  </span>
                  <Info
                    size={14}
                    className="text-textSecondary opacity-30 cursor-help hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-semibold text-accent tracking-tight">
                    {(stats?.total_actions ?? 0).toLocaleString()}
                  </span>
                  <span className="text-sm text-textSecondary opacity-30">
                    Events
                  </span>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/5 p-8 rounded-2xl group/metric shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-textSecondary uppercase tracking-widest font-medium opacity-80">
                    Security Findings
                  </span>
                  <Info
                    size={14}
                    className="text-textSecondary opacity-30 cursor-help hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-semibold text-red-500 tracking-tight">
                    {(stats?.total_findings ?? 0).toLocaleString()}
                  </span>
                  <span className="text-sm text-textSecondary opacity-30">
                    Risks
                  </span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[220px] w-full -mx-4 mb-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorActions"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#93C5FD" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorFindings"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.03)"
                  />
                  <XAxis
                    dataKey={timeRange === "1d" ? "hour" : "day"}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#B3B3BF", fontSize: 10 }}
                    tickFormatter={(str) => {
                      try {
                        if (timeRange === "1d") {
                          return format(parseISO(str + ":00:00"), "h a");
                        }
                        return format(parseISO(str), "MMM d");
                      } catch (e) {
                        return str;
                      }
                    }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#B3B3BF", fontSize: 10 }}
                    dx={-10}
                  />
                  <Tooltip
                    content={<CustomTooltip isHourly={timeRange === "1d"} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="actions"
                    name="Actions"
                    stroke="#93C5FD"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorActions)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="runs"
                    name="Runs"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRuns)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="findings"
                    name="Findings"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFindings)"
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Activity Table */}
            <div className="border-t border-white/5 pt-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-semibold font-serif text-textSecondary uppercase tracking-[0.2em]">
                  Recent Activity
                </h3>
                <button
                  onClick={() => router.push("/projects")}
                  className="text-[10px] text-accent font-medium uppercase tracking-wider hover:underline"
                >
                  View All Projects
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-textSecondary font-serif uppercase tracking-widest opacity-50 border-b border-white/5">
                      <th className="pb-4 font-normal">Project</th>
                      <th className="pb-4 font-normal">Run ID</th>
                      <th className="pb-4 font-normal">Goal / Task</th>
                      <th className="pb-4 font-normal">Status</th>
                      <th className="pb-4 font-normal">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {recentRuns.map((run) => (
                      <tr
                        key={run.id}
                        onClick={() => router.push(`/runs/${run.id}`)}
                        className="group cursor-pointer hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-4 font-medium text-white opacity-80 group-hover:opacity-100">
                          {run.project_name}
                        </td>
                        <td className="py-4 text-accent font-mono opacity-70 group-hover:opacity-100">
                          {run.id.slice(0, 8)}
                        </td>
                        <td className="py-4 text-textSecondary group-hover:text-white transition-colors truncate max-w-[200px]">
                          {run.task || "Generic Security Test"}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1.5 font-serif capitalize">
                            <div
                              className={`w-1 h-1 rounded-full ${
                                run.status === "completed"
                                  ? "bg-green-400"
                                  : run.status === "running"
                                  ? "bg-accent animate-pulse"
                                  : "bg-red-400"
                              }`}
                            />
                            <span className="text-textSecondary group-hover:text-white transition-colors">
                              {run.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 text-textSecondary font-serif opacity-50">
                          {format(parseISO(run.start_time), "MMM d, h:mm a")}
                        </td>
                      </tr>
                    ))}
                    {recentRuns.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-10 text-center text-textSecondary font-serif italic opacity-40"
                        >
                          No recent activity recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

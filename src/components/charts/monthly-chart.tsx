"use client";
import { LineChart,Line,ResponsiveContainer,XAxis,YAxis,Tooltip } from "recharts";
export function MonthlyChart({data}:{data:any[]}){return <div className="h-64"><ResponsiveContainer><LineChart data={data}><XAxis dataKey="month"/><YAxis/><Tooltip/><Line dataKey="total" stroke="#10b981" strokeWidth={3}/></LineChart></ResponsiveContainer></div>}

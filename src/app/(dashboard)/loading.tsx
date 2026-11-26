import React from "react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 rounded-xl bg-[#241112]" />
          <div className="h-4 w-80 rounded-lg bg-[#1A0D0E]" />
        </div>
        <div className="h-8 w-40 rounded-full bg-[#241112]" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="kukang-card h-24 rounded-2xl p-4"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="kukang-card h-72 rounded-2xl" />
        <div className="kukang-card h-72 rounded-2xl" />
      </div>
    </div>
  );
}
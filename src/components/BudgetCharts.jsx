// src/components/BudgetCharts.jsx
// Budget charts component for spending trends and forecasts

import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, Calendar } from 'lucide-react';

/**
 * Line chart component for spending trends
 */
export const SpendingTrendChart = ({ trends, period = 'month' }) => {
  if (!trends || trends.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-8">
        <p>No trend data available</p>
      </div>
    );
  }

  const maxValue = Math.max(
    ...trends.map(t => Math.max(t.income || 0, t.expenses || 0))
  );

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Spending Trends
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          <span>Income</span>
          <span className="w-3 h-3 bg-red-500 rounded-full ml-4"></span>
          <span>Expenses</span>
        </div>
      </div>

      <div className="relative h-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y * 2}
              x2="800"
              y2={y * 2}
              stroke="#e5e7eb"
              strokeWidth="1"
              className="dark:stroke-gray-700"
            />
          ))}

          {/* Income line */}
          {trends.length > 1 && (
            <polyline
              points={trends.map((t, i) => {
                const x = (i / (trends.length - 1)) * 800;
                const y = 200 - ((t.income || 0) / maxValue) * 200;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
            />
          )}

          {/* Expenses line */}
          {trends.length > 1 && (
            <polyline
              points={trends.map((t, i) => {
                const x = (i / (trends.length - 1)) * 800;
                const y = 200 - ((t.expenses || 0) / maxValue) * 200;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
            />
          )}

          {/* Data points */}
          {trends.map((t, i) => {
            const x = (i / (trends.length - 1)) * 800;
            const incomeY = 200 - ((t.income || 0) / maxValue) * 200;
            const expenseY = 200 - ((t.expenses || 0) / maxValue) * 200;
            return (
              <g key={i}>
                <circle cx={x} cy={incomeY} r="4" fill="#3b82f6" />
                <circle cx={x} cy={expenseY} r="4" fill="#ef4444" />
              </g>
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
          {trends.map((t, i) => {
            if (i % Math.ceil(trends.length / 5) === 0 || i === trends.length - 1) {
              const date = new Date(t.period);
              const label = period === 'month' 
                ? date.toLocaleDateString('en-US', { month: 'short' })
                : period === 'week'
                ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : date.getFullYear().toString();
              return <span key={i}>{label}</span>;
            }
            return null;
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Avg Income</p>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
            ${(trends.reduce((sum, t) => sum + (t.income || 0), 0) / trends.length).toFixed(0)}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <p className="text-xs text-red-600 dark:text-red-400 mb-1">Avg Expenses</p>
          <p className="text-lg font-bold text-red-900 dark:text-red-100">
            ${(trends.reduce((sum, t) => sum + (t.expenses || 0), 0) / trends.length).toFixed(0)}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <p className="text-xs text-green-600 dark:text-green-400 mb-1">Avg Savings</p>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">
            ${(trends.reduce((sum, t) => sum + (t.savings || 0), 0) / trends.length).toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Forecast chart component
 */
export const ForecastChart = ({ forecast }) => {
  if (!forecast || !forecast.forecast || forecast.forecast.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-8">
        <Calendar className="h-12 w-12 mx-auto mb-2" />
        <p>No forecast data available</p>
        <p className="text-sm mt-2">{forecast?.message || 'Need more historical data'}</p>
      </div>
    );
  }

  const maxValue = Math.max(
    ...forecast.forecast.map(f => Math.max(f.projectedIncome || 0, f.projectedExpenses || 0))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          6-Month Forecast
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Confidence: {forecast.confidence.toFixed(0)}%
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Projected Income</p>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
              ${forecast.projectedIncome.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Projected Expenses</p>
            <p className="text-xl font-bold text-red-900 dark:text-red-100">
              ${forecast.projectedExpenses.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Projected Savings</p>
            <p className="text-xl font-bold text-green-900 dark:text-green-100">
              ${forecast.projectedSavings.toFixed(0)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {forecast.forecast.map((month, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900 dark:text-white">
                  {month.monthName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {month.confidence.toFixed(0)}% confidence
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Income</p>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                    ${month.projectedIncome.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Expenses</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    ${month.projectedExpenses.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Savings</p>
                  <p className={`font-semibold ${
                    month.projectedSavings >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    ${month.projectedSavings.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpendingTrendChart;


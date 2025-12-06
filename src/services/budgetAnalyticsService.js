// src/services/budgetAnalyticsService.js
// Budget analytics service for forecasting, trends, and insights

class BudgetAnalyticsService {
  /**
   * Calculate financial forecast based on historical data
   * @param {Array} transactions - Array of transaction objects
   * @param {Array} budgets - Array of budget objects
   * @param {number} months - Number of months to forecast
   * @returns {Object} Forecast data
   */
  calculateForecast(transactions, budgets, months = 6) {
    if (!transactions || transactions.length === 0) {
      return {
        forecast: [],
        projectedIncome: 0,
        projectedExpenses: 0,
        projectedSavings: 0,
        confidence: 0,
      };
    }

    // Group transactions by month
    const monthlyData = this.groupByMonth(transactions);
    const monthsArray = Object.keys(monthlyData).sort();
    
    if (monthsArray.length < 2) {
      return {
        forecast: [],
        projectedIncome: 0,
        projectedExpenses: 0,
        projectedSavings: 0,
        confidence: 0,
        message: 'Need at least 2 months of data for forecasting',
      };
    }

    // Calculate averages and trends
    const incomeData = monthsArray.map(month => ({
      month,
      income: monthlyData[month].income || 0,
      expenses: monthlyData[month].expenses || 0,
    }));

    // Simple linear regression for income trend
    const incomeTrend = this.calculateTrend(incomeData.map(d => d.income));
    const expenseTrend = this.calculateTrend(incomeData.map(d => d.expenses));

    // Get latest month data
    const latestMonth = incomeData[incomeData.length - 1];
    const avgIncome = incomeData.reduce((sum, d) => sum + d.income, 0) / incomeData.length;
    const avgExpenses = incomeData.reduce((sum, d) => sum + d.expenses, 0) / incomeData.length;

    // Generate forecast
    const forecast = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + 1);

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(startDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const monthKey = forecastDate.toISOString().slice(0, 7);

      // Project based on trend and average
      const projectedIncome = Math.max(0, avgIncome + (incomeTrend * (i + 1)));
      const projectedExpenses = Math.max(0, avgExpenses + (expenseTrend * (i + 1)));
      const projectedSavings = projectedIncome - projectedExpenses;

      forecast.push({
        month: monthKey,
        monthName: forecastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        projectedIncome: Math.round(projectedIncome * 100) / 100,
        projectedExpenses: Math.round(projectedExpenses * 100) / 100,
        projectedSavings: Math.round(projectedSavings * 100) / 100,
        confidence: Math.max(0, 100 - (i * 15)), // Decreases confidence for further months
      });
    }

    const totalProjectedIncome = forecast.reduce((sum, f) => sum + f.projectedIncome, 0);
    const totalProjectedExpenses = forecast.reduce((sum, f) => sum + f.projectedExpenses, 0);
    const totalProjectedSavings = totalProjectedIncome - totalProjectedExpenses;

    // Calculate confidence based on data quality
    const confidence = Math.min(100, Math.max(0, 100 - (monthsArray.length < 3 ? 30 : 0)));

    return {
      forecast,
      projectedIncome: totalProjectedIncome,
      projectedExpenses: totalProjectedExpenses,
      projectedSavings: totalProjectedSavings,
      confidence,
      averageMonthlyIncome: avgIncome,
      averageMonthlyExpenses: avgExpenses,
      trend: {
        income: incomeTrend > 0 ? 'increasing' : incomeTrend < 0 ? 'decreasing' : 'stable',
        expenses: expenseTrend > 0 ? 'increasing' : expenseTrend < 0 ? 'decreasing' : 'stable',
      },
    };
  }

  /**
   * Calculate spending trends
   * @param {Array} transactions - Array of transaction objects
   * @param {string} period - 'month', 'week', 'year'
   * @returns {Object} Trend data
   */
  calculateSpendingTrends(transactions, period = 'month') {
    if (!transactions || transactions.length === 0) {
      return {
        trends: [],
        categoryTrends: {},
        totalTrend: 'stable',
        message: 'No data available',
      };
    }

    const grouped = this.groupTransactions(transactions, period);
    const periods = Object.keys(grouped).sort();

    const trends = periods.map(periodKey => {
      const periodData = grouped[periodKey];
      const income = periodData.income || 0;
      const expenses = periodData.expenses || 0;
      const savings = income - expenses;

      return {
        period: periodKey,
        income,
        expenses,
        savings,
        savingsRate: income > 0 ? (savings / income * 100) : 0,
      };
    });

    // Calculate category trends
    const categoryTrends = this.calculateCategoryTrends(transactions, period);

    // Determine overall trend
    const totalTrend = this.determineTrend(trends.map(t => t.expenses));

    return {
      trends,
      categoryTrends,
      totalTrend,
      periodCount: periods.length,
    };
  }

  /**
   * Get spending insights
   * @param {Array} transactions - Array of transaction objects
   * @param {Array} budgets - Array of budget objects
   * @returns {Object} Insights
   */
  getInsights(transactions, budgets) {
    if (!transactions || transactions.length === 0) {
      return {
        insights: [],
        recommendations: [],
      };
    }

    const insights = [];
    const recommendations = [];

    // Calculate category spending
    const categorySpending = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + (t.amount || 0);
      });

    // Find top spending category
    const topCategory = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCategory) {
      insights.push({
        type: 'top_category',
        message: `Your highest spending category is ${topCategory[0]} at ${this.formatCurrency(topCategory[1])}`,
        category: topCategory[0],
        amount: topCategory[1],
      });
    }

    // Check budget vs actual
    budgets.forEach(budget => {
      const spent = categorySpending[budget.category] || 0;
      const percentage = budget.amount > 0 ? (spent / budget.amount * 100) : 0;
      
      if (percentage > 100) {
        insights.push({
          type: 'over_budget',
          message: `You're ${percentage.toFixed(0)}% over budget for ${budget.category}`,
          category: budget.category,
          percentage,
        });
        recommendations.push({
          type: 'reduce_spending',
          message: `Consider reducing spending in ${budget.category} category`,
          category: budget.category,
        });
      } else if (percentage > 80) {
        insights.push({
          type: 'near_budget',
          message: `You're approaching your budget limit for ${budget.category}`,
          category: budget.category,
          percentage,
        });
      }
    });

    // Calculate savings rate
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;

    if (savingsRate < 0) {
      recommendations.push({
        type: 'negative_savings',
        message: 'You are spending more than you earn. Consider reducing expenses or increasing income.',
      });
    } else if (savingsRate < 10) {
      recommendations.push({
        type: 'low_savings',
        message: 'Your savings rate is low. Aim for at least 20% savings rate.',
      });
    } else if (savingsRate >= 20) {
      insights.push({
        type: 'good_savings',
        message: `Great job! You're saving ${savingsRate.toFixed(1)}% of your income.`,
        percentage: savingsRate,
      });
    }

    return {
      insights,
      recommendations,
      savingsRate,
    };
  }

  /**
   * Export transactions to CSV
   * @param {Array} transactions - Array of transaction objects
   * @returns {string} CSV string
   */
  exportToCSV(transactions) {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Account'];
    const rows = transactions.map(t => [
      t.date ? new Date(t.date).toLocaleDateString() : '',
      t.type || '',
      t.category || '',
      t.description || '',
      `$${(t.amount || 0).toFixed(2)}`,
      t.account || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Export budget report to CSV
   * @param {Array} transactions - Array of transaction objects
   * @param {Array} budgets - Array of budget objects
   * @param {Object} stats - Statistics object
   * @returns {string} CSV string
   */
  exportBudgetReportToCSV(transactions, budgets, stats) {
    const lines = [];

    // Summary section
    lines.push('Budget Report Summary');
    lines.push(`Generated: ${new Date().toLocaleDateString()}`);
    lines.push('');
    lines.push('Total Income,Total Expenses,Net Savings,Savings Rate');
    lines.push(`${stats.income || 0},${stats.expenses || 0},${stats.balance || 0},${(stats.savingsRate || 0).toFixed(2)}%`);
    lines.push('');

    // Budget vs Actual
    if (budgets.length > 0) {
      lines.push('Budget vs Actual');
      lines.push('Category,Budgeted,Spent,Remaining,Percentage');
      budgets.forEach(budget => {
        const spent = stats.expensesByCategory[budget.category] || 0;
        const remaining = budget.amount - spent;
        const percentage = budget.amount > 0 ? (spent / budget.amount * 100) : 0;
        lines.push(`${budget.category},${budget.amount},${spent},${remaining},${percentage.toFixed(2)}%`);
      });
      lines.push('');
    }

    // Spending by category
    lines.push('Spending by Category');
    lines.push('Category,Amount');
    Object.entries(stats.expensesByCategory || {}).forEach(([category, amount]) => {
      lines.push(`${category},${amount}`);
    });
    lines.push('');

    // Transactions
    lines.push('Transactions');
    lines.push('Date,Type,Category,Description,Amount');
    transactions.forEach(t => {
      lines.push([
        t.date ? new Date(t.date).toLocaleDateString() : '',
        t.type || '',
        t.category || '',
        t.description || '',
        t.amount || 0,
      ].join(','));
    });

    return lines.join('\n');
  }

  /**
   * Generate PDF report (returns HTML that can be printed as PDF)
   * @param {Array} transactions - Array of transaction objects
   * @param {Array} budgets - Array of budget objects
   * @param {Object} stats - Statistics object
   * @param {Object} forecast - Forecast data
   * @returns {string} HTML string
   */
  generatePDFReport(transactions, budgets, stats, forecast = null) {
    const now = new Date();
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Budget Report - ${now.toLocaleDateString()}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f3f4f6;
      font-weight: bold;
      color: #374151;
    }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Budget Report</h1>
    <p>Generated on ${now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}</p>
  </div>

  <div class="section">
    <div class="section-title">Financial Summary</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Income</div>
        <div class="stat-value positive">$${(stats.income || 0).toFixed(2)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Expenses</div>
        <div class="stat-value negative">$${(stats.expenses || 0).toFixed(2)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Net Savings</div>
        <div class="stat-value ${(stats.balance || 0) >= 0 ? 'positive' : 'negative'}">
          $${(stats.balance || 0).toFixed(2)}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Savings Rate</div>
        <div class="stat-value">${(stats.savingsRate || 0).toFixed(1)}%</div>
      </div>
    </div>
  </div>

  ${budgets.length > 0 ? `
  <div class="section">
    <div class="section-title">Budget vs Actual</div>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Budgeted</th>
          <th>Spent</th>
          <th>Remaining</th>
          <th>% Used</th>
        </tr>
      </thead>
      <tbody>
        ${budgets.map(budget => {
          const spent = stats.expensesByCategory[budget.category] || 0;
          const remaining = budget.amount - spent;
          const percentage = budget.amount > 0 ? (spent / budget.amount * 100) : 0;
          return `
          <tr>
            <td>${budget.category}</td>
            <td>$${budget.amount.toFixed(2)}</td>
            <td>$${spent.toFixed(2)}</td>
            <td class="${remaining >= 0 ? 'positive' : 'negative'}">$${remaining.toFixed(2)}</td>
            <td>${percentage.toFixed(1)}%</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${forecast ? `
  <div class="section">
    <div class="section-title">6-Month Forecast</div>
    <p>Projected Income: $${forecast.projectedIncome.toFixed(2)}</p>
    <p>Projected Expenses: $${forecast.projectedExpenses.toFixed(2)}</p>
    <p>Projected Savings: $${forecast.projectedSavings.toFixed(2)}</p>
    <p><small>Confidence: ${forecast.confidence.toFixed(0)}%</small></p>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Spending by Category</div>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Amount</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(stats.expensesByCategory || {})
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => {
            const percentage = stats.expenses > 0 ? (amount / stats.expenses * 100) : 0;
            return `
            <tr>
              <td>${category}</td>
              <td>$${amount.toFixed(2)}</td>
              <td>${percentage.toFixed(1)}%</td>
            </tr>
            `;
          }).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>This report was generated by Family Housing Hub</p>
    <p>For questions or support, please contact your administrator</p>
  </div>
</body>
</html>
    `;
    return html;
  }

  // Helper methods
  groupByMonth(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      if (!t.date) return;
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      const monthKey = date.toISOString().slice(0, 7);
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (t.type === 'income') {
        grouped[monthKey].income += t.amount || 0;
      } else if (t.type === 'expense') {
        grouped[monthKey].expenses += t.amount || 0;
      }
    });
    return grouped;
  }

  groupTransactions(transactions, period) {
    const grouped = {};
    transactions.forEach(t => {
      if (!t.date) return;
      const date = t.date instanceof Date ? t.date : new Date(t.date);
      let periodKey;
      
      if (period === 'month') {
        periodKey = date.toISOString().slice(0, 7);
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().slice(0, 10);
      } else {
        periodKey = date.getFullYear().toString();
      }
      
      if (!grouped[periodKey]) {
        grouped[periodKey] = { income: 0, expenses: 0 };
      }
      
      if (t.type === 'income') {
        grouped[periodKey].income += t.amount || 0;
      } else if (t.type === 'expense') {
        grouped[periodKey].expenses += t.amount || 0;
      }
    });
    return grouped;
  }

  calculateCategoryTrends(transactions, period) {
    const grouped = this.groupTransactions(transactions, period);
    const periods = Object.keys(grouped).sort();
    const categoryTrends = {};
    
    periods.forEach(periodKey => {
      const periodTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const date = t.date instanceof Date ? t.date : new Date(t.date);
        let transactionPeriod;
        
        if (period === 'month') {
          transactionPeriod = date.toISOString().slice(0, 7);
        } else if (period === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          transactionPeriod = weekStart.toISOString().slice(0, 10);
        } else {
          transactionPeriod = date.getFullYear().toString();
        }
        
        return transactionPeriod === periodKey;
      });
      
      periodTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          if (!categoryTrends[t.category]) {
            categoryTrends[t.category] = [];
          }
          categoryTrends[t.category].push({
            period: periodKey,
            amount: t.amount || 0,
          });
        });
    });
    
    return categoryTrends;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i + 1) * v, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  determineTrend(values) {
    if (values.length < 2) return 'stable';
    const trend = this.calculateTrend(values);
    if (trend > 0.05) return 'increasing';
    if (trend < -0.05) return 'decreasing';
    return 'stable';
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  }
}

export const budgetAnalytics = new BudgetAnalyticsService();
export default budgetAnalytics;


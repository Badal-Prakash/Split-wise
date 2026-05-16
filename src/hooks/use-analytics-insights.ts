import { useMemo } from "react";

export function useAnalyticsInsights(data: any) {
  return useMemo(() => {
    if (!data) return [];

    const insights: Array<{ title: string; description: string; type: "positive" | "warning" | "info" }> = [];
    const { monthly, categories, userContribution } = data;

    // 1. Spending Spike Detection
    if (monthly?.length > 0) {
      const latest = monthly[monthly.length - 1];
      const previous = monthly[monthly.length - 2];
      if (previous) {
        const growth = (latest.total / previous.total) - 1;
        if (growth > 0.2) {
          insights.push({
            title: "Spending Spike Detected",
            description: `Your spending in ${latest.month} increased by ${Math.round(growth * 100)}% compared to last month.`,
            type: "warning"
          });
        } else if (growth < -0.2) {
          insights.push({
            title: "Spending Drop",
            description: `Great job! Your spending decreased by ${Math.round(Math.abs(growth) * 100)}% this month.`,
            type: "positive"
          });
        }
      }
    }

    // 2. Category Dominance
    if (categories?.length > 0) {
      const topCategory = categories[0];
      const totalSpend = categories.reduce((sum: number, c: any) => sum + c.total, 0);
      const percentage = (topCategory.total / totalSpend) * 100;
      if (percentage > 40) {
        insights.push({
          title: "Category Dominance",
          description: `${topCategory.category} is your largest expense, taking up ${Math.round(percentage)}% of your total spend.`,
          type: "info"
        });
      }
    }

    // 3. Contribution Analysis
    if (userContribution?.length > 1) {
      const maxContrib = Math.max(...userContribution.map((u: any) => u.total));
      const minContrib = Math.min(...userContribution.map((u: any) => u.total));
      if (maxContrib / minContrib > 3) {
        insights.push({
          title: "Spending Imbalance",
          description: "There is a significant difference between the highest and lowest contributor in your groups.",
          type: "warning"
        });
      }
    }

    return insights;
  }, [data]);
}

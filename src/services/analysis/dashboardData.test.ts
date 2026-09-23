import { describe, expect, it } from "vitest";
import type { DashboardMetrics } from "../../types";
import { buildRawStatusDistribution, buildStatusDistribution } from "./dashboardData";

const metrics: DashboardMetrics = {
  total: 20,
  successCount: 10,
  errorCount: 4,
  instabilityCount: 3,
  noResultCount: 2,
  warningCount: 1,
  pendingCount: 0,
  processingCount: 0,
  cancelledCount: 0,
  otherCount: 0,
  successRate: 0.5,
  errorRate: 0.2,
  instabilityRate: 0.15,
  noResultRate: 0.1,
  warningRate: 0.05,
  technicalErrorCount: 7,
  businessResultCount: 3,
};

describe("dashboard chart data", () => {
  it("uses absolute counts for every pie slice", () => {
    const distribution = buildStatusDistribution(metrics);

    expect(distribution.find((item) => item.name === "Sem resultados")?.value).toBe(2);
    expect(distribution.reduce((sum, item) => sum + item.value, 0)).toBe(20);
  });

  it("keeps a stable color and calculates the rate for each status", () => {
    const distribution = buildStatusDistribution(metrics);
    const error = distribution.find((item) => item.key === "error");

    expect(error?.color).toBe("#dc2626");
    expect(error?.rate).toBe(0.2);
  });

  it("omits empty slices", () => {
    const distribution = buildStatusDistribution({ ...metrics, warningCount: 0 });
    expect(distribution.some((item) => item.name === "Aviso")).toBe(false);
  });

  it("keeps distinct report statuses in the percentage view", () => {
    const distribution = buildRawStatusDistribution([
      { status: "Sucesso", canonicalStatus: "success" },
      { status: "Site Error", canonicalStatus: "error" },
      { status: "Site Instável", canonicalStatus: "instability" },
      { status: "Site Error", canonicalStatus: "error" },
    ]);

    expect(distribution.find((item) => item.name === "Site Error")?.rate).toBe(0.5);
    expect(distribution.find((item) => item.name === "Site Instável")?.rate).toBe(0.25);
  });
});

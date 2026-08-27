import { describe, expect, it } from "vitest";
import { analyzeReport } from "./index";
import { analyzeAttempts, analyzeRetries } from "./attempts";
import { analyzeRobots } from "./robots";
import { analyzeTenants } from "./tenants";
import { analyzeEnvironments } from "./environments";
import { analyzeStages } from "./stageAnalysis";
import { analyzeProblems } from "./problems";
import { computeMetrics } from "./metrics";
import { makeClassified } from "../../fixtures/sampleExecutions";
import { classifyExecution } from "./classifier";
import { makeExecution } from "../../fixtures/sampleExecutions";

function classifiedFrom(message: string, extra: Parameters<typeof makeExecution>[0] = {}) {
  return classifyExecution(makeExecution({ message, ...extra }));
}

describe("metrics", () => {
  it("computes dashboard cards from status, not from invented numbers", () => {
    const executions = [
      classifiedFrom("ok", { status: "Sucesso", canonicalStatus: "success" }),
      classifiedFrom("Downloaded file not found", { status: "Erro", canonicalStatus: "error" }),
      classifiedFrom("site down", { status: "Site Instável", canonicalStatus: "instability", message: "O site não está disponivel, será realizada uma nova tentativa de emissão." }),
      classifiedFrom("ICMS", { status: "Sem Resultados", canonicalStatus: "no_result", message: "O ICMS ainda não foi liberado para pagamento ou o débito é inexistente." }),
      classifiedFrom("aviso", { status: "Aviso", canonicalStatus: "warning", message: "Contribuinte não localizado no Cadastro Centralizado de Contribuintes." }),
    ];
    const metrics = computeMetrics(executions);
    expect(metrics.total).toBe(5);
    expect(metrics.successCount).toBe(1);
    expect(metrics.errorCount).toBe(1);
    expect(metrics.instabilityCount).toBe(1);
    expect(metrics.noResultCount).toBe(1);
    expect(metrics.warningCount).toBe(1);
  });
});

describe("problems grouping", () => {
  it("groups by message and counts affected robots", () => {
    const executions = [
      classifiedFrom("Downloaded file not found", { robot: "R1" }),
      classifiedFrom("Downloaded file not found", { robot: "R2" }),
      classifiedFrom("Downloaded file not found", { robot: "R1" }),
    ];
    const problems = analyzeProblems(executions);
    expect(problems[0].count).toBe(3);
    expect(problems[0].robotCount).toBe(2);
    expect(problems[0].category).toBe("download");
  });
});

describe("retries", () => {
  it("counts retries, recovered and still failing from Tentativa", () => {
    const executions = [
      classifiedFrom("Site instável", { attempt: 1, status: "Site Instável", canonicalStatus: "instability" }),
      classifiedFrom("ok", { attempt: 2, status: "Sucesso", canonicalStatus: "success", message: "gerada com sucesso" }),
      classifiedFrom("SwitchToFrame", { attempt: 2, status: "Erro", canonicalStatus: "error", message: "Ocorreu um erro ao executar a instrução: SwitchToFrame" }),
      classifiedFrom("SwitchToFrame", { attempt: 3, status: "Erro", canonicalStatus: "error", message: "Ocorreu um erro ao executar a instrução: SwitchToFrame" }),
    ];
    const retries = analyzeRetries(executions);
    expect(retries.neededRetry).toBe(3);
    expect(retries.recovered).toBe(1);
    expect(retries.stillFailing).toBe(2);
    const attempts = analyzeAttempts(executions);
    expect(attempts.find((item) => item.attempt === 1)?.total).toBe(1);
    expect(attempts.find((item) => item.attempt === 3)?.total).toBe(1);
  });
});

describe("stages", () => {
  it("ranks failing automation stages", () => {
    const executions = [
      classifiedFrom("Ocorreu um erro ao executar a instrução: ClicarOpcaoCertidoes", { robot: "A" }),
      classifiedFrom("Ocorreu um erro ao executar a instrução: ClicarOpcaoCertidoes", { robot: "B" }),
      classifiedFrom("Ocorreu um erro ao executar a instrução: SwitchToFrame", { robot: "A" }),
    ];
    const stages = analyzeStages(executions);
    expect(stages[0].stage).toBe("ClicarOpcaoCertidoes");
    expect(stages[0].count).toBe(2);
    expect(stages[0].robotCount).toBe(2);
  });
});

describe("robots tenants environments", () => {
  it("builds robot ranking with a problem score", () => {
    const executions = [
      ...Array.from({ length: 8 }, (_, i) =>
        classifiedFrom("Downloaded file not found", { id: `e${i}`, robot: "BB8_CES", canonicalStatus: "error", status: "Erro" }),
      ),
      classifiedFrom("ok", { id: "ok1", robot: "BB8_CES", status: "Sucesso", canonicalStatus: "success", message: "BB8_CES gerada com sucesso" }),
      classifiedFrom("ok", { id: "ok2", robot: "Outro", robotId: "robot-2", status: "Sucesso", canonicalStatus: "success", message: "ok" }),
    ];
    const robots = analyzeRobots(executions);
    expect(robots[0].robot).toBe("BB8_CES");
    expect(robots[0].errorCount).toBe(8);
    expect(robots[0].problemScore).toBeGreaterThan(robots[1].problemScore);
  });

  it("aggregates tenants and environments", () => {
    const executions = [
      classifiedFrom("err", { tenant: "grupoilm", environment: "prod", status: "Erro", canonicalStatus: "error" }),
      classifiedFrom("ok", { tenant: "grupoilm", environment: "prod", status: "Sucesso", canonicalStatus: "success", message: "ok" }),
      classifiedFrom("err", { tenant: "suporte", environment: "hom", status: "Erro", canonicalStatus: "error" }),
    ];
    const tenants = analyzeTenants(executions);
    const envs = analyzeEnvironments(executions);
    expect(tenants.find((item) => item.tenant === "grupoilm")?.total).toBe(2);
    expect(envs.find((item) => item.environment === "prod")?.successCount).toBe(1);
    expect(envs.find((item) => item.environment === "hom")?.errorCount).toBe(1);
  });
});

describe("analyzeReport", () => {
  it("returns a complete dashboard model", () => {
    const executions = [
      makeClassified({ canonicalStatus: "success", eventType: "success", status: "Sucesso", message: "ok" }),
      makeClassified(),
    ];
    const analysis = analyzeReport(executions);
    expect(analysis.metrics.total).toBe(2);
    expect(analysis.summary.length).toBeGreaterThan(3);
    expect(analysis.problems.length).toBeGreaterThan(0);
  });
});

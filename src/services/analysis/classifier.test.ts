import { describe, expect, it } from "vitest";
import { classifyExecution, classifyMessage, matchErrorRule } from "./classifier";
import { extractStage } from "./stages";
import { makeExecution } from "../../fixtures/sampleExecutions";

describe("classifier", () => {
  it("classifies download failures as technical high", () => {
    const result = classifyMessage("Downloaded file not found");
    expect(result.category).toBe("download");
    expect(result.severity).toBe("high");
    expect(result.eventType).toBe("technical_error");
    expect(result.matchedRuleId).toBe("download-file-not-found");
  });

  it("classifies ICMS as business result, not a broken robot", () => {
    const result = classifyMessage(
      "O ICMS ainda não foi liberado para pagamento ou o débito é inexistente. Verifique os dados informados ou tente novamente mais tarde.",
    );
    expect(result.category).toBe("business_rule");
    expect(result.eventType).toBe("business_result");
    expect(result.severity).toBe("info");
  });

  it("classifies IP block as critical infrastructure", () => {
    const result = classifyMessage("Acesso negado. Seu IP foi temporariamente bloqueado.");
    expect(result.category).toBe("infrastructure");
    expect(result.severity).toBe("critical");
  });

  it("keeps Sem Resultados as business even if the message is negative", () => {
    const row = classifyExecution(
      makeExecution({
        status: "Sem Resultados",
        canonicalStatus: "no_result",
        message: "Nenhum Item encontrado",
      }),
    );
    expect(row.eventType).toBe("business_result");
    expect(row.canonicalStatus).toBe("no_result");
  });

  it("does not treat success as an error", () => {
    const row = classifyExecution(
      makeExecution({
        status: "Sucesso",
        canonicalStatus: "success",
        message: "BB8_CES gerada com sucesso",
      }),
    );
    expect(row.eventType).toBe("success");
    expect(row.severity).toBe("info");
  });

  it("matches automation instruction errors", () => {
    const result = classifyMessage("Ocorreu um erro ao executar a instrução: SwitchToFrame");
    expect(result.category).toBe("automation");
    expect(result.severity).toBe("high");
    expect(result.stage).toBe("SwitchToFrame");
  });

  it("returns undefined when no rule matches", () => {
    expect(matchErrorRule("mensagem inédita xyz")).toBeUndefined();
  });
});

describe("stage extraction", () => {
  it("extracts instruction names from real messages", () => {
    expect(extractStage("Ocorreu um erro ao executar a instrução: ClicarOpcaoCertidoes")).toBe(
      "ClicarOpcaoCertidoes",
    );
    expect(extractStage("Ocorreu um erro ao executar a instrução: FillCNPJ")).toBe("FillCNPJ");
    expect(extractStage("Ocorreu um erro ao executar a instrução: ClicarLoginClassico")).toBe(
      "ClicarLoginClassico",
    );
  });

  it("does not treat ICMS as an automation stage", () => {
    expect(
      extractStage("O ICMS ainda não foi liberado para pagamento ou o débito é inexistente."),
    ).toBeUndefined();
  });
});

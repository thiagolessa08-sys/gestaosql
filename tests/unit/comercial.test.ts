import { describe, it, expect } from "vitest"
import {
  COLUNAS_COMERCIAL,
  getEtapaConfig,
  ATIVIDADES_COMERCIAL,
  getEtapaDaAtividade,
  getAtividadesDaEtapa,
  getPrimeiraAtividade,
} from "@/lib/comercial"
import { EtapaComercial, AtividadeComercial } from "@prisma/client"

describe("COLUNAS_COMERCIAL", () => {
  it("deve ter 7 colunas", () => {
    expect(COLUNAS_COMERCIAL).toHaveLength(7)
  })

  it("deve ter as colunas na ordem correta", () => {
    const ids = COLUNAS_COMERCIAL.map((c) => c.enum)
    expect(ids).toEqual([
      EtapaComercial.SUSPECT,
      EtapaComercial.LEAD,
      EtapaComercial.PROSPECT_C,
      EtapaComercial.PROSPECT_B,
      EtapaComercial.PROSPECT_A,
      EtapaComercial.CONCLUIDO,
      EtapaComercial.PERDIDO,
    ])
  })
})

describe("getEtapaConfig", () => {
  it("retorna config correta para SUSPECT", () => {
    const config = getEtapaConfig(EtapaComercial.SUSPECT)
    expect(config.label).toBe("Suspect")
    expect(config.enum).toBe(EtapaComercial.SUSPECT)
  })

  it("retorna config correta para CONCLUIDO", () => {
    const config = getEtapaConfig(EtapaComercial.CONCLUIDO)
    expect(config.label).toBe("Concluído")
  })

  it("retorna config correta para PERDIDO", () => {
    const config = getEtapaConfig(EtapaComercial.PERDIDO)
    expect(config.label).toBe("Perdido")
  })
})

describe("ATIVIDADES_COMERCIAL", () => {
  it("deve ter 17 atividades", () => {
    expect(ATIVIDADES_COMERCIAL).toHaveLength(17)
  })
})

describe("getEtapaDaAtividade", () => {
  it("DOR_ADMITIDA pertence a PROSPECT_C", () => {
    expect(getEtapaDaAtividade(AtividadeComercial.DOR_ADMITIDA)).toBe(EtapaComercial.PROSPECT_C)
  })

  it("TR_ETP pertence a PROSPECT_B", () => {
    expect(getEtapaDaAtividade(AtividadeComercial.TR_ETP)).toBe(EtapaComercial.PROSPECT_B)
  })

  it("ASSINATURA_CONTRATO pertence a PROSPECT_A", () => {
    expect(getEtapaDaAtividade(AtividadeComercial.ASSINATURA_CONTRATO)).toBe(EtapaComercial.PROSPECT_A)
  })
})

describe("getAtividadesDaEtapa", () => {
  it("PROSPECT_C tem 4 atividades", () => {
    expect(getAtividadesDaEtapa(EtapaComercial.PROSPECT_C)).toHaveLength(4)
  })

  it("PROSPECT_B tem 6 atividades", () => {
    expect(getAtividadesDaEtapa(EtapaComercial.PROSPECT_B)).toHaveLength(6)
  })

  it("CONCLUIDO não tem atividades", () => {
    expect(getAtividadesDaEtapa(EtapaComercial.CONCLUIDO)).toHaveLength(0)
  })
})

describe("getPrimeiraAtividade", () => {
  it("primeira de PROSPECT_B é LEVANTAMENTO_AMBIENTE", () => {
    expect(getPrimeiraAtividade(EtapaComercial.PROSPECT_B)).toBe(AtividadeComercial.LEVANTAMENTO_AMBIENTE)
  })

  it("primeira de SUSPECT é MAPEAMENTO", () => {
    expect(getPrimeiraAtividade(EtapaComercial.SUSPECT)).toBe(AtividadeComercial.MAPEAMENTO)
  })

  it("CONCLUIDO retorna null", () => {
    expect(getPrimeiraAtividade(EtapaComercial.CONCLUIDO)).toBeNull()
  })

  it("PERDIDO retorna null", () => {
    expect(getPrimeiraAtividade(EtapaComercial.PERDIDO)).toBeNull()
  })
})

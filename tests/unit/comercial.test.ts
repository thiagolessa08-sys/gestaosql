import { describe, it, expect } from "vitest"
import { COLUNAS_COMERCIAL, getEtapaConfig } from "@/lib/comercial"
import { EtapaComercial } from "@prisma/client"

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

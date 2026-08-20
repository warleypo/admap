class CampaignService {
  constructor(model) {
    this.model = model;
    if (!this.model.campaigns) {
      this.model.campaigns = [];
    }
  }

  /**
   * Verifica se já existe alguma campanha ativa no sistema.
   */
  hasActiveCampaign() {
    return this.model.campaigns.some((c) => c.status === "Ativa");
  }

  /**
   * Retorna a campanha atualmente aberta/ativa.
   */
  getActiveCampaign() {
    return this.model.campaigns.find((c) => c.status === "Ativa") || null;
  }

  /**
   * Tenta abrir uma nova campanha respeitando a trava de segurança.
   */
  createCampaign(name, startDate) {
    if (this.hasActiveCampaign()) {
      const active = this.getActiveCampaign();
      throw new Error(
        `Não é possível abrir uma nova campanha. A campanha "${active.name}" ainda está aberta.`,
      );
    }

    const newCampaign = {
      id: Date.now(),
      name,
      startDate,
      endDate: null,
      status: "Ativa",
    };

    this.model.campaigns.push(newCampaign);
    return newCampaign;
  }

  /**
   * Encerra a campanha ativa atual.
   */
  closeActiveCampaign(endDate) {
    const active = this.getActiveCampaign();
    if (!active) {
      throw new Error("Nenhuma campanha ativa para encerrar.");
    }

    active.endDate = endDate || new Date().toISOString().split("T")[0];
    active.status = "Concluída";
    return active;
  }
}

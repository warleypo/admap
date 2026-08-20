class CampaignService {
  constructor(model, uiView) {
    this.model = model;
    this.uiView = uiView;
    if (!this.model.campaigns) {
      this.model.campaigns = [];
    }
  }

  /**
   * Verifica se já existe alguma campanha ativa no sistema.
   */
  hasActiveCampaign() {
    return this.model.campaignData.some((c) => c.status === "andamento");
  }

  /**
   * Retorna a campanha atualmente aberta/ativa.
   */
  getActiveCampaign() {
    return (
      this.model.campaignData.find((c) => c.status === "andamento") || null
    );
  }

  isDateBetween(date, startDate, endDate) {
    const d = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return d.getTime() >= start && d.getTime() <= end.getTime();
  }

  closeServiceYear(
    callback = () => {},
    serviceYear = this.model.getServiceYear(new Date()),
  ) {
    const id = "cmp_" + new Date().getTime();
    // const serviceYear = serviceYear || this.model.getServiceYear(new Date());
    if (serviceYear === "Sem data") return;

    if (this.hasActiveCampaign()) {
      const activeCampaign = this.getActiveCampaign();
      this.model.closeCampaign(activeCampaign.id, new Date());
    }

    const archivedCampaign = {
      id,
      name: `Ano de Serviço (${serviceYear})`,
      startDate: new Date(serviceYear.split("-")[0], 8, 1)
        .toISOString()
        .split("T")[0],
      endDate: new Date(serviceYear.split("-")[1], 7, 31)
        .toISOString()
        .split("T")[0],
      status: "concluida",
    };

    this.model.campaignData.push(archivedCampaign);

    // console.log(archivedCampaign);

    this.model.appData.map((t) => {
      t.quadras.forEach((q) => {
        const dateBetween = this.isDateBetween(
          q.startDate,
          archivedCampaign.startDate,
          archivedCampaign.endDate,
        );
        console.log(
          `Quadra ${q.number} do território ${t.name} - Data: ${q.startDate} - Entre: ${archivedCampaign.startDate} e ${archivedCampaign.endDate} - Está entre? ${dateBetween}`,
        );
        if (
          (dateBetween || q.startDate === "") &&
          (dateBetween || q.endDate === "")
        ) {
          this.model.campaignHistory.push({
            campaignId: archivedCampaign.id,
            territoryName: t.name,
            quadraNumber: q.number,
            status: q.status,
            startDate: q.startDate,
            endDate: q.endDate,
          });

          q.status = "pendente";
          q.startDate = "";
          q.endDate = "";
        } else {
          this.model.campaignHistory.push({
            campaignId: archivedCampaign.id,
            territoryName: t.name,
            quadraNumber: q.number,
            status: "andamento",
            startDate: q.startDate,
            endDate: "",
          });

          q.status = "andamento";
          q.startDate = archivedCampaign.startDate;
          q.endDate = "";
        }
      });
    });

    this.model.save();

    this.uiView.showToast(
      `🗓️ ${archivedCampaign.name} fechado e arquivado com sucesso!`,
    );

    callback();
  }
}

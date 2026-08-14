class TerritoryModel {
  constructor() {
    this.appData =
      JSON.parse(localStorage.getItem("janubaTerritoriesData")) || [];
    this.campaignData =
      JSON.parse(localStorage.getItem("janubaCampaignsData")) || [];
    this.campaignHistory =
      JSON.parse(localStorage.getItem("janubaCampaignHistory")) || [];
    this.showAllTerritories = false;
    this.selectedTerritoryId = null;
    this.editingTerritoryShapeId = null;
  }

  save() {
    localStorage.setItem("janubaTerritoriesData", JSON.stringify(this.appData));
    localStorage.setItem(
      "janubaCampaignsData",
      JSON.stringify(this.campaignData),
    );
    localStorage.setItem(
      "janubaCampaignHistory",
      JSON.stringify(this.campaignHistory),
    );
  }

  addTerritory(name, color, bounds) {
    const newId = "ter_" + Date.now();
    const territory = { id: newId, name, color, bounds, quadras: [] };
    this.appData.push(territory);
    this.selectedTerritoryId = newId;
    this.save();
    return territory;
  }

  updateTerritory(id, name, color) {
    const territory = this.appData.find((t) => t.id === id);
    if (territory) {
      territory.name = name;
      territory.color = color;
      this.save();
    }
  }

  updateTerritoryBounds(id, bounds) {
    const territory = this.appData.find((t) => t.id === id);
    if (territory) {
      territory.bounds = bounds;
      this.save();
    }
  }

  deleteTerritory(id) {
    this.appData = this.appData.filter((t) => t.id !== id);
    if (this.selectedTerritoryId === id) this.selectedTerritoryId = null;
    this.save();
  }

  addQuadra(territoryId, lat, lng) {
    const territory = this.appData.find((t) => t.id === territoryId);
    if (!territory) return null;
    const todayStr = new Date().toISOString().split("T")[0];
    const newQuadra = {
      id: `q_${Date.now()}`,
      number: territory.quadras.length + 1,
      lat,
      lng,
      status: "pendente",
      startDate: todayStr,
      endDate: "",
    };
    territory.quadras.push(newQuadra);
    this.save();
    return newQuadra;
  }

  updateQuadra(territoryId, quadraId, status, startDate, endDate) {
    const territory = this.appData.find((t) => t.id === territoryId);
    if (!territory) return;
    const quadra = territory.quadras.find((q) => q.id === quadraId);
    if (quadra) {
      quadra.status = status;
      quadra.startDate = startDate;
      quadra.endDate = endDate;
      this.save();
    }
  }

  deleteQuadra(territoryId, quadraId) {
    const territory = this.appData.find((t) => t.id === territoryId);
    if (!territory) return;
    const idx = territory.quadras.findIndex((q) => q.id === quadraId);
    if (idx !== -1) {
      const removed = territory.quadras[idx];
      this.campaignHistory = this.campaignHistory.filter(
        (h) =>
          !(
            h.territoryName === territory.name &&
            h.quadraNumber === removed.number
          ),
      );
      territory.quadras.splice(idx, 1);
      territory.quadras.forEach((q, i) => (q.number = i + 1));
      this.save();
    }
  }

  createCampaign(name) {
    const active = this.campaignData.find((c) => c.status === "em_andamento");
    if (active) this.closeCampaign(active.id);

    const campaignId = "cmp_" + Date.now();
    const newCampaign = {
      id: campaignId,
      name,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      status: "em_andamento",
    };

    this.appData.forEach((t) => {
      t.quadras.forEach((q) => {
        q.baseStatus = {
          status: q.status,
          startDate: q.startDate,
          endDate: q.endDate,
        };
        q.status = "pendente";
        q.startDate = newCampaign.startDate;
        q.endDate = "";
      });
    });

    this.campaignData.push(newCampaign);
    this.save();
  }

  closeCampaign(campaignId) {
    const cmp = this.campaignData.find((c) => c.id === campaignId);
    if (!cmp) return;
    cmp.status = "concluida";
    cmp.endDate = new Date().toISOString().split("T")[0];

    this.appData.forEach((t) => {
      t.quadras.forEach((q) => {
        this.campaignHistory.push({
          campaignId,
          territoryName: t.name,
          quadraNumber: q.number,
          status: q.status,
          startDate: q.startDate,
          endDate: q.endDate || cmp.endDate,
        });

        if (q.baseStatus) {
          q.status = q.baseStatus.status;
          q.startDate = q.baseStatus.startDate;
          q.endDate = q.baseStatus.endDate;
          delete q.baseStatus;
        }
      });
    });

    this.save();
  }
}

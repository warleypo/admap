class ReportService {
  constructor(model) {
    this.model = model;
  }

  /**
   * Obtém um resumo geral de cobertura e progresso de todos os territórios.
   */
  getOverallProgressReport() {
    const territories = this.model.appData || [];
    const total = territories.length;

    if (total === 0) {
      return { total: 0, completed: 0, pending: 0, percentage: 0 };
    }

    const completed = territories.filter((t) => {
      const terDetail = this.getTerritoryDetailReport(t.id);
      return terDetail.total && terDetail.total === terDetail.concluidas;
    }).length;

    const pending = total - completed;
    const progress = Math.round((completed / total) * 100);

    return {
      total,
      completed,
      pending,
      progress,
    };
  }

  /**
   * Gera relatório detalhado das quadras e trabalho pendente de um território específico.
   */
  getTerritoryDetailReport(territoryId) {
    const territory = (this.model.appData || []).find(
      (t) => t.id === territoryId,
    );
    if (!territory) return null;

    const pendentes = territory.quadras.filter(
      (ter) => ter.status === "pendente",
    ).length;
    const concluidas = territory.quadras.filter(
      (ter) => ter.status === "concluida",
    ).length;
    const iniciadas = territory.quadras.length - concluidas - pendentes;

    const progress =
      territory.quadras.length > 0
        ? Math.round((concluidas / territory.quadras.length) * 100)
        : 0;

    return {
      id: territory.id,
      name: territory.name || "Território Sem Nome",
      status: territory.status || "Em Andamento",
      assignedTo: territory.assignedTo || "Não atribuído",
      total: territory.quadras.length,
      concluidas,
      pendentes,
      iniciadas,
      progress,
      notes: territory.notes || "Nenhuma observação registrada.",
    };
  }

  /**
   * Retorna a lista de territórios com mais tempo sem trabalhar (para priorização).
   */
  getInactiveTerritoriesReport(daysThreshold = 30) {
    const territories = this.model.appData || [];
    const now = new Date();

    return territories
      .filter((t) => {
        if (!t.lastWorkedDate) return true;
        const lastDate = new Date(t.lastWorkedDate);
        const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        return diffDays >= daysThreshold;
      })
      .map((t) => ({
        id: t.id,
        name: t.name,
        lastWorkedDate: t.lastWorkedDate || "Nunca trabalhado",
        assignedTo: t.assignedTo || "Livre",
      }));
  }

  calculeStatus(detail) {
    if (detail.concluidas === detail.total && detail.concluidas !== 0) {
      return "Concluída";
    }

    if (detail.concluidas < detail.total && detail.concluidas > 0) {
      return "Em Andamento";
    }

    return "Pendente";
  }

  /**
   * Formata os dados de progresso para impressão tabular ou modal de relatório.
   */
  generatePrintableSummaryHTML() {
    const summary = this.getOverallProgressReport();
    const territories = this.model.appData || [];

    let rowsHTML = territories
      .map((t) => {
        const detail = this.getTerritoryDetailReport(t.id);
        return `
        <tr>
          <td>${detail.name}</td>
          <td>${detail.assignedTo}</td>
          <td>${detail.concluidas}/${detail.total} (${detail.progress}%)</td>
          <td>${this.calculeStatus(detail)}</td>
        </tr>
      `;
      })
      .join("");

    return `
      <div class="report-container">
        <h2>📊 Relatório Geral de Cobertura dos Territórios</h2>
        <p><strong>Progresso Total:</strong> ${summary.completed} de ${summary.total} concluídos (${summary.progress}%)</p>
        <hr>
        <table class="report-table" border="1" style="width:100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr>
              <th>Território</th>
              <th>Designado a</th>
              <th>Quadras Trabalhadas</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }

  generateS13() {
    let s13 = `
    <div style="font-weight: bold; font-size: 16pt; text-align: center; margin-bottom: 10px;">
    Registro de Designações de Territórios (S13)</div>
    <div class="s13-container" style="font-family: monospace; font-size: 12pt; width: 100%; display: flex; flex-direction: column;">`;

    const records = {};

    this.model.appData.map((territory) => {
      const gHistory = this.model.getGroupedHistory(territory.history || []);
      Object.keys(gHistory).map((ano) => {
        if (!records[ano]) records[ano] = [];
        console.log("ghistory", gHistory[ano]);
        records[ano] = records[ano]?.concat(
          gHistory[ano].map((h) => {
            h["territoryName"] = territory.name;
            return h;
          }),
        );
      });
    });

    console.log("records", records);

    Object.keys(records).map((k) => {
      s13 += `
      <div style="font-weight: bold; margin-top: 20px; margin-bottom: 10px; width: 100%;">Ano de Serviço: ${k}</div>\n`;

      let terNumber = 1;
      let currentTerritory = "";
      records[k].map((h) => {
        if (currentTerritory !== "" && currentTerritory !== h.territoryName) {
          s13 += `</div>`;
        }
        if (currentTerritory !== h.territoryName) {
          s13 += `
          \t<div style="font-weight: bold; margin-top: 10px; width: 100%; border: 1px solid #ccc; padding: 4px;">${h.territoryName}</div>\n
          \t<div style="display: flex; flex-direction: row; justify-content: start; border-bottom: 1px solid #ccc; padding: 0;">\n
          \t\t<div style="font-weight: bold; text-align: center; padding: 4px; background-color: #ccc; display: flex; align-items: center;">${terNumber++}</div>\n`;
        }
        console.log("h", h);

        s13 += `
          <div  style="display: flex; flex-direction: column; justify-content: space-between; border-left: 1px solid #ccc; padding: 0; border-right: 1px solid #ccc; padding: 0;">
            <div style="border-bottom: 1px solid #ccc; padding: 0; width: 100%; text-align: center;">
              ${h.assigneeName || "Sem designação"}
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; gap: 10px; width: 100%; background-color: #e0e0e0;">
              <div style="font-weight: bold; flex-grow: 1; text-align: center; padding: 4px; ">Designação</div>
              <div style="font-weight: bold; flex-grow: 1; text-align: center; padding: 4px; ">Conclusão</div>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 10px;">
              <div style="padding: 4px; text-align: center;">${ConvertDate.convertStringDateToBR(h.assignmentDate) || ""}</div>
              <div style="padding: 4px; text-align: center;">${ConvertDate.convertStringDateToBR(h.completionDate) || ""}</div>
            </div>
          </div>
        `;

        currentTerritory = h.territoryName;
      });
      s13 += `</div>`;
    });

    return s13;
  }

  /**
   * Gera um relatório com o percentual de progresso de cada território
   * baseado na quantidade de quadras concluídas.
   */
  getTerritoriesCompletionPercentage() {
    const territories = this.model.appData || [];

    return territories.map((territory) => {
      const totalQuadras = territory.quadras.length;
      const quadrasConcluidas = territory.quadras.filter(
        (q) => q.status === "concluida",
      ).length;
      const quadrasAndamento = territory.quadras.filter(
        (q) => q.status === "andamento",
      ).length;
      const quadrasPendentes = territory.quadras.filter(
        (q) => q.status === "pendente",
      ).length;

      // Cálculo da porcentagem (evita divisão por zero)
      const percentage =
        totalQuadras > 0
          ? Math.round((quadrasConcluidas / totalQuadras) * 100)
          : 0;

      return {
        id: territory.id,
        name: territory.name,
        totalQuadras,
        quadrasConcluidas,
        quadrasAndamento,
        quadrasPendentes,
        percentage,
      };
    });
  }

  /**
   * Gera a tabela HTML pronta para visualização e impressão
   */
  generatePercentageReportHTML() {
    const data = this.getTerritoriesCompletionPercentage();

    let rowsHTML = data
      .map(
        (t) => `
      <tr>
        <td><strong>${t.name}</strong></td>
        <td style="text-align: center;">${t.totalQuadras}</td>
        <td style="text-align: center; color: #166534;">${t.quadrasConcluidas}</td>
        <td style="text-align: center; color: #854d0e;">${t.quadrasAndamento}</td>
        <td style="text-align: center; color: #475569;">${t.quadrasPendentes}</td>
        <td style="text-align: center; font-weight: bold;">${t.percentage}%</td>
      </tr>
    `,
      )
      .join("");

    if (data.length === 0) {
      rowsHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum território cadastrado.</td></tr>`;
    }

    return `
    <div class="report-header">
      <h2>📊 Relatório de Progresso por Território</h2>
      <p>Janaúba - MG | Emitido em: ${new Date().toLocaleDateString("pt-BR")}</p>
    </div>
    <table border="1" style="width:100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="text-align: left; padding: 8px;">Território / Bairro</th>
          <th>Total Quadras</th>
          <th>Concluídas</th>
          <th>Em Andamento</th>
          <th>Pendentes</th>
          <th>Progresso</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
  `;
  }
}

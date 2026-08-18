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
}

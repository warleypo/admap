class AppController {
  constructor(
    model,
    mapView,
    uiView,
    printService,
    whatsappService,
    reportService,
    campaignService,
  ) {
    this.model = model;
    this.mapView = mapView;
    this.uiView = uiView;
    this.printService = printService;
    this.whatsappService = whatsappService;
    this.reportService = reportService;
    this.campaignService = campaignService;

    this.tempPolygonLayer = null;
    this.editingTerritoryId = null;
    this.activeQuadraId = null;
    this.isAddingQuadraMode = false;
    this.selectedTerritoryIdForQuadra = null;

    this.shiftKey = false;

    this.initEvents();
    this.renderAll();
  }

  initEvents() {
    // Ações de cabeçalho / Globais
    document.getElementById("btnStartDraw").onclick = () =>
      this.startDrawingTerritory();
    document.getElementById("btnOpenCampaign").onclick = () =>
      this.openCampaignModal();
    document.getElementById("btnOpenReport").onclick = (e) =>
      this.openReportTypeModal(e);
    document.getElementById("btnPrintMap").onclick = () =>
      this.printCurrentMapScreen();
    document.getElementById("btnAssignTerritory").onclick = () =>
      this.openAssignmentModal();
    document.getElementById("btnCloseAssignTerritory").onclick = () =>
      this.closeAssignmentModal();
    document.getElementById("btnCloseCampaignModal").onclick = () =>
      (document.getElementById("modalCampaign").style.display = "none");
    document.getElementById("btnSaveAssignTerritory").onclick = (e) =>
      this.handleAssignmentSubmit(e);
    // Ações de Relatórios
    document.getElementById("btnGenerateContinuousReport").onclick = () =>
      this.generateReport("continuous");
    document.getElementById("btnGenerateArchiveReport").onclick = () =>
      this.generateReport("archive");
    document.getElementById("btnGenerateS13Report").onclick = () =>
      this.generateReport("s13");
    document.getElementById("btnCloseReportTypeModal").onclick = () =>
      this.closeReportTypeModal();
    document.getElementById("btnGenerateReport").onclick = () =>
      this.generateAndPrintReport();
    document.getElementById("btnGeneratePercentageReport").onclick = () =>
      this.generateReport("percentage");

    document.getElementById("btnCloseServiceYear").onclick = async () => {
      const confirmed = await this.uiView.showConfirmDialog(
        "📦 Encerrar Ano de Serviço",
        `Deseja realmente encerrar o ano de serviço (<strong>${this.model.getServiceYear(new Date())}</strong>)? Os dados serão salvos no histórico como uma campanha.`,
        "Encerrar",
        "btn-warning",
      );

      if (confirmed) {
        this.campaignService.closeServiceYear(
          this.openCampaignModal.bind(this),
        );
        this.renderAll();
      }
    };

    document.getElementById("togglePrintGuide").onchange = (e) => {
      const guide = document.getElementById("a4PrintGuide");
      if (guide) guide.style.display = e.target.checked ? "flex" : "none";
    };

    document.getElementById("globalShowAll").onchange = (e) => {
      this.model.showAllTerritories = e.target.checked;
      this.renderAll();
      if (e.target.checked) this.mapView.fitAll();
    };

    // Cliques no Mapa
    this.mapView.map.on("click", (e) => this.handleMapClick(e));

    // Eventos de Modais
    document.getElementById("btnSaveTerritoryInfo").onclick = () =>
      this.saveTerritoryInfo();
    document.getElementById("btnCancelTerritoryModal").onclick = () =>
      this.cancelTerritoryModal();
    document.getElementById("btnSaveQuadra").onclick = () =>
      this.saveQuadraData();
    document.getElementById("btnDeleteQuadra").onclick = () =>
      this.deleteCurrentQuadra();
    document.getElementById("btnCreateCampaign").onclick = () =>
      this.createNewCampaign();
    // document.getElementById("btnGenerateReport").onclick = () =>
    //   this.generateAndPrintReport();

    // Cancela o modo de adição de quadras ao pressionar ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isAddingQuadraMode) {
        this.disableAddQuadraMode();
      }
    });
  }

  renderAll() {
    this.mapView.clearMap();

    this.model.appData.forEach((territory) => {
      const isVisible =
        this.model.showAllTerritories ||
        this.model.selectedTerritoryId === territory.id;
      const polygon = this.mapView.drawTerritoryPolygon(territory, isVisible);

      territory.quadras.forEach((q) => {
        this.mapView.drawQuadraMarker(
          territory.id,
          q,
          isVisible,
          () => this.openQuadraModal(territory.id, q.id),
          (newLat, newLng) => {
            q.lat = newLat;
            q.lng = newLng;
            this.model.save();
            this.uiView.showToast(`Posição da Quadra ${q.number} atualizada!`);
          },
        );
      });
    });

    this.uiView.renderTerritoryCards(
      this.model.appData,
      this.model.selectedTerritoryId,
      this.model.editingTerritoryShapeId,
      {
        onSelect: (id) => this.selectTerritory(id),
        onEditInfo: (id) => this.editTerritoryInfo(id),
        onAddQuadra: (id) => {
          if (
            this.isAddingQuadraMode &&
            this.selectedTerritoryIdForQuadra === id
          ) {
            this.disableAddQuadraMode();
          } else {
            this.enableAddQuadraMode(id);
          }
        },
        onEditNodes: (id) => this.editTerritoryNodes(id),
        onSaveShape: (id) => this.saveTerritoryShape(id),
        onShareWhatsApp: (id) => {
          const territory = this.model.appData.find((t) => t.id === id);
          this.selectTerritory(id); // Seleciona o território antes de compartilhar
          this.whatsappService.prepareMapForShare(territory);
        },
        onDelete: (id) => this.deleteTerritory(id),
      },
      this.isAddingQuadraMode ? this.model.selectedTerritoryId : null,
    );
  }

  selectTerritory(id) {
    if (
      this.model.editingTerritoryShapeId &&
      this.model.editingTerritoryShapeId !== id
    ) {
      this.mapView.disablePolygonEdit(this.model.editingTerritoryShapeId);
      this.model.editingTerritoryShapeId = null;
    }

    this.model.selectedTerritoryId =
      this.model.selectedTerritoryId === id ? null : id;
    this.renderAll();

    if (this.model.selectedTerritoryId && this.mapView.territoryPolygons[id]) {
      const poly = this.mapView.territoryPolygons[id];
      this.mapView.fitBounds(poly.getBounds());

      // Recolta o painel no mobile para dar foco ao mapa selecionado
      this.uiView.collapseSidebarOnMobile();
    }

    console.log("Território selecionado:", this.model.selectedTerritoryId);
  }

  startDrawingTerritory() {
    this.mapView.enableDraw((layer) => {
      this.tempPolygonLayer = layer;
      this.editingTerritoryId = null;
      document.getElementById("modalTerritoryTitle").innerText =
        "Cadastrar Território";
      document.getElementById("territoryNameInput").value = "";
      document.getElementById("territoryColorInput").value = "#3b82f6";
      this.uiView.toggleModal("modalTerritory", true);
    });
  }

  editTerritoryInfo(id) {
    const territory = this.model.appData.find((t) => t.id === id);
    if (!territory) return;
    if (this.model.selectedTerritoryId !== id) this.selectTerritory(id);

    this.editingTerritoryId = id;
    document.getElementById("modalTerritoryTitle").innerText =
      "Editar Território";
    document.getElementById("territoryNameInput").value = territory.name;
    document.getElementById("territoryColorInput").value = territory.color;
    this.uiView.toggleModal("modalTerritory", true);
  }

  saveTerritoryInfo() {
    const name = document.getElementById("territoryNameInput").value.trim();
    const color = document.getElementById("territoryColorInput").value;
    if (!name)
      return this.uiView.showToast("Por favor, informe o nome do território.");

    if (this.editingTerritoryId) {
      this.model.updateTerritory(this.editingTerritoryId, name, color);
    } else {
      const latLngs = this.tempPolygonLayer
        .getLatLngs()[0]
        .map((pt) => [pt.lat, pt.lng]);
      this.model.addTerritory(name, color, latLngs);
    }

    this.uiView.toggleModal("modalTerritory", false);
    if (this.tempPolygonLayer) {
      this.mapView.map.removeLayer(this.tempPolygonLayer);
      this.tempPolygonLayer = null;
    }
    this.editingTerritoryId = null;
    this.renderAll();
  }

  cancelTerritoryModal() {
    this.uiView.toggleModal("modalTerritory", false);
    if (this.tempPolygonLayer) {
      this.mapView.map.removeLayer(this.tempPolygonLayer);
      this.tempPolygonLayer = null;
    }
    this.editingTerritoryId = null;
  }

  editTerritoryNodes(id) {
    if (this.model.editingTerritoryShapeId) {
      this.mapView.disablePolygonEdit(this.model.editingTerritoryShapeId);
    }

    this.model.editingTerritoryShapeId = id;
    this.model.selectedTerritoryId = id;
    this.renderAll();

    const poly = this.mapView.territoryPolygons[id];
    if (poly) {
      this.mapView.fitBounds(poly.getBounds());
      this.mapView.enablePolygonEdit(id);
    }
    this.uiView.showToast(
      "✏️ Arraste os pontos para ajustar. Clique em '💾 Salvar Forma' no card ao concluir.",
    );
  }

  saveTerritoryShape(id) {
    const poly = this.mapView.territoryPolygons[id];
    if (poly) {
      const latLngsRaw = poly.getLatLngs()[0];
      const latLngs = latLngsRaw.map((pt) => [pt.lat, pt.lng]);
      this.model.updateTerritoryBounds(id, latLngs);
      this.mapView.disablePolygonEdit(id);
      this.model.editingTerritoryShapeId = null;
      this.uiView.showToast("✅ Formato do território atualizado com sucesso!");
      this.renderAll();
    }
  }

  async deleteTerritory(id) {
    const territory = this.model.appData.find((t) => t.id === id);
    if (!territory) return;
    const confirmed = await this.uiView.showConfirmDialog(
      "🗑️ Excluir Território",
      `Tem certeza de que deseja excluir o território <strong>${territory.name}</strong>? Esta ação não pode ser desfeita.`,
      "Excluir Território",
      "btn-danger",
    );

    if (confirmed) {
      this.model.deleteTerritory(id);
      this.uiView.showToast("Território excluído.");
      this.renderAll();
    }
  }

  enableAddQuadraMode(territoryId) {
    this.isAddingQuadraMode = true;
    this.selectedTerritoryIdForQuadra = territoryId;

    const territory = this.model.appData.find((t) => t.id === territoryId);
    const name = territory ? territory.name : "";

    this.uiView.showToast(
      `📍 Modo Adicionar Quadras (${name}): Clique no mapa para adicionar quadras. Pressione 'ESC' para finalizar.`,
      6000,
    );
    this.mapView.map.getContainer().style.cursor = "crosshair";

    this.renderAll();
  }

  handleMapClick(e) {
    if (!this.isAddingQuadraMode || !this.selectedTerritoryIdForQuadra) return;

    const quadra = this.model.addQuadra(
      this.selectedTerritoryIdForQuadra,
      e.latlng.lat,
      e.latlng.lng,
    );

    // this.isAddingQuadraMode = false;
    // this.selectedTerritoryIdForQuadra = null;
    // this.mapView.map.getContainer().style.cursor = "";
    if (quadra) {
      this.uiView.showToast(
        `Quadra ${quadra.number} criada! Clique para adicionar mais ou 'ESC' para sair.`,
      );
      this.renderAll();
    }
  }

  disableAddQuadraMode() {
    if (this.isAddingQuadraMode) {
      this.isAddingQuadraMode = false;
      this.selectedTerritoryIdForQuadra = null;
      this.mapView.map.getContainer().style.cursor = "";
      this.uiView.showToast("🛑 Adição de quadras finalizada.");
    }
    this.renderAll();
  }

  openQuadraModal(territoryId, quadraId) {
    const territory = this.model.appData.find((t) => t.id === territoryId);
    const quadra = territory.quadras.find((q) => q.id === quadraId);
    this.activeQuadraId = { territoryId, quadraId };

    console.log(this.shiftKey);
    if (this.shiftKey) {
      this.model.deleteQuadra(
        this.activeQuadraId.territoryId,
        this.activeQuadraId.quadraId,
      );
      this.renderAll();
      return;
    }

    document.getElementById("modalQuadraTitle").innerText =
      `${territory.name} - Quadra ${quadra.number}`;
    document.getElementById("statusSelect").value = quadra.status || "pendente";
    document.getElementById("startDateInput").value = quadra.startDate || "";
    document.getElementById("endDateInput").value = quadra.endDate || "";

    this.uiView.toggleModal("modalQuadra", true);
  }

  saveQuadraData() {
    if (!this.activeQuadraId) return;
    const status = document.getElementById("statusSelect").value;
    const startDate = document.getElementById("startDateInput").value;
    const endDate = document.getElementById("endDateInput").value;

    this.model.updateQuadra(
      this.activeQuadraId.territoryId,
      this.activeQuadraId.quadraId,
      status,
      startDate,
      endDate,
    );
    this.uiView.toggleModal("modalQuadra", false);
    this.renderAll();
  }

  async deleteCurrentQuadra() {
    if (!this.activeQuadraId) return;
    const confirmed = await this.uiView.showConfirmDialog(
      "🗑️ Excluir Quadra",
      "Tem certeza que deseja remover esta quadra?",
      "Remover",
      "btn-danger",
    );
    if (confirmed) {
      this.model.deleteQuadra(
        this.activeQuadraId.territoryId,
        this.activeQuadraId.quadraId,
      );
      this.uiView.toggleModal("modalQuadra", false);
      this.renderAll();
    }
  }

  openCampaignModal() {
    const currentCampaign = this.model.campaignData.find(
      (c) => c.status === "andamento",
    );
    const endDateInput = document.getElementById("campaignEndDate");
    const startDateInput = document.getElementById("campaignStartDate");
    const nameInput = document.getElementById("campaignNameInput");
    const btnCreate = document.getElementById("btnCreateCampaign");

    if (currentCampaign) {
      nameInput.value = currentCampaign.name;
      startDateInput.value = currentCampaign.startDate;
      endDateInput.value = new Date().toISOString().split("T")[0];

      nameInput.disabled = true;
      startDateInput.disabled = true;
      endDateInput.disabled = false;
      btnCreate.disabled = true;
      btnCreate.style.display = "none";
    } else {
      nameInput.value = "";
      startDateInput.value = new Date().toISOString().split("T")[0];
      endDateInput.value = "";

      nameInput.disabled = false;
      startDateInput.disabled = false;
      endDateInput.disabled = true;
      btnCreate.disabled = false;
      btnCreate.style.display = "block";
    }

    this.uiView.renderCampaignList(
      this.model.campaignData,
      (id) => this.closeCampaign(id),
      (idArchive) => this.archiveCampaign(idArchive),
      (idReopen) => this.reopenCampaign(idReopen),
    );
    this.uiView.toggleModal("modalCampaign", true);
  }

  createNewCampaign() {
    const currentCampaign = this.model.campaignData.find(
      (c) => c.status === "andamento",
    );
    if (currentCampaign) {
      this.uiView.showToast(
        `⚠️ A campanha "${currentCampaign.name}" ainda está em andamento. Encerre-a antes de criar uma nova.`,
      );
      return;
    }
    const name = document.getElementById("campaignNameInput").value.trim();
    if (!name) return this.uiView.showToast("Insira um nome para a campanha.");
    const startDate = document.getElementById("campaignStartDate").value;
    if (!startDate) startDate = new Date();

    this.model.createCampaign(name, startDate);
    document.getElementById("campaignNameInput").value = "";
    document.getElementById("campaignStartDate").value = "";
    document.getElementById("campaignEndDate").value = "";
    this.openCampaignModal(); // Reabre para atualizar a lista
    // this.uiView.renderCampaignList(this.model.campaignData, (id) =>
    //   this.closeCampaign(id),
    // );
    this.renderAll();
  }

  closeCampaign(campaignId) {
    const endDate = document.getElementById("campaignEndDate").value;
    if (!endDate) endDate = new Date();

    this.model.closeCampaign(campaignId, endDate);
    this.openCampaignModal(); // Reabre para atualizar a lista
    // this.uiView.renderCampaignList(this.model.campaignData, (id) =>
    //   this.closeCampaign(id),
    // );
    this.renderAll();
  }

  archiveCampaign(campaignId) {
    this.model.archiveCampaign(campaignId);
    this.openCampaignModal(); // Reabre para atualizar a lista
    this.renderAll();
  }

  reopenCampaign(campaignId) {
    this.model.reopenCampaign(campaignId);
    this.openCampaignModal(); // Reabre para atualizar a lista
    this.renderAll();
  }

  /**
   * Abre a modal de designação preenchendo a data atual por padrão
   */
  openAssignmentModal() {
    // const print = this.reportService.generateS13();
    // const printWindow = window.open("", "_blank");
    // printWindow.document.write(print);
    // printWindow.document.close();
    // printWindow.print();

    const activeId =
      this.model.activeTerritoryId || this.model.selectedTerritoryId;

    if (!activeId) {
      this.uiView.showToast("⚠️ Selecione um território antes de designar.");
      return;
    }

    const territory = this.model.appData.find((t) => t.id === activeId);
    if (!territory.history) territory.history = [];

    // 1. Renderiza o histórico por Ano de Serviço
    this.model.renderAssignmentHistory(territory.history);

    const currentAssign = this.model.getCurrentAssign(territory.id);
    // Preenche os campos se o território já possuir dados de designação
    document.getElementById("assigneeName").value =
      currentAssign?.assigneeName || "";
    document.getElementById("assignmentDate").value =
      currentAssign?.assignmentDate || "";
    document.getElementById("completionDate").value = "";

    // Exibe a modal
    const modal = document.getElementById("assignmentModal");
    if (modal) modal.style.display = "flex";
  }

  /**
   * Fecha a modal de designação
   */
  closeAssignmentModal() {
    const modal = document.getElementById("assignmentModal");
    if (modal) modal.style.display = "none";
  }

  /**
   * Processa o envio do formulário de designação
   */
  handleAssignmentSubmit(event) {
    event.preventDefault();

    const activeId = this.model.selectedTerritoryId;
    const territory = this.model.appData.find((t) => t.id === activeId);

    if (!territory) {
      this.uiView.showToast(
        `⚠️ Território não localizado, selecione e tente novamente!`,
      );
      return;
    }

    const newRecord = {
      assigneeName: document.getElementById("assigneeName").value,
      assignmentDate: document.getElementById("assignmentDate").value,
      completionDate: document.getElementById("completionDate").value || null,
    };

    const currentAssign = this.model.getCurrentAssign(activeId);
    if (currentAssign) {
      currentAssign.assigneeName = newRecord.assigneeName;
      currentAssign.assignmentDate = newRecord.assignmentDate;
      currentAssign.completionDate = newRecord.completionDate;
    } else {
      if (!territory.history) territory.history = [];
      territory.history.push(newRecord);
    }

    territory.assignedTo = newRecord.assigneeName;
    territory.status = newRecord.completionDate ? "Concluído" : "Designado";

    this.model.save();

    this.uiView.showToast(
      `✅ Designação registrada para ${newRecord.assigneeName}!`,
    );
    this.openAssignmentModal(); //reabre para atualizar historico

    // if (this.mapView.updateTerritoryStyle) {
    //   this.mapView.updateTerritoryStyle(activeId);
    // }

    this.closeAssignmentModal();
  }

  openReportFilterModal(arquivadas = false) {
    const select = document.getElementById("reportCampaignSelect");
    select.innerHTML =
      '<option value="normal">Trabalho Contínuo / Normal</option>';
    this.model.campaignData.map((c) => {
      if (c.status === "arquivada" && !arquivadas) return; // Não renderiza campanhas arquivadas
      if (c.status !== "arquivada" && arquivadas) return; // Não renderiza campanhas não arquivadas
      select.innerHTML += `<option value="${c.id}">Campanha: ${c.name} (${c.status === "andamento" ? "Ativa" : c.status === "concluida" ? "Encerrada" : "Arquivada"})</option>`;
    });
    this.uiView.toggleModal("modalReportFilter", true);
  }

  printCurrentMapScreen() {
    this.uiView.showToast("🖨️ Preparando impressão...");

    //delega as tarefas para o serviço de impressão
    const restoreLayout = this.printService.prepareMapForPrint();
    if (!restoreLayout) return;

    const handleAfterPrint = () => {
      restoreLayout();
      window.removeEventListener("afterprint", handleAfterPrint);
    };

    window.addEventListener("afterprint", handleAfterPrint);

    setTimeout(() => {
      window.print();
    }, 600);
  }

  generateAndPrintReport() {
    const selectedOption = document.getElementById(
      "reportCampaignSelect",
    ).value;
    let reportItems = [];
    let reportTitle = "";
    let htmlContent = "";

    if (selectedOption === "normal") {
      reportTitle = "Trabalho Contínuo / Normal";
      this.model.appData.forEach((t) => {
        t.quadras.forEach((q) => {
          const statusInfo = q.baseStatus || q;
          reportItems.push({
            territoryName: t.name,
            number: q.number,
            status: statusInfo.status,
            startDate: statusInfo.startDate,
            endDate: statusInfo.endDate,
          });
        });
      });
    } else {
      const cmp = this.model.campaignData.find((c) => c.id === selectedOption);
      if (!cmp) return;
      reportTitle = `Campanha: ${cmp.name}`;
      if (cmp.status === "andamento") {
        this.model.appData.forEach((t) => {
          t.quadras.forEach((q) => {
            reportItems.push({
              territoryName: t.name,
              number: q.number,
              status: q.status,
              startDate: q.startDate,
              endDate: q.endDate,
            });
          });
        });
      } else {
        reportItems = this.model.campaignHistory
          .filter((h) => h.campaignId === selectedOption)
          .map((h) => ({
            territoryName: h.territoryName,
            number: h.quadraNumber,
            status: h.status,
            startDate: h.startDate,
            endDate: h.endDate,
          }));
      }
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return "-";
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    };

    const total = reportItems.length;
    const concluidas = reportItems.filter(
      (q) => q.status === "concluida",
    ).length;
    const emAndamento = reportItems.filter(
      (q) => q.status === "andamento",
    ).length;
    const pendentes = reportItems.filter((q) => q.status === "pendente").length;

    let tableRows = reportItems
      .map(
        (q) => `
      <tr>
        <td><strong>${q.territoryName}</strong></td>
        <td>Quadra ${q.number}</td>
        <td><span class="badge badge-${q.status}">${q.status === "andamento" ? "Incompleto" : q.status}</span></td>
        <td>${formatDate(q.startDate)}</td>
        <td>${formatDate(q.endDate)}</td>
      </tr>
    `,
      )
      .join("");

    if (reportItems.length === 0) {
      tableRows = `<tr><td colspan="5" style="text-align:center;">Nenhum registro encontrado.</td></tr>`;
    }

    htmlContent = `
      <div class="report-header">
        <h1>Relatório - ${reportTitle}</h1>
        <p>Janaúba - MG | Emitido em: ${new Date().toLocaleDateString("pt-BR")}</p>
      </div>
      <div class="report-summary">
        <div class="summary-box"><strong>${total}</strong><span>Total Quadras</span></div>
        <div class="summary-box"><strong style="color:#166534;">${concluidas}</strong><span>Concluídas</span></div>
        <div class="summary-box"><strong style="color:#854d0e;">${emAndamento}</strong><span>Em Andamento</span></div>
        <div class="summary-box"><strong style="color:#475569;">${pendentes}</strong><span>Pendentes</span></div>
      </div>
      <table class="report-table">
        <thead>
          <tr><th>Território</th><th>Quadra</th><th>Status</th><th>Início</th><th>Término</th></tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;

    this.uiView.toggleModal("modalReportFilter", false);

    this.openPrintWindow(htmlContent);

    setTimeout(() => {
      document.body.classList.remove("printing-report");
    }, 500);
  }

  // Reports
  /**
   * Abre a modal de escolha de relatórios
   */
  openReportTypeModal(event) {
    const modal = document.getElementById("reportTypeModal");
    if (modal) modal.style.display = "flex";
  }

  /**
   * Fecha a modal de escolha de relatórios
   */
  closeReportTypeModal() {
    const modal = document.getElementById("reportTypeModal");
    if (modal) modal.style.display = "none";
  }

  /**
   * Dispara a geração e abertura da janela de impressão conforme o tipo escolhido
   */
  generateReport(type) {
    this.closeReportTypeModal();

    let htmlContent = "";

    switch (type) {
      case "continuous":
        console.log("Gerando relatório de Trabalho Contínuo / Normal...");
        this.openReportFilterModal();
        break;
      case "archive":
        this.openReportFilterModal(true); //abre o filtro com as arquivadas
        break;
      case "s13":
        htmlContent = this.reportService.generateS13();
        this.openPrintWindow(htmlContent);
        break;
      case "percentage":
        htmlContent = this.reportService.generatePercentageReportHTML();
        this.openPrintWindow(htmlContent);
        break;
      default:
        this.uiView.showToast("⚠️ Tipo de relatório inválido.");
        return;
    }

    // this.openPrintWindow(htmlContent);
  }

  /**
   * Utilitário para renderizar o HTML em uma nova janela de impressão
   */
  openPrintWindow(contentHTML) {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 14px; }
            th { background-color: #f2f2f2; }
            h2, h3 { margin-bottom: 5px; }
          </style>
        </head>
        <body>
          ${contentHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}

class AppController {
  constructor(model, mapView, uiView) {
    this.model = model;
    this.mapView = mapView;
    this.uiView = uiView;

    this.tempPolygonLayer = null;
    this.editingTerritoryId = null;
    this.activeQuadraId = null;
    this.isAddingQuadraMode = false;
    this.selectedTerritoryIdForQuadra = null;

    this.initEvents();
    this.renderAll();
  }

  initEvents() {
    // Ações de cabeçalho / Globais
    document.getElementById("btnStartDraw").onclick = () =>
      this.startDrawingTerritory();
    document.getElementById("btnOpenCampaign").onclick = () =>
      this.openCampaignModal();
    document.getElementById("btnOpenReport").onclick = () =>
      this.openReportFilterModal();
    document.getElementById("btnPrintMap").onclick = () =>
      this.printCurrentMapScreen();

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
    document.getElementById("btnGenerateReport").onclick = () =>
      this.generateAndPrintReport();
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
        onAddQuadra: (id) => this.enableAddQuadraMode(id),
        onEditNodes: (id) => this.editTerritoryNodes(id),
        onSaveShape: (id) => this.saveTerritoryShape(id),
        onShareWhatsApp: (id) => this.shareTerritoryWhatsApp(id),
        onDelete: (id) => this.deleteTerritory(id),
      },
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

  async shareTerritoryWhatsApp(id) {
    const territory = this.model.appData.find((t) => t.id === id);
    if (!territory) return;

    this.uiView.showToast("📸 Gerando imagem do território...");

    const map = this.mapView.map;
    const poly = this.mapView.territoryPolygons[id];

    // 1. Centraliza no território sem animação para garantir alinhamento
    if (poly && map) {
      map.fitBounds(poly.getBounds(), { animate: false, padding: [40, 40] });
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // 2. Prepara o SVG do Leaflet injetando os atributos XML necessários para o Canvas
      const svgElement = map.getPanes().overlayPane.querySelector("svg");
      if (svgElement) {
        svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }

      // 3. Usa o html2canvas com a opção de ignorar transformações 3D problemáticas
      const canvas = await html2canvas(map.getContainer(), {
        useCORS: true,
        allowTaint: true,
        logging: false,
        ignoreElements: (el) =>
          el.classList.contains("leaflet-control-container") ||
          el.classList.contains("leaflet-bottom") ||
          el.classList.contains("leaflet-top"),
        onclone: (clonedDoc) => {
          // Força a visualização do SVG clonado e ajusta o transform no clone
          const clonedSvg = clonedDoc.querySelector(
            ".leaflet-overlay-pane svg",
          );
          if (clonedSvg) {
            clonedSvg.style.visibility = "visible";
            clonedSvg.style.display = "block";
          }
        },
      });

      // 4. Montar a mensagem do WhatsApp
      const total = territory.quadras.length;
      const concluidas = territory.quadras.filter(
        (q) => q.status === "concluida",
      ).length;
      const emAndamento = territory.quadras.filter(
        (q) => q.status === "andamento",
      ).length;
      const pendentes = territory.quadras.filter(
        (q) => q.status === "pendente",
      ).length;
      const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;

      const text = `📍 *RESUMO DO TERRITÓRIO*
*Nome:* ${territory.name}
*Progresso:* ${pct}% concluído

📊 *Status das Quadras:*
• Total: ${total}
• Concluídas: ${concluidas}
• Em Andamento: ${emAndamento}
• Pendentes: ${pendentes}

📅 *Gerado em:* ${new Date().toLocaleDateString("pt-BR")}`;

      // 5. Copiar imagem ou realizar o Download
      // canvas.toBlob(async (blob) => {
      //   let imageCopied = false;
      //   try {
      //     if (navigator.clipboard && window.ClipboardItem) {
      //       const item = new ClipboardItem({ "image/png": blob });
      //       await navigator.clipboard.write([item]);
      //       imageCopied = true;
      //     }
      //   } catch (e) {
      //     imageCopied = false;
      //   }

      //   if (!imageCopied) {
      //     const link = document.createElement("a");
      //     link.download = `Territorio_${territory.name.replace(/\s+/g, "_")}.png`;
      //     link.href = canvas.toDataURL("image/png");
      //     link.click();
      //     this.uiView.showToast("⬇️ Imagem baixada! Anexe-a no WhatsApp.");
      //   } else {
      //     this.uiView.showToast("📋 Imagem com demarcação copiada!");
      //   }

      //   const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      //   setTimeout(() => {
      //     window.open(whatsappUrl, "_blank");
      //   }, 800);
      // }, "image/png");
      canvas.toBlob(async (blob) => {
        const file = new File(
          [blob],
          `Territorio_${territory.name.replace(/\s+/g, "_")}.png`,
          { type: "image/png" },
        );

        // 1. Tenta usar o compartilhamento nativo do celular (Mobile)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: territory.name,
              text: text,
              files: [file], // Envia a imagem e o texto juntos nativamente
            });
            this.uiView.showToast("✅ Compartilhado com sucesso!");
            return;
          } catch (shareError) {
            // Se o usuário cancelar o menu de compartilhamento, apenas encerra
            if (shareError.name === "AbortError") return;
          }
        }

        // 2. Fallback para Computador / WhatsApp Web (Cópia + Abertura da URL)
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ "image/png": blob });
            await navigator.clipboard.write([item]);
            this.uiView.showToast(
              "📋 Imagem copiada! No WhatsApp Web, use Ctrl+V.",
            );
          }
        } catch (e) {
          // Se falhar a cópia, faz o download do arquivo
          const link = document.createElement("a");
          link.download = file.name;
          link.href = canvas.toDataURL("image/png");
          link.click();
          this.uiView.showToast("⬇️ Imagem baixada! Anexe-a na conversa.");
        }

        // Abre a janela do WhatsApp com o texto preenchido
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        setTimeout(() => {
          window.open(whatsappUrl, "_blank");
        }, 800);
      }, "image/png");
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      this.uiView.showToast("❌ Falha ao capturar o mapa.");
    }
  }

  deleteTerritory(id) {
    const territory = this.model.appData.find((t) => t.id === id);
    if (!territory) return;
    if (
      confirm(
        `Tem certeza que deseja excluir o território "${territory.name}" e todas as suas quadras?`,
      )
    ) {
      this.model.deleteTerritory(id);
      this.uiView.showToast("Território excluído.");
      this.renderAll();
    }
  }

  enableAddQuadraMode(territoryId) {
    this.isAddingQuadraMode = true;
    this.selectedTerritoryIdForQuadra = territoryId;
    this.uiView.showToast(
      "📍 Clique no mapa onde deseja posicionar a nova quadra.",
    );
    this.mapView.map.getContainer().style.cursor = "crosshair";
  }

  handleMapClick(e) {
    if (!this.isAddingQuadraMode || !this.selectedTerritoryIdForQuadra) return;
    const quadra = this.model.addQuadra(
      this.selectedTerritoryIdForQuadra,
      e.latlng.lat,
      e.latlng.lng,
    );
    this.isAddingQuadraMode = false;
    this.selectedTerritoryIdForQuadra = null;
    this.mapView.map.getContainer().style.cursor = "";
    if (quadra) {
      this.uiView.showToast(
        `Quadra ${quadra.number} criada! Você pode arrastá-la no mapa para reposicionar.`,
      );
      this.renderAll();
    }
  }

  openQuadraModal(territoryId, quadraId) {
    const territory = this.model.appData.find((t) => t.id === territoryId);
    const quadra = territory.quadras.find((q) => q.id === quadraId);
    this.activeQuadraId = { territoryId, quadraId };

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

  deleteCurrentQuadra() {
    if (!this.activeQuadraId) return;
    if (confirm("Tem certeza que deseja excluir esta quadra?")) {
      this.model.deleteQuadra(
        this.activeQuadraId.territoryId,
        this.activeQuadraId.quadraId,
      );
      this.uiView.toggleModal("modalQuadra", false);
      this.renderAll();
    }
  }

  openCampaignModal() {
    this.uiView.renderCampaignList(this.model.campaignData, (id) =>
      this.closeCampaign(id),
    );
    this.uiView.toggleModal("modalCampaign", true);
  }

  createNewCampaign() {
    const name = document.getElementById("campaignNameInput").value.trim();
    if (!name) return this.uiView.showToast("Insira um nome para a campanha.");

    this.model.createCampaign(name);
    document.getElementById("campaignNameInput").value = "";
    this.uiView.renderCampaignList(this.model.campaignData, (id) =>
      this.closeCampaign(id),
    );
    this.renderAll();
  }

  closeCampaign(campaignId) {
    this.model.closeCampaign(campaignId);
    this.uiView.renderCampaignList(this.model.campaignData, (id) =>
      this.closeCampaign(id),
    );
    this.renderAll();
  }

  openReportFilterModal() {
    const select = document.getElementById("reportCampaignSelect");
    select.innerHTML =
      '<option value="normal">Trabalho Contínuo / Normal</option>';
    this.model.campaignData.forEach((c) => {
      select.innerHTML += `<option value="${c.id}">Campanha: ${c.name} (${c.status === "em_andamento" ? "Ativa" : "Encerrada"})</option>`;
    });
    this.uiView.toggleModal("modalReportFilter", true);
  }

  printCurrentMapScreen2() {
    const currentCenter = this.mapView.map.getCenter();
    const currentZoom = this.mapView.map.getZoom();
    const currentBearing = this.mapView.map.getBearing
      ? this.mapView.map.getBearing()
      : 0;

    const guide = document.getElementById("a4PrintGuide");
    if (guide) guide.style.display = "none";

    document.body.classList.remove("printing-report");
    document.body.classList.add("printing-map");
    this.mapView.map.invalidateSize();
    this.mapView.map.setView(currentCenter, currentZoom, { animate: false });
    if (this.mapView.map.setBearing)
      this.mapView.map.setBearing(currentBearing);

    setTimeout(() => {
      this.mapView.map.invalidateSize();
      window.print();
      setTimeout(() => {
        document.body.classList.remove("printing-map");
        this.mapView.map.invalidateSize();
        this.mapView.map.setView(currentCenter, currentZoom, {
          animate: false,
        });
        if (this.mapView.map.setBearing)
          this.mapView.map.setBearing(currentBearing);

        const chk = document.getElementById("togglePrintGuide");
        if (chk && chk.checked && guide) guide.style.display = "flex";
      }, 300);
    }, 400);
  }

  printCurrentMapScreenBom() {
    const map = this.mapView.map;
    const mapContainer = document.getElementById("map");

    if (!map || !mapContainer) return;

    this.uiView.showToast("🖨️ Preparando impressão A4...");

    const isMobile = window.innerWidth <= 768;
    const originalWidth = mapContainer.style.width;
    const originalHeight = mapContainer.style.height;

    // No mobile forçamos a proporção A4; no desktop mantemos o tamanho do container ativo
    if (isMobile) {
      mapContainer.style.width = "1122px";
      mapContainer.style.height = "793px";
    }

    // Notifica o Leaflet sobre o redimensionamento
    map.invalidateSize();

    // Reenquadra o território adicionando folga superior de segurança [topo, direita, baixo, esquerda]
    const activeId = this.model.activeTerritoryId;
    const poly = activeId ? this.mapView.territoryPolygons[activeId] : null;

    if (poly) {
      map.fitBounds(poly.getBounds(), {
        animate: false,
        paddingTopLeft: [50, 80], // Adiciona margem extra no topo para não cortar a linha superior
        paddingBottomRight: [50, 50],
      });
    }

    // Restaura as dimensões originais após a impressão
    const restoreLayout = () => {
      if (isMobile) {
        mapContainer.style.width = originalWidth;
        mapContainer.style.height = originalHeight;
      }
      map.invalidateSize();
      if (poly) {
        map.fitBounds(poly.getBounds(), { animate: false, padding: [30, 30] });
      }
      window.removeEventListener("afterprint", restoreLayout);
    };

    window.addEventListener("afterprint", restoreLayout);

    setTimeout(() => {
      window.print();
    }, 600);
  }

  printCurrentMapScreen() {
    const map = this.mapView.map;
    const mapContainer = document.getElementById("map");

    if (!map || !mapContainer) return;

    this.uiView.showToast("🖨️ Preparando impressão A4...");

    const isMobile = window.innerWidth <= 768;
    const originalWidth = mapContainer.style.width;
    const originalHeight = mapContainer.style.height;

    if (isMobile) {
      mapContainer.style.width = "1122px";
      mapContainer.style.height = "793px";
    }

    map.invalidateSize();

    const activeId = !this.showAllTerritories
      ? this.model.selectedTerritoryId
      : null;
    const poly = activeId ? this.mapView.territoryPolygons[activeId] : null;

    if (poly) {
      if (isMobile) {
        console.log(
          "Ajustando zoom para impressão no mobile...",
          activeId,
          this.showAllTerritories,
        );
        // 1. Calcula o enquadramento com margens bem justas para aproximar a visão
        map.fitBounds(poly.getBounds(), {
          animate: false,
          padding: [10, 10],
        });

        // 2. Aumenta 1 nível de zoom em relação ao cálculo automático
        // map.setZoom(map.getZoom() + 0, { animate: false });
      } else {
        // map.fitBounds(poly.getBounds(), {
        //   animate: false,
        //   paddingTopLeft: [50, 80],
        //   paddingBottomRight: [50, 50],
        // });
      }
    }

    const restoreLayout = () => {
      if (isMobile) {
        mapContainer.style.width = originalWidth;
        mapContainer.style.height = originalHeight;
      }
      map.invalidateSize();
      if (poly) {
        map.fitBounds(poly.getBounds(), { animate: false, padding: [30, 30] });
      }
      window.removeEventListener("afterprint", restoreLayout);
    };

    window.addEventListener("afterprint", restoreLayout);

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
      if (cmp.status === "em_andamento") {
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
        <td><span class="badge badge-${q.status}">${q.status}</span></td>
        <td>${formatDate(q.startDate)}</td>
        <td>${formatDate(q.endDate)}</td>
      </tr>
    `,
      )
      .join("");

    if (reportItems.length === 0) {
      tableRows = `<tr><td colspan="5" style="text-align:center;">Nenhum registro encontrado.</td></tr>`;
    }

    document.getElementById("printReportArea").innerHTML = `
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
    document.body.classList.remove("printing-map");
    document.body.classList.add("printing-report");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-report");
    }, 500);
  }
}

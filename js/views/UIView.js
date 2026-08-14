class UIView {
  constructor() {
    this.toastTimeout = null;
  }

  showToast(message, duration = 3500) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(
      () => toast.classList.remove("show"),
      duration,
    );
  }

  toggleModal(modalId, show = true) {
    document.getElementById(modalId).style.display = show ? "flex" : "none";
  }

  renderTerritoryCards(appData, selectedId, editingShapeId, callbacks) {
    const listContainer = document.getElementById("territoryList");
    listContainer.innerHTML = "";

    appData.forEach((territory) => {
      const total = territory.quadras.length;
      const completed = territory.quadras.filter(
        (q) => q.status === "concluida",
      ).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isBeingEdited = editingShapeId === territory.id;

      const card = document.createElement("div");
      card.className = `territory-card ${selectedId === territory.id ? "active" : ""}`;
      card.onclick = () => callbacks.onSelect(territory.id);

      card.innerHTML = `
        <h3>
          <span>${territory.name}</span>
          <button class="btn btn-sm btn-secondary" id="btn-edit-info-${territory.id}">⚙️ Info</button>
        </h3>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${percentage}%"></div></div>
        <div class="progress-text"><span>${completed} de ${total} concluídas</span><span><b>${percentage}%</b></span></div>
        <div class="card-actions">
          <button class="btn btn-sm btn-primary" id="btn-add-q-${territory.id}">+ Quadra</button>
          ${
            !isBeingEdited
              ? `<button class="btn btn-sm btn-warning" id="btn-edit-nodes-${territory.id}">✏️ Desenho</button>`
              : `<button class="btn btn-sm btn-report" id="btn-save-shape-${territory.id}">💾 Salvar Forma</button>`
          }
          <button class="btn btn-sm btn-danger" id="btn-del-${territory.id}">🗑️ Excluir</button>
        </div>
      `;

      listContainer.appendChild(card);

      // Bind local de eventos com stopPropagation
      document.getElementById(`btn-edit-info-${territory.id}`).onclick = (
        e,
      ) => {
        e.stopPropagation();
        callbacks.onEditInfo(territory.id);
      };
      document.getElementById(`btn-add-q-${territory.id}`).onclick = (e) => {
        e.stopPropagation();
        callbacks.onAddQuadra(territory.id);
      };
      if (!isBeingEdited) {
        document.getElementById(`btn-edit-nodes-${territory.id}`).onclick = (
          e,
        ) => {
          e.stopPropagation();
          callbacks.onEditNodes(territory.id);
        };
      } else {
        document.getElementById(`btn-save-shape-${territory.id}`).onclick = (
          e,
        ) => {
          e.stopPropagation();
          callbacks.onSaveShape(territory.id);
        };
      }
      document.getElementById(`btn-del-${territory.id}`).onclick = (e) => {
        e.stopPropagation();
        callbacks.onDelete(territory.id);
      };
    });
  }

  renderCampaignList(campaignData, onCloseCampaign) {
    const listArea = document.getElementById("campaignListArea");
    listArea.innerHTML = "";
    if (campaignData.length === 0) {
      listArea.innerHTML =
        '<p style="font-size:0.8rem; color:#64748b;">Nenhuma campanha criada.</p>';
      return;
    }
    campaignData.forEach((cmp) => {
      const item = document.createElement("div");
      item.className = "campaign-item";
      item.innerHTML = `
        <header>
          <span>${cmp.name}</span>
          <span style="font-size:0.75rem; color:${cmp.status === "em_andamento" ? "#2563eb" : "#166534"}">
            ${cmp.status === "em_andamento" ? "● Em Andamento" : "✓ Concluída"}
          </span>
        </header>
        <div style="font-size:0.75rem; color:#64748b;">
          Início: ${cmp.startDate} ${cmp.endDate ? "| Fim: " + cmp.endDate : ""}
        </div>
        ${
          cmp.status === "em_andamento"
            ? `<button class="btn btn-danger btn-sm" style="margin-top:8px;" id="btn-close-cmp-${cmp.id}">
              Encerrar Campanha e Voltar ao Trabalho Normal
             </button>`
            : ""
        }
      `;
      listArea.appendChild(item);

      if (cmp.status === "em_andamento") {
        document.getElementById(`btn-close-cmp-${cmp.id}`).onclick = () =>
          onCloseCampaign(cmp.id);
      }
    });
  }
}

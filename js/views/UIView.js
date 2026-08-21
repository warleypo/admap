class UIView {
  constructor() {
    this.toastTimeout = null;
    this.setupMobileInteractions();
  }

  setupMobileInteractions() {
    const sidebar = document.getElementById("sidebar");
    const header = document.querySelector("#sidebar .header");

    // No mobile, clicar no cabeçalho abre/recolhe o painel
    if (header) {
      header.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.toggle("collapsed");
        }
      });
    }
  }

  // Método auxiliar para fechar a sidebar no mobile ao focar no mapa
  collapseSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.classList.add("collapsed");
    }
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

  toggleButtonAddQuadra(id, isEditing) {
    const btn = document.getElementById(`btn-add-q-${id}`);
    if (isEditing) {
      btn.innerHTML = "❌ Cancelar";
      btn.classList.remover("btn-primary");
      btn.classList.add("btn-danger");
    }
  }

  renderTerritoryCards(
    appData,
    selectedId,
    editingShapeId,
    callbacks,
    isEditing = false,
  ) {
    const listContainer = document.getElementById("territoryList");
    listContainer.innerHTML = "";

    appData.forEach((territory) => {
      const isAddingQuadra = isEditing && territory.id === isEditing;
      // Define a classe CSS e o rótulo do botão
      const btnClass = isAddingQuadra ? "btn-danger" : "btn-primary";
      const btnText = isAddingQuadra ? "❌ Cancelar" : "+ Quadra";

      // Na criação do elemento do botão no HTML/DOM:
      const addQuadraBtnHTML = `
      <button class="btn btn-sm ${btnClass}" id="btn-add-q-${territory.id}">
        ${btnText}
      </button>
    `;

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
          ${addQuadraBtnHTML}
          ${
            !isBeingEdited
              ? `<button class="btn btn-sm btn-warning" id="btn-edit-nodes-${territory.id}">✏️ Desenho</button>`
              : `<button class="btn btn-sm btn-report" id="btn-save-shape-${territory.id}">💾 Salvar Forma</button>`
          }
          <!-- NOVO BOTÃO WHATSAPP -->
        <button class="btn btn-sm btn-whatsapp" id="btn-wsp-${territory.id}" style="background:#25D366; color:white;">📱 Zap</button>
          <button class="btn btn-sm btn-danger" id="btn-del-${territory.id}">🗑️ Excluir</button>
        </div>
      `;

      listContainer.appendChild(card);

      // Bind local de eventos com stopPropagation
      // Bind do WhatsApp
      document.getElementById(`btn-wsp-${territory.id}`).onclick = (e) => {
        e.stopPropagation();
        callbacks.onShareWhatsApp(territory.id);
      };

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

  renderCampaignList(
    campaignData,
    onCloseCampaign,
    onArchiveCampaign,
    onReopenCampaign,
  ) {
    const listArea = document.getElementById("campaignListArea");
    listArea.innerHTML = "";
    if (campaignData.length === 0) {
      listArea.innerHTML =
        '<p style="font-size:0.8rem; color:#64748b;">Nenhuma campanha criada.</p>';
      return;
    }
    [...campaignData].reverse().map((cmp) => {
      if (cmp.status === "arquivada") return; // Não renderiza campanhas arquivadas
      const item = document.createElement("div");
      item.className = "campaign-item";
      item.innerHTML = `
        <header>
          <span>${cmp.name}</span>
          <span style="font-size:0.75rem; color:${cmp.status === "andamento" ? "#2563eb" : "#166534"}">
            ${cmp.status === "andamento" ? "● Em Andamento" : "✓ Concluída"}
          </span>
        </header>
        <div style="font-size:0.75rem; color:#64748b;">
          Início: ${cmp.startDate} ${cmp.endDate ? "| Fim: " + cmp.endDate : ""}
        </div>
        ${
          cmp.status === "concluida"
            ? `<button class="btn btn-warning btn-sm" style="margin-top:8px;" id="btn-archive-cmp-${cmp.id}">
                Arquivar Campanha
              </button>
              <button class="btn btn-primary btn-sm" style="margin-top:8px;" id="btn-reopen-cmp-${cmp.id}">
                Reabrir Campanha
              </button>`
            : ""
        }
        
        ${
          cmp.status === "andamento"
            ? `<button class="btn btn-danger btn-sm" style="margin-top:8px;" id="btn-close-cmp-${cmp.id}">
              Encerrar Campanha e Voltar ao Trabalho Normal
             </button>`
            : ""
        }
      `;
      listArea.appendChild(item);

      if (cmp.status === "andamento") {
        document.getElementById(`btn-close-cmp-${cmp.id}`).onclick = () =>
          onCloseCampaign(cmp.id);
      }

      if (cmp.status === "concluida") {
        document.getElementById(`btn-reopen-cmp-${cmp.id}`).onclick = () =>
          onReopenCampaign(cmp.id);
        document.getElementById(`btn-archive-cmp-${cmp.id}`).onclick = () =>
          onArchiveCampaign(cmp.id);
      }
    });
  }

  /**
   * Exibe um dialog de confirmação personalizado baseado em Promise
   * @param {string} title Título do modal
   * @param {string} message Mensagem de texto explicativa
   * @param {string} confirmBtnText Rótulo do botão principal
   * @param {string} confirmBtnClass Classe CSS do botão de confirmação (ex: btn-danger, btn-primary)
   * @returns {Promise<boolean>} Retorna true se confirmado, false se cancelado
   */
  showConfirmDialog(
    title = "⚠️ Confirmação",
    message = "Deseja realmente prosseguir?",
    confirmBtnText = "Confirmar",
    confirmBtnClass = "btn-danger",
  ) {
    return new Promise((resolve) => {
      const modal = document.getElementById("customConfirmModal");
      const titleEl = document.getElementById("customConfirmTitle");
      const msgEl = document.getElementById("customConfirmMessage");
      const btnOk = document.getElementById("btnCustomConfirmOk");
      const btnCancel = document.getElementById("btnCustomConfirmCancel");
      const btnClose = document.getElementById("btnCustomConfirmClose");

      titleEl.textContent = title;
      msgEl.innerHTML = message;
      btnOk.textContent = confirmBtnText;

      // Ajusta a cor/estilo do botão principal
      btnOk.className = `btn ${confirmBtnClass}`;

      modal.classList.remove("d-none");

      const cleanup = (result) => {
        modal.classList.add("d-none");
        btnOk.onclick = null;
        btnCancel.onclick = null;
        btnClose.onclick = null;
        resolve(result);
      };

      btnOk.onclick = () => cleanup(true);
      btnCancel.onclick = () => cleanup(false);
      btnClose.onclick = () => cleanup(false);
    });
  }
}

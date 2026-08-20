class WhatsappService {
  constructor(uiView, mapView) {
    this.uiView = uiView;
    this.mapView = mapView;
    this.baseUrl = "https://api.whatsapp.com/send";
  }

  async prepareMapForShare(territory) {
    // console.log("Terrr", territory);
    this.uiView.showToast("📸 Gerando imagem do território...");

    const map = this.mapView.map;
    const poly = this.mapView.territoryPolygons[territory.id];

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

      const message = this.buildTerritoryMessage(territory);

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
              text: message,
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
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        setTimeout(() => {
          window.open(whatsappUrl, "_blank");
        }, 800);
      }, "image/png");
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      this.uiView.showToast("❌ Falha ao capturar o mapa.");
    }
  }

  buildTerritoryMessage(territory) {
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

    return text;
  }
}

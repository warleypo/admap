document.addEventListener("DOMContentLoaded", () => {
  const uiView = new UIView();
  const model = new TerritoryModel(uiView);
  const mapView = new MapView("map");
  const printService = new PrintService(mapView, model);
  const reportService = new ReportService(model);
  const whatsappService = new WhatsappService(uiView, mapView);
  const app = new AppController(
    model,
    mapView,
    uiView,
    printService,
    whatsappService,
    reportService,
  );
});

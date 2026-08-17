document.addEventListener("DOMContentLoaded", () => {
  const model = new TerritoryModel();
  const mapView = new MapView("map");
  const uiView = new UIView();
  const printService = new PrintService(mapView, model);
  const whatsappService = new WhatsappService(uiView, mapView);
  const app = new AppController(
    model,
    mapView,
    uiView,
    printService,
    whatsappService,
  );
});

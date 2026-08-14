document.addEventListener("DOMContentLoaded", () => {
  const model = new TerritoryModel();
  const mapView = new MapView("map");
  const uiView = new UIView();
  const app = new AppController(model, mapView, uiView);
});

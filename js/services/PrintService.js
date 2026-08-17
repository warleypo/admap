class PrintService {
  constructor(mapView, model) {
    this.mapView = mapView;
    this.model = model;
  }

  isPrintGuideActive() {
    const inputs = Array.from(
      document.querySelectorAll(
        ".chk-print-guide, #togglePrintGuide, #togglePrintGuideMobile",
      ),
    );
    return inputs.some((input) => input.checked);
  }

  getActiveTerritoryId() {
    if (this.isPrintGuideActive()) return null;
    return (
      this.model.activeTerritoryId || this.model.selectedTerritoryId || null
    );
  }

  prepareMapForPrint() {
    const mapContainer = document.getElementById("map");
    const isMobile = window.innerWidth <= 768;

    if (!mapContainer || !this.mapView.map) return null;

    const originalDimensions = {
      width: mapContainer.style.width,
      height: mapContainer.style.height,
    };

    if (isMobile) {
      mapContainer.style.width = "1122px";
      mapContainer.style.height = "793px";
    }

    this.mapView.map.invalidateSize();

    const activeId = this.getActiveTerritoryId();
    const polygon = activeId ? this.mapView.territoryPolygons[activeId] : null;

    return () =>
      this.restoreMap(mapContainer, originalDimensions, polygon, isMobile);
  }

  restoreMap(container, dimensions, polygon, isMobile) {
    if (isMobile) {
      container.style.width = dimensions.width;
      container.style.height = dimensions.height;
    }
    this.mapView.map.invalidateSize();

    if (polygon) {
      this.mapView.map.fitBounds(polygon.getBounds(), {
        animate: false,
        padding: [30, 30],
      });
    }
  }
}

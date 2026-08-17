class MapView {
  constructor(containerId) {
    this.map = L.map(containerId, {
      rotate: true,
      touchRotate: true,
      boxZoom: false,
      rotateControl: { closeOnReset: false },
      bearing: 0,
      preferCanvas: true, //usa o canvas para renderizar polígonos e marcadores, melhorando a performance
    }).setView([-15.8042, -43.305], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(this.map);

    this.map.pm.addControls({
      drawMarker: false,
      drawPolygon: false,
      drawPolyline: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawRectangle: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
    });

    const searchProvider = new GeoSearch.OpenStreetMapProvider({
      params: { "accept-language": "pt-BR", countrycodes: "br" },
    });

    this.searchControl = new GeoSearch.GeoSearchControl({
      provider: searchProvider,
      position: "topright",
      style: "bar",
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      searchLabel: "🔍 Buscar rua, bairro ou local...",
      notFoundMessage: "Nenhum local encontrado com esse nome.",
    });

    this.map.addControl(this.searchControl);

    this.drawnItems = new L.FeatureGroup().addTo(this.map);
    this.territoryPolygons = {};
    this.territoryQuadraMarkers = {};
  }

  clearMap() {
    this.drawnItems.clearLayers();
    Object.keys(this.territoryQuadraMarkers).forEach((tid) => {
      this.territoryQuadraMarkers[tid].forEach((m) => this.map.removeLayer(m));
    });
    this.territoryPolygons = {};
    this.territoryQuadraMarkers = {};
  }

  drawTerritoryPolygon(territory, isVisible) {
    const polygon = L.polygon(territory.bounds, {
      color: territory.color,
      fillColor: territory.color,
      fillOpacity: 0.2,
      weight: 3,
    });
    this.territoryPolygons[territory.id] = polygon;
    if (isVisible) this.drawnItems.addLayer(polygon);
    return polygon;
  }

  drawQuadraMarker(territoryId, quadra, isVisible, onClick, onDragEnd) {
    if (!this.territoryQuadraMarkers[territoryId]) {
      this.territoryQuadraMarkers[territoryId] = [];
    }

    const icon = L.divIcon({
      className: "custom-pin",
      html: `<div class="quadra-number-icon ${quadra.status}">${quadra.number}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    const marker = L.marker([quadra.lat, quadra.lng], {
      icon,
      draggable: true,
      zIndexOffset: 1000,
    });

    marker.on("dragend", (e) => {
      const pos = e.target.getLatLng();
      onDragEnd(pos.lat, pos.lng);
    });

    marker.on("click", (ev) => {
      L.DomEvent.stopPropagation(ev);
      onClick();
    });

    this.territoryQuadraMarkers[territoryId].push(marker);
    if (isVisible) marker.addTo(this.map);
  }

  enableDraw(onCreated) {
    this.map.pm.enableDraw("Polygon", { snapping: true, finishOn: "dblclick" });
    this.map.once("pm:create", (e) => {
      onCreated(e.layer);
    });
  }

  enablePolygonEdit(id) {
    const poly = this.territoryPolygons[id];
    if (poly) {
      poly.bringToFront();
      poly.pm.enable({
        allowSelfIntersection: false,
        preventMarkerRemoval: false,
      });
    }
  }

  disablePolygonEdit(id) {
    const poly = this.territoryPolygons[id];
    if (poly) poly.pm.disable();
  }

  fitBounds(bounds) {
    if (bounds && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [30, 30] });
    }
  }

  fitAll() {
    if (this.drawnItems.getLayers().length > 0) {
      this.fitBounds(this.drawnItems.getBounds());
    }
  }
}

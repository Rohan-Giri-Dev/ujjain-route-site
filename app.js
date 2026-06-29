(function () {
  const data = window.UJJAIN_ROUTE_DATA;
  const map = L.map("map", {
    zoomControl: false,
    scrollWheelZoom: true,
  });

  const state = {
    markers: new Map(),
    stopRows: new Map(),
    stopDots: new Map(),
    legCards: new Map(),
    legLines: new Map(),
    arrows: [],
    activeStopId: null,
    activeLegId: null,
    userMarker: null,
  };

  const street = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  });

  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });

  const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri",
  });

  street.addTo(map);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.control.layers({ Street: street, OSM: osm, Satellite: satellite }, null, { position: "bottomright" }).addTo(map);

  document.getElementById("fullRouteLink").href = data.googleFullRouteUrl;

  const routeBounds = L.latLngBounds([]);

  function iconForPlace(place) {
    return L.divIcon({
      className: "route-pin",
      html: `<span class="pin-body"><span>${place.id}</span></span>`,
      iconSize: [40, 52],
      iconAnchor: [20, 50],
      popupAnchor: [0, -48],
    });
  }

  function popupForPlace(place) {
    return `
      <p class="popup-title">${place.id}. ${place.name}</p>
      <a class="popup-link" href="${place.googleMapsUrl}" target="_blank" rel="noreferrer">Open in Google Maps</a>
    `;
  }

  function lineStyle(leg, active) {
    const walk = leg.mode === "walking";
    return {
      color: active ? "#0b57d0" : walk ? "#0f8f62" : "#1a73e8",
      weight: active ? 9 : 6,
      opacity: active ? 1 : 0.82,
      dashArray: walk ? "10 10" : null,
      lineCap: "round",
      lineJoin: "round",
    };
  }

  function bearing(start, end) {
    const startLat = toRad(start[0]);
    const startLng = toRad(start[1]);
    const endLat = toRad(end[0]);
    const endLng = toRad(end[1]);
    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x =
      Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  function toRad(value) {
    return (value * Math.PI) / 180;
  }

  function toDeg(value) {
    return (value * 180) / Math.PI;
  }

  function arrowForLeg(leg) {
    const geometry = leg.geometry;
    if (!geometry || geometry.length < 3) return null;
    const index = Math.max(1, Math.floor(geometry.length * 0.56));
    const angle = bearing(geometry[index - 1], geometry[index]) - 90;
    const color = leg.mode === "walking" ? "#0f8f62" : "#1a73e8";
    const icon = L.divIcon({
      className: "direction-arrow",
      html: `<span style="--angle:${angle}deg;--arrow-color:${color}"></span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    return L.marker(geometry[index], { icon, interactive: false, keyboard: false });
  }

  function renderMap() {
    data.legs.forEach((leg) => {
      const line = L.polyline(leg.geometry, lineStyle(leg, false)).addTo(map);
      line.on("click", () => selectLeg(leg.id, true));
      state.legLines.set(leg.id, line);
      routeBounds.extend(line.getBounds());

      const arrow = arrowForLeg(leg);
      if (arrow) {
        arrow.addTo(map);
        state.arrows.push(arrow);
      }
    });

    data.places.forEach((place) => {
      const latLng = [place.lat, place.lon];
      const marker = L.marker(latLng, { icon: iconForPlace(place), title: place.name })
        .bindPopup(popupForPlace(place))
        .addTo(map);
      marker.on("click", () => selectStop(place.id, false));
      state.markers.set(place.id, marker);
      routeBounds.extend(latLng);
    });

    map.fitBounds(routeBounds.pad(0.18));
  }

  function stopRow(place) {
    const row = document.createElement("div");
    row.className = "stop-row";
    row.dataset.stopId = place.id;
    row.innerHTML = `
      <button class="stop-number" type="button" aria-label="Focus ${place.name}">${place.id}</button>
      <button class="stop-main" type="button">
        <strong>${place.name}</strong>
        <span>${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}</span>
      </button>
      <a class="small-link" href="${place.googleMapsUrl}" target="_blank" rel="noreferrer" title="Open ${place.name} in Google Maps" aria-label="Open ${place.name} in Google Maps">
        <i data-lucide="external-link"></i>
      </a>
    `;
    row.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => selectStop(place.id, true));
    });
    return row;
  }

  function stopDot(place) {
    const button = document.createElement("button");
    button.className = "stop-dot";
    button.type = "button";
    button.textContent = place.id;
    button.title = place.name;
    button.setAttribute("aria-label", `Focus ${place.name}`);
    button.addEventListener("click", () => selectStop(place.id, true));
    return button;
  }

  function legCard(leg) {
    const from = data.places.find((place) => place.id === leg.from);
    const to = data.places.find((place) => place.id === leg.to);
    const iconName = leg.mode === "walking" ? "footprints" : "car";
    const card = document.createElement("article");
    card.className = "leg-card";
    card.dataset.legId = leg.id;
    card.innerHTML = `
      <div class="leg-top">
        <button class="leg-route" type="button" aria-label="Focus route from ${from.name} to ${to.name}">
          <span class="leg-index">${from.id} -> ${to.id}</span>
          <span class="leg-name">${from.short} to ${to.short}</span>
        </button>
      </div>
      <div class="leg-meta">
        <span class="mode-chip ${leg.mode === "walking" ? "walk" : "drive"}"><i data-lucide="${iconName}"></i>${leg.label}</span>
        <span>${leg.distanceKm.toFixed(1)} km</span>
        <span>approx ${leg.time}</span>
      </div>
      <a class="link-button" href="${leg.googleMapsUrl}" target="_blank" rel="noreferrer">
        <i data-lucide="navigation"></i>
        Open this leg
      </a>
    `;
    card.querySelector(".leg-route").addEventListener("click", () => selectLeg(leg.id, true));
    return card;
  }

  function renderPanel() {
    const stopStrip = document.getElementById("stopStrip");
    const stopList = document.getElementById("stopList");
    const legList = document.getElementById("legList");

    data.places.forEach((place) => {
      const dot = stopDot(place);
      const row = stopRow(place);
      stopStrip.appendChild(dot);
      stopList.appendChild(row);
      state.stopDots.set(place.id, dot);
      state.stopRows.set(place.id, row);
    });

    data.legs.forEach((leg) => {
      const card = legCard(leg);
      legList.appendChild(card);
      state.legCards.set(leg.id, card);
    });
  }

  function selectStop(stopId, moveMap) {
    state.activeStopId = stopId;
    state.stopRows.forEach((row, id) => row.classList.toggle("is-active", id === stopId));
    state.stopDots.forEach((dot, id) => dot.classList.toggle("is-active", id === stopId));

    const marker = state.markers.get(stopId);
    if (marker && moveMap) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
      marker.openPopup();
    }
  }

  function selectLeg(legId, moveMap) {
    state.activeLegId = legId;
    data.legs.forEach((leg) => {
      const active = leg.id === legId;
      const line = state.legLines.get(leg.id);
      const card = state.legCards.get(leg.id);
      if (line) line.setStyle(lineStyle(leg, active));
      if (card) card.classList.toggle("is-active", active);
    });

    const leg = data.legs.find((item) => item.id === legId);
    const line = state.legLines.get(legId);
    if (leg && line && moveMap) {
      selectStop(leg.from, false);
      map.fitBounds(line.getBounds().pad(0.28), { maxZoom: 16, animate: true });
    }
  }

  function distanceKm(a, b) {
    const radius = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function nearestStop(position) {
    const current = { lat: position.coords.latitude, lon: position.coords.longitude };
    return data.places
      .map((place) => ({ place, km: distanceKm(current, place) }))
      .sort((a, b) => a.km - b.km)[0];
  }

  function showStatus(text) {
    const status = document.getElementById("locationStatus");
    status.textContent = text;
    status.classList.add("is-visible");
    window.clearTimeout(showStatus.timer);
    showStatus.timer = window.setTimeout(() => status.classList.remove("is-visible"), 7000);
  }

  function locateUser() {
    if (!navigator.geolocation) {
      showStatus("Location is not available in this browser.");
      return;
    }
    showStatus("Checking your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latLng = [position.coords.latitude, position.coords.longitude];
        if (!state.userMarker) {
          state.userMarker = L.marker(latLng, {
            icon: L.divIcon({
              className: "user-location",
              html: "<span></span>",
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
            title: "Your location",
          }).addTo(map);
        } else {
          state.userMarker.setLatLng(latLng);
        }
        const nearest = nearestStop(position);
        map.setView(latLng, 15, { animate: true });
        showStatus(`Nearest stop: ${nearest.place.name}, about ${nearest.km.toFixed(1)} km away.`);
      },
      () => showStatus("Location permission was not allowed."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function init() {
    renderMap();
    renderPanel();
    selectLeg(1, false);
    selectStop(1, false);

    document.getElementById("resetBtn").addEventListener("click", () => {
      map.fitBounds(routeBounds.pad(0.18), { animate: true });
      showStatus("Route view reset.");
    });
    document.getElementById("locateBtn").addEventListener("click", locateUser);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  init();
})();

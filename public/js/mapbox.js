export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoid2l6YXJkY29kaW5nIiwiYSI6ImNrYXh6ejVzMDBiN3UyeG5pZHV3ZDl1eGUifQ.3yx5c45P8A1cmOSyycXugQ';

  var map = new mapboxgl.Map({
    container: 'map', // container set to map means it will set (map) to an element of id map
    style: 'mapbox://styles/wizardcoding/ckay05eo10yow1hquhsidgsgy',
    scrollZoom: false,
    //   center: [-118.113491, 34.111745], // first long then lat
    //   zoom: 4,
    //   interactive: false, // it will stop scrolling the map
  });

  const bounds = new mapboxgl.LngLatBounds(); // LatLngBounds(); this will show the location

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);
    // ADD popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    //  Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};

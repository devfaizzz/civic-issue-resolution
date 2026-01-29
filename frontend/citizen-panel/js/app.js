// Google Maps Integration for Citizen Panel
let map;
let marker;
let geocoder;
let mapLoaded = false;

// Initialize Google Maps
function initMap() {
  console.log('initMap called - Google Maps is loading...');

  // Default location (will be replaced by user's location)
  const defaultLocation = { lat: 28.6139, lng: 77.2090 }; // Delhi, India

  // Create map
  map = new google.maps.Map(document.getElementById('map'), {
    center: defaultLocation,
    zoom: 13,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true
  });

  // Initialize geocoder
  geocoder = new google.maps.Geocoder();

  // Add click listener to map
  map.addListener('click', (event) => {
    placeMarker(event.latLng);
    reverseGeocode(event.latLng);
  });

  // Mark map as loaded
  google.maps.event.addListenerOnce(map, 'idle', () => {
    mapLoaded = true;
    console.log('✅ Google Maps fully loaded and ready!');
  });
}

// Place marker on map
function placeMarker(location) {
  if (marker) {
    marker.setPosition(location);
  } else {
    marker = new google.maps.Marker({
      position: location,
      map: map,
      draggable: true,
      animation: google.maps.Animation.DROP
    });

    // Update coordinates when marker is dragged
    marker.addListener('dragend', (event) => {
      reverseGeocode(event.latLng);
    });
  }

  // Update hidden form fields
  document.getElementById('latitude').value = location.lat();
  document.getElementById('longitude').value = location.lng();
}

// Reverse geocode to get address
function reverseGeocode(latLng) {
  geocoder.geocode({ location: latLng }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const address = results[0].formatted_address;
      document.getElementById('locationAddress').textContent = address;
    } else {
      document.getElementById('locationAddress').textContent =
        `Lat: ${latLng.lat().toFixed(5)}, Lng: ${latLng.lng().toFixed(5)}`;
    }
  });
}

// Existing DOMContentLoaded code
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Basic form handler
  const issueForm = document.getElementById('issueForm');
  if (issueForm) {
    issueForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(issueForm);
      const body = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        latitude: document.getElementById('latitude').value,
        longitude: document.getElementById('longitude').value,
        priority: (document.querySelector('input[name="priority"]:checked') || {}).value,
        address: document.getElementById('locationAddress').textContent
      };

      // Validate location
      if (!body.latitude || !body.longitude) {
        alert('Please select a location on the map');
        return;
      }

      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok) {
        alert('Report submitted successfully!');
        issueForm.reset();
        if (marker) marker.setMap(null);
        marker = null;
        loadMyReports();
      } else {
        alert(json.message || 'Failed to submit report');
      }
    });
  }

  // Get Current Location button
  const getLocationBtn = document.getElementById('getLocation');
  if (getLocationBtn) {
    getLocationBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }

      // Show loading state
      getLocationBtn.disabled = true;
      getLocationBtn.textContent = '📍 Getting location...';

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Wait for map to be ready if it's not yet
          const processLocation = () => {
            if (!map) {
              // Map not ready yet, wait a bit
              setTimeout(processLocation, 500);
              return;
            }

            const location = new google.maps.LatLng(latitude, longitude);

            // Center map and place marker
            map.setCenter(location);
            map.setZoom(16);
            placeMarker(location);
            reverseGeocode(location);

            // Reset button
            getLocationBtn.disabled = false;
            getLocationBtn.textContent = '📍 Get Current Location';
          };

          processLocation();
        },
        (error) => {
          let errorMsg = 'Error getting location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMsg = 'Location request timed out. Please try again.';
              break;
          }
          alert(errorMsg);
          getLocationBtn.disabled = false;
          getLocationBtn.textContent = '📍 Get Current Location';
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  async function loadMyReports() {
    const list = document.getElementById('reportsList');
    if (!list) return;
    const res = await fetch('/api/issues/public');
    const data = await res.json();
    list.innerHTML = '';
    (data.issues || []).slice(0, 10).forEach(issue => {
      const div = document.createElement('div');
      div.className = 'p-4 border rounded-lg';
      div.innerHTML = `<div class="font-semibold">${issue.title}</div>
        <div class="text-sm text-gray-600">${issue.category} • ${issue.priority}</div>
        <div class="mt-1">Status: <span class="font-medium">${issue.status}</span></div>`;
      list.appendChild(div);
    });
  }
  loadMyReports();

  // Audio recording
  let mediaRecorder, audioChunks = [];
  const startBtn = document.getElementById('startRecord');
  const stopBtn = document.getElementById('stopRecord');
  const audioPlayback = document.getElementById('audioPlayback');
  if (startBtn && stopBtn && audioPlayback) {
    startBtn.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
          const type = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
          const blob = new Blob(audioChunks, { type });
          const url = URL.createObjectURL(blob);
          audioPlayback.src = url; audioPlayback.classList.remove('hidden');
          audioPlayback.load();
          audioPlayback.play().catch(() => { });
        };
        mediaRecorder.start();
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
      } catch (e) {
        alert('Microphone error: ' + e.message);
      }
    });
    stopBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      stopBtn.classList.add('hidden');
      startBtn.classList.remove('hidden');
    });
  }
});

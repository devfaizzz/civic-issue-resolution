// Google Maps Integration for Admin Panel
let adminMap;
let issueMarkers = [];
let infoWindow;

// Initialize Google Maps for Admin
function initAdminMap() {
  // Default location (Delhi, India)
  const defaultLocation = { lat: 28.6139, lng: 77.2090 };

  // Create map
  adminMap = new google.maps.Map(document.getElementById('adminMap'), {
    center: defaultLocation,
    zoom: 12,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  });

  // Initialize info window
  infoWindow = new google.maps.InfoWindow();

  // Load issues and display on map
  loadIssuesOnMap();
}

// Load issues and display markers on map
async function loadIssuesOnMap() {
  try {
    const res = await fetch('/api/issues/public');
    const data = await res.json();
    const issues = data.issues || [];

    // Clear existing markers
    issueMarkers.forEach(marker => marker.setMap(null));
    issueMarkers = [];

    // Add markers for each issue
    issues.forEach(issue => {
      if (issue.location && issue.location.coordinates) {
        const [lng, lat] = issue.location.coordinates;

        // Choose marker color based on priority
        const markerColor = getMarkerColor(issue.priority, issue.status);

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: adminMap,
          title: issue.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: markerColor,
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        // Add click listener to show issue details
        marker.addListener('click', () => {
          const content = `
            <div style="max-width: 300px;">
              <h3 style="font-weight: bold; margin-bottom: 8px;">${issue.title}</h3>
              <p style="margin-bottom: 4px;"><strong>Category:</strong> ${issue.category}</p>
              <p style="margin-bottom: 4px;"><strong>Priority:</strong> <span style="color: ${markerColor};">${issue.priority}</span></p>
              <p style="margin-bottom: 4px;"><strong>Status:</strong> ${issue.status}</p>
              <p style="margin-bottom: 8px;">${issue.description.substring(0, 100)}...</p>
              <p style="font-size: 12px; color: #666;">${issue.location.address || 'No address'}</p>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(adminMap, marker);
        });

        issueMarkers.push(marker);
      }
    });

    // Fit map to show all markers
    if (issueMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      issueMarkers.forEach(marker => bounds.extend(marker.getPosition()));
      adminMap.fitBounds(bounds);
    }
  } catch (error) {
    console.error('Error loading issues on map:', error);
  }
}

// Get marker color based on priority and status
function getMarkerColor(priority, status) {
  if (status === 'resolved' || status === 'closed') {
    return '#10B981'; // Green
  }

  switch (priority) {
    case 'critical':
      return '#DC2626'; // Red
    case 'high':
      return '#F59E0B'; // Orange
    case 'medium':
      return '#3B82F6'; // Blue
    case 'low':
      return '#6B7280'; // Gray
    default:
      return '#3B82F6'; // Blue
  }
}

// Existing admin.js code
document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('issuesTableBody');

  async function loadIssues() {
    const res = await fetch('/api/issues/public');
    const data = await res.json();
    tableBody.innerHTML = '';
    (data.issues || []).forEach(issue => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-6 py-4 text-sm">${issue._id}</td>
        <td class="px-6 py-4 text-sm">${issue.category}</td>
        <td class="px-6 py-4 text-sm">${issue.title}</td>
        <td class="px-6 py-4 text-sm">${issue.location?.address || ''}</td>
        <td class="px-6 py-4 text-sm">${issue.priority}</td>
        <td class="px-6 py-4 text-sm">${issue.status}</td>
        <td class="px-6 py-4 text-sm">${issue.assignedTo?.name || 'Unassigned'}</td>
        <td class="px-6 py-4 text-sm">
          <button data-id="${issue._id}" data-status="approved" class="approve px-2 py-1 bg-green-500 text-white rounded">Approve</button>
          <button data-id="${issue._id}" data-status="rejected" class="reject px-2 py-1 bg-red-500 text-white rounded ml-2">Reject</button>
          <button data-id="${issue._id}" data-status="hold" class="hold px-2 py-1 bg-yellow-500 text-white rounded ml-2">Hold</button>
        </td>`;
      tableBody.appendChild(tr);
    });

    // Reload map markers
    if (typeof loadIssuesOnMap === 'function') {
      loadIssuesOnMap();
    }
  }

  tableBody?.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.id && t.dataset.status) {
      await fetch(`/api/issues/${t.dataset.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: t.dataset.status })
      });
      loadIssues();
    }
  });

  loadIssues();
});

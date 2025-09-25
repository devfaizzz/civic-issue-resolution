document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('issuesTableBody');
  
  // Show loading state
  function showLoading() {
    const loader = document.createElement('tr');
    loader.innerHTML = '<td colspan="8" class="text-center py-4">Loading...</td>';
    tableBody.innerHTML = '';
    tableBody.appendChild(loader);
  }
  
  // Show success message
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }
  
  async function loadIssues() {
    try {
      showLoading();
      const res = await fetch('/api/issues/public');
      const data = await res.json();
      tableBody.innerHTML = '';
      
      if (!data.issues || data.issues.length === 0) {
        const noData = document.createElement('tr');
        noData.innerHTML = '<td colspan="8" class="text-center py-4 text-gray-500">No issues found</td>';
        tableBody.appendChild(noData);
        return;
      }
      
      // Filter to show only pending issues in the main table
      const pendingIssues = data.issues.filter(issue => 
        issue.status === 'pending' || issue.status === 'new' || !issue.status
      );
      
      if (pendingIssues.length === 0) {
        const noData = document.createElement('tr');
        noData.innerHTML = '<td colspan="8" class="text-center py-4 text-gray-500">No pending issues found</td>';
        tableBody.appendChild(noData);
        return;
      }
      
      pendingIssues.forEach(issue => {
        const tr = document.createElement('tr');
        const statusBadge = getStatusBadge(issue.status);
        const priorityBadge = getPriorityBadge(issue.priority);
        
        tr.innerHTML = `
          <td class="px-6 py-4 text-sm font-mono">${issue._id.slice(-6)}</td>
          <td class="px-6 py-4 text-sm">
            <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">${issue.category}</span>
          </td>
          <td class="px-6 py-4 text-sm font-medium">${issue.title}</td>
          <td class="px-6 py-4 text-sm text-gray-600">${issue.location?.address || 'N/A'}</td>
          <td class="px-6 py-4 text-sm">${priorityBadge}</td>
          <td class="px-6 py-4 text-sm">${statusBadge}</td>
          <td class="px-6 py-4 text-sm text-gray-600">${new Date(issue.createdAt).toLocaleDateString()}</td>
          <td class="px-6 py-4 text-sm">
            <div class="flex space-x-1">
              <button data-id="${issue._id}" data-status="approved" 
                class="approve px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-xs"
                ${issue.status === 'approved' ? 'disabled' : ''}>
                ✓ Approve
              </button>
              <button data-id="${issue._id}" data-status="rejected" 
                class="reject px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs"
                ${issue.status === 'rejected' ? 'disabled' : ''}>
                ✗ Reject
              </button>
              <button data-id="${issue._id}" data-status="on-hold" 
                class="hold px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-xs"
                ${issue.status === 'on-hold' ? 'disabled' : ''}>
                ⏸ Hold
              </button>
            </div>
          </td>`;
        tableBody.appendChild(tr);
      });
      
      // Load processed issues in the separate table
      loadProcessedIssues(data.issues);
    } catch (error) {
      console.error('Error loading issues:', error);
      showToast('Failed to load issues', 'error');
    }
  }
  
  function loadProcessedIssues(allIssues) {
    const processedTableBody = document.getElementById('processedIssuesTableBody');
    if (!processedTableBody) return;
    
    // Filter processed issues (approved, rejected, on-hold, resolved)
    const processedIssues = allIssues.filter(issue => 
      issue.status === 'approved' || 
      issue.status === 'rejected' || 
      issue.status === 'on-hold' || 
      issue.status === 'resolved' ||
      issue.status === 'in-progress'
    );
    
    processedTableBody.innerHTML = '';
    
    if (processedIssues.length === 0) {
      const noData = document.createElement('tr');
      noData.innerHTML = '<td colspan="5" class="text-center py-4 text-gray-500">No processed issues yet</td>';
      processedTableBody.appendChild(noData);
      return;
    }
    
    // Sort by most recent first
    processedIssues.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    
    processedIssues.slice(0, 10).forEach(issue => {
      const tr = document.createElement('tr');
      const statusBadge = getStatusBadge(issue.status);
      
      tr.innerHTML = `
        <td class="px-6 py-4 text-sm font-mono">${issue._id.slice(-6)}</td>
        <td class="px-6 py-4 text-sm font-medium">${issue.title}</td>
        <td class="px-6 py-4 text-sm">
          <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">${issue.category}</span>
        </td>
        <td class="px-6 py-4 text-sm">${statusBadge}</td>
        <td class="px-6 py-4 text-sm text-gray-600">${new Date(issue.updatedAt || issue.createdAt).toLocaleDateString()}</td>
      `;
      processedTableBody.appendChild(tr);
    });
  }
  
  function getStatusBadge(status) {
    const badges = {
      'pending': '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">⏳ Pending</span>',
      'approved': '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">✅ Approved</span>',
      'rejected': '<span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">❌ Rejected</span>',
      'on-hold': '<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">⏸ On Hold</span>',
      'in-progress': '<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">🔄 In Progress</span>',
      'resolved': '<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">✨ Resolved</span>'
    };
    return badges[status] || `<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">${status}</span>`;
  }
  
  function getPriorityBadge(priority) {
    const badges = {
      'low': '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Low</span>',
      'medium': '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Medium</span>',
      'high': '<span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">High</span>'
    };
    return badges[priority] || `<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">${priority}</span>`;
  }
  
  tableBody?.addEventListener('click', async (e) => {
    const button = e.target;
    if (button.dataset && button.dataset.id && button.dataset.status) {
      // Disable button during request
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Processing...';
      
      try {
        const response = await fetch(`/api/issues/${button.dataset.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: button.dataset.status })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          showToast(`Issue ${button.dataset.status} successfully!`);
          loadIssues(); // Reload to show updated status
        } else {
          throw new Error(result.message || 'Failed to update status');
        }
      } catch (error) {
        console.error('Error updating status:', error);
        showToast(`Failed to ${button.dataset.status} issue: ${error.message}`, 'error');
        // Re-enable button on error
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });
  
  // Export functionality
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        exportBtn.textContent = 'Exporting...';
        exportBtn.disabled = true;
        
        const res = await fetch('/api/issues/public');
        const data = await res.json();
        
        // Filter processed issues
        const processedIssues = data.issues.filter(issue => 
          issue.status === 'approved' || 
          issue.status === 'rejected' || 
          issue.status === 'on-hold' || 
          issue.status === 'resolved' ||
          issue.status === 'in-progress'
        );
        
        if (processedIssues.length === 0) {
          showToast('No processed issues to export', 'error');
          return;
        }
        
        // Create CSV content
        const headers = ['ID', 'Title', 'Category', 'Status', 'Priority', 'Location', 'Created Date', 'Updated Date'];
        const csvContent = [
          headers.join(','),
          ...processedIssues.map(issue => [
            issue._id,
            `"${issue.title.replace(/"/g, '""')}"`,
            issue.category,
            issue.status,
            issue.priority,
            `"${issue.location?.address || 'N/A'}"`,
            new Date(issue.createdAt).toLocaleDateString(),
            new Date(issue.updatedAt || issue.createdAt).toLocaleDateString()
          ].join(','))
        ].join('\\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `processed-issues-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${processedIssues.length} processed issues successfully!`);
        
      } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export data', 'error');
      } finally {
        exportBtn.textContent = 'Export Report';
        exportBtn.disabled = false;
      }
    });
  }
  
  // Initial load
  loadIssues();
  
  // Auto-refresh every 30 seconds
  setInterval(loadIssues, 30000);
});

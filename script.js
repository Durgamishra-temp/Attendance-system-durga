// Auto-detect API URL (Vercel vs local)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

let students = [];
let attendanceData = {};
let currentDate = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen with progress animation
    animateLoadingScreen(() => {
        // Set current date
        const today = new Date();
        currentDate = today.toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = currentDate;
        document.getElementById('currentDate').textContent = today.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Load students and attendance
        loadStudents();
        loadAttendance(currentDate);

        // Event listeners
        document.getElementById('attendanceDate').addEventListener('change', (e) => {
            currentDate = e.target.value;
            loadAttendance(currentDate);
        });

        document.getElementById('searchInput').addEventListener('input', filterStudents);
        document.getElementById('markAllPresent').addEventListener('click', () => markAll('present'));
        document.getElementById('markAllAbsent').addEventListener('click', () => markAll('absent'));
        document.getElementById('saveAttendance').addEventListener('click', saveAttendance);
        document.getElementById('copyPresentList').addEventListener('click', copyPresentList);
        document.getElementById('copyAbsentList').addEventListener('click', copyAbsentList);
        document.getElementById('viewHistory').addEventListener('click', viewHistory);
        document.getElementById('clearAllHistory').addEventListener('click', clearAllHistory);
        document.getElementById('closeModal').addEventListener('click', closeHistoryModal);
        document.getElementById('historyModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeHistoryModal();
        });
    });
});

function animateLoadingScreen(callback) {
    const loadingScreen = document.getElementById('loadingScreen');
    const barFill = document.getElementById('loaderBarFill');
    const percentText = document.getElementById('loaderPercent');
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += Math.random() * 8 + 2;
        if (progress > 100) progress = 100;
        
        barFill.style.width = progress + '%';
        percentText.textContent = Math.round(progress) + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                callback();
            }, 500);
        }
    }, 200);
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const table = document.getElementById('tableContainer');
    if (show) {
        spinner.classList.add('active');
        table.style.display = 'none';
    } else {
        spinner.classList.remove('active');
        table.style.display = 'block';
    }
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    const icon = notification.querySelector('.notification-icon');
    
    text.textContent = message;
    icon.textContent = isError ? '❌' : '✅';
    notification.style.borderLeft = isError ? '4px solid #dc3545' : '4px solid #28a745';
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

async function loadStudents() {
    try {
        const response = await fetch(`${API_BASE}/students`);
        const data = await response.json();
        students = data.students;
        document.getElementById('totalCount').textContent = students.length;
    } catch (error) {
        console.error('Error loading students:', error);
        showNotification('Failed to load students from server', true);
    }
}

async function loadAttendance(date) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/attendance?date=${date}`);
        const data = await response.json();
        attendanceData = data.attendance || {};
        renderTable();
    } catch (error) {
        console.error('Error loading attendance:', error);
        showNotification('Failed to load attendance data', true);
    } finally {
        showLoading(false);
    }
}

function renderTable() {
    const tbody = document.getElementById('attendanceBody');
    tbody.innerHTML = '';
    
    let presentCount = 0;
    let absentCount = 0;

    students.forEach((student, index) => {
        const status = attendanceData[student] || 'absent';
        if (status === 'present') presentCount++;
        else absentCount++;

        const tr = document.createElement('tr');
        tr.className = status;
        tr.dataset.index = index;
        tr.dataset.name = student.toLowerCase();

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${student}</td>
            <td>
                <span class="status-badge ${status}">
                    ${status === 'present' ? '✅ Present' : '❌ Absent'}
                </span>
            </td>
            <td>
                <button class="toggle-btn ${status === 'present' ? '' : 'absent'}" 
                        onclick="toggleAttendance(${index})">
                    ${status === 'present' ? 'Mark Absent' : 'Mark Present'}
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
    updateSearchResults();
}

function toggleAttendance(index) {
    const student = students[index];
    const currentStatus = attendanceData[student] || 'absent';
    attendanceData[student] = currentStatus === 'present' ? 'absent' : 'present';
    renderTable();
}

function markAll(status) {
    students.forEach(student => {
        attendanceData[student] = status;
    });
    renderTable();
    showNotification(`All students marked as ${status}`);
}

function filterStudents() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#attendanceBody tr');
    
    let visibleCount = 0;
    rows.forEach(row => {
        const name = row.dataset.name;
        if (name.includes(searchTerm)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    document.getElementById('searchResults').textContent = 
        `Showing ${visibleCount} of ${students.length} students`;
}

function updateSearchResults() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filterStudents();
    } else {
        document.getElementById('searchResults').textContent = 
            `Showing ${students.length} of ${students.length} students`;
    }
}

async function saveAttendance() {
    const saveBtn = document.getElementById('saveAttendance');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';

    try {
        const response = await fetch(`${API_BASE}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: currentDate,
                attendance: attendanceData
            })
        });

        const data = await response.json();
        if (data.status === 'success') {
            showNotification('Attendance saved successfully! ✅');
            document.getElementById('copyPresentList').style.display = '';
            document.getElementById('copyAbsentList').style.display = '';
        } else {
            showNotification('Failed to save attendance', true);
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        showNotification('Failed to connect to server', true);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Attendance';
    }
}

function copyPresentList() {
    const presentStudents = students.filter(student => attendanceData[student] === 'present');
    
    if (presentStudents.length === 0) {
        showNotification('No present students to copy!', true);
        return;
    }

    const date = new Date(currentDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let text = `📋 Present List - ${date}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Total Present: ${presentStudents.length} / ${students.length}\n\n`;
    
    presentStudents.forEach((student, index) => {
        text += `${index + 1}. ${student}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        showNotification(`✅ Copied ${presentStudents.length} present students to clipboard!`);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification(`✅ Copied ${presentStudents.length} present students to clipboard!`);
    });
}

function copyAbsentList() {
    const absentStudents = students.filter(student => attendanceData[student] !== 'present');
    
    if (absentStudents.length === 0) {
        showNotification('No absent students to copy!', true);
        return;
    }

    const date = new Date(currentDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let text = `📋 Absent List - ${date}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Total Absent: ${absentStudents.length} / ${students.length}\n\n`;
    
    absentStudents.forEach((student, index) => {
        text += `${index + 1}. ${student}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        showNotification(`✅ Copied ${absentStudents.length} absent students to clipboard!`);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification(`✅ Copied ${absentStudents.length} absent students to clipboard!`);
    });
}

async function viewHistory() {
    const modal = document.getElementById('historyModal');
    const body = document.getElementById('historyBody');
    body.innerHTML = '<div class="loading-spinner active"><div class="spinner"></div><p>Loading history...</p></div>';
    modal.classList.add('active');

    try {
        const response = await fetch(`${API_BASE}/attendance/history`);
        const data = await response.json();
        const history = data.history || {};
        
        body.innerHTML = '';
        
        const dates = Object.keys(history).sort().reverse();
        
        if (dates.length === 0) {
            body.innerHTML = '<p style="text-align:center;padding:40px;color:#888;">No attendance records found yet.</p>';
            return;
        }

        dates.forEach(date => {
            const dateDiv = document.createElement('div');
            dateDiv.innerHTML = `
                <div class="history-date-header">
                    📅 ${new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                    <button class="btn-clear-date" onclick="clearDateHistory('${date}')">🗑️ Clear</button>
                </div>
            `;
            body.appendChild(dateDiv);

            const table = document.createElement('table');
            table.className = 'history-table';
            
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Status</th>
                </tr>
            `;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            const dayData = history[date];
            
            students.forEach((student, index) => {
                const status = dayData[student] || 'absent';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${student}</td>
                    <td class="${status === 'present' ? 'history-present' : 'history-absent'}">
                        ${status === 'present' ? '✅ Present' : '❌ Absent'}
                    </td>
                `;
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            body.appendChild(table);
        });
    } catch (error) {
        console.error('Error loading history:', error);
        body.innerHTML = '<p style="text-align:center;padding:40px;color:#dc3545;">Failed to load history. Make sure the server is running.</p>';
    }
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

async function clearDateHistory(date) {
    if (!confirm(`Delete attendance record for ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/attendance/history?date=${date}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data.status === 'success') {
            showNotification(`🗑️ ${data.message}`);
            viewHistory();
        } else {
            showNotification('Failed to clear record', true);
        }
    } catch (error) {
        console.error('Error clearing history:', error);
        showNotification('Failed to connect to server', true);
    }
}

async function clearAllHistory() {
    if (!confirm('Delete ALL attendance history? This cannot be undone!')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/attendance/history`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data.status === 'success') {
            showNotification('🗑️ All attendance history cleared!');
            closeHistoryModal();
        } else {
            showNotification('Failed to clear history', true);
        }
    } catch (error) {
        console.error('Error clearing all history:', error);
        showNotification('Failed to connect to server', true);
    }
}

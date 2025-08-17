// TorBox API Client JavaScript
class TorBoxClient {
    constructor() {
        this.baseURL = 'https://api.torbox.app/v1';
        this.apiKey = '';
        this.isConnected = false;
        
        this.init();
    }

    init() {
        // Hide loading overlay initially
        this.showLoading(false);
        
        this.setupEventListeners();
        this.showView('dashboard');
    }

    setupEventListeners() {
        // API Key and Connection
        document.getElementById('testConnection').addEventListener('click', () => this.testConnection());
        document.getElementById('apiKey').addEventListener('input', (e) => {
            this.apiKey = e.target.value.trim();
        });

        // Navigation - Fixed event handling
        document.querySelectorAll('.sidebar__link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.getAttribute('data-view');
                if (view) {
                    this.showView(view);
                }
            });
        });

        // Torrent Management
        document.getElementById('addTorrentBtn').addEventListener('click', () => this.toggleAddTorrentForm(true));
        document.getElementById('cancelAddTorrent').addEventListener('click', () => this.toggleAddTorrentForm(false));
        document.getElementById('torrentForm').addEventListener('submit', (e) => this.handleAddTorrent(e));
        document.getElementById('refreshTorrents').addEventListener('click', () => this.loadTorrents());

        // Web Downloads
        document.getElementById('addWebDlBtn').addEventListener('click', () => this.toggleAddWebDlForm(true));
        document.getElementById('cancelAddWebDl').addEventListener('click', () => this.toggleAddWebDlForm(false));
        document.getElementById('webDlForm').addEventListener('submit', (e) => this.handleAddWebDownload(e));
        document.getElementById('refreshWebDl').addEventListener('click', () => this.loadWebDownloads());

        // Usenet Downloads
        document.getElementById('addUsenetBtn').addEventListener('click', () => this.toggleAddUsenetForm(true));
        document.getElementById('cancelAddUsenet').addEventListener('click', () => this.toggleAddUsenetForm(false));
        document.getElementById('usenetForm').addEventListener('submit', (e) => this.handleAddUsenetDownload(e));
        document.getElementById('refreshUsenet').addEventListener('click', () => this.loadUsenetDownloads());

        // Profile and Status
        document.getElementById('refreshProfile').addEventListener('click', () => this.loadProfile());
        document.getElementById('refreshStatus').addEventListener('click', () => this.loadServiceStatus());
    }

    // API Methods
    async makeRequest(endpoint, options = {}) {
        if (!this.apiKey && !endpoint.includes('/general/')) {
            this.showToast('API key required', 'error');
            return null;
        }

        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        try {
            this.showLoading(true);
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            this.showToast(`API Error: ${error.message}`, 'error');
            return null;
        } finally {
            this.showLoading(false);
        }
    }

    async testConnection() {
        if (!this.apiKey) {
            this.showToast('Please enter an API key', 'warning');
            return;
        }

        const result = await this.makeRequest('/api/user/me');
        const statusElement = document.getElementById('connectionStatus');
        
        if (result) {
            this.isConnected = true;
            statusElement.innerHTML = '<span class="status status--success">Connected</span>';
            this.showToast('Successfully connected to TorBox API', 'success');
            this.loadDashboardData();
        } else {
            this.isConnected = false;
            statusElement.innerHTML = '<span class="status status--error">Connection Failed</span>';
        }
    }

    async loadDashboardData() {
        if (!this.isConnected) return;

        const userInfo = await this.makeRequest('/api/user/me');
        const serviceStats = await this.makeRequest('/api/general/getstats');
        
        if (userInfo || serviceStats) {
            document.getElementById('quickStats').style.display = 'block';
            this.displayQuickStats(userInfo, serviceStats);
        }
    }

    displayQuickStats(userInfo, serviceStats) {
        const statsContainer = document.getElementById('statsContent');
        let statsHTML = '';

        if (userInfo && userInfo.data) {
            const user = userInfo.data;
            statsHTML += `
                <div class="stat-item">
                    <span class="stat-value">${user.email || 'N/A'}</span>
                    <span class="stat-label">Email</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${user.plan || 'Free'}</span>
                    <span class="stat-label">Plan</span>
                </div>
            `;
        }

        if (serviceStats && serviceStats.data) {
            const stats = serviceStats.data;
            statsHTML += `
                <div class="stat-item">
                    <span class="stat-value">${stats.total_torrents || 0}</span>
                    <span class="stat-label">Total Torrents</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.total_downloads || 0}</span>
                    <span class="stat-label">Total Downloads</span>
                </div>
            `;
        }

        if (!statsHTML) {
            statsHTML = '<div class="loading-state">Connect your API key to view stats</div>';
        }

        statsContainer.innerHTML = statsHTML;
    }

    // Torrent Management
    async loadTorrents() {
        if (!this.isConnected) {
            document.getElementById('torrentsTableContainer').innerHTML = '<div class="loading-state">Connect your API key to view torrents</div>';
            return;
        }

        const result = await this.makeRequest('/api/torrents/mylist');
        const container = document.getElementById('torrentsTableContainer');

        if (result && result.data) {
            this.displayTorrentsTable(result.data, container);
        } else {
            container.innerHTML = '<div class="empty-state">No torrents found or failed to load</div>';
        }
    }

    displayTorrentsTable(torrents, container) {
        if (!torrents.length) {
            container.innerHTML = '<div class="empty-state">No torrents found</div>';
            return;
        }

        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        torrents.forEach(torrent => {
            const progress = torrent.progress || 0;
            const progressBar = `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                    <div class="progress-text">${progress}%</div>
                </div>
            `;

            html += `
                <tr>
                    <td class="text-truncate" style="max-width: 200px;" title="${torrent.name || 'Unknown'}">${torrent.name || 'Unknown'}</td>
                    <td>${this.formatFileSize(torrent.size)}</td>
                    <td>${progressBar}</td>
                    <td><span class="status status--${this.getStatusClass(torrent.download_state)}">${torrent.download_state || 'Unknown'}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn--primary btn--sm" onclick="torboxClient.controlTorrent('${torrent.id}', 'resume')" title="Resume">▶️</button>
                            <button class="btn btn--secondary btn--sm" onclick="torboxClient.controlTorrent('${torrent.id}', 'pause')" title="Pause">⏸️</button>
                            <button class="btn btn--outline btn--sm" onclick="torboxClient.getDownloadLink('${torrent.id}')" title="Get Download Link">📥</button>
                            <button class="btn btn--secondary btn--sm" onclick="torboxClient.controlTorrent('${torrent.id}', 'delete')" style="color: var(--color-error);" title="Delete">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    async controlTorrent(torrentId, operation) {
        if (!confirm(`Are you sure you want to ${operation} this torrent?`)) return;

        const result = await this.makeRequest('/api/torrents/controltorrent', {
            method: 'POST',
            body: JSON.stringify({
                torrent_id: torrentId,
                operation: operation
            })
        });

        if (result) {
            this.showToast(`Torrent ${operation} successful`, 'success');
            this.loadTorrents();
        }
    }

    async getDownloadLink(torrentId) {
        const result = await this.makeRequest(`/api/torrents/requestdl?torrent_id=${torrentId}`);
        
        if (result && result.data) {
            const link = result.data;
            navigator.clipboard.writeText(link).then(() => {
                this.showToast('Download link copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast(`Download link: ${link}`, 'info');
            });
        }
    }

    toggleAddTorrentForm(show) {
        const form = document.getElementById('addTorrentForm');
        form.style.display = show ? 'block' : 'none';
        if (!show) {
            document.getElementById('torrentForm').reset();
        }
    }

    async handleAddTorrent(e) {
        e.preventDefault();
        
        const magnetLink = document.getElementById('magnetLink').value.trim();
        const name = document.getElementById('torrentName').value.trim();
        const seed = document.getElementById('seedTorrent').checked;
        const allowZip = document.getElementById('allowZip').checked;

        if (!magnetLink) {
            this.showToast('Magnet link is required', 'warning');
            return;
        }

        const result = await this.makeRequest('/api/torrents/createtorrent', {
            method: 'POST',
            body: JSON.stringify({
                magnet: magnetLink,
                name: name,
                seed: seed ? 1 : 0,
                allow_zip: allowZip ? 1 : 0
            })
        });

        if (result) {
            this.showToast('Torrent added successfully', 'success');
            this.toggleAddTorrentForm(false);
            this.loadTorrents();
        }
    }

    // Web Downloads
    async loadWebDownloads() {
        if (!this.isConnected) {
            document.getElementById('webDlTableContainer').innerHTML = '<div class="loading-state">Connect your API key to view web downloads</div>';
            return;
        }

        const result = await this.makeRequest('/api/webdl/mylist');
        const container = document.getElementById('webDlTableContainer');

        if (result && result.data) {
            this.displayWebDownloadsTable(result.data, container);
        } else {
            container.innerHTML = '<div class="empty-state">No web downloads found or failed to load</div>';
        }
    }

    displayWebDownloadsTable(downloads, container) {
        if (!downloads.length) {
            container.innerHTML = '<div class="empty-state">No web downloads found</div>';
            return;
        }

        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>URL</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
        `;

        downloads.forEach(download => {
            html += `
                <tr>
                    <td class="text-truncate" style="max-width: 200px;" title="${download.name || 'Unknown'}">${download.name || 'Unknown'}</td>
                    <td class="text-truncate" style="max-width: 300px;" title="${download.url || 'N/A'}">${download.url || 'N/A'}</td>
                    <td><span class="status status--${this.getStatusClass(download.status)}">${download.status || 'Unknown'}</span></td>
                    <td>${this.formatDate(download.created_at)}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    toggleAddWebDlForm(show) {
        const form = document.getElementById('addWebDlForm');
        form.style.display = show ? 'block' : 'none';
        if (!show) {
            document.getElementById('webDlForm').reset();
        }
    }

    async handleAddWebDownload(e) {
        e.preventDefault();
        
        const url = document.getElementById('webDlUrl').value.trim();
        const name = document.getElementById('webDlName').value.trim();

        if (!url) {
            this.showToast('URL is required', 'warning');
            return;
        }

        const result = await this.makeRequest('/api/webdl/createwebdownload', {
            method: 'POST',
            body: JSON.stringify({
                url: url,
                name: name
            })
        });

        if (result) {
            this.showToast('Web download added successfully', 'success');
            this.toggleAddWebDlForm(false);
            this.loadWebDownloads();
        }
    }

    // Usenet Downloads
    async loadUsenetDownloads() {
        if (!this.isConnected) {
            document.getElementById('usenetTableContainer').innerHTML = '<div class="loading-state">Connect your API key to view usenet downloads</div>';
            return;
        }

        const result = await this.makeRequest('/api/usenet/mylist');
        const container = document.getElementById('usenetTableContainer');

        if (result && result.data) {
            this.displayUsenetDownloadsTable(result.data, container);
        } else {
            container.innerHTML = '<div class="empty-state">No usenet downloads found or failed to load</div>';
        }
    }

    displayUsenetDownloadsTable(downloads, container) {
        if (!downloads.length) {
            container.innerHTML = '<div class="empty-state">No usenet downloads found</div>';
            return;
        }

        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>URL</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
        `;

        downloads.forEach(download => {
            html += `
                <tr>
                    <td class="text-truncate" style="max-width: 200px;" title="${download.name || 'Unknown'}">${download.name || 'Unknown'}</td>
                    <td class="text-truncate" style="max-width: 300px;" title="${download.url || 'N/A'}">${download.url || 'N/A'}</td>
                    <td><span class="status status--${this.getStatusClass(download.status)}">${download.status || 'Unknown'}</span></td>
                    <td>${this.formatDate(download.created_at)}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    toggleAddUsenetForm(show) {
        const form = document.getElementById('addUsenetForm');
        form.style.display = show ? 'block' : 'none';
        if (!show) {
            document.getElementById('usenetForm').reset();
        }
    }

    async handleAddUsenetDownload(e) {
        e.preventDefault();
        
        const url = document.getElementById('usenetUrl').value.trim();
        const name = document.getElementById('usenetName').value.trim();

        if (!url) {
            this.showToast('NZB URL is required', 'warning');
            return;
        }

        const result = await this.makeRequest('/api/usenet/createusenetdownload', {
            method: 'POST',
            body: JSON.stringify({
                url: url,
                name: name
            })
        });

        if (result) {
            this.showToast('Usenet download added successfully', 'success');
            this.toggleAddUsenetForm(false);
            this.loadUsenetDownloads();
        }
    }

    // Profile
    async loadProfile() {
        if (!this.isConnected) {
            document.getElementById('profileContent').innerHTML = '<div class="loading-state">Connect your API key to view profile information</div>';
            return;
        }

        const result = await this.makeRequest('/api/user/me?settings=1');
        const container = document.getElementById('profileContent');

        if (result && result.data) {
            this.displayProfile(result.data, container);
        } else {
            container.innerHTML = '<div class="empty-state">Could not load profile information</div>';
        }
    }

    displayProfile(profile, container) {
        let html = '<div class="profile-grid">';
        
        const profileFields = [
            { key: 'email', label: 'Email' },
            { key: 'plan', label: 'Plan' },
            { key: 'premium_expires_at', label: 'Premium Expires' },
            { key: 'total_downloaded', label: 'Total Downloaded' },
            { key: 'total_uploaded', label: 'Total Uploaded' },
            { key: 'server_time', label: 'Server Time' },
            { key: 'id', label: 'User ID' }
        ];

        profileFields.forEach(field => {
            if (profile[field.key] !== undefined) {
                let value = profile[field.key];
                if (field.key.includes('downloaded') || field.key.includes('uploaded')) {
                    value = this.formatFileSize(value);
                } else if (field.key.includes('expires_at') || field.key.includes('time')) {
                    value = this.formatDate(value);
                }
                
                html += `
                    <div class="profile-item">
                        <div class="profile-label">${field.label}</div>
                        <div class="profile-value">${value}</div>
                    </div>
                `;
            }
        });

        html += '</div>';
        
        // Add raw JSON display
        html += `
            <div class="mt-16">
                <h4>Raw Profile Data</h4>
                <div class="json-display">${JSON.stringify(profile, null, 2)}</div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Service Status
    async loadServiceStatus() {
        const uptime = await this.makeRequest('/api/general/getupstatus');
        const stats = await this.makeRequest('/api/general/getstats');

        const uptimeContainer = document.getElementById('uptimeContent');
        const statsContainer = document.getElementById('serviceStatsContent');

        if (uptime) {
            this.displayServiceUptime(uptime, uptimeContainer);
        } else {
            uptimeContainer.innerHTML = '<div class="empty-state">Could not load uptime data</div>';
        }

        if (stats) {
            this.displayServiceStats(stats, statsContainer);
        } else {
            statsContainer.innerHTML = '<div class="empty-state">Could not load statistics</div>';
        }
    }

    displayServiceUptime(uptime, container) {
        if (uptime.success) {
            container.innerHTML = `
                <div class="status status--success mb-16">Service is operational</div>
                <div class="json-display">${JSON.stringify(uptime, null, 2)}</div>
            `;
        } else {
            container.innerHTML = `
                <div class="status status--error mb-16">Service issues detected</div>
                <div class="json-display">${JSON.stringify(uptime, null, 2)}</div>
            `;
        }
    }

    displayServiceStats(stats, container) {
        if (stats.data) {
            let html = '<div class="stats-grid">';
            
            const statsData = stats.data;
            Object.keys(statsData).forEach(key => {
                html += `
                    <div class="stat-item">
                        <span class="stat-value">${statsData[key]}</span>
                        <span class="stat-label">${key.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                `;
            });
            
            html += '</div>';
            html += `<div class="json-display mt-16">${JSON.stringify(stats, null, 2)}</div>`;
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div class="empty-state">No statistics available</div>';
        }
    }

    // Navigation - Fixed implementation
    showView(viewName) {
        console.log('Switching to view:', viewName); // Debug log
        
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const targetView = document.getElementById(viewName);
        if (targetView) {
            targetView.classList.add('active');
            console.log('View switched successfully to:', viewName); // Debug log
        } else {
            console.error('View not found:', viewName); // Debug log
        }

        // Update sidebar active state
        document.querySelectorAll('.sidebar__link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-view="${viewName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Load data for the view if connected
        if (this.isConnected) {
            switch (viewName) {
                case 'torrents':
                    this.loadTorrents();
                    break;
                case 'webdownloads':
                    this.loadWebDownloads();
                    break;
                case 'usenet':
                    this.loadUsenetDownloads();
                    break;
                case 'profile':
                    this.loadProfile();
                    break;
                case 'status':
                    this.loadServiceStatus();
                    break;
            }
        } else {
            // Show appropriate not connected messages
            switch (viewName) {
                case 'torrents':
                    document.getElementById('torrentsTableContainer').innerHTML = '<div class="loading-state">Connect your API key to view torrents</div>';
                    break;
                case 'webdownloads':
                    document.getElementById('webDlTableContainer').innerHTML = '<div class="loading-state">Connect your API key to view web downloads</div>';
                    break;
                case 'usenet':
                    document.getElementById('usenetTableContainer').innerHTML = '<div class="loading-state">Connect your API key to view usenet downloads</div>';
                    break;
                case 'profile':
                    document.getElementById('profileContent').innerHTML = '<div class="loading-state">Connect your API key to view profile information</div>';
                    break;
                case 'status':
                    this.loadServiceStatus(); // Status endpoints don't require auth
                    break;
            }
        }
    }

    // Utility Methods
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        toast.innerHTML = `
            <div class="toast__content">
                <div class="toast__message">${message}</div>
                <button class="toast__close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    getStatusClass(status) {
        if (!status) return 'info';
        
        const statusLower = status.toLowerCase();
        if (statusLower.includes('completed') || statusLower.includes('seeding')) return 'success';
        if (statusLower.includes('downloading') || statusLower.includes('active')) return 'info';
        if (statusLower.includes('paused') || statusLower.includes('queued')) return 'warning';
        if (statusLower.includes('error') || statusLower.includes('failed')) return 'error';
        
        return 'info';
    }

    formatFileSize(bytes) {
        if (!bytes || isNaN(bytes)) return 'N/A';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch (error) {
            return dateString;
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.torboxClient = new TorBoxClient();
});
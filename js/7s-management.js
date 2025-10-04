class SevenSManager {
    constructor() {
        this.apiBaseUrl = '/api/7s-management.php';
        this.currentRecord = null;
        this.currentUser = this.getCurrentUser();
        this.init();
    }
    
    getCurrentUser() {

        return 'engineer1';
    }

    init() {
        this.bindEvents();
        this.loadRecords();
        this.registerWithGlobalManager();
    }

    bindEvents() {

        const form = document.getElementById('evaluationForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEvaluation();
            });
        }


        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearForm();
            });
        }


        const newBtn = document.getElementById('newBtn');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                this.createNew();
            });
        }


        const checkboxes = document.querySelectorAll('.evaluation-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.updateItemStyle(e.target);
            });
            
    
            checkbox.addEventListener('focus', () => {
                this.setCellFocused();
                if (window.globalRefreshManager) {
                    window.globalRefreshManager.setCellFocused();
                }
            });
            
            checkbox.addEventListener('blur', () => {
                this.setCellBlurred();
                if (window.globalRefreshManager) {
                    window.globalRefreshManager.setCellBlurred();
                }
            });
        });


        const evaluationItems = document.querySelectorAll('.evaluation-item');
        evaluationItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('.evaluation-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        this.updateItemStyle(checkbox);
                    }
                }
            });
        });
    }

    updateItemStyle(checkbox) {
        const item = checkbox.closest('.evaluation-item');
        if (item) {
            if (checkbox.checked) {
                item.classList.add('checked');
            } else {
                item.classList.remove('checked');
            }
        }
    }

    collectFormData() {
        const formData = {
            user: this.currentUser,
            current_user: this.currentUser,
            arrange: document.getElementById('arrange').checked,
            reorganize: document.getElementById('reorganize').checked,
            clean: document.getElementById('clean').checked,
            cleanliness: document.getElementById('cleanliness').checked,
            quality: document.getElementById('quality').checked,
            secure: document.getElementById('secure').checked,
            save: document.getElementById('save').checked
        };
        return formData;
    }

    /**
     * 填充表单数据
     */
    fillFormData(data) {
        if (!data) return;

        const fields = ['arrange', 'reorganize', 'clean', 'cleanliness', 'quality', 'secure', 'save'];
        fields.forEach(field => {
            const checkbox = document.getElementById(field);
            if (checkbox) {
                checkbox.checked = Boolean(data[field]);
                this.updateItemStyle(checkbox);
            }
        });
    }

    clearForm() {
        const checkboxes = document.querySelectorAll('.evaluation-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            this.updateItemStyle(checkbox);
        });
        this.currentRecord = null;
        this.showMessage('表单已清空', 'success');
    }

    createNew() {
        this.clearForm();
        this.currentRecord = null;
    }

    async saveEvaluation() {
        try {
    
            if (window.globalRefreshManager) {
                window.globalRefreshManager.setSaving();
            }
            
            const formData = this.collectFormData();
            let url = this.apiBaseUrl;
            let method = 'POST';

            if (this.currentRecord && this.currentRecord.id) {
                url += `/${this.currentRecord.id}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage(result.message || '保存成功', 'success');
                this.loadRecords();
                if (method === 'POST') {
                    this.clearForm();
                }
            } else {
                // 确保错误信息是字符串格式
                const errorMsg = Array.isArray(result.message) ? result.message.join(', ') : (result.message || '保存失败');
                this.showMessage(errorMsg, 'error');
            }
        } catch (error) {
            console.error('保存评估时出错:', error);
            this.showMessage('保存失败，请检查网络连接', 'error');
        } finally {
    
            if (window.globalRefreshManager) {
                window.globalRefreshManager.clearSaving();
            }
        }
    }

    async loadRecords() {
        try {
            const response = await fetch(this.apiBaseUrl);
            const result = await response.json();

            if (result.success) {
                this.renderRecords(result.data);
            } else {
                this.showMessage('加载记录失败', 'error');
            }
        } catch (error) {
            console.error('加载记录时出错:', error);
            this.showMessage('加载记录失败，请检查网络连接', 'error');
        }
    }

    renderRecords(records) {
        const tbody = document.getElementById('recordsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!records || records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11">暂无记录</td></tr>';
            return;
        }

        
        const userRecords = records.filter(record => record.user === this.currentUser);
        
        if (userRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11">您还没有评估记录</td></tr>';
            return;
        }

        userRecords.forEach(record => {
            const row = document.createElement('tr');
            const isCurrentUser = record.user === this.currentUser;
            const actionButtons = isCurrentUser ? 
                `<div class="action-buttons">
                    <button class="btn btn-primary btn-small" onclick="sevenSManager.editRecord(${record.id})">编辑</button>
                    <button class="btn btn-danger btn-small" onclick="sevenSManager.deleteRecord(${record.id})">删除</button>
                </div>` : 
                '<span class="text-muted">只读</span>';
            
            row.innerHTML = `
                <td>${record.id}</td>
                <td>${record.user}</td>
                <td><span class="status-badge status-${record.arrange}">${record.arrange ? '✓' : '✗'}</span></td>
                <td><span class="status-badge status-${record.reorganize}">${record.reorganize ? '✓' : '✗'}</span></td>
                <td><span class="status-badge status-${record.clean}">${record.clean ? '✓' : '✗'}</span></td>
                <td><span class="status-badge status-${record.cleanliness}">${record.cleanliness ? '✓' : '✗'}</span></td>
                <td><span class="status-badge status-${record.quality}">${record.quality ? '✓' : '✗'}</span></td>
                <td><span class="status-badge status-${record.secure}">${record.secure ? '✓' : '✗'}</span></td>
                <td><span class="status-badge status-${record.save}">${record.save ? '✓' : '✗'}</span></td>
                <td>${this.formatDateTime(record.created_at)}</td>
                <td>${actionButtons}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async editRecord(id) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/${id}`);
            const result = await response.json();

            if (result.success) {
                this.currentRecord = result.data;
                this.fillFormData(result.data);
                this.showMessage('记录已加载到表单中，可以进行编辑', 'success');
                

                document.querySelector('.evaluation-form').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            } else {
                this.showMessage('加载记录失败', 'error');
            }
        } catch (error) {
            console.error('编辑记录时出错:', error);
            this.showMessage('加载记录失败，请检查网络连接', 'error');
        }
    }

    async deleteRecord(id) {
        if (!confirm('确定要删除这条记录吗？')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage(result.message || '删除成功', 'success');
                this.loadRecords();
                

                if (this.currentRecord && this.currentRecord.id === id) {
                    this.clearForm();
                }
            } else {
                this.showMessage(result.message || '删除失败', 'error');
            }
        } catch (error) {
            console.error('删除记录时出错:', error);
            this.showMessage('删除失败，请检查网络连接', 'error');
        }
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        container.innerHTML = `<div class="message ${type}">${message}</div>`;
        

        setTimeout(() => {
            container.innerHTML = '';
        }, 3000);
    }

    /**
     * 注册到全局刷新管理器
     */
    registerWithGlobalManager() {
        if (window.globalRefreshManager) {
            window.globalRefreshManager.registerModule(
                '7s',
                () => this.loadRecords()
            );
            window.globalRefreshManager.startAutoRefresh();
        }
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '';
        
        try {
            const date = new Date(dateTimeString);
            if (isNaN(date.getTime())) {
                return dateTimeString;
            }
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        } catch (error) {
            return dateTimeString;
        }
    }













    /**
     * 设置单元格聚焦状态
     */
    setCellFocused() {

    }

    /**
     * 设置单元格失焦状态
     */
    setCellBlurred() {

    }
}


let sevenSManager;


document.addEventListener('DOMContentLoaded', function() {
    sevenSManager = new SevenSManager();
    
    window.sevenSManager = sevenSManager;
});


window.addEventListener('beforeunload', function() {

});
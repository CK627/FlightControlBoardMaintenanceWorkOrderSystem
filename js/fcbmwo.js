class FCBMWOManager {
    constructor() {
        this.currentWorkOrder = null;
        this.apiBaseUrl = '/api/fcbmwo.php';
    }

    async init() {
        this.bindEvents();
        await this.loadWorkOrder();
        this.registerWithGlobalManager();
        this.updateCellEditability(); // 设置单元格可编辑状态
    }

    bindEvents() {

        document.addEventListener('input', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('engineer-cell')) {
                if (this.canEditFCBMWO() && this.canEditEngineerCell(e.target)) {
                    this.onCellChange(e.target);
                } else {
                    e.target.blur();
                    return false;
                }
            }
        });


        document.addEventListener('focus', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('engineer-cell')) {
                if (this.canEditFCBMWO() && this.canEditEngineerCell(e.target)) {
                    this.setCellFocused();
                    if (window.globalRefreshManager) {
                        window.globalRefreshManager.setCellFocused();
                    }
                } else {
                    // 如果没有权限编辑，立即失去焦点
                    e.target.blur();
                    e.preventDefault();
                    return false;
                }
            }
        }, true);

        document.addEventListener('blur', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('engineer-cell')) {
                this.setCellBlurred();
                if (window.globalRefreshManager) {
                    window.globalRefreshManager.setCellBlurred();
                }
            }
        }, true);

        // 防止禁用单元格被点击
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('engineer-cell')) {
                if (!this.canEditFCBMWO() || !this.canEditEngineerCell(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        }, true);

        document.addEventListener('blur', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('engineer-cell')) {
                if (this.canEditFCBMWO() && this.canEditEngineerCell(e.target)) {
                    this.saveWorkOrder();
                }
            }
        }, true);
    }

    canEditFCBMWO() {
        if (window.LoginManager && LoginManager.isLoggedIn()) {
            return LoginManager.hasPermission('can_edit_fcbmwo');
        }

        return window.canEdit ? window.canEdit() : false;
    }

    canEditDataRecovery() {
        if (window.LoginManager && LoginManager.isLoggedIn()) {
            return LoginManager.hasPermission('can_edit_data_recovery');
        }

        return window.canEditDataRecovery ? window.canEditDataRecovery() : false;
    }

    /**
     * 检查当前用户是否可以编辑指定工程师的单元格
     */
    canEditEngineerCell(cell) {
        if (!window.LoginManager || !LoginManager.isLoggedIn()) {
            return false;
        }

        const currentUserRole = LoginManager.getUserRole();
        const cellEngineer = cell.dataset.engineer;

        // 只有对应的工程师才能编辑自己的单元格
        return currentUserRole === cellEngineer;
    }

    /**
     * 更新所有单元格的可编辑状态
     */
    updateCellEditability() {
        const engineerCells = document.querySelectorAll('.engineer-cell');
        
        engineerCells.forEach(cell => {
            const canEdit = this.canEditFCBMWO() && this.canEditEngineerCell(cell);
            
            if (canEdit) {
                cell.setAttribute('contenteditable', 'true');
                cell.classList.remove('cell-disabled');
                cell.style.backgroundColor = '';
                cell.style.cursor = 'text';
            } else {
                cell.setAttribute('contenteditable', 'false');
                cell.classList.add('cell-disabled');
                cell.style.backgroundColor = '#f5f5f5';
                cell.style.cursor = 'not-allowed';
            }
        });
    }

    onCellChange(cell) {
        const engineer = cell.dataset.engineer;
        const field = cell.dataset.field;
        const value = cell.textContent.trim() || cell.value || '';
        
        console.log(`单元格变化: ${engineer} - ${field} = ${value}`);

        this.markAsModified();
    }


    onDataRecoveryChange(cell) {
        const project = cell.dataset.project;
        const engineer = cell.dataset.engineer;
        const value = cell.textContent;
        
        if (!window.formData.dataRecovery[project]) {
            window.formData.dataRecovery[project] = {};
        }
        window.formData.dataRecovery[project][engineer] = value;
        
        window.saveFormData(window.formData);
        
        this.markAsModified();
        this.markAsModified();
    }

    markAsModified() {
        document.body.classList.add('data-modified');
    }

    collectTableData() {
        const engineers = ['engineer1', 'engineer2', 'engineer3'];
        const engineerData = [];
        
        engineers.forEach(engineer => {
            const data = {
                user: engineer,
                Discovered_a_malfunction: this.getCellValue(engineer, 'fault1') || '',
                Test_results: this.getCellValue(engineer, 'testResult') || '',
                Locate_faulty_components: this.getCellValue(engineer, 'locate') || '',
                Repair_results: this.getCellValue(engineer, 'repair') || '',
                Optimization_effect: this.getCellValue(engineer, 'optimize') || '',

                Discovered_a_malfunction2: this.getCellValue(engineer, 'fault2') || '',
                Test_results2: this.getCellValue(engineer, 'testResult2') || '',
                Locate_faulty_components2: this.getCellValue(engineer, 'locate2') || '',
                Repair_results2: this.getCellValue(engineer, 'repair2') || '',

                Discovered_a_malfunction3: this.getCellValue(engineer, 'fault3') || '',
                Test_results3: this.getCellValue(engineer, 'testResult3') || '',
                Locate_faulty_components3: this.getCellValue(engineer, 'locate3') || '',
                Repair_results3: this.getCellValue(engineer, 'repair3') || ''
            };
            engineerData.push(data);
        });
        
        return engineerData;
    }

    getCellValue(engineer, field) {
        const cell = document.querySelector(`[data-engineer="${engineer}"][data-field="${field}"]`);
        if (!cell) return '';
        
        return cell.textContent.trim() || cell.value || '';
    }



    setCellValue(engineer, field, value) {
        // 缓存DOM查询结果以提高性能
        if (!this.cellCache) {
            this.cellCache = new Map();
        }
        
        const cacheKey = `${engineer}-${field}`;
        let cell = this.cellCache.get(cacheKey);
        
        if (!cell) {
            cell = document.querySelector(`[data-engineer="${engineer}"][data-field="${field}"]`);
            if (cell) {
                this.cellCache.set(cacheKey, cell);
            }
        }
        
        if (cell) {
            if (cell.tagName === 'INPUT' || cell.tagName === 'TEXTAREA') {
                cell.value = value || '';
            } else {
                cell.textContent = value || '';
            }
        }
    }

    generateWorkNumber() {
        if (this.currentWorkOrder && this.currentWorkOrder.work_number) {
            return this.currentWorkOrder.work_number;
        }
        const now = new Date();
        const dateStr = now.getFullYear() + 
                       String(now.getMonth() + 1).padStart(2, '0') + 
                       String(now.getDate()).padStart(2, '0');
        const timeStr = String(now.getHours()).padStart(2, '0') + 
                       String(now.getMinutes()).padStart(2, '0');
        return `FCBMWO-${dateStr}-${timeStr}`;
    }

    getCurrentUser() {

        const userSession = localStorage.getItem('userSession');
        if (userSession) {
            const user = JSON.parse(userSession);
            return user.username || 'unknown';
        }
        return 'unknown';
    }

    /**
     * 获取当前用户可以保存的工程师列表
     */
    getAuthorizedEngineersForSave() {
        if (!window.LoginManager || !LoginManager.isLoggedIn()) {
            return [];
        }

        const currentUserRole = LoginManager.getUserRole();
        const authorizedEngineers = [];

        // 只有对应的工程师才能保存自己的数据
        if (currentUserRole === 'engineer1') {
            authorizedEngineers.push('engineer1');
        } else if (currentUserRole === 'engineer2') {
            authorizedEngineers.push('engineer2');
        } else if (currentUserRole === 'engineer3') {
            authorizedEngineers.push('engineer3');
        }
        // 管理员和裁判可以保存所有工程师的数据
        else if (currentUserRole === 'admin' || currentUserRole === 'referee') {
            authorizedEngineers.push('engineer1', 'engineer2', 'engineer3');
        }

        return authorizedEngineers;
    }

    async saveWorkOrder() {
        try {
            if (window.globalRefreshManager) {
                window.globalRefreshManager.setSaving();
            }
            
            // 获取当前用户有权限保存的工程师列表
            const authorizedEngineers = this.getAuthorizedEngineersForSave();
            
            if (authorizedEngineers.length === 0) {
                this.showMessage('您没有权限保存任何数据', 'error');
                return;
            }
            
            const engineerDataArray = this.collectTableData();
            let allSuccess = true;
            let errorMessages = [];
            let savedCount = 0;

            for (let i = 0; i < engineerDataArray.length; i++) {
                const engineerData = engineerDataArray[i];
                const engineerId = i + 1;
                const engineerRole = engineerData.user;
                
                // 只保存当前用户有权限的工程师数据
                if (!authorizedEngineers.includes(engineerRole)) {
                    console.log(`跳过保存工程师 ${engineerRole} 的数据（无权限）`);
                    continue;
                }
                
                try {
                    let response;
                    // 先尝试更新工单
                    response = await fetch(`${this.apiBaseUrl}/${engineerId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(engineerData)
                    });
                    
                    let result = await response.json();
                    
                    // 如果工单不存在，则创建新工单
                    if (!result.success && result.message === '工单不存在') {
                        console.log(`工单 ${engineerId} 不存在，尝试创建新工单`);
                        response = await fetch(this.apiBaseUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(engineerData)
                        });
                        result = await response.json();
                    }
                    
                    if (result.success) {
                        savedCount++;
                        console.log(`工程师 ${engineerRole} 数据保存成功`);
                    } else {
                        allSuccess = false;
                        // 确保错误信息是字符串格式
                        const errorMsg = Array.isArray(result.message) ? result.message.join(', ') : result.message;
                        errorMessages.push(`${engineerData.user}: ${errorMsg}`);
                    }
                } catch (error) {
                    allSuccess = false;
                    // 确保错误信息是字符串格式
                    const errorMsg = Array.isArray(error.message) ? error.message.join(', ') : (error.message || error.toString());
                    errorMessages.push(`${engineerData.user}: ${errorMsg}`);
                }
            }
            
            if (savedCount > 0 && allSuccess) {
                console.log(`成功保存 ${savedCount} 个工程师的数据`);
                this.showMessage(`数据保存成功（保存了 ${savedCount} 个工程师的数据）`, 'success');
                document.body.classList.remove('data-modified');
            } else if (savedCount > 0) {
                console.error('部分数据保存失败:', errorMessages);
                this.showMessage(`部分数据保存成功（${savedCount} 个），失败: ` + errorMessages.join('; '), 'warning');
            } else if (errorMessages.length > 0) {
                console.error('数据保存失败:', errorMessages);
                this.showMessage('数据保存失败: ' + errorMessages.join('; '), 'error');
            } else {
                this.showMessage('没有需要保存的数据', 'info');
            }
        } catch (error) {
            console.error('保存数据时发生错误:', error);
            this.showMessage('保存数据时发生错误: ' + error.message, 'error');
        } finally {
            if (window.globalRefreshManager) {
                window.globalRefreshManager.clearSaving();
            }
        }
    }

    async loadWorkOrder(id = null) {
        try {
            let url = this.apiBaseUrl;
            if (id) {
                url += `/${id}`;
            } else {
                url += '/list';
            }

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();

            if (result.success) {
                if (result.data && result.data.length > 0) {
                    this.currentWorkOrder = result.data;
                    this.fillTableData(result.data);
                } else {
                    console.log('未找到工单数据');
                }
            } else {
                console.log('未找到工单数据');
            }
        } catch (error) {
            console.error('加载工单时发生错误:', error);
        }
    }

    fillTableData(dataArray) {
        if (!dataArray || !Array.isArray(dataArray)) {
            return;
        }

        this.clearTable();

        const userMapping = {
            'engineer1': 'engineer1',
            'engineer2': 'engineer2',
            'engineer3': 'engineer3'
        };

        // 批量更新DOM以提高性能
        const updates = [];
        
        dataArray.forEach(record => {
            const engineerKey = userMapping[record.user];
            if (!engineerKey) return;

            // 收集所有需要更新的数据
            const fieldMappings = [
                ['fault1', record.Discovered_a_malfunction],
                ['testResult', record.Test_results],
                ['locate', record.Locate_faulty_components],
                ['repair', record.Repair_results],
                ['optimize', record.Optimization_effect],
                ['fault2', record.Discovered_a_malfunction2],
                ['testResult2', record.Test_results2],
                ['locate2', record.Locate_faulty_components2],
                ['repair2', record.Repair_results2],
                ['fault3', record.Discovered_a_malfunction3],
                ['testResult3', record.Test_results3],
                ['locate3', record.Locate_faulty_components3],
                ['repair3', record.Repair_results3]
            ];
            
            fieldMappings.forEach(([field, value]) => {
                updates.push({ engineer: engineerKey, field, value: value || '' });
            });
        });
        
        // 批量执行DOM更新
        requestAnimationFrame(() => {
            updates.forEach(({ engineer, field, value }) => {
                this.setCellValue(engineer, field, value);
            });
            
            // 更新单元格可编辑状态
            this.updateCellEditability();
        });
    }


    registerWithGlobalManager() {
        if (window.globalRefreshManager) {
            window.globalRefreshManager.registerModule(
                'fcbmwo',
                () => this.loadWorkOrder(),
                'refresh-countdown-fcbmwo'
            );
            window.globalRefreshManager.startAutoRefresh();
        }
    }

    // 自动保存功能已移除，因为单元格失焦时会自动保存
    // startAutoSave() 和 stopAutoSave() 方法已删除













    setCellFocused() {
    }

    setCellBlurred() {
    }

    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            ${type === 'success' ? 'background-color: #4CAF50;' : ''}
            ${type === 'error' ? 'background-color: #f44336;' : ''}
            ${type === 'info' ? 'background-color: #2196F3;' : ''}
        `;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    createNewWorkOrder() {
        this.currentWorkOrder = null;
        this.clearTable();
        console.log('创建新工单');
    }



    /**
     * 计算填写进度（不包括故障三相关字段）
     */
    calculateProgress() {
        const engineers = ['engineer1', 'engineer2', 'engineer3'];
        const faultFields = [
            // 故障一相关字段
            'fault1', 'testResult', 'locate', 'repair',
            // 故障二相关字段
            'fault2', 'testResult2', 'locate2', 'repair2'
        ];
        
        let totalFields = 0;
        let filledFields = 0;
        
        // 计算故障相关字段（每个工程师8个字段）
        engineers.forEach(engineer => {
            faultFields.forEach(field => {
                totalFields += 1;
                const value = this.getCellValue(engineer, field);
                if (value && value.trim() !== '') {
                    filledFields += 1;
                }
            });
        });
        
        // 计算调优效果字段（每个工程师1个字段）
        engineers.forEach(engineer => {
            totalFields += 1;
            const value = this.getCellValue(engineer, 'optimize');
            if (value && value.trim() !== '') {
                filledFields += 1;
            }
        });
        
        const percentage = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
        
        return {
            total: totalFields,
            filled: filledFields,
            percentage: percentage
        };
    }



    clearTable() {
        const cells = document.querySelectorAll('.engineer-cell');
        cells.forEach(cell => {
            if (cell.tagName === 'INPUT' || cell.tagName === 'TEXTAREA') {
                cell.value = '';
            } else {
                cell.textContent = '';
            }
        });
        
        // 清除DOM缓存
        if (this.cellCache) {
            this.cellCache.clear();
        }
        
        document.body.classList.remove('data-modified');
    }
}


let fcbmwoManager;

document.addEventListener('DOMContentLoaded', async function() {
    fcbmwoManager = new FCBMWOManager();
    await fcbmwoManager.init();
    // 将管理器实例暴露到全局window对象
    window.fcbmwoManager = fcbmwoManager;
});

window.addEventListener('beforeunload', function() {
    // 页面卸载时的清理工作（如果需要的话）
});

// 确保全局可访问
window.loadFCBMWO = function() {
    return fcbmwoManager;
};
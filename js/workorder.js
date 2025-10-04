class WorkOrderManager {
    constructor() {
        this.apiBaseUrl = '/api/workorder.php';
        this.currentWorkOrder = null;
        this.isAutoSaving = false;
        this.autoSaveInterval = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadWorkOrder();
        this.startAutoSave();
    }

    bindEvents() {

        document.addEventListener('input', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('engineer-cell')) {
                this.onCellChange(e.target);
            }
        });


        document.addEventListener('blur', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('engineer-cell')) {
                this.saveWorkOrder();
            }
        }, true);


        const saveBtn = document.getElementById('saveWorkOrder');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveWorkOrder());
        }


        const newBtn = document.getElementById('newWorkOrder');
        if (newBtn) {
            newBtn.addEventListener('click', () => this.createNewWorkOrder());
        }


        const listBtn = document.getElementById('workOrderList');
        if (listBtn) {
            listBtn.addEventListener('click', () => this.showWorkOrderList());
        }
    }

    onCellChange(cell) {
        const engineer = cell.dataset.engineer;
        const field = cell.dataset.field;
        const value = cell.textContent || cell.value;

        console.log(`单元格变化: ${engineer} - ${field} = ${value}`);
        

        this.markAsModified();
    }

    markAsModified() {
        const saveBtn = document.getElementById('saveWorkOrder');
        if (saveBtn) {
            saveBtn.textContent = '保存*';
            saveBtn.classList.add('modified');
        }
    }

    markAsSaved() {
        const saveBtn = document.getElementById('saveWorkOrder');
        if (saveBtn) {
            saveBtn.textContent = '保存';
            saveBtn.classList.remove('modified');
        }
    }

    collectTableData() {
        const data = {
            engineers: {
                engineer1: { fault1: {}, fault2: {} },
                engineer2: { fault1: {}, fault2: {} },
                engineer3: { fault1: {}, fault2: {} }
            }
        };


        const cells = document.querySelectorAll('.engineer-cell');
        cells.forEach(cell => {
            const engineer = cell.dataset.engineer;
            const field = cell.dataset.field;
            const value = cell.textContent.trim() || cell.value || '';

            if (engineer && field) {

                if (field === 'fault1' || field === 'fault2') {
                    if (!data.engineers[engineer][field]) {
                        data.engineers[engineer][field] = {};
                    }
                    data.engineers[engineer][field].description = value;
                } else {
                    const cellIndex = Array.from(cell.parentNode.children).indexOf(cell);
                    let faultType = 'fault1';
                    

                    if (cellIndex >= 3 && cellIndex <= 4) {
                        faultType = cellIndex % 2 === 1 ? 'fault1' : 'fault2';
                    } else if (cellIndex >= 5 && cellIndex <= 6) {
                        faultType = cellIndex % 2 === 1 ? 'fault1' : 'fault2';
                    }
                    
                    if (!data.engineers[engineer][faultType]) {
                        data.engineers[engineer][faultType] = {};
                    }
                    data.engineers[engineer][faultType][field] = value;
                }
            }
        });

        return data;
    }

    /**
     * 转换数据格式为API格式
     */
    convertToApiFormat(tableData) {
        const details = [];
        
        Object.keys(tableData.engineers).forEach(engineer => {
            ['fault1', 'fault2'].forEach(faultType => {
                const faultData = tableData.engineers[engineer][faultType];
                if (faultData && Object.keys(faultData).length > 0) {
                    details.push({
                        engineer: engineer,
                        fault_type: faultType,
                        fault_description: faultData.description || faultData.fault1 || faultData.fault2 || '',
                        test_result: faultData.testResult || '',
                        locate_component: faultData.locate || '',
                        repair_result: faultData.repairResult || '',
                        tuning_effect: faultData.tuning || '',
                        seven_s_evaluation: faultData.sevenS || null
                    });
                }
            });
        });

        return {
            work_number: this.generateWorkNumber(),
            created_by: LoginManager.getCurrentUser()?.username || 'unknown',
            status: 'in_progress',
            details: details,
            operator: LoginManager.getCurrentUser()?.username || 'unknown'
        };
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
        return `WO-${dateStr}-${timeStr}`;
    }

    async saveWorkOrder() {
        if (this.isAutoSaving) return;
        
        try {
            this.isAutoSaving = true;
            const tableData = this.collectTableData();
            const apiData = this.convertToApiFormat(tableData);

            let response;
            if (this.currentWorkOrder && this.currentWorkOrder.id) {
    
                response = await fetch(`${this.apiBaseUrl}/${this.currentWorkOrder.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(apiData)
                });
            } else {
    
                response = await fetch(`${this.apiBaseUrl}/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(apiData)
                });
            }

            const result = await response.json();
            
            if (result.success) {
                if (result.data && result.data.id && !this.currentWorkOrder) {
    
                    this.currentWorkOrder = {
                        id: result.data.id,
                        work_number: apiData.work_number
                    };
                }
                
                this.markAsSaved();
                this.showMessage('工单保存成功', 'success');
                console.log('工单保存成功:', result);
            } else {
                // 确保错误信息是字符串格式
                const errorMsg = Array.isArray(result.message) ? result.message.join(', ') : result.message;
                this.showMessage('保存失败: ' + errorMsg, 'error');
                console.error('保存失败:', errorMsg);
            }
        } catch (error) {
            // 确保错误信息是字符串格式
            const errorMsg = Array.isArray(error.message) ? error.message.join(', ') : (error.message || error.toString());
            this.showMessage('保存失败: ' + errorMsg, 'error');
            console.error('保存工单时发生错误:', error);
        } finally {
            this.isAutoSaving = false;
        }
    }

    async loadWorkOrder(workOrderId = null) {
        try {
            if (!workOrderId) {

                const response = await fetch(`${this.apiBaseUrl}/list`);
                const result = await response.json();
                
                if (result.success && result.data.length > 0) {
                    workOrderId = result.data[0].id;
                } else {
                    console.log('没有找到现有工单，将创建新工单');
                    return;
                }
            }

            const response = await fetch(`${this.apiBaseUrl}/${workOrderId}`);
            const result = await response.json();
            
            if (result.success) {
                this.currentWorkOrder = result.data;
                this.populateTable(result.data);
                this.showMessage('工单加载成功', 'success');
                console.log('工单加载成功:', result.data);
            } else {
                this.showMessage('加载失败: ' + result.message, 'error');
                console.error('加载失败:', result.message);
            }
        } catch (error) {
            console.error('加载工单时发生错误:', error);
        }
    }

    populateTable(workOrderData) {
        if (!workOrderData.details) return;


        const cells = document.querySelectorAll('.engineer-cell');
        cells.forEach(cell => {
            cell.textContent = '';
        });


        workOrderData.details.forEach(detail => {
            const engineer = detail.engineer;
            const faultType = detail.fault_type;
            

            this.setCellValue(engineer, 'fault1', detail.fault_description, faultType === 'fault1');
            this.setCellValue(engineer, 'fault2', detail.fault_description, faultType === 'fault2');
            this.setCellValue(engineer, 'testResult', detail.test_result);
            this.setCellValue(engineer, 'locate', detail.locate_component);
            this.setCellValue(engineer, 'repairResult', detail.repair_result);
            this.setCellValue(engineer, 'tuning', detail.tuning_effect);
        });
    }

    setCellValue(engineer, field, value, condition = true) {
        if (!condition || !value) return;
        
        const cell = document.querySelector(`[data-engineer="${engineer}"][data-field="${field}"]`);
        if (cell) {
            cell.textContent = value;
        }
    }

    createNewWorkOrder() {
        this.currentWorkOrder = null;
        

        const cells = document.querySelectorAll('.engineer-cell');
        cells.forEach(cell => {
            cell.textContent = '';
        });
        
        this.markAsModified();
        this.showMessage('已创建新工单，请填写数据后保存', 'info');
    }

    async showWorkOrderList() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/list`);
            const result = await response.json();
            
            if (result.success) {
                this.displayWorkOrderList(result.data);
            } else {
                this.showMessage('获取工单列表失败: ' + result.message, 'error');
            }
        } catch (error) {
            this.showMessage('获取工单列表失败: ' + error.message, 'error');
            console.error('获取工单列表时发生错误:', error);
        }
    }

    displayWorkOrderList(workOrders) {

        console.log('工单列表:', workOrders);
        

        let listText = '工单列表:\n\n';
        workOrders.forEach((wo, index) => {
            listText += `${index + 1}. ${wo.work_number} - ${wo.status} (${wo.created_at})\n`;
        });
        
        const selectedIndex = prompt(listText + '\n请输入要加载的工单序号（1-' + workOrders.length + '）:');
        
        if (selectedIndex && !isNaN(selectedIndex)) {
            const index = parseInt(selectedIndex) - 1;
            if (index >= 0 && index < workOrders.length) {
                this.loadWorkOrder(workOrders[index].id);
            }
        }
    }

    startAutoSave() {

        this.autoSaveInterval = setInterval(() => {
            if (this.currentWorkOrder || this.hasUnsavedChanges()) {
                this.saveWorkOrder();
            }
        }, 30000);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    hasUnsavedChanges() {
        const saveBtn = document.getElementById('saveWorkOrder');
        return saveBtn && saveBtn.classList.contains('modified');
    }

    showMessage(message, type = 'info') {

        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 4px;
            color: white;
            z-index: 1000;
            font-size: 14px;
            max-width: 300px;
        `;
        

        switch (type) {
            case 'success':
                messageDiv.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                messageDiv.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                messageDiv.style.backgroundColor = '#ff9800';
                break;
            default:
                messageDiv.style.backgroundColor = '#2196F3';
        }
        
        document.body.appendChild(messageDiv);
        

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    destroy() {
        this.stopAutoSave();
    }
}


let workOrderManager = null;


document.addEventListener('DOMContentLoaded', () => {
    workOrderManager = new WorkOrderManager();
});


window.addEventListener('beforeunload', (e) => {
    if (workOrderManager && workOrderManager.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '您有未保存的更改，确定要离开吗？';
        return e.returnValue;
    }
});
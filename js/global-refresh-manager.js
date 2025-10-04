/**
 * 全局刷新管理器
 * 统一管理所有模块的自动刷新功能
 */
class GlobalRefreshManager {
    constructor() {
        this.refreshInterval = 5000;
        this.countdownDuration = 5;
        this.autoRefreshInterval = null;
        this.countdownInterval = null;
        this.refreshCountdown = this.countdownDuration;
        this.isCellFocused = false;
        this.isSaving = false;
        this.registeredModules = new Map();
        this.countdownElements = new Map();
    }

    /**
     * 注册模块
     * @param {string} moduleId - 模块ID
     * @param {Function} refreshCallback - 刷新回调函数
     * @param {string} countdownElementId - 倒计时显示元素ID
     */
    registerModule(moduleId, refreshCallback, countdownElementId) {
        this.registeredModules.set(moduleId, refreshCallback);
        if (countdownElementId) {
            this.countdownElements.set(moduleId, countdownElementId);
        }
        console.log(`模块 ${moduleId} 已注册到全局刷新管理器`);
    }

    /**
     * 注销模块
     * @param {string} moduleId - 模块ID
     */
    unregisterModule(moduleId) {
        this.registeredModules.delete(moduleId);
        this.countdownElements.delete(moduleId);
        console.log(`模块 ${moduleId} 已从全局刷新管理器注销`);
    }

    /**
     * 开始自动刷新
     */
    startAutoRefresh() {
        this.stopAutoRefresh();
        this.startCountdown();
        
        // 立即执行一次刷新，确保页面刷新后立即显示数据
        setTimeout(() => {
            if (!this.isCellFocused && !this.isSaving) {
                this.executeRefresh();
                this.resetCountdown();
            }
        }, 100); // 延迟100ms确保DOM完全加载
        
        this.autoRefreshInterval = setInterval(() => {
            if (!this.isCellFocused && !this.isSaving) {
                this.executeRefresh();
                this.resetCountdown();
            }
        }, this.refreshInterval);
        
        console.log('全局自动刷新已启动');
    }

    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        this.stopCountdown();
        console.log('全局自动刷新已停止');
    }

    /**
     * 执行所有注册模块的刷新
     */
    executeRefresh() {
        this.registeredModules.forEach((refreshCallback, moduleId) => {
            try {
                refreshCallback();
                console.log(`模块 ${moduleId} 刷新完成`);
            } catch (error) {
                console.error(`模块 ${moduleId} 刷新失败:`, error);
            }
        });
    }

    /**
     * 开始倒计时
     */
    startCountdown() {
        this.stopCountdown();
        this.refreshCountdown = this.countdownDuration;
        this.updateCountdownDisplay();
        
        this.countdownInterval = setInterval(() => {
            if (!this.isCellFocused && !this.isSaving) {
                this.refreshCountdown--;
                this.updateCountdownDisplay();
                
                if (this.refreshCountdown <= 0) {
                    this.refreshCountdown = this.countdownDuration;
                }
            }
        }, 1000);
    }

    /**
     * 停止倒计时
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * 重置倒计时
     */
    resetCountdown() {
        this.refreshCountdown = this.countdownDuration;
        this.updateCountdownDisplay();
    }

    /**
     * 更新倒计时显示
     */
    updateCountdownDisplay() {
        this.countdownElements.forEach((elementId, moduleId) => {
            const countdownEl = document.getElementById(elementId);
            if (countdownEl) {
                if (this.isCellFocused) {
                    countdownEl.textContent = '编辑模式中...';
                } else if (this.isSaving) {
                    countdownEl.textContent = '保存中...';
                } else {
                    countdownEl.textContent = `下次刷新: ${this.refreshCountdown}秒`;
                }
            }
        });
    }

    /**
     * 设置单元格聚焦状态
     */
    setCellFocused() {
        this.isCellFocused = true;
        this.updateCountdownDisplay();
        console.log('全局刷新已暂停 - 编辑模式');
    }

    /**
     * 设置单元格失焦状态
     */
    setCellBlurred() {
        this.isCellFocused = false;
        this.updateCountdownDisplay();
        console.log('全局刷新已恢复');
    }

    /**
     * 设置保存状态
     */
    setSaving() {
        this.isSaving = true;
        this.updateCountdownDisplay();
        console.log('全局刷新已暂停 - 保存中');
    }

    /**
     * 清除保存状态
     */
    clearSaving() {
        this.isSaving = false;
        this.updateCountdownDisplay();
        console.log('保存完成 - 全局刷新已恢复');
    }

    /**
     * 获取当前刷新状态
     */
    getStatus() {
        return {
            isRunning: !!this.autoRefreshInterval,
            isFocused: this.isCellFocused,
            isSaving: this.isSaving,
            countdown: this.refreshCountdown,
            registeredModules: Array.from(this.registeredModules.keys())
        };
    }
}


const globalRefreshManager = new GlobalRefreshManager();


window.globalRefreshManager = globalRefreshManager;


window.addEventListener('beforeunload', function() {
    if (globalRefreshManager) {
        globalRefreshManager.stopAutoRefresh();
    }
});

console.log('全局刷新管理器已初始化');
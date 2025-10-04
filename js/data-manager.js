/**
 * 数据管理模块 - 负责数据的导出和导入功能
 * @author System
 * @version 1.0.0
 */

/**
 * 数据管理器类
 */
class DataManager {
  /**
   * 初始化数据管理器
   */
  static init() {
    const exportBtn = document.getElementById('exportDataBtn');
    const importBtn = document.getElementById('importDataBtn');
    const clearBtn = document.getElementById('clearDataBtn');
    const fileInput = document.getElementById('importFileInput');
    
    if (exportBtn) {
      exportBtn.addEventListener('click', DataManager.exportData);
    }
    
    if (importBtn) {
      importBtn.addEventListener('click', function() {
        fileInput.click();
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', DataManager.clearAllData);
    }
    
    if (fileInput) {
      fileInput.addEventListener('change', DataManager.importData);
    }
  }

  /**
   * 导出当前页面数据为JSON格式
   */
  static async exportData() {
    try {
      DataManager.showMessage('正在导出数据...', 'info');
      
      // 直接调用管理员API导出数据
      const response = await fetch('api/admin-manager.php?action=export');
      
      if (!response.ok) {
        throw new Error('导出请求失败');
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = '工单系统数据.json';
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/); 
        if (matches) {
          filename = matches[1];
        }
      }
      
      // 创建下载
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      DataManager.showMessage('数据导出成功！', 'success');
      
    } catch (error) {
      console.error('导出失败:', error);
      DataManager.showMessage('导出失败: ' + error.message, 'error');
    }
  }

  /**
   * 导入JSON数据到当前页面
   * @param {Event} event - 文件选择事件
   */
  static async importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      DataManager.showMessage('请选择JSON格式的文件！', 'warning');
      return;
    }
    
    try {
      DataManager.showMessage('正在导入数据...', 'info');
      
      // 创建FormData对象
       const formData = new FormData();
       formData.append('import_file', file);
      
      // 直接调用管理员API导入数据
      const response = await fetch('api/admin-manager.php?action=import', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        DataManager.showMessage(result.message || '数据导入成功！', 'success');
      } else {
        DataManager.showMessage(result.message || '数据导入失败！', 'error');
      }
      
      // 清空文件输入框
      event.target.value = '';
      
    } catch (error) {
      console.error('导入数据时发生错误:', error);
      DataManager.showMessage('导入数据失败: ' + error.message, 'error');
    }
  }

  /**
   * 清除所有数据
   */
  static async clearAllData() {
    // 确认对话框
    const confirmed = confirm('⚠️ 警告：此操作将清除所有数据库中的数据，且无法恢复！\n\n确定要继续吗？');
    if (!confirmed) {
      return;
    }
    
    // 二次确认
    const doubleConfirmed = confirm('🚨 最后确认：您真的要删除所有数据吗？\n\n此操作不可逆转！');
    if (!doubleConfirmed) {
      return;
    }
    
    try {
      DataManager.showMessage('正在清除所有数据...', 'info');
      
      const response = await fetch('api/admin-manager.php?action=clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        DataManager.showMessage(result.message || '所有数据已成功清除！', 'success');
        
        // 刷新页面以更新显示
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        DataManager.showMessage(result.message || '清除数据失败！', 'error');
      }
      
    } catch (error) {
      console.error('清除数据时发生错误:', error);
      DataManager.showMessage('清除数据失败: ' + error.message, 'error');
    }
  }

  /**
   * 显示消息提示
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 (success, error, warning, info)
   */
  static showMessage(message, type = 'info') {
    // 创建消息容器
    const messageContainer = document.createElement('div');
    messageContainer.className = `data-manager-message data-manager-message-${type}`;
    messageContainer.textContent = message;
    
    // 添加样式
    Object.assign(messageContainer.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '4px',
      color: 'white',
      fontWeight: 'bold',
      zIndex: '10000',
      maxWidth: '300px',
      wordWrap: 'break-word',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease-in-out'
    });
    
    // 根据类型设置背景色
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    messageContainer.style.backgroundColor = colors[type] || colors.info;
    
    // 添加到页面
    document.body.appendChild(messageContainer);
    
    // 显示动画
    setTimeout(() => {
      messageContainer.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动移除
    setTimeout(() => {
      messageContainer.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (messageContainer.parentNode) {
          messageContainer.parentNode.removeChild(messageContainer);
        }
      }, 300);
    }, 3000);
  }
}

// 当DOM加载完成时初始化数据管理器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DataManager.init);
} else {
  DataManager.init();
}
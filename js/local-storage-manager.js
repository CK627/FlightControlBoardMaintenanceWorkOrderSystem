/**
 * 本地存储管理器
 * 用于管理用户自定义的表格标题
 */
class LocalStorageManager {
  constructor() {
    this.storageKey = 'customTableHeaders';
    this.dateFilePath = './date/date.txt';
    this.isInitialized = false;
    this.defaultHeaders = {
      drarwo_engineer1: '队长1',
      drarwo_engineer2: '队长2',
      drarwo_engineer3: '队长3'
    };
    
    // 延迟初始化，确保所有脚本都已加载并且表格已生成
    this.delayedInit();
  }

  /**
   * 延迟初始化，等待表格元素生成
   */
  delayedInit() {
    const checkAndInit = () => {
      const editableElements = document.querySelectorAll('.editable-header');
      if (editableElements.length > 0) {
        console.log('找到可编辑元素，开始初始化本地存储管理器');
        this.init().catch(error => console.error('初始化失败:', error));
      } else {
        console.log('未找到可编辑元素，1秒后重试...');
        setTimeout(checkAndInit, 1000);
      }
    };

    // 等待DOM加载完成后开始检查
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkAndInit);
    } else {
      // DOM已经加载完成，立即开始检查
      setTimeout(checkAndInit, 100);
    }
  }

  /**
   * 初始化本地存储管理器
   */
  async init() {
    const headers = await this.loadHeaders();
    this.applyHeaders(headers);
    this.bindEvents();
    this.isInitialized = true;
  }

  /**
   * 从本地存储和文件加载标题
   */
  async loadHeaders() {
    try {
      // 首先尝试从date.txt文件加载
      try {
        const response = await fetch('./date/date.txt');
        if (response.ok) {
          const fileData = await response.json();
          if (fileData.customHeaders) {
            // 同步到localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(fileData.customHeaders));
            return fileData.customHeaders;
          }
        }
      } catch (fileError) {
        console.log('从文件加载失败，尝试从localStorage加载:', fileError.message);
      }
      
      // 如果文件加载失败，从localStorage加载
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : this.defaultHeaders;
    } catch (error) {
      console.warn('加载本地存储失败，使用默认标题:', error);
      return this.defaultHeaders;
    }
  }

  /**
   * 应用标题到页面元素
   */
  applyHeaders(headers) {
    console.log('应用标题到页面元素:', headers);
    Object.keys(headers).forEach(key => {
      const elements = document.querySelectorAll(`[data-key="${key}"]`);
      elements.forEach(element => {
        // 直接应用保存的值，包括空值
        element.textContent = headers[key] || '';
        console.log(`应用标题 ${key}: "${headers[key]}" 到元素`);
      });
    });
  }

  /**
   * 保存标题到本地存储
   */
  async saveHeaders() {
    console.log('saveHeaders方法被调用，初始化状态:', this.isInitialized);
    
    // 如果还未初始化完成，跳过保存
    if (!this.isInitialized) {
      console.log('未初始化完成，跳过保存');
      return;
    }
    
    try {
      // 设置保存状态，暂停全局刷新
      if (window.globalRefreshManager) {
        window.globalRefreshManager.setSaving();
      }
      
      const headers = {};
      
      // 收集所有可编辑标题的当前值
      const editableElements = document.querySelectorAll('.editable-header');
      editableElements.forEach(element => {
        const key = element.getAttribute('data-key');
        if (key && !headers[key]) {
          const value = element.textContent.trim();
          // 保存实际值，包括空值
          headers[key] = value;
        }
      });
      
      console.log('收集到的原始标题数据（包含空值）:', headers);
      
      console.log('收集到的标题数据:', headers);

      // 验证headers对象不为空
      if (Object.keys(headers).length === 0) {
        console.warn('没有找到可编辑的标题元素，跳过保存');
        return;
      }
      
      // 保存到localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(headers));
      console.log('标题已保存到localStorage');
      
      // 保存到date.txt文件（通过API）
      try {
        await this.saveToFile(headers);
        console.log('标题已成功保存到本地存储和文件');
      } catch (fileError) {
        console.warn('文件保存失败，但localStorage保存成功:', fileError.message);
        // 可以在这里添加用户提示，比如显示一个警告消息
      }
    } catch (error) {
      console.error('保存标题失败:', error);
    } finally {
      // 清除保存状态，恢复全局刷新
      if (window.globalRefreshManager) {
        window.globalRefreshManager.clearSaving();
      }
    }
  }

  /**
   * 保存到date.txt文件
   */
  async saveToFile(headers) {
    try {
      const data = {
        customHeaders: headers,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('准备保存到文件的数据:', data);
      
      // 通过API保存到服务器端的date.txt文件
      const response = await fetch('./api/save-headers.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('数据已成功保存到date.txt文件:', result);
      } else {
        const errorText = await response.text();
        console.warn('保存到date.txt文件失败，状态码:', response.status, '错误信息:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('保存到文件失败:', error);
      // 即使文件保存失败，localStorage仍然有效
      throw error; // 重新抛出错误，让调用者知道保存失败
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const editableElements = document.querySelectorAll('.editable-header');
    console.log(`找到 ${editableElements.length} 个可编辑标题元素`);
    
    editableElements.forEach((element, index) => {
      console.log(`绑定事件到元素 ${index + 1}:`, element.textContent, element.getAttribute('data-key'));
      
      // 失焦时保存，与其他单元格保持一致
      element.addEventListener('blur', () => {
        console.log('标题失焦，触发保存:', element.textContent);
        this.saveHeaders();
      });
      
      // 按Enter键时保存并失焦
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          console.log('按下Enter键，触发保存');
          e.preventDefault();
          element.blur();
        }
      });
    });
    
    // 注释掉beforeunload事件，避免初始化时的保存错误
    // window.addEventListener('beforeunload', () => {
    //   if (this.isInitialized) {
    //     this.saveHeaders();
    //   }
    // });
  }

  /**
   * 重置为默认标题
   */
  resetToDefault() {
    this.applyHeaders(this.defaultHeaders);
    if (this.isInitialized) {
      this.saveHeaders();
    }
  }

  /**
   * 获取当前标题配置
   */
  getCurrentHeaders() {
    const headers = {};
    const editableElements = document.querySelectorAll('.editable-header');
    editableElements.forEach(element => {
      const key = element.getAttribute('data-key');
      if (key && !headers[key]) {
        headers[key] = element.textContent.trim();
      }
    });
    return headers;
  }
}

// 创建全局实例
window.localStorageManager = new LocalStorageManager();

console.log('本地存储管理器已初始化');
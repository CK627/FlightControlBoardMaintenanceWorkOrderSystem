/**
 * 数据恢复维修工单管理类
 * 每个工程师对应数据库中的一条记录
 */
class DRARWOManager {
  constructor() {
    this.apiBaseUrl = '/api/drarwo.php';
    this.tableBody = null;
    this.engineers = ['engineer1', 'engineer2', 'engineer3'];
    this.currentProgressNode = null; // 用于跟踪当前进度节点
    this.pageHiddenTime = null; // 记录页面隐藏时间
    this.timeAdjustment = 0; // 时间调整量
    this.init();
  }

  /**
   * 初始化管理器
   */
  async init() {
    this.tableBody = document.querySelector('#dataRecoveryTable tbody');
    if (!this.tableBody) {
      console.error('未找到数据恢复表格');
      return;
    }
    this.bindEvents();
    await this.loadWorkOrders();
    this.registerWithGlobalManager();
    this.initPageVisibilityHandler();
    
    // 延迟更新进度条，确保DOM完全加载
    setTimeout(() => {
      this.updateProgress(); // 初始化进度条
      this.startProgressTimer(); // 启动进度条定时器
    }, 100);
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    document.addEventListener('input', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('data-recovery-cell')) {
        if (this.canEditDataRecovery()) {
          this.onCellChange(e.target);
        } else {
          e.target.blur();
          return false;
        }
      }
    });

    document.addEventListener('focus', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('data-recovery-cell')) {
        if (this.canEditDataRecovery()) {
          this.setCellFocused();
          if (window.globalRefreshManager) {
            window.globalRefreshManager.setCellFocused();
          }
        } else {
          e.target.blur();
          return false;
        }
      }
    }, true);

    document.addEventListener('blur', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('data-recovery-cell')) {
        if (this.canEditDataRecovery()) {
          this.saveWorkOrder();
          this.setCellBlurred();
          if (window.globalRefreshManager) {
            window.globalRefreshManager.setCellBlurred();
          }
        }
      }
    }, true);
  }

  /**
   * 检查是否可以编辑数据恢复工单
   */
  canEditDataRecovery() {
    if (window.LoginManager && LoginManager.isLoggedIn()) {
      return LoginManager.hasPermission('can_edit_data_recovery');
    }
    return window.canEdit ? window.canEdit() : false;
  }

  /**
   * 单元格内容变化处理
   */
  onCellChange(cell) {
    // 如果正在填充数据，避免递归调用
    if (this.isFillingData) {
      return;
    }
    this.markAsModified();
    this.updateProgress(); // 更新进度条
  }

  /**
   * 标记为已修改
   */
  markAsModified() {
    
  }

  /**
   * 获取当前用户
   */
  getCurrentUser() {
    return localStorage.getItem('currentUser') || 'engineer1';
  }

  /**
   * 加载所有工程师的工单数据
   */
  async loadWorkOrders() {
    try {
      // 并行加载所有工程师的数据，提高加载速度
      const loadPromises = this.engineers.map((engineer, index) => 
        this.loadEngineerData(engineer, index + 1)
      );
      
      await Promise.all(loadPromises);
      console.log('所有工程师数据加载完成');
      
      // 刷新后重新从文件加载维修人员标题
      await this.refreshHeadersFromFile();
    } catch (error) {
      console.error('加载工单数据时发生错误:', error);
    }
  }

  /**
   * 从本地存储文件刷新维修人员标题
   */
  async refreshHeadersFromFile() {
    try {
      console.log('开始从文件刷新数据恢复维修工单的维修人员标题');
      
      // 直接从文件读取最新的标题数据
      const response = await fetch('./date/date.txt');
      if (response.ok) {
        const fileData = await response.json();
        if (fileData.customHeaders) {
          // 只应用数据恢复维修工单的维修人员标题
          const drarwoHeaders = {
            drarwo_engineer1: fileData.customHeaders.drarwo_engineer1 || '',
            drarwo_engineer2: fileData.customHeaders.drarwo_engineer2 || '',
            drarwo_engineer3: fileData.customHeaders.drarwo_engineer3 || ''
          };
          
          // 直接应用到页面元素
          Object.keys(drarwoHeaders).forEach(key => {
            const elements = document.querySelectorAll(`[data-key="${key}"]`);
            elements.forEach(element => {
              element.textContent = drarwoHeaders[key];
              console.log(`从文件刷新标题 ${key}: "${drarwoHeaders[key]}"`);
            });
          });
          
          console.log('数据恢复维修工单维修人员标题刷新完成');
        } else {
          console.log('文件中未找到customHeaders数据');
        }
      } else {
        console.log('无法读取date.txt文件，状态:', response.status);
      }
    } catch (error) {
      console.error('从文件刷新维修人员标题时发生错误:', error);
    }
  }

  /**
   * 加载单个工程师的数据
   */
  async loadEngineerData(engineer, engineerId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/list?user=${engineer}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          const data = result.data[0];
          this.fillEngineerData(engineer, data);
        }
      }
    } catch (error) {
      console.error(`加载工程师${engineer}数据时发生错误:`, error);
    }
  }

  /**
   * 填充工程师数据到表格
   */
  fillEngineerData(engineer, data) {
    const fields = [
      'Discovered_a_malfunction',
      'Reason_for_malfunction', 
      'Repair_method',
      'Repair_results',
      'Customer_satisfaction'
    ];

    const projects = ['fault', 'cause', 'method', 'result', 'satisfaction'];

    // 临时标记，避免在数据填充时触发事件
    this.isFillingData = true;
    
    fields.forEach((field, index) => {
      const project = projects[index];
      const cell = document.querySelector(`[data-engineer="${engineer}"][data-project="${project}"]`);
      if (cell) {
        cell.textContent = data[field] || '';
        
        
        if (!window.formData) window.formData = {};
        if (!window.formData.dataRecovery) window.formData.dataRecovery = {};
        if (!window.formData.dataRecovery[project]) window.formData.dataRecovery[project] = {};
        window.formData.dataRecovery[project][engineer] = data[field] || '';
      }
    });
    
    // 清除标记
    this.isFillingData = false;
    
    // 数据填充后更新进度条
    this.updateProgress();
  }

  /**
   * 收集单个工程师的数据
   */
  collectEngineerData(engineer) {
    const data = {
      user: engineer,
      Discovered_a_malfunction: '',
      Reason_for_malfunction: '',
      Repair_method: '',
      Repair_results: '',
      Customer_satisfaction: ''
    };

    const projects = ['fault', 'cause', 'method', 'result', 'satisfaction'];
    const fields = [
      'Discovered_a_malfunction',
      'Reason_for_malfunction',
      'Repair_method', 
      'Repair_results',
      'Customer_satisfaction'
    ];

    projects.forEach((project, index) => {
      const cell = document.querySelector(`[data-engineer="${engineer}"][data-project="${project}"]`);
      if (cell) {
        data[fields[index]] = cell.textContent.trim() || '';
      }
    });

    return data;
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

    // 数据恢复工程师只能保存所有工程师的数据恢复工单
    if (currentUserRole === 'data_recovery_engineer') {
      authorizedEngineers.push('engineer1', 'engineer2', 'engineer3');
    }
    // 管理员和裁判可以保存所有工程师的数据
    else if (currentUserRole === 'admin' || currentUserRole === 'referee') {
      authorizedEngineers.push('engineer1', 'engineer2', 'engineer3');
    }
    // 普通工程师不能保存数据恢复工单

    return authorizedEngineers;
  }

  /**
   * 保存工程师的工单数据（基于权限控制）
   */
  async saveWorkOrder() {
    try {
      
      if (window.globalRefreshManager) {
        window.globalRefreshManager.setSaving();
      }
      
      // 获取当前用户有权限保存的工程师列表
      const authorizedEngineers = this.getAuthorizedEngineersForSave();
      
      if (authorizedEngineers.length === 0) {
        this.showMessage('您没有权限保存数据恢复工单数据', 'error');
        return;
      }
      
      let successCount = 0;
      let errorMessages = [];
      let savedCount = 0;

      for (const engineer of this.engineers) {
        // 只保存当前用户有权限的工程师数据
        if (!authorizedEngineers.includes(engineer)) {
          console.log(`跳过保存工程师 ${engineer} 的数据恢复工单（无权限）`);
          continue;
        }
        
        try {
          const data = this.collectEngineerData(engineer);
          console.log(`正在保存工程师 ${engineer} 的数据:`, data);
          
          
          const existingRecord = await this.findExistingRecord(engineer);
          console.log(`工程师 ${engineer} 的现有记录:`, existingRecord);
          
          let response;
          if (existingRecord) {
            
            console.log(`更新工程师 ${engineer} 的记录，ID: ${existingRecord.id}`);
            response = await fetch(`${this.apiBaseUrl}/${existingRecord.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
            });
          } else {
            
            console.log(`创建工程师 ${engineer} 的新记录`);
            response = await fetch(this.apiBaseUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
            });
          }

          console.log(`工程师 ${engineer} 的响应状态:`, response.status);
          const result = await response.json();
          console.log(`工程师 ${engineer} 的响应结果:`, result);
          
          if (result.success) {
            successCount++;
            savedCount++;
            console.log(`工程师 ${engineer} 数据恢复工单保存成功`);
          } else {
            // 确保错误信息是字符串格式
            const errorMsg = Array.isArray(result.message) ? result.message.join(', ') : result.message;
            errorMessages.push(`${engineer}: ${errorMsg}`);
          }
        } catch (error) {
          console.error(`保存工程师 ${engineer} 数据时发生错误:`, error);
          // 确保错误信息是字符串格式
          const errorMsg = Array.isArray(error.message) ? error.message.join(', ') : (error.message || error.toString());
          errorMessages.push(`${engineer}: ${errorMsg}`);
        }
      }

      if (savedCount > 0 && successCount === savedCount) {
        console.log(`成功保存 ${savedCount} 个工程师的数据恢复工单`);
        this.showMessage(`数据保存成功（保存了 ${savedCount} 个工程师的数据恢复工单）`, 'success');
      } else if (savedCount > 0) {
        console.warn(`部分数据保存成功（${successCount}/${savedCount}）`);
        this.showMessage(`部分数据保存成功（${successCount} 个），失败: ` + errorMessages.join('; '), 'warning');
      } else if (errorMessages.length > 0) {
        console.error('数据保存失败:', errorMessages.join(', '));
        this.showMessage('数据保存失败: ' + errorMessages.join('; '), 'error');
      } else {
        this.showMessage('没有需要保存的数据', 'info');
      }

    } catch (error) {
      console.error('保存工单时发生错误:', error);
      this.showMessage('保存工单时发生错误: ' + error.message, 'error');
    } finally {
      
      if (window.globalRefreshManager) {
        window.globalRefreshManager.clearSaving();
      }
    }
  }

  /**
   * 查找工程师的现有记录
   */
  async findExistingRecord(engineer) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/list?user=${engineer}`);
      if (response.ok) {
        const result = await response.json();
        return result.success && result.data && result.data.length > 0 ? result.data[0] : null;
      }
    } catch (error) {
      console.error('查找现有记录时发生错误:', error);
    }
    return null;
  }

  /**
   * 注册到全局刷新管理器
   */
  registerWithGlobalManager() {
    if (window.globalRefreshManager) {
      window.globalRefreshManager.registerModule(
        'drarwo',
        () => this.loadWorkOrders(),
        'refreshCountdown'
      );
      window.globalRefreshManager.startAutoRefresh();
    }
  }

  // 自动保存功能已移除，因为单元格失焦时会自动保存
  // startAutoSave() 和 stopAutoSave() 方法已删除
  
  /**
   * 启动进度条定时器
   */
  startProgressTimer() {
    // 每秒更新一次进度条（主要用于倒计时）
    this.progressTimer = setInterval(() => {
      this.updateProgress();
    }, 1000);
  }
  
  /**
   * 停止进度条定时器
   */
  stopProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
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

  /**
   * 初始化页面可见性处理器
   */
  initPageVisibilityHandler() {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 页面隐藏时记录时间
        this.pageHiddenTime = Date.now();
        console.log('页面隐藏，暂停倒计时计算');
      } else {
        // 页面显示时计算隐藏时长并调整时间
        if (this.pageHiddenTime) {
          const hiddenDuration = Date.now() - this.pageHiddenTime;
          this.timeAdjustment += hiddenDuration;
          console.log(`页面重新显示，隐藏时长: ${hiddenDuration}ms，累计调整: ${this.timeAdjustment}ms`);
          this.pageHiddenTime = null;
          
          // 保存时间调整量到localStorage
          localStorage.setItem('drarwo_time_adjustment', this.timeAdjustment.toString());
          
          // 立即更新进度条以反映正确的时间
          this.updateProgress();
        }
      }
    });

    // 监听窗口焦点变化（作为备用机制）
    window.addEventListener('blur', () => {
      if (!this.pageHiddenTime) {
        this.pageHiddenTime = Date.now();
        console.log('窗口失焦，开始记录隐藏时间');
      }
    });

    window.addEventListener('focus', () => {
      if (this.pageHiddenTime) {
        const hiddenDuration = Date.now() - this.pageHiddenTime;
        this.timeAdjustment += hiddenDuration;
        console.log(`窗口重新获得焦点，隐藏时长: ${hiddenDuration}ms，累计调整: ${this.timeAdjustment}ms`);
        this.pageHiddenTime = null;
        
        // 保存时间调整量到localStorage
        localStorage.setItem('drarwo_time_adjustment', this.timeAdjustment.toString());
        
        // 立即更新进度条以反映正确的时间
        this.updateProgress();
      }
    });
  }

  /**
   * 显示消息提示
   */
  showMessage(message, type = 'info') {
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
 messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    
    switch (type) {
      case 'success':
        messageDiv.style.backgroundColor = '#4CAF50';
        break;
      case 'warning':
        messageDiv.style.backgroundColor = '#FF9800';
        break;
      case 'error':
        messageDiv.style.backgroundColor = '#F44336';
        break;
      default:
        messageDiv.style.backgroundColor = '#2196F3';
    }
    
    
    document.body.appendChild(messageDiv);
 setTimeout(() => {
      messageDiv.style.opacity = '1';
    }, 100);
    
    
    setTimeout(() => {
      messageDiv.style.opacity = '0';
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 300);
    }, 3000);
  }

  /**
   * 计算填写进度（复杂逻辑版本）
   */
  calculateProgress() {
    // 计算DRARWO网格填充情况
    const drarwoCells = document.querySelectorAll('.data-recovery-cell');
    let drarwoFilled = 0;
    drarwoCells.forEach(cell => {
      if (cell.textContent.trim() !== '') {
        drarwoFilled++;
      }
    });
    
    // 获取FCBMWO进度
    let fcbmwoFilled = 0;
    let fcbmwoTotal = 0;
    if (window.fcbmwoManager && typeof window.fcbmwoManager.calculateProgress === 'function') {
      const fcbmwoProgress = window.fcbmwoManager.calculateProgress();
      fcbmwoFilled = fcbmwoProgress.filled;
      fcbmwoTotal = fcbmwoProgress.total;
    }
    
    // 计算总体进度
    const totalGrids = fcbmwoTotal + drarwoCells.length;
    const filledGrids = fcbmwoFilled + drarwoFilled;
    
    // 节点配置
    const nodeConfig = {
      background: { timeBonus: 5 },
      market: { timeBonus: 5 },
      industry: { timeBonus: 0 },
      development: { timeBonus: 0 },
      proposal: { timeBonus: 0 },
      technology: { timeBonus: 0 },
      innovation: { timeBonus: 0 },
      summary: { timeBonus: 0 }
    };
    
    // 计算当前节点和进度
    const nodeData = this.calculateCurrentNode(filledGrids, totalGrids, nodeConfig);
    
    return {
      total: totalGrids,
      filled: filledGrids,
      percentage: nodeData.percentage,
      currentNode: nodeData.currentNode
    };
  }

  /**
   * 更新进度条
   */
  updateProgress() {
    const progressData = this.calculateProgress();
    
    // 双向绑定监测：如果进度少于89%，重置summary倒计时
    if (progressData.percentage < 89 && this.timeStarted && this.timeStarted.summary) {
      delete this.timeStarted.summary;
      localStorage.setItem('drarwo_time_started', JSON.stringify(this.timeStarted));
      // 重置时间调整
      this.timeAdjustment = 0;
      localStorage.removeItem('drarwo_time_adjustment');
      console.log('进度低于89%，重置summary倒计时');
    }
    
    const progressFill = document.getElementById('drarwoProgressFill');
    const progressText = document.getElementById('drarwoProgressText');
    
    // 获取镜像进度条元素
    const mirrorProgressFill = document.getElementById('mirrorProgressFill');
    const mirrorProgressText = document.getElementById('mirrorProgressText');
    
    if (progressFill && progressText) {
      const percentage = Math.round(progressData.percentage);
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${percentage}%`;
      
      // 根据进度计算从红色到绿色的渐变颜色
      const gradientColor = this.calculateProgressGradient(percentage);
      progressFill.style.background = gradientColor;
      
      // 同步更新镜像进度条
      if (mirrorProgressFill && mirrorProgressText) {
        mirrorProgressFill.style.width = `${percentage}%`;
        mirrorProgressText.textContent = `${percentage}%`;
        
        // 为镜像进度条使用蓝绿渐变颜色
        const mirrorGradientColor = this.calculateMirrorProgressGradient(percentage);
        mirrorProgressFill.style.background = mirrorGradientColor;
        
        // 更新镜像进度条的节点显示
        this.updateMirrorProgressNodes(percentage);
      }
    }
    
    // 更新详情显示
    const totalGridsSpan = document.getElementById('totalGrids');
    const currentNodeSpan = document.getElementById('currentNode');
    
    if (totalGridsSpan) {
      totalGridsSpan.textContent = progressData.total;
    } else {
      console.error('未找到totalGrids元素');
    }
    
    if (currentNodeSpan) {
      // 显示当前节点的中文名称
      const nodeNames = {
        'background': '项目背景',
        'market': '市场分析',
        'industry': '行业分析',
        'development': '发展趋势',
        'proposal': '项目建议',
        'technology': '技术方案',
        'innovation': '创新点',
        'summary': '项目总结'
      };
      currentNodeSpan.textContent = nodeNames[progressData.currentNode] || '数据恢复';
    }
    
    // 更新进度节点显示
    this.updateProgressNodes(progressData);
  }

  /**
   * 计算进度条的渐变颜色（深绿色固定渐变）
   * @param {number} percentage - 进度百分比 (0-100)
   * @returns {string} CSS渐变字符串
   */
  calculateProgressGradient(percentage) {
    // 使用固定的深绿色渐变，类似第一个进度条
    return 'linear-gradient(90deg, #4FC3F7 0%, #1B5E20 100%)';
  }
  
  /**
   * 计算镜像进度条的明显渐变颜色
   * @param {number} percentage - 进度百分比 (0-100)
   * @returns {string} CSS渐变字符串
   */
  calculateMirrorProgressGradient(percentage) {
    // 使用更深的橙红色渐变，对比度更强
    return 'linear-gradient(90deg, #D84315 0%, #BF360C 100%)';
  }
  



  

  /**
   * 计算当前节点和进度百分比（实时精确计算）
   */
  calculateCurrentNode(filledGrids, totalGrids, nodeConfig) {
    let currentNode = 'background';
    let basePercentage = 0;
    
    // 记录当前节点，用于检测节点变化
    const previousNode = this.currentProgressNode;
    
    // 计算格子基础进度：前5个格子每个1%，后续格子每个2%
    let gridProgress = 0;
    if (filledGrids <= 5) {
      gridProgress = filledGrids * 1; // 前5个格子每个1%
    } else {
      gridProgress = 5 + ((filledGrids - 5) * 2); // 前5个格子5% + 后续格子每个2%
    }
    
    // 判断是否需要停止倒计时：格子数大于5个时停止倒计时
    if (filledGrids > 5) {
      // 格子数大于5个，停止倒计时，根据累计格子数和百分比判断节点
      basePercentage = gridProgress + 10; // 格子进度 + 项目背景倒计时5% + 市场发展倒计时5%
      
      // 根据格子数和百分比综合确定当前节点
      // 行业现状：累计 ≤ 9个格子，百分比 ≤ 23%
      if (filledGrids <= 9 && basePercentage <= 23) {
        currentNode = 'industry';
      // 研发历程：累计 ≤ 11个格子，百分比 ≤ 27%  
      } else if (filledGrids <= 11 && basePercentage <= 27) {
        currentNode = 'development';
      // 方案提出：累计 ≤ 16个格子，百分比 ≤ 37%
      } else if (filledGrids <= 16 && basePercentage <= 37) {
        currentNode = 'proposal';
      // 核心技术：累计 ≤ 28个格子，百分比 ≤ 61%
      } else if (filledGrids <= 28 && basePercentage <= 61) {
        currentNode = 'technology';
      // 创新点：格子数 < 42格
      } else if (filledGrids < 42) {
        currentNode = 'innovation';
      // 项目总结：格子数 ≥ 42格，开始倒计时逻辑
      } else {
        currentNode = 'summary';
        // 计算基础进度（89%）
        basePercentage = 89;
        
        // 添加倒计时进度（最多11%，从89%到100%）
        const summaryTimeProgress = this.getTimeProgress('summary');
        basePercentage += (11 * summaryTimeProgress / 100);
      }
    } else {
      // 格子数 ≤ 5个，继续倒计时逻辑
      const backgroundTimeProgress = this.getTimeProgress('background');
      if (backgroundTimeProgress < 100) {
        // 项目背景节点倒计时进行中
        currentNode = 'background';
        basePercentage = gridProgress; // 只有格子进度，倒计时进度单独计算
      } else {
        // 项目背景节点已完成，检查市场发展节点
        const marketTimeProgress = this.getTimeProgress('market');
        if (marketTimeProgress < 100) {
          // 市场发展节点倒计时进行中
          currentNode = 'market';
          basePercentage = gridProgress + 5; // 格子进度 + 项目背景倒计时5%
        } else {
          // 两个倒计时节点都已完成，但格子数仍 ≤ 5个，停留在行业现状
          currentNode = 'industry';
          basePercentage = gridProgress + 10; // 格子进度 + 背景5% + 市场5%
        }
      }
    }
    
    // 计算最终百分比（包含时间奖励）
    let finalPercentage = basePercentage;
    const currentConfig = nodeConfig[currentNode];
    
    if (currentConfig.timeBonus > 0) {
      // 添加时间推进的百分比
      const timeProgress = this.getTimeProgress(currentNode);
      finalPercentage += (currentConfig.timeBonus * timeProgress / 100);
    }
    
    // 检测节点变化，如果节点倒退，重置后续节点的倒计时
    if (previousNode && previousNode !== currentNode) {
      this.resetFutureNodeTimers(currentNode);
    }
    
    // 保存当前节点状态
    this.currentProgressNode = currentNode;
    
    return {
      currentNode: currentNode,
      percentage: Math.min(finalPercentage, 100)
    };
  }
  
  /**
   * 完全重置倒计时状态
   */
  resetAllTimers() {
    this.timeStarted = {};
    this.timeAdjustment = 0;
    this.pageHiddenTime = null;
    localStorage.removeItem('drarwo_time_started');
    localStorage.removeItem('drarwo_time_adjustment');
    console.log('所有倒计时状态已重置');
  }

  /**
   * 重置后续节点的倒计时
   */
  resetFutureNodeTimers(currentNode) {
    if (!this.timeStarted) {
      return;
    }
    
    const nodeOrder = ['background', 'market', 'industry', 'development', 'proposal', 'technology', 'innovation', 'summary'];
    const currentIndex = nodeOrder.indexOf(currentNode);
    
    if (currentIndex === -1) {
      return;
    }
    
    // 重置当前节点之后的所有节点倒计时
    let hasChanges = false;
    for (let i = currentIndex + 1; i < nodeOrder.length; i++) {
      const nodeKey = nodeOrder[i];
      if (this.timeStarted[nodeKey]) {
        delete this.timeStarted[nodeKey];
        hasChanges = true;
      }
    }
    
    // 如果有变化，保存到localStorage
    if (hasChanges) {
      localStorage.setItem('drarwo_time_started', JSON.stringify(this.timeStarted));
    }
  }
  
  /**
   * 获取时间推进进度
   */
  getTimeProgress(node) {
    if (!this.timeStarted) {
      // 尝试从localStorage恢复时间数据
      const savedTimeData = localStorage.getItem('drarwo_time_started');
      if (savedTimeData) {
        try {
          this.timeStarted = JSON.parse(savedTimeData);
        } catch (e) {
          this.timeStarted = {};
        }
      } else {
        this.timeStarted = {};
      }
      
      // 恢复时间调整量
      const savedTimeAdjustment = localStorage.getItem('drarwo_time_adjustment');
      if (savedTimeAdjustment) {
        try {
          this.timeAdjustment = parseFloat(savedTimeAdjustment) || 0;
        } catch (e) {
          this.timeAdjustment = 0;
        }
      }
    }
    
    const now = Date.now();
    
    // 如果页面当前隐藏，需要考虑当前隐藏时间
    let adjustedNow = now;
    if (document.hidden && this.pageHiddenTime) {
      // 页面当前隐藏，不计算隐藏期间的时间
      adjustedNow = this.pageHiddenTime;
    }
    
    // 减去累计的隐藏时间调整
    adjustedNow -= this.timeAdjustment;
    
    if (node === 'background') {
      // 项目背景节点需要达到5格输入后才开始55秒倒计时
      // 直接计算填充的格子数，避免递归调用
      const drarwoCells = document.querySelectorAll('.data-recovery-cell');
      let drarwoFilled = 0;
      drarwoCells.forEach(cell => {
        if (cell.textContent.trim() !== '') {
          drarwoFilled++;
        }
      });
      
      let fcbmwoFilled = 0;
      if (window.fcbmwoManager && typeof window.fcbmwoManager.calculateProgress === 'function') {
        const fcbmwoProgress = window.fcbmwoManager.calculateProgress();
        fcbmwoFilled = fcbmwoProgress.filled;
      }
      
      const totalFilled = fcbmwoFilled + drarwoFilled;
      if (totalFilled < 5) {
        // 如果格子数量不足5个，重置background倒计时
        if (this.timeStarted.background) {
          delete this.timeStarted.background;
          localStorage.setItem('drarwo_time_started', JSON.stringify(this.timeStarted));
          // 重置时间调整
          this.timeAdjustment = 0;
          localStorage.removeItem('drarwo_time_adjustment');
        }
        return 0; // 未达到5个格子，不开始倒计时
      }
      
      // 只有在倒计时未开始时才初始化
      if (!this.timeStarted.background) {
        this.timeStarted.background = adjustedNow;
        // 保存到localStorage
        localStorage.setItem('drarwo_time_started', JSON.stringify(this.timeStarted));
      }
      
      // 记录当前格子数量，但不用于重置倒计时
      this.lastBackgroundGridCount = totalFilled;
      const elapsed = (adjustedNow - this.timeStarted.background) / 1000; // 秒
      return Math.min((elapsed / 55) * 100, 100); // 55秒
    } else if (node === 'market') {
      // 只有在background节点完成后才开始market倒计时
      // 检查background是否已经开始并完成
      if (!this.timeStarted.background) {
        // 如果background节点未开始，重置market倒计时
        if (this.timeStarted.market) {
          delete this.timeStarted.market;
          localStorage.setItem('drarwo_time_started', JSON.stringify(this.timeStarted));
          // 重置时间调整
          this.timeAdjustment = 0;
        }
        return 0; // background节点未开始，不开始market倒计时
      }
      
      const backgroundElapsed = (adjustedNow - this.timeStarted.background) / 1000;
      const backgroundProgress = Math.min((backgroundElapsed / 55) * 100, 100);
      if (backgroundProgress < 100) {
        // 如果background节点未完成，重置market倒计时
        if (this.timeStarted.market) {
          delete this.timeStarted.market;
          localStorage.setItem('drarwo_time_started', JSON.stringify(this.timeStarted));
          // 重置时间调整
          this.timeAdjustment = 0;
          localStorage.removeItem('drarwo_time_adjustment');
        }
        return 0; // background节点未完成，不开始market倒计时
      }
      
      // 计算当前格子数量，用于检测格子数量变化
      const drarwoCells = document.querySelectorAll('.data-recovery-cell');
      let drarwoFilled = 0;
      drarwoCells.forEach(cell => {
        if (cell.textContent.trim() !== '') {
          drarwoFilled++;
        }
      });
      
      let fcbmwoFilled = 0;
      if (window.fcbmwoManager && typeof window.fcbmwoManager.calculateProgress === 'function') {
        const fcbmwoProgress = window.fcbmwoManager.calculateProgress();
        fcbmwoFilled = fcbmwoProgress.filled;
      }
      
      const totalFilled = fcbmwoFilled + drarwoFilled;
      
      // 只有在倒计时未开始时才初始化
      if (!this.timeStarted.market) {
        this.timeStarted.market = adjustedNow;
        // 保存到localStorage
        localStorage.setItem('drarwo_time_started', JSON.stringify(this.timeStarted));
      }
      
      // 记录当前格子数量，但不用于重置倒计时
      this.lastMarketGridCount = totalFilled;
      const elapsed = (adjustedNow - this.timeStarted.market) / 1000; // 秒
      return Math.min((elapsed / 80) * 100, 100); // 1分20秒 = 80秒
    } else if (node === 'summary') {
      // summary节点倒计时逻辑：3分钟倒计时
      if (!this.timeStarted.summary) {
        this.timeStarted.summary = adjustedNow;
        // 保存到localStorage
        localStorage.setItem('drarwo_time_started', JSON.stringify(this.timeStarted));
      }
      
      const elapsed = (adjustedNow - this.timeStarted.summary) / 1000; // 秒
      return Math.min((elapsed / 180) * 100, 100); // 3分钟 = 180秒
    }
    
    return 0;
  }
  
  /**
   * 更新进度节点显示
   */
  updateProgressNodes(progressData) {
    const nodes = document.querySelectorAll('#drarwoProgressContainer .progress-node');
    const nodeOrder = ['background', 'market', 'industry', 'development', 'proposal', 'technology', 'innovation', 'summary'];
    
    nodes.forEach((node, index) => {
      const nodeKey = nodeOrder[index];
      node.classList.remove('active', 'completed');
      
      // 当进度达到100%时，所有节点都设置为完成状态，不显示激活状态
      if (Math.round(progressData.percentage) >= 100) {
        node.classList.add('completed');
      } else if (nodeKey === progressData.currentNode) {
        node.classList.add('active');
      } else if (nodeOrder.indexOf(nodeKey) < nodeOrder.indexOf(progressData.currentNode)) {
        node.classList.add('completed');
      }
    });
  }
  
  /**
   * 更新镜像进度条节点显示
   */
  updateMirrorProgressNodes(percentage) {
    const mirrorNodes = document.querySelectorAll('#mirrorProgressContainer .progress-node');
    const mirrorNodeOrder = ['background', 'market', 'industry', 'development', 'proposal', 'technology', 'innovation', 'education', 'social'];
    
    // 将100%进度平均分配到9个节点，每个节点约11.11%
    const nodeThreshold = 100 / mirrorNodeOrder.length; // 约11.11%
    
    mirrorNodes.forEach((node, index) => {
      const nodeKey = mirrorNodeOrder[index];
      node.classList.remove('active', 'completed');
      
      const nodeStartPercentage = index * nodeThreshold;
      const nodeEndPercentage = (index + 1) * nodeThreshold;
      
      if (percentage >= nodeEndPercentage) {
        // 节点已完成
        node.classList.add('completed');
      } else if (percentage > nodeStartPercentage) {
        // 节点正在进行中
        node.classList.add('active');
      }
    });
  }
  

}

let drarwoManager;


document.addEventListener('DOMContentLoaded', async function() {
  drarwoManager = new DRARWOManager();
  await drarwoManager.init();
});


window.addEventListener('beforeunload', function() {
  if (drarwoManager) {
    drarwoManager.stopProgressTimer();
  }
});


window.loadDRARWO = function() {
  return drarwoManager;
};
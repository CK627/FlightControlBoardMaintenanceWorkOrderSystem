class LoginManager {
  constructor() {
    this.apiUrl = 'api/login.php';
    this.configUrl = 'api/config-manager.php';
    this.init();
  }

  init() {
    this.checkDatabaseInitialization();
    this.bindEvents();
    this.checkExistingSession();
  }

  /**
   * 检查数据库初始化状态
   */
  async checkDatabaseInitialization() {
    try {
      const response = await fetch(`${this.configUrl}?key=database.initialized`);
      const result = await response.json();
      
      if (result.success) {
        const isInitialized = result.data;
        
        if (!isInitialized) {
          // 数据库未初始化，跳转到初始化页面
          this.showInitializationMessage();
          setTimeout(() => {
            window.location.href = 'database-init.html';
          }, 2000);
          return;
        }
      } else {
        console.warn('无法检查数据库初始化状态:', result.message);
      }
    } catch (error) {
      console.error('检查数据库初始化状态时出错:', error);
      // 如果检查失败，继续正常登录流程
    }
  }

  /**
   * 显示初始化提示信息
   */
  showInitializationMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'init-message';
    messageDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        text-align: center;
        min-width: 300px;
      ">
        <h3 style="color: #856404; margin: 0 0 10px 0;">系统初始化</h3>
        <p style="color: #856404; margin: 0;">检测到数据库未初始化，正在跳转到初始化页面...</p>
        <div style="margin-top: 15px;">
          <div style="
            width: 100%;
            height: 4px;
            background: #f8f9fa;
            border-radius: 2px;
            overflow: hidden;
          ">
            <div style="
              width: 0%;
              height: 100%;
              background: #007bff;
              border-radius: 2px;
              animation: progress 2s ease-in-out forwards;
            "></div>
          </div>
        </div>
      </div>
      <style>
        @keyframes progress {
          to { width: 100%; }
        }
      </style>
    `;
    
    document.body.appendChild(messageDiv);
    
    // 禁用登录表单
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.style.opacity = '0.5';
      loginForm.style.pointerEvents = 'none';
    }
  }

  bindEvents() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    

    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
        e.preventDefault();
        this.handleLogin(e);
      }
    });
  }

  async handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    

    if (!username || !password) {
      this.showError('请输入用户名和密码');
      return;
    }
    

    loginBtn.disabled = true;
    loginBtn.textContent = '登录中...';
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('登录成功，正在跳转...');
        

        this.storeUserSession(result.user);
        

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
        
      } else {
        this.showError(result.message || '登录失败，请检查用户名和密码');
      }
      
    } catch (error) {
      console.error('登录请求失败:', error);
      this.showError('网络连接失败，请稍后重试');
    } finally {

      loginBtn.disabled = false;
      loginBtn.textContent = '登录';
    }
  }

  storeUserSession(user) {
    const sessionData = {
      id: user.id,
      username: user.username,
      realName: user.real_name,
      role: user.role,
      permissions: user.permissions,
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('userSession', JSON.stringify(sessionData));
    localStorage.setItem('isLoggedIn', 'true');
  }

  checkExistingSession() {

    if (window.location.pathname.includes('login.html')) {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userSession = localStorage.getItem('userSession');
      
      if (isLoggedIn === 'true' && userSession) {
        try {
          const user = JSON.parse(userSession);

          if (user && user.id && user.username) {

            window.location.href = 'index.html';
          } else {

            this.clearInvalidSession();
          }
        } catch (error) {

          console.error('用户会话数据解析失败:', error);
          this.clearInvalidSession();
        }
      }
    }
  }
  
  clearInvalidSession() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userSession');
    console.log('已清除无效的会话数据');
  }

  showError(message) {
    const errorElement = document.getElementById('errorMessage');
    const successElement = document.getElementById('successMessage');
    
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
    
    if (successElement) {
      successElement.style.display = 'none';
    }
    

    setTimeout(() => {
      if (errorElement) {
        errorElement.style.display = 'none';
      }
    }, 3000);
  }

  showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    const errorElement = document.getElementById('errorMessage');
    
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
    }
    
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  static getCurrentUser() {
    const userSession = localStorage.getItem('userSession');
    return userSession ? JSON.parse(userSession) : null;
  }

  static isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
  }

  static logout() {
    console.log('开始执行退出登录');
    try {
      localStorage.removeItem('userSession');
      localStorage.removeItem('isLoggedIn');
      console.log('已清除本地存储数据');
      console.log('正在跳转到登录页面...');
      window.location.href = 'login.html';
    } catch (error) {
      console.error('退出登录过程中发生错误:', error);
      throw error;
    }
  }

  static hasPermission(permission) {
    const user = LoginManager.getCurrentUser();
    if (!user || user.permissions === undefined) {
      return false;
    }
    
    const userLevel = parseInt(user.permissions);
    
    switch (permission) {
      case 'can_edit_fcbmwo':
        // 权限1（1、2、3号工程师）可以编辑飞控板维修工单
        return userLevel === 1;
      case 'can_edit_data_recovery':
        // 权限2（数据恢复工程师）可以编辑数据恢复工单
        return userLevel === 2;
      case 'can_edit_7s':
        // 权限2（数据恢复工程师）可以编辑7S管理
        return userLevel === 2;
      case 'can_view_all':
        // 权限2及以上可以查看所有内容
        return userLevel >= 2;
      case 'can_manage_users':
        // 权限4（管理员）可以管理用户
        return userLevel >= 4;
      case 'can_referee':
        // 权限3（裁判）的特殊权限
        return userLevel === 3;
      default:
        return userLevel >= 1;
    }
  }

  static getUserRole() {
    const user = LoginManager.getCurrentUser();
    return user ? user.role : null;
  }

  static getUserDisplayName() {
    const user = LoginManager.getCurrentUser();
    return user ? (user.realName || user.username) : '未知用户';
  }
}


document.addEventListener('DOMContentLoaded', () => {
  new LoginManager();
});


window.LoginManager = LoginManager;
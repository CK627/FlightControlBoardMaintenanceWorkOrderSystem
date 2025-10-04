const defaultData = {
  engineer1: {
    fault1: "",
    fault2: "",
    testResult: "",
    locate: "",
    repairResult: "",
    tuning: "",
    "7s_zhengli": false,
    "7s_zhengdun": false,
    "7s_qingsao": false,
    "7s_qingjie": false,
    "7s_suyang": false,
    "7s_anquan": false,
    "7s_jieyue": false,
  },
  engineer2: {
    fault1: "",
    fault2: "",
    testResult: "",
    locate: "",
    repairResult: "",
    tuning: "",
    "7s_zhengli": false,
    "7s_zhengdun": false,
    "7s_qingsao": false,
    "7s_qingjie": false,
    "7s_suyang": false,
    "7s_anquan": false,
    "7s_jieyue": false,
  },
  engineer3: {
    fault1: "",
    fault2: "",
    testResult: "",
    locate: "",
    repairResult: "",
    tuning: "",
    "7s_zhengli": false,
    "7s_zhengdun": false,
    "7s_qingsao": false,
    "7s_qingjie": false,
    "7s_suyang": false,
    "7s_anquan": false,
    "7s_jieyue": false,
  },
  dataRecovery: {
    fault: {
      engineer1: "",
      engineer2: "",
      engineer3: ""
    },
    cause: {
      engineer1: "",
      engineer2: "",
      engineer3: ""
    },
    method: {
      engineer1: "",
      engineer2: "",
      engineer3: ""
    },
    result: {
      engineer1: "",
      engineer2: "",
      engineer3: ""
    },
    satisfaction: {
      engineer1: "",
      engineer2: "",
      engineer3: ""
    }
  }
};

function loadFormData() {
  const saved = localStorage.getItem("workOrderData");
  if (saved) {
    const parsedData = JSON.parse(saved);

    return {
      ...defaultData,
      ...parsedData,
      dataRecovery: {
        ...defaultData.dataRecovery,
        ...(parsedData.dataRecovery || {})
      }
    };
  }
  return defaultData;
}

function saveFormData(data) {
  localStorage.setItem("workOrderData", JSON.stringify(data));
}

let formData = loadFormData();
let currentUser = "engineer1";

function canEdit() {
  if (window.LoginManager && LoginManager.isLoggedIn()) {
    return LoginManager.hasPermission('can_edit_fcbmwo');
  }
  return currentUser.startsWith("engineer");
}

function canEdit7S() {
  if (window.LoginManager && LoginManager.isLoggedIn()) {
    return LoginManager.hasPermission('can_edit_7s');
  }
  return currentUser === "captain";
}

function canEditDataRecovery() {
  if (window.LoginManager && LoginManager.isLoggedIn()) {
    return LoginManager.hasPermission('can_edit_data_recovery');
  }
  return currentUser === "captain";
}

function getCurrentUserRole() {
  if (window.LoginManager && LoginManager.isLoggedIn()) {
    return LoginManager.getUserRole();
  }
  return currentUser;
}

function saveCurrentInputs() {
  document.querySelectorAll(".engineer-cell").forEach(cell => {
    const engineer = cell.dataset.engineer;
    const field = cell.dataset.field;
    if (!formData[engineer]) formData[engineer] = {};
    formData[engineer][field] = cell.textContent || cell.innerText || "";
  });


  document.querySelectorAll(".data-recovery-cell").forEach(cell => {
    const project = cell.dataset.project;
    const engineer = cell.dataset.engineer;
    if (!formData.dataRecovery) formData.dataRecovery = {};
    if (!formData.dataRecovery[project]) formData.dataRecovery[project] = {};
    formData.dataRecovery[project][engineer] = cell.textContent || cell.innerText || "";
  });


}


function renderAllCells() {
  const canEditOwn = canEdit();
  const canEditDataRec = canEditDataRecovery();
  const canEdit7s = canEdit7S();
  

  document.querySelectorAll(".engineer-cell").forEach(cell => {
    const engineer = cell.dataset.engineer;
    const field = cell.dataset.field;
    const value = (formData[engineer] && formData[engineer][field]) || "";

    cell.textContent = value;
    

    if (canEditOwn) {
      cell.setAttribute('contenteditable', 'true');
    } else {
      cell.removeAttribute('contenteditable');
    }
    

    if (!canEditOwn) {
      cell.style.backgroundColor = '#f5f5f5';
      cell.style.color = '#999';
      cell.style.cursor = 'not-allowed';
    } else {
      cell.style.backgroundColor = '';
      cell.style.color = '';
      cell.style.cursor = '';
    }
  });


  document.querySelectorAll(".btn-7s-edit").forEach(btn => {
    btn.disabled = !canEdit7s;
    if (!canEdit7s) {
      btn.style.backgroundColor = '#f5f5f5';
      btn.style.color = '#999';
      btn.style.cursor = 'not-allowed';
      btn.style.border = '1px solid #ddd';
    } else {
      btn.style.backgroundColor = '';
      btn.style.color = '';
      btn.style.cursor = '';
      btn.style.border = '';
    }
  });


  document.querySelectorAll(".data-recovery-cell").forEach(cell => {
    const project = cell.dataset.project;
    const engineer = cell.dataset.engineer;
    const value = (formData.dataRecovery[project] && formData.dataRecovery[project][engineer]) || "";

    cell.textContent = value;
    

    if (canEditDataRec) {
      cell.setAttribute('contenteditable', 'true');
    } else {
      cell.removeAttribute('contenteditable');
    }
    

    if (!canEditDataRec) {
      cell.style.backgroundColor = '#f5f5f5';
      cell.style.color = '#999';
      cell.style.cursor = 'not-allowed';
    } else {
      cell.style.backgroundColor = '';
      cell.style.color = '';
      cell.style.cursor = 'text';
    }
  });
}


const roleSelect = document.getElementById("roleSelect");
if (roleSelect) {
  roleSelect.addEventListener("change", function () {
    saveCurrentInputs();

    if (window.LoginManager && LoginManager.isLoggedIn()) {
      currentUser = LoginManager.getUserRole();
    } else {
      currentUser = this.value;
    }
    renderAllCells();
  });
}






let currentModal7sEngineer = null;
let isModal7sEditMode = false;


async function open7sModal(engineer, isEditMode) {
  currentModal7sEngineer = engineer;
  isModal7sEditMode = isEditMode;
  
  const modal = document.getElementById("modal7s");
  const title = document.getElementById("modal7sTitle");
  const saveBtn = document.getElementById("save7sBtn");
  

  const engineerNames = {
    engineer1: "1号工程师",
    engineer2: "2号工程师", 
    engineer3: "3号工程师"
  };
  title.textContent = `${engineerNames[engineer]} - 7S管理评价 (${isEditMode ? '编辑' : '查看'})`;
  

  let evaluationData = null;
  try {
    const response = await fetch('/api/7s-management.php');
    const result = await response.json();
    if (result.success && result.data) {

      evaluationData = result.data.find(record => record.user === engineer);
    }
  } catch (error) {
    console.error('获取7S评估数据失败:', error);
  }
  

  const fieldMapping = {
    arrange: '7s_zhengli',
    reorganize: '7s_zhengdun', 
    clean: '7s_qingsao',
    cleanliness: '7s_qingjie',
    quality: '7s_suyang',
    secure: '7s_anquan',
    save: '7s_jieyue'
  };
  

  const checkboxes = modal.querySelectorAll(".checkbox");
  checkboxes.forEach(checkbox => {
    const field = checkbox.dataset.field;
    let checked = false;
    
    if (evaluationData) {

      const dbField = Object.keys(fieldMapping).find(key => fieldMapping[key] === field);
      if (dbField) {
        checked = evaluationData[dbField] || false;
      }
    } else {

      checked = (formData[engineer] && formData[engineer][field]) || false;
    }
    
    checkbox.className = "checkbox" + (checked ? " checked" : "");
    checkbox.onclick = null;
    
    const canEdit7s = canEdit7S();
    if (isEditMode && canEdit7s) {
      checkbox.onclick = function() {
        checkbox.classList.toggle("checked");
      };

      checkbox.style.opacity = '';
      checkbox.style.cursor = '';
      

      if (checkbox) {
        checkbox.addEventListener('focus', () => {
          if (window.sevenSManager) {
            window.sevenSManager.setCellFocused();
          }
        });
        
        checkbox.addEventListener('blur', () => {
          if (window.sevenSManager) {
            window.sevenSManager.setCellBlurred();
          }
        });
      }
      

      checkbox.setAttribute('tabindex', '0');
    } else {

      checkbox.style.opacity = '0.5';
      checkbox.style.cursor = 'not-allowed';
    }
  });
  

  const canEdit7s = canEdit7S();
  if (isEditMode && canEdit7s) {
    saveBtn.style.display = "inline-block";
    saveBtn.disabled = false;
    saveBtn.style.backgroundColor = '';
    saveBtn.style.color = '';
    saveBtn.style.cursor = '';
  } else {
    saveBtn.style.display = "none";
  }
  
  modal.style.display = "block";
}


function close7sModal() {
  document.getElementById("modal7s").style.display = "none";
  currentModal7sEngineer = null;
  isModal7sEditMode = false;
}


async function save7sData() {
  if (!currentModal7sEngineer || !isModal7sEditMode || !canEdit7S()) return;
  
  const modal = document.getElementById("modal7s");
  const checkboxes = modal.querySelectorAll(".checkbox");
  

  const fieldMapping = {
    '7s_zhengli': 'arrange',
    '7s_zhengdun': 'reorganize',
    '7s_qingsao': 'clean',
    '7s_qingjie': 'cleanliness',
    '7s_suyang': 'quality',
    '7s_anquan': 'secure',
    '7s_jieyue': 'save'
  };
  

  const evaluationData = {
    user: currentModal7sEngineer,
    current_user: currentModal7sEngineer
  };
  
  checkboxes.forEach(checkbox => {
    const field = checkbox.dataset.field;
    const checked = checkbox.classList.contains("checked");
    const dbField = fieldMapping[field];
    if (dbField) {
      evaluationData[dbField] = checked ? 1 : 0;
    }
  });
  
  // 先保存到本地localStorage，确保数据不丢失
  if (!formData[currentModal7sEngineer]) {
    formData[currentModal7sEngineer] = {};
  }
  
  checkboxes.forEach(checkbox => {
    const field = checkbox.dataset.field;
    const checked = checkbox.classList.contains("checked");
    formData[currentModal7sEngineer][field] = checked;
  });
  
  // 保存数据到localStorage
  saveFormData(formData);
  console.log('7S数据已保存到localStorage:', formData[currentModal7sEngineer]);
  
  // 然后尝试保存到服务器
  try {
    const getResponse = await fetch('/api/7s-management.php');
    const getResult = await getResponse.json();
    let existingRecord = null;
    
    if (getResult.success && getResult.data) {
      existingRecord = getResult.data.find(record => record.user === currentModal7sEngineer);
    }
    
    let response;
    if (existingRecord) {
      response = await fetch(`/api/7s-management.php/${existingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(evaluationData)
      });
    } else {
      response = await fetch('/api/7s-management.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(evaluationData)
      });
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('7S数据已同步到服务器');
    } else {
      console.warn('服务器保存失败，但本地数据已保存:', result.message || '未知错误');
    }
  } catch (error) {
    console.error('服务器保存失败，但本地数据已保存:', error);
  }
  
  close7sModal();
}


window.addEventListener("load", function () {

  if (window.LoginManager && LoginManager.isLoggedIn()) {
    currentUser = LoginManager.getUserRole();

    const roleSelect = document.getElementById("roleSelect");
    if (roleSelect) {
      roleSelect.value = currentUser;
    }
  } else {
    currentUser = document.getElementById("roleSelect").value;
  }
  
  renderAllCells();
  

  setTimeout(() => {
    renderAllCells();
  }, 100);
  

  document.querySelectorAll(".btn-7s-view").forEach(btn => {
    btn.addEventListener("click", function() {
      const engineer = this.dataset.engineer;
      open7sModal(engineer, false);
    });
  });
  

  document.querySelectorAll(".btn-7s-edit").forEach(btn => {
    btn.addEventListener("click", function() {
      const engineer = this.dataset.engineer;
      if (canEdit7S()) {
        open7sModal(engineer, true);
      } else {
        alert("您没有权限编辑7S管理评价！");
      }
    });
  });
  

  const closeBtn = document.querySelector(".close");
  const cancel7sBtn = document.getElementById("cancel7sBtn");
  const save7sBtn = document.getElementById("save7sBtn");
  
  if (closeBtn) {
    closeBtn.addEventListener("click", close7sModal);
  }
  if (cancel7sBtn) {
    cancel7sBtn.addEventListener("click", close7sModal);
  }
  if (save7sBtn) {
    save7sBtn.addEventListener("click", save7sData);
  }
  

  window.addEventListener("click", function(event) {
    const modal = document.getElementById("modal7s");
    if (event.target === modal) {
      close7sModal();
    }
  });
});

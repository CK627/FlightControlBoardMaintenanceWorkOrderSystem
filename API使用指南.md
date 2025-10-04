# API使用指南

## API概述

本系统提供RESTful API接口，支持工单管理、配置管理、数据库操作等功能。

## 基础信息

- **基础URL**: `http://localhost:8000/api/`
- **数据格式**: JSON
- **字符编码**: UTF-8
- **HTTP方法**: GET, POST, PUT, DELETE

## API接口列表

### 1. 配置管理API

**接口地址**: `/api/config-manager.php`

#### 方法一: 获取配置

```bash
# 获取单个配置项
curl "http://localhost:8000/api/config-manager.php?key=database.initialized"

# 获取所有配置
curl "http://localhost:8000/api/config-manager.php"
```

**响应示例**:
```json
{
  "success": true,
  "data": true
}
```

#### 方法二: 设置配置

```bash
# 设置配置项
curl -X POST http://localhost:8000/api/config-manager.php \
  -H "Content-Type: application/json" \
  -d '{"key":"database.initialized","value":"true"}'
```

**响应示例**:
```json
{
  "success": true,
  "message": "配置已更新"
}
```

#### 方法三: 批量操作

```bash
# 批量设置配置
curl -X POST http://localhost:8000/api/config-manager.php \
  -H "Content-Type: application/json" \
  -d '{
    "batch": [
      {"key":"system.debug","value":"false"},
      {"key":"system.version","value":"1.0.1"}
    ]
  }'
```

### 2. 数据库初始化API

**接口地址**: `/api/database-init.php`

#### 方法一: 初始化数据库

```bash
curl -X POST http://localhost:8000/api/database-init.php \
  -H "Content-Type: application/json" \
  -d '{"action":"initialize"}'
```

**响应示例**:
```json
{
  "success": true,
  "message": "数据库初始化成功",
  "details": {
    "database_connection": "成功",
    "tables_created": 3,
    "config_updated": true
  }
}
```

#### 方法二: 检查数据库状态

```bash
curl -X POST http://localhost:8000/api/database-init.php \
  -H "Content-Type: application/json" \
  -d '{"action":"check"}'
```

#### 方法三: 重置数据库

```bash
curl -X POST http://localhost:8000/api/database-init.php \
  -H "Content-Type: application/json" \
  -d '{"action":"reset"}'
```

### 3. 工单管理API (FCBMWO)

**接口地址**: `/api/fcbmwo.php`

#### 方法一: 获取工单列表

```bash
# 获取所有工单
curl http://localhost:8000/api/fcbmwo.php/list

# 分页获取
curl "http://localhost:8000/api/fcbmwo.php/list?page=1&limit=10"

# 按状态筛选
curl "http://localhost:8000/api/fcbmwo.php/list?status=pending"
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "work_order_no": "FCBMWO-001",
      "user": "engineer1",
      "description": "飞控板电源模块故障",
      "status": "pending",
      "created_at": "2024-01-15 10:30:00"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

#### 方法二: 创建工单

```bash
curl -X POST http://localhost:8000/api/fcbmwo.php \
  -H "Content-Type: application/json" \
  -d '{
    "user": "engineer1",
    "work_order_no": "FCBMWO-002",
    "description": "IMU传感器校准",
    "priority": "high",
    "estimated_hours": 4
  }'
```

#### 方法三: 更新工单

```bash
curl -X PUT http://localhost:8000/api/fcbmwo.php/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "notes": "开始维修工作"
  }'
```

#### 方法四: 删除工单

```bash
curl -X DELETE http://localhost:8000/api/fcbmwo.php/1
```

### 4. 维修记录API (DRARWO)

**接口地址**: `/api/drarwo.php`

#### 方法一: 获取维修记录

```bash
# 获取所有记录
curl http://localhost:8000/api/drarwo.php/list

# 按工单ID获取
curl "http://localhost:8000/api/drarwo.php/list?work_order_id=1"
```

#### 方法二: 添加维修记录

```bash
curl -X POST http://localhost:8000/api/drarwo.php \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": 1,
    "repair_description": "更换电源模块",
    "parts_used": "电源模块 x1",
    "repair_time": 2.5,
    "status": "completed"
  }'
```

#### 方法三: 更新维修记录

```bash
curl -X PUT http://localhost:8000/api/drarwo.php/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "verified",
    "notes": "维修完成并测试通过"
  }'
```

### 5. 通用工单API

**接口地址**: `/api/workorder.php`

#### 方法一: 获取工单统计

```bash
curl http://localhost:8000/api/workorder.php/stats
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 50,
    "pending": 10,
    "in_progress": 15,
    "completed": 20,
    "cancelled": 5
  }
}
```

#### 方法二: 搜索工单

```bash
curl "http://localhost:8000/api/workorder.php/search?q=电源&type=description"
```

#### 方法三: 导出工单

```bash
curl "http://localhost:8000/api/workorder.php/export?format=csv&start_date=2024-01-01&end_date=2024-01-31"
```

## JavaScript SDK使用

### 方法一: 原生JavaScript

```javascript
// 配置管理
class ConfigManager {
  static async get(key) {
    const response = await fetch(`/api/config-manager.php?key=${key}`);
    return await response.json();
  }
  
  static async set(key, value) {
    const response = await fetch('/api/config-manager.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({key, value})
    });
    return await response.json();
  }
}

// 工单管理
class WorkOrderManager {
  static async list(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/api/fcbmwo.php/list?${query}`);
    return await response.json();
  }
  
  static async create(data) {
    const response = await fetch('/api/fcbmwo.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    return await response.json();
  }
  
  static async update(id, data) {
    const response = await fetch(`/api/fcbmwo.php/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    return await response.json();
  }
}

// 使用示例
async function example() {
  // 获取配置
  const config = await ConfigManager.get('database.initialized');
  console.log('数据库状态:', config.data);
  
  // 获取工单列表
  const workOrders = await WorkOrderManager.list({status: 'pending'});
  console.log('待处理工单:', workOrders.data);
  
  // 创建新工单
  const newOrder = await WorkOrderManager.create({
    user: 'engineer1',
    work_order_no: 'FCBMWO-003',
    description: '新的维修任务'
  });
  console.log('创建结果:', newOrder);
}
```

### 方法二: jQuery

```javascript
// 配置管理
function getConfig(key) {
  return $.get(`/api/config-manager.php?key=${key}`);
}

function setConfig(key, value) {
  return $.ajax({
    url: '/api/config-manager.php',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({key, value})
  });
}

// 工单管理
function getWorkOrders(params = {}) {
  return $.get('/api/fcbmwo.php/list', params);
}

function createWorkOrder(data) {
  return $.ajax({
    url: '/api/fcbmwo.php',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(data)
  });
}

// 使用示例
$(document).ready(function() {
  // 获取工单列表
  getWorkOrders({status: 'pending'}).done(function(response) {
    if (response.success) {
      console.log('工单列表:', response.data);
    }
  });
  
  // 创建工单
  $('#create-form').submit(function(e) {
    e.preventDefault();
    const formData = {
      user: $('#user').val(),
      work_order_no: $('#work_order_no').val(),
      description: $('#description').val()
    };
    
    createWorkOrder(formData).done(function(response) {
      if (response.success) {
        alert('工单创建成功');
        location.reload();
      } else {
        alert('创建失败: ' + response.message);
      }
    });
  });
});
```

### 方法三: Axios

```javascript
// 配置axios
const api = axios.create({
  baseURL: '/api/',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 配置管理
const configAPI = {
  get: (key) => api.get(`config-manager.php?key=${key}`),
  set: (key, value) => api.post('config-manager.php', {key, value}),
  getAll: () => api.get('config-manager.php')
};

// 工单管理
const workOrderAPI = {
  list: (params) => api.get('fcbmwo.php/list', {params}),
  create: (data) => api.post('fcbmwo.php', data),
  update: (id, data) => api.put(`fcbmwo.php/${id}`, data),
  delete: (id) => api.delete(`fcbmwo.php/${id}`)
};

// 使用示例
async function loadDashboard() {
  try {
    // 并行获取数据
    const [configResponse, workOrdersResponse] = await Promise.all([
      configAPI.get('database.initialized'),
      workOrderAPI.list({limit: 10})
    ]);
    
    console.log('配置状态:', configResponse.data);
    console.log('最新工单:', workOrdersResponse.data);
    
  } catch (error) {
    console.error('加载失败:', error);
  }
}
```

## PHP SDK使用

### 方法一: cURL封装

```php
<?php
class APIClient {
    private $baseUrl;
    
    public function __construct($baseUrl = 'http://localhost:8000/api/') {
        $this->baseUrl = $baseUrl;
    }
    
    public function get($endpoint, $params = []) {
        $url = $this->baseUrl . $endpoint;
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
    
    public function post($endpoint, $data) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->baseUrl . $endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}

// 使用示例
$client = new APIClient();

// 获取工单列表
$workOrders = $client->get('fcbmwo.php/list', ['status' => 'pending']);
echo "待处理工单数量: " . count($workOrders['data']) . "\n";

// 创建工单
$newOrder = $client->post('fcbmwo.php', [
    'user' => 'engineer1',
    'work_order_no' => 'FCBMWO-004',
    'description' => 'PHP API测试工单'
]);
echo "创建结果: " . ($newOrder['success'] ? '成功' : '失败') . "\n";
?>
```

### 方法二: Guzzle HTTP

```php
<?php
require_once 'vendor/autoload.php';

use GuzzleHttp\Client;

class WorkOrderService {
    private $client;
    
    public function __construct() {
        $this->client = new Client([
            'base_uri' => 'http://localhost:8000/api/',
            'headers' => ['Content-Type' => 'application/json']
        ]);
    }
    
    public function getWorkOrders($params = []) {
        $response = $this->client->get('fcbmwo.php/list', [
            'query' => $params
        ]);
        return json_decode($response->getBody(), true);
    }
    
    public function createWorkOrder($data) {
        $response = $this->client->post('fcbmwo.php', [
            'json' => $data
        ]);
        return json_decode($response->getBody(), true);
    }
}

// 使用示例
$service = new WorkOrderService();
$workOrders = $service->getWorkOrders(['status' => 'pending']);
print_r($workOrders);
?>
```

### 方法三: 原生PHP

```php
<?php
function callAPI($endpoint, $method = 'GET', $data = null) {
    $url = 'http://localhost:8000/api/' . $endpoint;
    
    $context = [
        'http' => [
            'method' => $method,
            'header' => 'Content-Type: application/json',
            'content' => $data ? json_encode($data) : null
        ]
    ];
    
    $result = file_get_contents($url, false, stream_context_create($context));
    return json_decode($result, true);
}

// 使用示例
$workOrders = callAPI('fcbmwo.php/list?status=pending');
$newOrder = callAPI('fcbmwo.php', 'POST', [
    'user' => 'engineer1',
    'work_order_no' => 'FCBMWO-005',
    'description' => '原生PHP API测试'
]);
?>
```

## 错误处理

### 常见错误码

| 错误码 | 说明 | 解决方法 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求参数格式 |
| 401 | 未授权访问 | 检查认证信息 |
| 404 | 接口不存在 | 检查API路径 |
| 500 | 服务器内部错误 | 检查服务器日志 |

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "具体错误信息"
  }
}
```

## 性能优化

### 方法一: 请求缓存

```javascript
// 简单缓存实现
const cache = new Map();

async function cachedRequest(url, ttl = 60000) {
  const key = url;
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  cache.set(key, {
    data: data,
    timestamp: Date.now()
  });
  
  return data;
}
```

### 方法二: 批量请求

```javascript
// 批量获取工单
async function batchGetWorkOrders(ids) {
  const promises = ids.map(id => 
    fetch(`/api/fcbmwo.php/${id}`)
  );
  
  const responses = await Promise.all(promises);
  return Promise.all(responses.map(r => r.json()));
}
```

### 方法三: 分页加载

```javascript
// 分页加载工单
class PaginatedWorkOrders {
  constructor() {
    this.page = 1;
    this.limit = 20;
    this.loading = false;
  }
  
  async loadMore() {
    if (this.loading) return;
    
    this.loading = true;
    try {
      const response = await fetch(
        `/api/fcbmwo.php/list?page=${this.page}&limit=${this.limit}`
      );
      const data = await response.json();
      
      if (data.success) {
        this.page++;
        return data.data;
      }
    } finally {
      this.loading = false;
    }
  }
}
```

---

**注意**: 
1. 所有API请求都应该包含适当的错误处理
2. 生产环境中建议使用HTTPS
3. 敏感操作应该添加身份验证
4. 大量数据请求建议使用分页
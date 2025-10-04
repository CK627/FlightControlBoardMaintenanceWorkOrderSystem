<?php
/**
 * 配置文件管理器
 * 用于读取和更新数据库初始化状态
 */

class ConfigManager {
    private $configFile;
    private $config;
    
    public function __construct() {
        $this->configFile = dirname(__DIR__) . '/config/app-config.ini';
        $this->loadConfig();
    }
    
    /**
     * 加载配置文件
     */
    private function loadConfig() {
        if (!file_exists($this->configFile)) {
            // 如果配置文件不存在，创建默认配置
            $this->createDefaultConfig();
        }
        
        $this->config = parse_ini_file($this->configFile, true);
        
        if ($this->config === false) {
            throw new Exception('配置文件格式错误或无法读取');
        }
    }
    
    /**
     * 创建默认配置文件
     */
    private function createDefaultConfig() {
        $defaultConfigContent = '; 飞控板维修工单系统配置文件
; 只记录数据库初始化状态
; 最后更新：' . date('Y-m-d') . '

[database]
; 数据库是否已初始化 (true/false)
initialized = false';
        
        // 确保config目录存在
        $configDir = dirname($this->configFile);
        if (!is_dir($configDir)) {
            mkdir($configDir, 0755, true);
        }
        
        file_put_contents($this->configFile, $defaultConfigContent);
        $this->config = parse_ini_file($this->configFile, true);
    }
    
    /**
     * 获取数据库初始化状态
     */
    public function isDatabaseInitialized() {
        $value = $this->config['database']['initialized'] ?? 'false';
        
        // 处理布尔值转换
        if (is_string($value)) {
            $value = strtolower(trim($value));
            return $value === 'true' || $value === '1';
        }
        
        // parse_ini_file 可能返回 "1" 或 1 表示 true
        return $value === '1' || $value === 1 || $value === true;
    }
    
    /**
     * 设置数据库初始化状态
     */
    public function setDatabaseInitialized($initialized = true) {
        $this->config['database']['initialized'] = $initialized ? 'true' : 'false';
        $result = $this->save();
        
        // 重新加载配置文件以确保数据一致性
        if ($result) {
            $this->config = parse_ini_file($this->configFile, true);
        }
        
        return $result;
    }
    
    /**
     * 保存配置到INI文件
     */
    private function save() {
        $iniContent = '; 飞控板维修工单系统配置文件' . PHP_EOL;
        $iniContent .= '; 只记录数据库初始化状态' . PHP_EOL;
        $iniContent .= '; 最后更新：' . date('Y-m-d H:i:s') . PHP_EOL . PHP_EOL;
        $iniContent .= '[database]' . PHP_EOL;
        $iniContent .= '; 数据库是否已初始化 (true/false)' . PHP_EOL;
        $iniContent .= 'initialized = ' . $this->config['database']['initialized'] . PHP_EOL;
        
        $result = file_put_contents($this->configFile, $iniContent);
        return $result !== false;
    }
    
    /**
     * 获取所有配置
     */
    public function getAll() {
        return $this->config;
    }
}

// 只有当直接访问此文件时才处理HTTP请求
if (basename($_SERVER['SCRIPT_NAME']) === 'config-manager.php') {
    // 处理HTTP请求
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        $configManager = new ConfigManager();
        
        // 检查是否请求特定配置
        $key = $_GET['key'] ?? null;
        
        if ($key === 'database.initialized') {
            $value = $configManager->isDatabaseInitialized();
            echo json_encode([
                'success' => true,
                'data' => $value
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'success' => true,
                'data' => $configManager->getAll()
            ], JSON_UNESCAPED_UNICODE);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        $configManager = new ConfigManager();
        
        // 支持JSON和表单数据两种格式
        $input = null;
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        
        if (strpos($contentType, 'application/json') !== false) {
            $input = json_decode(file_get_contents('php://input'), true);
        } else {
            // 使用表单数据
            $input = $_POST;
        }
        
        if (!$input || !isset($input['key']) || !isset($input['value'])) {
            throw new Exception('请求参数错误');
        }
        
        if ($input['key'] === 'database.initialized') {
            // 将字符串转换为布尔值
            $value = $input['value'];
            if (is_string($value)) {
                $value = strtolower(trim($value));
                $boolValue = ($value === 'true' || $value === '1');
            } else {
                $boolValue = (bool)$value;
            }
            
            $result = $configManager->setDatabaseInitialized($boolValue);
            
            echo json_encode([
                'success' => $result,
                'message' => $result ? '配置更新成功' : '配置更新失败'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception('不支持的配置项');
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => '不支持的请求方法'
    ], JSON_UNESCAPED_UNICODE);
}
}
?>
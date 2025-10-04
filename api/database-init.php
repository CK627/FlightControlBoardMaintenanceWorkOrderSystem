<?php
/**
 * 数据库初始化和完整性检查工具
 * 使用标准SQL文件进行数据库初始化，确保准确性和可靠性
 */

class DatabaseInitializer {
    private $config;
    private $pdo;
    private $log = [];
    
    public function __construct() {
        $this->loadConfig();
        $this->connectDatabase();
    }
    
    /**
     * 加载数据库配置
     */
    private function loadConfig() {
        $configFile = dirname(__DIR__) . '/config/mysql.ini';
        if (!file_exists($configFile)) {
            throw new Exception("配置文件不存在: $configFile");
        }
        
        $this->config = parse_ini_file($configFile, true);
        if (!$this->config || !isset($this->config['database'])) {
            throw new Exception("配置文件格式错误");
        }
    }
    
    /**
     * 连接数据库
     */
    private function connectDatabase() {
        $dbConfig = $this->config['database'];
        
        try {
            // 首先连接到MySQL服务器（不指定数据库）
            $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};charset={$dbConfig['charset']}";
            $this->pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$dbConfig['charset']}"
            ]);
            
            $this->log[] = "✓ 成功连接到MySQL服务器";
        } catch (PDOException $e) {
            throw new Exception("数据库连接失败: " . $e->getMessage());
        }
    }
    
    /**
     * 连接到MySQL服务器
     */
    private function connectToMysql() {
        $dbConfig = $this->config['database'];
        $host = $dbConfig['host'];
        $port = isset($dbConfig['port']) ? $dbConfig['port'] : 3306;
        $user = $dbConfig['user'];
        $password = $dbConfig['password'];
        $charset = isset($dbConfig['charset']) ? $dbConfig['charset'] : 'utf8';
        
        try {
            // 连接到MySQL服务器（不指定数据库）
            $dsn = "mysql:host=$host;port=$port;charset=$charset";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,  // 启用查询缓冲
                PDO::MYSQL_ATTR_MULTI_STATEMENTS => false    // 禁用多语句执行
            ];
            
            $this->pdo = new PDO($dsn, $user, $password, $options);
            $this->log[] = "✓ 成功连接到MySQL服务器";
            return true;
        } catch (PDOException $e) {
            $this->log[] = "✗ 连接MySQL服务器失败: " . $e->getMessage();
            return false;
        }
    }
    
    /**
     * 连接到指定数据库
     */
    private function connectToDatabase($dbName) {
        $dbConfig = $this->config['database'];
        $host = $dbConfig['host'];
        $port = isset($dbConfig['port']) ? $dbConfig['port'] : 3306;
        $user = $dbConfig['user'];
        $password = $dbConfig['password'];
        $charset = isset($dbConfig['charset']) ? $dbConfig['charset'] : 'utf8';
        
        try {
            $dsn = "mysql:host=$host;port=$port;dbname=$dbName;charset=$charset";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,  // 启用查询缓冲
                PDO::MYSQL_ATTR_MULTI_STATEMENTS => false    // 禁用多语句执行
            ];
            
            $this->pdo = new PDO($dsn, $user, $password, $options);
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    /**
     * 检查数据库是否存在
     */
    private function checkDatabaseExists() {
        $dbName = $this->config['database']['database'];
        
        try {
            $stmt = $this->pdo->prepare("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?");
            $stmt->execute([$dbName]);
            return $stmt->fetch() !== false;
        } catch (PDOException $e) {
            $this->log[] = "✗ 检查数据库存在性失败: " . $e->getMessage();
            return false;
        }
    }
    
    /**
     * 检查表结构完整性
     */
    private function checkTableStructure() {
        $dbName = $this->config['database']['database'];
        
        // 切换到目标数据库
        try {
            $this->pdo->exec("USE `$dbName`");
        } catch (PDOException $e) {
            $this->log[] = "✗ 无法切换到数据库 $dbName: " . $e->getMessage();
            return false;
        }
        
        // 检查必需的表
        $requiredTables = ['User', '7S_Management_Evaluation', 'fcbmwo_date', 'drarwo', 'system_log'];
        $missingTables = [];
        
        foreach ($requiredTables as $table) {
            try {
                $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?");
                $stmt->execute([$dbName, $table]);
                
                if ($stmt->fetchColumn() == 0) {
                    $missingTables[] = $table;
                }
            } catch (PDOException $e) {
                $this->log[] = "✗ 检查表 $table 失败: " . $e->getMessage();
                $missingTables[] = $table;
            }
        }
        
        if (empty($missingTables)) {
            $this->log[] = "✓ 所有必需的表都存在";
            
            // 检查关键字段
            $this->checkKeyFields();
            return ['complete' => true, 'missing_tables' => []];
        } else {
            $this->log[] = "✗ 缺少表: " . implode(', ', $missingTables);
            return ['complete' => false, 'missing_tables' => $missingTables];
        }
    }
    
    /**
     * 检查关键字段
     */
    private function checkKeyFields() {
        $fieldChecks = [
            'fcbmwo_date' => ['work_date'],
            'drarwo' => ['work_date'],
            'User' => ['permissions', 'status']
        ];
        
        foreach ($fieldChecks as $table => $fields) {
            foreach ($fields as $field) {
                try {
                    $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?");
                    $stmt->execute([$this->config['database']['database'], $table, $field]);
                    
                    if ($stmt->fetchColumn() > 0) {
                        $this->log[] = "✓ 表 $table 包含字段 $field";
                    } else {
                        $this->log[] = "✗ 表 $table 缺少字段 $field";
                    }
                } catch (PDOException $e) {
                    $this->log[] = "✗ 检查字段 $table.$field 失败: " . $e->getMessage();
                }
            }
        }
    }
    
    /**
     * 执行标准SQL文件进行数据库初始化
     */
    private function executeStandardSqlFile() {
        $sqlFile = dirname(__DIR__) . '/fcbmwos_mysql8_updated.sql';
        
        if (!file_exists($sqlFile)) {
            throw new Exception("SQL文件不存在: $sqlFile");
        }
        
        $this->log[] = "📁 找到标准SQL文件: fcbmwos_mysql8_updated.sql";
        
        // 读取SQL文件内容
        $sqlContent = file_get_contents($sqlFile);
        if ($sqlContent === false) {
            throw new Exception("无法读取SQL文件");
        }
        
        $this->log[] = "📖 成功读取SQL文件内容 (" . strlen($sqlContent) . " 字符)";
        
        // 执行SQL文件
        $this->executeSqlContent($sqlContent);
    }
    
    /**
     * 执行SQL内容，智能处理不同类型的SQL语句
     */
    private function executeSqlContent($sqlContent) {
        // 预处理SQL内容，正确处理触发器和存储过程
        $statements = $this->parseComplexSqlStatements($sqlContent);
        
        $this->log[] = "🔍 解析出 " . count($statements) . " 条SQL语句";
        
        $successCount = 0;
        $errorCount = 0;
        
        foreach ($statements as $index => $statement) {
            $statement = trim($statement);
            if (empty($statement)) continue;
            
            try {
                // 检查是否需要特殊处理的语句类型
                if ($this->isDelimiterStatement($statement)) {
                    // 跳过DELIMITER语句，PDO不需要
                    continue;
                }
                
                if ($this->isTransactionStatement($statement)) {
                    // 处理事务语句
                    $this->executeTransactionStatement($statement);
                } else {
                    // 执行普通SQL语句 - 使用prepare/execute避免缓冲问题
                    $stmt = $this->pdo->prepare($statement);
                    $stmt->execute();
                    $stmt->closeCursor(); // 释放结果集
                }
                
                $successCount++;
                
                // 记录重要操作
                if (stripos($statement, 'CREATE DATABASE') !== false) {
                    $this->log[] = "✓ 创建数据库";
                } elseif (stripos($statement, 'CREATE TABLE') !== false) {
                    preg_match('/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/i', $statement, $matches);
                    if (isset($matches[1])) {
                        $this->log[] = "✓ 创建表: " . $matches[1];
                    }
                } elseif (stripos($statement, 'CREATE TRIGGER') !== false) {
                    preg_match('/CREATE TRIGGER\s+`?(\w+)`?/i', $statement, $matches);
                    if (isset($matches[1])) {
                        $this->log[] = "✓ 创建触发器: " . $matches[1];
                    }
                } elseif (stripos($statement, 'CREATE PROCEDURE') !== false) {
                    preg_match('/CREATE PROCEDURE\s+`?(\w+)`?/i', $statement, $matches);
                    if (isset($matches[1])) {
                        $this->log[] = "✓ 创建存储过程: " . $matches[1];
                    }
                } elseif (stripos($statement, 'CREATE OR REPLACE VIEW') !== false) {
                    preg_match('/CREATE OR REPLACE VIEW\s+`?(\w+)`?/i', $statement, $matches);
                    if (isset($matches[1])) {
                        $this->log[] = "✓ 创建视图: " . $matches[1];
                    }
                } elseif (stripos($statement, 'INSERT INTO') !== false) {
                    preg_match('/INSERT INTO\s+`?(\w+)`?/i', $statement, $matches);
                    if (isset($matches[1])) {
                        $this->log[] = "✓ 插入数据到表: " . $matches[1];
                    }
                }
                
            } catch (PDOException $e) {
                $errorCount++;
                $this->log[] = "✗ SQL执行失败 (语句 " . ($index + 1) . "): " . $e->getMessage();
                
                // 对于某些非关键错误，继续执行
                if (stripos($e->getMessage(), 'already exists') !== false) {
                    $this->log[] = "ℹ️ 对象已存在，继续执行";
                    continue;
                }
                
                // 对于严重错误，抛出异常
                if (stripos($e->getMessage(), 'syntax error') !== false || 
                    stripos($e->getMessage(), 'access denied') !== false) {
                    throw new Exception("严重SQL错误: " . $e->getMessage());
                }
            }
        }
        
        $this->log[] = "📊 SQL执行完成: 成功 $successCount 条，错误 $errorCount 条";
    }
    
    /**
     * 解析复杂SQL语句，正确处理触发器和存储过程
     */
    private function parseComplexSqlStatements($sqlContent) {
        // 移除多行注释
        $sqlContent = preg_replace('/\/\*.*?\*\//s', '', $sqlContent);
        
        // 移除单行注释，但保留字符串中的内容
        $lines = explode("\n", $sqlContent);
        $cleanLines = [];
        
        foreach ($lines as $line) {
            $line = trim($line);
            // 跳过空行和注释行
            if (empty($line) || strpos($line, '--') === 0) {
                continue;
            }
            $cleanLines[] = $line;
        }
        
        $cleanSql = implode("\n", $cleanLines);
        
        // 处理DELIMITER语句块 - 改进版本
        $statements = [];
        $currentStatement = '';
        $inDelimiterBlock = false;
        $delimiterBlockContent = '';
        $customDelimiter = '//';
        
        // 按行处理，正确识别DELIMITER块
        $lines = explode("\n", $cleanSql);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            // 检查DELIMITER开始
            if (preg_match('/^DELIMITER\s+(.*?)\s*$/i', $line, $matches)) {
                $customDelimiter = trim($matches[1]);
                if ($customDelimiter === '//') {
                    $inDelimiterBlock = true;
                    $delimiterBlockContent = '';
                }
                continue;
            }
            
            // 检查DELIMITER结束
            if (preg_match('/^DELIMITER\s+;\s*$/i', $line)) {
                $inDelimiterBlock = false;
                if (!empty($delimiterBlockContent)) {
                    // 清理DELIMITER块内容，移除自定义分隔符
                    $cleanContent = str_replace($customDelimiter, '', $delimiterBlockContent);
                    $cleanContent = trim($cleanContent);
                    if (!empty($cleanContent)) {
                        $statements[] = $cleanContent;
                    }
                    $delimiterBlockContent = '';
                }
                $customDelimiter = ';';
                continue;
            }
            
            // 在DELIMITER块内
            if ($inDelimiterBlock) {
                // 检查是否遇到自定义分隔符结尾
                if (substr($line, -strlen($customDelimiter)) === $customDelimiter) {
                    // 移除分隔符并添加到内容
                    $line = substr($line, 0, -strlen($customDelimiter));
                    $delimiterBlockContent .= $line . "\n";
                    
                    // 完成一个DELIMITER块内的语句
                    $cleanContent = trim($delimiterBlockContent);
                    if (!empty($cleanContent)) {
                        $statements[] = $cleanContent;
                    }
                    $delimiterBlockContent = '';
                } else {
                    $delimiterBlockContent .= $line . "\n";
                }
                continue;
            }
            
            // 普通SQL语句处理
            $currentStatement .= $line . "\n";
            
            // 检查语句结束（以分号结尾）
            if (preg_match('/;\s*$/', $line)) {
                $statement = trim($currentStatement);
                if (!empty($statement)) {
                    $statements[] = $statement;
                }
                $currentStatement = '';
            }
        }
        
        // 处理最后一个语句（如果没有分号结尾）
        if (!empty(trim($currentStatement))) {
            $statements[] = trim($currentStatement);
        }
        
        // 处理剩余的DELIMITER块内容
        if (!empty($delimiterBlockContent)) {
            $cleanContent = trim($delimiterBlockContent);
            if (!empty($cleanContent)) {
                $statements[] = $cleanContent;
            }
        }
        
        // 清理语句，移除末尾的分号和空语句
        $cleanStatements = [];
        foreach ($statements as $statement) {
            $statement = trim($statement);
            $statement = rtrim($statement, ';');
            $statement = trim($statement);
            
            // 跳过空语句和DELIMITER语句
            if (!empty($statement) && 
                !preg_match('/^DELIMITER/i', $statement) &&
                $statement !== '//' &&
                $statement !== ';') {
                $cleanStatements[] = $statement;
            }
        }
        
        return $cleanStatements;
    }
    
    /**
     * 解析SQL语句 - 保留原有方法作为备用
     */
    private function parseSqlStatements($sqlContent) {
        // 移除多行注释
        $sqlContent = preg_replace('/\/\*.*?\*\//s', '', $sqlContent);
        
        // 移除单行注释（但保留字符串中的--）
        $lines = explode("\n", $sqlContent);
        $cleanLines = [];
        
        foreach ($lines as $line) {
            $line = trim($line);
            // 跳过空行和注释行
            if (empty($line) || strpos($line, '--') === 0) {
                continue;
            }
            $cleanLines[] = $line;
        }
        
        $cleanSql = implode("\n", $cleanLines);
        
        // 处理DELIMITER语句 - 简化处理方式
        $cleanSql = preg_replace('/DELIMITER\s+\/\//', '', $cleanSql);
        $cleanSql = preg_replace('/DELIMITER\s+;/', '', $cleanSql);
        
        // 按分号分割语句
        $statements = explode(';', $cleanSql);
        
        // 清理和过滤语句
        $cleanStatements = [];
        foreach ($statements as $statement) {
            $statement = trim($statement);
            if (!empty($statement) && $statement !== 'DELIMITER') {
                $cleanStatements[] = $statement;
            }
        }
        
        return $cleanStatements;
    }
    
    /**
     * 检查是否为DELIMITER语句
     */
    private function isDelimiterStatement($statement) {
        return stripos($statement, 'DELIMITER') === 0;
    }
    
    /**
     * 检查是否为事务语句
     */
    private function isTransactionStatement($statement) {
        $statement = strtoupper(trim($statement));
        return in_array($statement, ['BEGIN', 'COMMIT', 'ROLLBACK', 'START TRANSACTION']);
    }
    
    /**
     * 执行事务语句
     */
    private function executeTransactionStatement($statement) {
        $statement = strtoupper(trim($statement));
        
        switch ($statement) {
            case 'BEGIN':
            case 'START TRANSACTION':
                if (!$this->pdo->inTransaction()) {
                    $this->pdo->beginTransaction();
                    $this->log[] = "🔄 开始事务";
                }
                break;
                
            case 'COMMIT':
                if ($this->pdo->inTransaction()) {
                    $this->pdo->commit();
                    $this->log[] = "✅ 提交事务";
                }
                break;
                
            case 'ROLLBACK':
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                    $this->log[] = "↩️ 回滚事务";
                }
                break;
        }
    }
    
    /**
     * 初始化数据库
     */
    public function initialize() {
        try {
            // 连接到MySQL服务器
            if (!$this->connectToMysql()) {
                throw new Exception("无法连接到MySQL服务器");
            }
            
            $this->log[] = "🚀 开始数据库初始化检查";
            
            $dbName = $this->config['database']['database'];
            
            // 检查数据库是否存在
            if ($this->checkDatabaseExists()) {
                $this->log[] = "✓ 数据库已存在，检查表结构";
                
                // 重新连接到指定数据库
                if (!$this->connectToDatabase($dbName)) {
                    throw new Exception("无法连接到数据库: $dbName");
                }
                
                // 检查表结构完整性
                $structureCheck = $this->checkTableStructure();
                
                if ($structureCheck['complete']) {
                    $this->log[] = "✅ 数据库结构完整，无需重建";
                } else {
                    $this->log[] = "⚠️ 数据库结构不完整，执行修复";
                    $this->executeStandardSqlFile();
                }
            } else {
                $this->log[] = "ℹ️ 数据库不存在，执行完整初始化";
                $this->executeStandardSqlFile();
            }
            
            // 执行最终验证
            $this->log[] = "🔍 执行最终验证";
            
            // 重新连接到数据库进行验证
            if (!$this->connectToDatabase($dbName)) {
                throw new Exception("验证阶段无法连接到数据库");
            }
            
            $finalCheck = $this->checkTableStructure();
            if (!$finalCheck['complete']) {
                throw new Exception("数据库初始化验证失败");
            }
            
            $this->log[] = "🎉 数据库初始化成功完成！";
            
            // 更新配置文件，标记数据库已初始化
            $this->updateConfigFile();
            
            return [
                'success' => true,
                'message' => '数据库初始化成功',
                'log' => $this->log
            ];
            
        } catch (Exception $e) {
            $this->log[] = "❌ 初始化失败: " . $e->getMessage();
            
            // 安全地回滚事务（如果存在）
            try {
                if ($this->pdo && $this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                    $this->log[] = "🔄 已回滚未完成的事务";
                }
            } catch (PDOException $rollbackError) {
                $this->log[] = "⚠️ 回滚事务时出错: " . $rollbackError->getMessage();
            }
            
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'log' => $this->log
            ];
        }
    }
    
    /**
     * 获取日志
     */
    public function getLog() {
        return $this->log;
    }
    
    /**
     * 更新配置文件，标记数据库已初始化
     */
    private function updateConfigFile() {
        try {
            require_once __DIR__ . '/config-manager.php';
            $configManager = new ConfigManager();
            $configManager->setDatabaseInitialized(true);
            $this->log[] = "✓ 配置文件已更新，数据库标记为已初始化";
        } catch (Exception $e) {
            $this->log[] = "⚠️ 更新配置文件时出错: " . $e->getMessage();
            // 不抛出异常，因为数据库初始化已成功
        }
    }
}

// 处理请求
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        $initializer = new DatabaseInitializer();
        $result = $initializer->initialize();
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage(),
            'log' => ['❌ 系统错误: ' . $e->getMessage()]
        ], JSON_UNESCAPED_UNICODE);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => '只支持POST请求'
    ], JSON_UNESCAPED_UNICODE);
}
?>
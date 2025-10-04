<?php

// 从配置文件读取数据库连接信息
function loadDatabaseConfig() {
    $configFile = dirname(__DIR__) . '/config/mysql.ini';

if (!file_exists($configFile)) {
    die("配置文件 mysql.ini 不存在");
}
    
    $config = parse_ini_file($configFile, true);
    if (!$config) {
        die("无法解析配置文件 mysql.ini");
    }
    
    return $config['database'];
}

function getConnection() {
    $dbConfig = loadDatabaseConfig();
    $host = $dbConfig['host'];
    $user = $dbConfig['user'];
    $password = $dbConfig['password'];
    $database = $dbConfig['database'];
    $port = $dbConfig['port'] ?? 3306; // 添加端口支持，默认3306
    
    $conn = new mysqli($host, $user, $password, $database, $port);
    

    if ($conn->connect_error) {
        die("数据库连接失败: " . $conn->connect_error);
    }
    

    $conn->set_charset("utf8");
    
    return $conn;
}

function closeConnection($conn) {
    $conn->close();
}
?>
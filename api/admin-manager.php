<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db.php';

// 获取数据库连接
$conn = getConnection();

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'export':
        exportAllData();
        break;
    case 'import':
        importData();
        break;
    case 'clear':
        clearAllData();
        break;
    default:
        echo json_encode(['success' => false, 'message' => '无效的操作']);
        break;
}

/**
 * 导出所有数据为JSON格式
 */
function exportAllData() {
    global $conn;
    
    try {
        $exportData = [];
        
        // 导出飞控板维修工单数据
        $result = $conn->query("SELECT * FROM fcbmwo_date ORDER BY id");
        $exportData['fcbmwo_date'] = $result->fetch_all(MYSQLI_ASSOC);
        
        // 导出7S管理评价数据
        $result = $conn->query("SELECT * FROM 7S_Management_Evaluation ORDER BY id");
        $exportData['7S_Management_Evaluation'] = $result->fetch_all(MYSQLI_ASSOC);
        
        // 导出DRARWO数据
        $result = $conn->query("SELECT * FROM drarwo ORDER BY id");
        $exportData['drarwo'] = $result->fetch_all(MYSQLI_ASSOC);
        
        // 添加导出时间戳
        $exportData['export_info'] = [
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '1.0',
            'total_records' => [
                'fcbmwo_date' => count($exportData['fcbmwo_date']),
                '7S_Management_Evaluation' => count($exportData['7S_Management_Evaluation']),
                'drarwo' => count($exportData['drarwo'])
            ]
        ];
        
        // 设置响应头 - 使用ASCII安全的文件名避免乱码
        $timestamp = date('Y-m-d_H-i-s');
        $asciiFilename = 'workorder_system_data_' . $timestamp . '.json';
        $chineseFilename = '工单系统数据_' . $timestamp . '.json';
        $encodedFilename = rawurlencode($chineseFilename);
        header('Content-Disposition: attachment; filename="' . $asciiFilename . '"; filename*=UTF-8\'\''. $encodedFilename);
        header('Content-Type: application/json; charset=utf-8');
        
        echo json_encode($exportData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => '导出失败: ' . $e->getMessage()
        ]);
    }
}

/**
 * 导入JSON数据到数据库
 */
function importData() {
    global $conn;
    
    try {
        // 检查是否有上传的文件
        if (!isset($_FILES['import_file']) || $_FILES['import_file']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('请选择要导入的JSON文件');
        }
        
        $uploadedFile = $_FILES['import_file'];
        
        // 检查文件类型
        $fileExtension = strtolower(pathinfo($uploadedFile['name'], PATHINFO_EXTENSION));
        if ($fileExtension !== 'json') {
            throw new Exception('只支持JSON格式的文件');
        }
        
        // 读取文件内容
        $jsonContent = file_get_contents($uploadedFile['tmp_name']);
        if ($jsonContent === false) {
            throw new Exception('无法读取文件内容');
        }
        
        // 解析JSON数据
        $importData = json_decode($jsonContent, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('JSON格式错误: ' . json_last_error_msg());
        }
        
        // 开始事务
        $conn->autocommit(false);
        
        $importResults = [];
        
        // 导入各个表的数据
        $tables = ['fcbmwo_date', '7S_Management_Evaluation', 'drarwo'];
        
        foreach ($tables as $table) {
            // 使用与导出时相同的键名
            if (isset($importData[$table]) && is_array($importData[$table])) {
                $result = importTableData($table, $importData[$table]);
                $importResults[$table] = $result;
            }
        }
        
        // 提交事务
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => '数据导入成功',
            'results' => $importResults,
            'import_info' => $importData['export_info'] ?? null
        ]);
        
    } catch (Exception $e) {
        // 回滚事务
        $conn->rollback();
        
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => '导入失败: ' . $e->getMessage()
        ]);
    }
}

/**
 * 导入单个表的数据
 */
function importTableData($tableName, $data) {
    global $conn;
    
    if (empty($data)) {
        return 0;
    }
    
    $count = 0;
    $updated = 0;
    
    foreach ($data as $record) {
        // 移除id字段，让数据库自动生成
        unset($record['id']);
        
        if (empty($record)) {
            continue;
        }
        
        // 根据表名确定日期字段和用户字段
        $dateField = '';
        $userField = 'user';
        
        switch ($tableName) {
            case 'fcbmwo_date':
                $dateField = 'work_date';
                break;
            case 'drarwo':
                $dateField = 'work_date';
                break;
            case '7S_Management_Evaluation':
                $dateField = 'evaluation_date';
                break;
        }
        
        // 如果没有日期字段，使用当前日期
        if ($dateField && !isset($record[$dateField])) {
            $record[$dateField] = date('Y-m-d');
        }
        
        // 检查是否存在相同用户和日期的记录
        if ($dateField && isset($record[$userField]) && isset($record[$dateField])) {
            $checkSql = "SELECT id FROM `{$tableName}` WHERE `{$userField}` = ? AND `{$dateField}` = ?";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param('ss', $record[$userField], $record[$dateField]);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            $existingRecord = $result->fetch_assoc();
            
            if ($existingRecord) {
                // 更新现有记录
                $updateColumns = [];
                $updateValues = [];
                
                foreach ($record as $key => $value) {
                    if ($key !== $userField && $key !== $dateField && $key !== 'total_score') {
                        $updateColumns[] = "`{$key}` = ?";
                        $updateValues[] = $value;
                    }
                }
                
                if (!empty($updateColumns)) {
                    $updateValues[] = $record[$userField];
                    $updateValues[] = $record[$dateField];
                    
                    $updateSql = "UPDATE `{$tableName}` SET " . implode(', ', $updateColumns) . ", updated_at = CURRENT_TIMESTAMP WHERE `{$userField}` = ? AND `{$dateField}` = ?";
                    $updateStmt = $conn->prepare($updateSql);
                    $updateStmt->bind_param(str_repeat('s', count($updateValues)), ...$updateValues);
                    $updateStmt->execute();
                    $updated++;
                }
                continue;
            }
        }
        
        // 插入新记录
        // 对于7S_Management_Evaluation表，需要排除生成列total_score
        if ($tableName === '7S_Management_Evaluation') {
            unset($record['total_score']);
        }
        
        $columns = array_keys($record);
        $placeholders = array_fill(0, count($columns), '?');
        
        $sql = "INSERT INTO `{$tableName}` (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $placeholders) . ")";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param(str_repeat('s', count($record)), ...array_values($record));
        $stmt->execute();
        
        $count++;
    }
    
    return ['inserted' => $count, 'updated' => $updated];
}

/**
 * 获取数据库表结构信息
 */
function getTableInfo($tableName) {
    global $conn;
    
    $result = $conn->query("DESCRIBE `{$tableName}`");
    return $result->fetch_all(MYSQLI_ASSOC);
}

/**
 * 清除所有数据
 */
function clearAllData() {
    global $conn;
    
    try {
        // 开始事务
        $conn->autocommit(false);
        
        $clearResults = [];
        
        // 清除各个表的数据
        $tables = ['fcbmwo_date', '7S_Management_Evaluation', 'drarwo'];
        
        foreach ($tables as $table) {
            $result = $conn->query("DELETE FROM `{$table}`");
            if ($result) {
                $clearResults[$table] = $conn->affected_rows;
                // 重置自增ID
                $conn->query("ALTER TABLE `{$table}` AUTO_INCREMENT = 1");
            } else {
                throw new Exception("清除表 {$table} 失败");
            }
        }
        
        // 提交事务
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => '所有数据已成功清除',
            'results' => $clearResults
        ]);
        
    } catch (Exception $e) {
        // 回滚事务
        $conn->rollback();
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => '清除数据失败: ' . $e->getMessage()
        ]);
    }
}

/**
 * 验证数据格式
 */
function validateImportData($data) {
    if (!is_array($data)) {
        throw new Exception('导入数据格式错误');
    }
    
    $requiredTables = ['fcbmwo', '7s_management', 'drarwo', 'workorder'];
    $hasValidTable = false;
    
    foreach ($requiredTables as $table) {
        if (isset($data[$table]) && is_array($data[$table]) && !empty($data[$table])) {
            $hasValidTable = true;
            break;
        }
    }
    
    if (!$hasValidTable) {
        throw new Exception('导入文件中没有找到有效的数据表');
    }
    
    return true;
}
?>
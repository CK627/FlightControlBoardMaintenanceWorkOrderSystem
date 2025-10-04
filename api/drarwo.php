<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}


// 从配置文件读取数据库连接信息
function loadDatabaseConfig() {
    $configFile = dirname(__DIR__) . '/config/mysql.ini';
    if (!file_exists($configFile)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '配置文件 mysql.ini 不存在']);
        exit;
    }
    
    $config = parse_ini_file($configFile, true);
    if (!$config) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '无法解析配置文件 mysql.ini']);
        exit;
    }
    
    return $config['database'];
}

$dbConfig = loadDatabaseConfig();
$host = $dbConfig['host'];
$dbname = $dbConfig['database'];
$username = $dbConfig['user'];
$password = $dbConfig['password'];
$port = $dbConfig['port'] ?? 3306; // 添加端口支持

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '数据库连接失败: ' . $e->getMessage()]);
    exit;
}


$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));


$apiIndex = array_search('api', $pathParts);
if ($apiIndex !== false) {
    $pathParts = array_slice($pathParts, $apiIndex + 2);
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (empty($pathParts[0]) || $pathParts[0] === 'list') {
            getDRARWOList($pdo);
        } else {
            getDRARWO($pdo, $pathParts[0]);
        }
        break;
    case 'POST':
        createDRARWO($pdo);
        break;
    case 'PUT':
        if (!empty($pathParts[0])) {
            updateDRARWO($pdo, $pathParts[0]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '缺少记录ID']);
        }
        break;
    case 'DELETE':
        if (!empty($pathParts[0])) {
            deleteDRARWO($pdo, $pathParts[0]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '缺少记录ID']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => '不支持的请求方法']);
        break;
}

/**
 * 获取DRARWO列表
 */
function getDRARWOList($pdo) {
    try {
        // 获取查询参数
        $workDate = $_GET['work_date'] ?? date('Y-m-d');
        $user = $_GET['user'] ?? null;
        
        // 构建查询条件
        $whereConditions = [];
        $params = [];
        
        if ($workDate) {
            $whereConditions[] = "work_date = ?";
            $params[] = $workDate;
        }
        
        if ($user) {
            $whereConditions[] = "user = ?";
            $params[] = $user;
        }
        
        $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
        
        $sql = "SELECT * FROM drarwo {$whereClause} ORDER BY work_date DESC, created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $records,
            'query_info' => [
                'work_date' => $workDate,
                'user' => $user,
                'total_records' => count($records)
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '查询失败: ' . $e->getMessage()]);
    }
}

/**
 * 获取单个DRARWO记录
 */
function getDRARWO($pdo, $id) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM drarwo WHERE id = ?");
        $stmt->execute([$id]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($record) {
            echo json_encode(['success' => true, 'data' => $record]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '记录不存在']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '查询失败: ' . $e->getMessage()]);
    }
}

/**
 * 创建DRARWO记录
 */
function createDRARWO($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的JSON数据']);
            return;
        }
        
        if (empty($input['user'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '用户字段不能为空']);
            return;
        }
        
        $user = $input['user'];
        $workDate = $input['work_date'] ?? date('Y-m-d');
        $discovered_malfunction = $input['Discovered_a_malfunction'] ?? '';
        $reason_malfunction = $input['Reason_for_malfunction'] ?? '';
        $repair_method = $input['Repair_method'] ?? '';
        $repair_results = $input['Repair_results'] ?? '';
        $customer_satisfaction = $input['Customer_satisfaction'] ?? '';
        
        // 检查该用户当天是否已有记录
        $checkStmt = $pdo->prepare("SELECT id FROM drarwo WHERE user = ? AND work_date = ?");
        $checkStmt->execute([$user, $workDate]);
        $existingRecord = $checkStmt->fetch();
        
        if ($existingRecord) {
            // 如果记录存在，更新记录
            $updateSql = "UPDATE drarwo SET Discovered_a_malfunction = ?, Reason_for_malfunction = ?, Repair_method = ?, Repair_results = ?, Customer_satisfaction = ?, updated_at = NOW() WHERE user = ? AND work_date = ?";
            $updateStmt = $pdo->prepare($updateSql);
            $result = $updateStmt->execute([
                $discovered_malfunction,
                $reason_malfunction,
                $repair_method,
                $repair_results,
                $customer_satisfaction,
                $user,
                $workDate
            ]);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => '记录更新成功',
                    'action' => 'updated',
                    'id' => $existingRecord['id'],
                    'work_date' => $workDate
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => '更新记录失败']);
            }
            return;
        }
        
        // 创建新记录
        $sql = "INSERT INTO drarwo (user_id, user, work_date, Discovered_a_malfunction, Reason_for_malfunction, Repair_method, Repair_results, Customer_satisfaction, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            1, // 默认user_id
            $user,
            $workDate,
            $discovered_malfunction,
            $reason_malfunction,
            $repair_method,
            $repair_results,
            $customer_satisfaction
        ]);
        
        if ($result) {
            $newId = $pdo->lastInsertId();
            echo json_encode([
                'success' => true,
                'message' => '记录创建成功',
                'action' => 'created',
                'id' => $newId,
                'work_date' => $workDate
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '创建记录失败']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '创建失败: ' . $e->getMessage()]);
    }
}

/**
 * 更新DRARWO记录
 */
function updateDRARWO($pdo, $id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的JSON数据']);
            return;
        }
        
    
        $checkStmt = $pdo->prepare("SELECT id FROM drarwo WHERE id = ?");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '记录不存在']);
            return;
        }
        
        $user = $input['user'] ?? '';
        $discovered_malfunction = $input['Discovered_a_malfunction'] ?? '';
        $reason_malfunction = $input['Reason_for_malfunction'] ?? '';
        $repair_method = $input['Repair_method'] ?? '';
        $repair_results = $input['Repair_results'] ?? '';
        $customer_satisfaction = $input['Customer_satisfaction'] ?? '';
        
        $sql = "UPDATE drarwo SET user = ?, Discovered_a_malfunction = ?, Reason_for_malfunction = ?, Repair_method = ?, Repair_results = ?, Customer_satisfaction = ? WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            $user,
            $discovered_malfunction,
            $reason_malfunction,
            $repair_method,
            $repair_results,
            $customer_satisfaction,
            $id
        ]);
        
        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => '记录更新成功'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '更新记录失败']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '更新失败: ' . $e->getMessage()]);
    }
}

/**
 * 删除DRARWO记录
 */
function deleteDRARWO($pdo, $id) {
    try {
    
        $checkStmt = $pdo->prepare("SELECT id FROM drarwo WHERE id = ?");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '记录不存在']);
            return;
        }
        
        $stmt = $pdo->prepare("DELETE FROM drarwo WHERE id = ?");
        $result = $stmt->execute([$id]);
        
        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => '记录删除成功'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '删除记录失败']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '删除失败: ' . $e->getMessage()]);
    }
}
?>
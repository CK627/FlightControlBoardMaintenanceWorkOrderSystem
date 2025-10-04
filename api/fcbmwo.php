<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


// 从配置文件读取数据库连接信息
function loadDatabaseConfig() {
    $configFile = dirname(__DIR__) . '/config/mysql.ini';
    if (!file_exists($configFile)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '配置文件 mysql.ini 不存在']);
        exit();
    }
    
    $config = parse_ini_file($configFile, true);
    if (!$config) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '无法解析配置文件 mysql.ini']);
        exit();
    }
    
    return $config['database'];
}

$dbConfig = loadDatabaseConfig();
$host = $dbConfig['host'];
$username = $dbConfig['user'];
$password = $dbConfig['password'];
$database = $dbConfig['database'];
$port = $dbConfig['port'] ?? 3306; // 添加端口支持

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$database;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '数据库连接失败: ' . $e->getMessage()]);
    exit();
}


$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '';


if (empty($path)) {
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($requestUri, '/api/fcbmwo.php') !== false) {
        $path = str_replace('/api/fcbmwo.php', '', $requestUri);

        if (strpos($path, '?') !== false) {
            $path = substr($path, 0, strpos($path, '?'));
        }
    }
}

$input = json_decode(file_get_contents('php://input'), true);




switch ($method) {
    case 'GET':
        if ($path === '/list' || $path === '') {

            getFCBMWOList($pdo);
        } elseif (preg_match('/^\/([0-9]+)$/', $path, $matches)) {

            getFCBMWO($pdo, $matches[1]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '接口不存在', 'debug_path' => $path]);
        }
        break;
        
    case 'POST':
        if ($path === '/create' || $path === '') {

            createFCBMWO($pdo, $input);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '接口不存在']);
        }
        break;
        
    case 'PUT':
        if (preg_match('/^\/([0-9]+)$/', $path, $matches)) {

            updateFCBMWO($pdo, $matches[1], $input);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '接口不存在']);
        }
        break;
        
    case 'DELETE':
        if (preg_match('/^\/([0-9]+)$/', $path, $matches)) {

            deleteFCBMWO($pdo, $matches[1]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '接口不存在']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => '不支持的请求方法']);
        break;
}

function getFCBMWOList($pdo) {
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
        
        $sql = "SELECT * FROM fcbmwo_date {$whereClause} ORDER BY work_date DESC, created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $workOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $workOrders,
            'query_info' => [
                'work_date' => $workDate,
                'user' => $user,
                'total_records' => count($workOrders)
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '获取工单列表失败: ' . $e->getMessage()]);
    }
}

function getFCBMWO($pdo, $id) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM fcbmwo_date WHERE id = ?");
        $stmt->execute([$id]);
        $workOrder = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$workOrder) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '工单不存在']);
            return;
        }
        
        echo json_encode([
            'success' => true,
            'data' => $workOrder
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '获取工单详情失败: ' . $e->getMessage()]);
    }
}

function createFCBMWO($pdo, $data) {
    try {

        if (empty($data['user'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '用户字段不能为空']);
            return;
        }
        
        // 获取工作日期，默认为今天
        $workDate = $data['work_date'] ?? date('Y-m-d');
        
        // 检查是否已存在该用户当天的记录
        $checkSql = "SELECT id FROM fcbmwo_date WHERE user = ? AND work_date = ?";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([$data['user'], $workDate]);
        
        if ($checkStmt->fetch()) {
            // 如果存在，则更新记录
            $sql = "UPDATE fcbmwo_date SET 
                user_id = ?,
                Discovered_a_malfunction = ?,
                Discovered_a_malfunction2 = ?,
                Discovered_a_malfunction3 = ?,
                Test_results = ?,
                Test_results2 = ?,
                Test_results3 = ?,
                Locate_faulty_components = ?,
                Locate_faulty_components2 = ?,
                Locate_faulty_components3 = ?,
                Repair_results = ?,
                Repair_results2 = ?,
                Repair_results3 = ?,
                Optimization_effect = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user = ? AND work_date = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['user_id'] ?? 1,
                $data['Discovered_a_malfunction'] ?? '',
                $data['Discovered_a_malfunction2'] ?? '',
                $data['Discovered_a_malfunction3'] ?? '',
                $data['Test_results'] ?? '',
                $data['Test_results2'] ?? '',
                $data['Test_results3'] ?? '',
                $data['Locate_faulty_components'] ?? '',
                $data['Locate_faulty_components2'] ?? '',
                $data['Locate_faulty_components3'] ?? '',
                $data['Repair_results'] ?? '',
                $data['Repair_results2'] ?? '',
                $data['Repair_results3'] ?? '',
                $data['Optimization_effect'] ?? '',
                $data['user'],
                $workDate
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => '工单更新成功',
                'data' => ['work_date' => $workDate, 'action' => 'updated']
            ]);
        } else {
            // 如果不存在，则创建新记录
            $sql = "INSERT INTO fcbmwo_date (
                user_id,
                user,
                work_date,
                Discovered_a_malfunction,
                Discovered_a_malfunction2,
                Discovered_a_malfunction3,
                Test_results,
                Test_results2,
                Test_results3,
                Locate_faulty_components,
                Locate_faulty_components2,
                Locate_faulty_components3,
                Repair_results,
                Repair_results2,
                Repair_results3,
                Optimization_effect
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
        
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['user_id'] ?? 1,
                $data['user'],
                $workDate,
                $data['Discovered_a_malfunction'] ?? '',
                $data['Discovered_a_malfunction2'] ?? '',
                $data['Discovered_a_malfunction3'] ?? '',
                $data['Test_results'] ?? '',
                $data['Test_results2'] ?? '',
                $data['Test_results3'] ?? '',
                $data['Locate_faulty_components'] ?? '',
                $data['Locate_faulty_components2'] ?? '',
                $data['Locate_faulty_components3'] ?? '',
                $data['Repair_results'] ?? '',
                $data['Repair_results2'] ?? '',
                $data['Repair_results3'] ?? '',
                $data['Optimization_effect'] ?? ''
            ]);
            
            $workOrderId = $pdo->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => '工单创建成功',
                'data' => ['id' => $workOrderId, 'work_date' => $workDate, 'action' => 'created']
            ]);
        }
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '创建工单失败: ' . $e->getMessage()]);
    }
}

function updateFCBMWO($pdo, $id, $data) {
    try {

        $stmt = $pdo->prepare("SELECT id FROM fcbmwo_date WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '工单不存在']);
            return;
        }
        
        $sql = "UPDATE fcbmwo_date SET 
            user = ?,
            Discovered_a_malfunction = ?,
            Discovered_a_malfunction2 = ?,
            Discovered_a_malfunction3 = ?,
            Test_results = ?,
            Test_results2 = ?,
            Test_results3 = ?,
            Locate_faulty_components = ?,
            Locate_faulty_components2 = ?,
            Locate_faulty_components3 = ?,
            Repair_results = ?,
            Repair_results2 = ?,
            Repair_results3 = ?,
            Optimization_effect = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['user'] ?? '',
            $data['Discovered_a_malfunction'] ?? '',
            $data['Discovered_a_malfunction2'] ?? '',
            $data['Discovered_a_malfunction3'] ?? '',
            $data['Test_results'] ?? '',
            $data['Test_results2'] ?? '',
            $data['Test_results3'] ?? '',
            $data['Locate_faulty_components'] ?? '',
            $data['Locate_faulty_components2'] ?? '',
            $data['Locate_faulty_components3'] ?? '',
            $data['Repair_results'] ?? '',
            $data['Repair_results2'] ?? '',
            $data['Repair_results3'] ?? '',
            $data['Optimization_effect'] ?? '',
            $id
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => '工单更新成功'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '更新工单失败: ' . $e->getMessage()]);
    }
}

function deleteFCBMWO($pdo, $id) {
    try {
        $stmt = $pdo->prepare("DELETE FROM fcbmwo_date WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => '工单删除成功'
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '工单不存在']);
        }
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '删除工单失败: ' . $e->getMessage()]);
    }
}
?>
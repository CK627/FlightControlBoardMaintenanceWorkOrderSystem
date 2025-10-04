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
$port = $dbConfig['port'] ?? 3306; // 添加端口支持
// 使用配置文件中的数据库名称
$database = $dbConfig['database'];

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
$input = json_decode(file_get_contents('php://input'), true);


switch ($method) {
    case 'GET':
        if ($path === '/list' || $path === '') {

            getWorkOrderList($pdo);
        } elseif (preg_match('/^\/([0-9]+)$/', $path, $matches)) {

            getWorkOrder($pdo, $matches[1]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '接口不存在']);
        }
        break;
        
    case 'POST':
        if ($path === '/create' || $path === '') {

            createWorkOrder($pdo, $input);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '接口不存在']);
        }
        break;
        
    case 'PUT':
        if (preg_match('/^\/([0-9]+)$/', $path, $matches)) {

            updateWorkOrder($pdo, $matches[1], $input);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '接口不存在']);
        }
        break;
        
    case 'DELETE':
        if (preg_match('/^\/([0-9]+)$/', $path, $matches)) {

            deleteWorkOrder($pdo, $matches[1]);
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

function getWorkOrderList($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                wo.id,
                wo.work_number,
                wo.created_by,
                wo.status,
                wo.created_at,
                wo.updated_at,
                COUNT(wod.id) as detail_count
            FROM WorkOrder wo
            LEFT JOIN WorkOrderDetail wod ON wo.id = wod.work_order_id
            GROUP BY wo.id
            ORDER BY wo.created_at DESC
        ");
        
        $workOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $workOrders,
            'count' => count($workOrders)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '获取工单列表失败: ' . $e->getMessage()]);
    }
}

function getWorkOrder($pdo, $id) {
    try {

        $stmt = $pdo->prepare("SELECT * FROM WorkOrder WHERE id = ?");
        $stmt->execute([$id]);
        $workOrder = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$workOrder) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '工单不存在']);
            return;
        }
        

        $stmt = $pdo->prepare("SELECT * FROM WorkOrderDetail WHERE work_order_id = ? ORDER BY engineer, fault_type");
        $stmt->execute([$id]);
        $details = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $workOrder['details'] = $details;
        
        echo json_encode([
            'success' => true,
            'data' => $workOrder
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '获取工单详情失败: ' . $e->getMessage()]);
    }
}

function createWorkOrder($pdo, $input) {
    try {
        if (empty($input['work_number']) || empty($input['created_by'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '工号和创建人不能为空']);
            return;
        }
        
        $pdo->beginTransaction();
        

        $stmt = $pdo->prepare("
            INSERT INTO WorkOrder (work_number, created_by, status) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([
            $input['work_number'],
            $input['created_by'],
            $input['status'] ?? 'draft'
        ]);
        
        $workOrderId = $pdo->lastInsertId();
        

        if (!empty($input['details']) && is_array($input['details'])) {
            $detailStmt = $pdo->prepare("
                INSERT INTO WorkOrderDetail (
                    work_order_id, engineer, fault_type, 
                    fault_description, test_result, locate_component, 
                    repair_result, tuning_effect, seven_s_evaluation
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($input['details'] as $detail) {
                $detailStmt->execute([
                    $workOrderId,
                    $detail['engineer'],
                    $detail['fault_type'],
                    $detail['fault_description'] ?? null,
                    $detail['test_result'] ?? null,
                    $detail['locate_component'] ?? null,
                    $detail['repair_result'] ?? null,
                    $detail['tuning_effect'] ?? null,
                    isset($detail['seven_s_evaluation']) ? json_encode($detail['seven_s_evaluation']) : null
                ]);
            }
        }
        

        $logStmt = $pdo->prepare("
            INSERT INTO WorkOrderLog (work_order_id, operator, operation_type, operation_detail) 
            VALUES (?, ?, 'create', ?)
        ");
        $logStmt->execute([
            $workOrderId,
            $input['created_by'],
            '创建工单: ' . $input['work_number']
        ]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => '工单创建成功',
            'data' => ['id' => $workOrderId]
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '创建工单失败: ' . $e->getMessage()]);
    }
}

function updateWorkOrder($pdo, $id, $input) {
    try {
        $pdo->beginTransaction();
        

        $stmt = $pdo->prepare("SELECT * FROM WorkOrder WHERE id = ?");
        $stmt->execute([$id]);
        $workOrder = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$workOrder) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '工单不存在']);
            return;
        }
        

        $updateFields = [];
        $updateValues = [];
        
        if (isset($input['work_number'])) {
            $updateFields[] = 'work_number = ?';
            $updateValues[] = $input['work_number'];
        }
        if (isset($input['status'])) {
            $updateFields[] = 'status = ?';
            $updateValues[] = $input['status'];
        }
        
        if (!empty($updateFields)) {
            $updateValues[] = $id;
            $stmt = $pdo->prepare("UPDATE WorkOrder SET " . implode(', ', $updateFields) . " WHERE id = ?");
            $stmt->execute($updateValues);
        }
        

        if (isset($input['details']) && is_array($input['details'])) {

            $stmt = $pdo->prepare("DELETE FROM WorkOrderDetail WHERE work_order_id = ?");
            $stmt->execute([$id]);
            

            $detailStmt = $pdo->prepare("
                INSERT INTO WorkOrderDetail (
                    work_order_id, engineer, fault_type, 
                    fault_description, test_result, locate_component, 
                    repair_result, tuning_effect, seven_s_evaluation
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($input['details'] as $detail) {
                $detailStmt->execute([
                    $id,
                    $detail['engineer'],
                    $detail['fault_type'],
                    $detail['fault_description'] ?? null,
                    $detail['test_result'] ?? null,
                    $detail['locate_component'] ?? null,
                    $detail['repair_result'] ?? null,
                    $detail['tuning_effect'] ?? null,
                    isset($detail['seven_s_evaluation']) ? json_encode($detail['seven_s_evaluation']) : null
                ]);
            }
        }
        

        $logStmt = $pdo->prepare("
            INSERT INTO WorkOrderLog (work_order_id, operator, operation_type, operation_detail) 
            VALUES (?, ?, 'update', ?)
        ");
        $logStmt->execute([
            $id,
            $input['operator'] ?? 'system',
            '更新工单: ' . ($input['work_number'] ?? $workOrder['work_number'])
        ]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => '工单更新成功'
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '更新工单失败: ' . $e->getMessage()]);
    }
}

function deleteWorkOrder($pdo, $id) {
    try {
        $pdo->beginTransaction();
        

        $stmt = $pdo->prepare("SELECT work_number FROM WorkOrder WHERE id = ?");
        $stmt->execute([$id]);
        $workOrder = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$workOrder) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '工单不存在']);
            return;
        }
        

        $logStmt = $pdo->prepare("
            INSERT INTO WorkOrderLog (work_order_id, operator, operation_type, operation_detail) 
            VALUES (?, ?, 'delete', ?)
        ");
        $logStmt->execute([
            $id,
            'system',
            '删除工单: ' . $workOrder['work_number']
        ]);
        

        $stmt = $pdo->prepare("DELETE FROM WorkOrder WHERE id = ?");
        $stmt->execute([$id]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => '工单删除成功'
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '删除工单失败: ' . $e->getMessage()]);
    }
}
?>
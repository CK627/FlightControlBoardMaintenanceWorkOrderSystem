<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';


$conn = getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            if (isset($pathParts[2]) && is_numeric($pathParts[2])) {
                get7SManagement($pathParts[2]);
            } else {
                get7SManagementList();
            }
            break;
        case 'POST':
            create7SManagement();
            break;
        case 'PUT':
            if (isset($pathParts[2]) && is_numeric($pathParts[2])) {
                update7SManagement($pathParts[2]);
            } else {
                throw new Exception('ID is required for update');
            }
            break;
        case 'DELETE':
            if (isset($pathParts[2]) && is_numeric($pathParts[2])) {
                delete7SManagement($pathParts[2]);
            } else {
                throw new Exception('ID is required for delete');
            }
            break;
        default:
            throw new Exception('Method not allowed');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function get7SManagementList() {
    global $conn;
    
    try {
        // 获取查询参数
        $evaluationDate = $_GET['evaluation_date'] ?? date('Y-m-d');
        $user = $_GET['user'] ?? null;
        
        // 构建查询条件
        $whereConditions = [];
        $params = [];
        $types = '';
        
        if ($evaluationDate) {
            $whereConditions[] = "evaluation_date = ?";
            $params[] = $evaluationDate;
            $types .= 's';
        }
        
        if ($user) {
            $whereConditions[] = "user = ?";
            $params[] = $user;
            $types .= 's';
        }
        
        $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
        
        $sql = "SELECT * FROM 7S_Management_Evaluation {$whereClause} ORDER BY evaluation_date DESC, created_at DESC";
        
        if (!empty($params)) {
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query($sql);
        }
        
        $data = [];
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $row['arrange'] = (bool)$row['arrange'];
                $row['reorganize'] = (bool)$row['reorganize'];
                $row['clean'] = (bool)$row['clean'];
                $row['cleanliness'] = (bool)$row['cleanliness'];
                $row['quality'] = (bool)$row['quality'];
                $row['secure'] = (bool)$row['secure'];
                $row['save'] = (bool)$row['save'];
                $data[] = $row;
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => $data,
            'query_info' => [
                'evaluation_date' => $evaluationDate,
                'user' => $user,
                'total_records' => count($data)
            ]
        ]);
    } catch (Exception $e) {
        throw new Exception('Database error: ' . $e->getMessage());
    }
}

function get7SManagement($id) {
    global $conn;
    
    try {
        $stmt = $conn->prepare("SELECT * FROM 7S_Management_Evaluation WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        
        if ($data) {
        
            $data['arrange'] = (bool)$data['arrange'];
            $data['reorganize'] = (bool)$data['reorganize'];
            $data['clean'] = (bool)$data['clean'];
            $data['cleanliness'] = (bool)$data['cleanliness'];
            $data['quality'] = (bool)$data['quality'];
            $data['secure'] = (bool)$data['secure'];
            $data['save'] = (bool)$data['save'];
            
            echo json_encode([
                'success' => true,
                'data' => $data
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => '7S管理评估记录不存在'
            ]);
        }
    } catch (Exception $e) {
        throw new Exception('Database error: ' . $e->getMessage());
    }
}

function create7SManagement() {
    global $conn;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    try {
        $user = isset($input['user']) ? $input['user'] : '';
        $evaluationDate = isset($input['evaluation_date']) ? $input['evaluation_date'] : date('Y-m-d');
        
        // 检查该用户当天是否已有评估记录
        $checkStmt = $conn->prepare("SELECT id FROM 7S_Management_Evaluation WHERE user = ? AND evaluation_date = ?");
        $checkStmt->bind_param("ss", $user, $evaluationDate);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $existingRecord = $result->fetch_assoc();
        
        $arrange = isset($input['arrange']) ? (int)(bool)$input['arrange'] : 0;
        $reorganize = isset($input['reorganize']) ? (int)(bool)$input['reorganize'] : 0;
        $clean = isset($input['clean']) ? (int)(bool)$input['clean'] : 0;
        $cleanliness = isset($input['cleanliness']) ? (int)(bool)$input['cleanliness'] : 0;
        $quality = isset($input['quality']) ? (int)(bool)$input['quality'] : 0;
        $secure = isset($input['secure']) ? (int)(bool)$input['secure'] : 0;
        $save = isset($input['save']) ? (int)(bool)$input['save'] : 0;
        
        if ($existingRecord) {
            // 如果记录存在，更新记录
            $updateStmt = $conn->prepare("
                UPDATE 7S_Management_Evaluation SET 
                arrange = ?, reorganize = ?, clean = ?, cleanliness = ?, 
                quality = ?, secure = ?, save = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE user = ? AND evaluation_date = ?
            ");
            $updateStmt->bind_param("iiiiiiiss", $arrange, $reorganize, $clean, $cleanliness, $quality, $secure, $save, $user, $evaluationDate);
            $updateStmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => '7S管理评估更新成功',
                'action' => 'updated',
                'id' => $existingRecord['id'],
                'evaluation_date' => $evaluationDate
            ]);
            return;
        }
        
        // 创建新记录
        $stmt = $conn->prepare("
            INSERT INTO 7S_Management_Evaluation 
            (user_id, user, evaluation_date, arrange, reorganize, clean, cleanliness, quality, secure, save) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        // 默认使用user_id为1，如果需要可以从输入中获取
        $userId = isset($input['user_id']) ? (int)$input['user_id'] : 1;
        $stmt->bind_param("issiiiiiii", $userId, $user, $evaluationDate, $arrange, $reorganize, $clean, $cleanliness, $quality, $secure, $save);
        $stmt->execute();
        
        $id = $conn->insert_id;
        
        echo json_encode([
            'success' => true,
            'message' => '7S管理评估创建成功',
            'action' => 'created',
            'id' => $id,
            'evaluation_date' => $evaluationDate
        ]);
    } catch (Exception $e) {
        throw new Exception('Database error: ' . $e->getMessage());
    }
}

function update7SManagement($id) {
    global $conn;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    try {
        $currentUser = isset($input['current_user']) ? $input['current_user'] : '';
        

        $stmt = $conn->prepare("SELECT user FROM 7S_Management_Evaluation WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $record = $result->fetch_assoc();
        
        if (!$record) {
            echo json_encode([
                'success' => false,
                'message' => '7S管理评估记录不存在'
            ]);
            return;
        }
        

        if ($record['user'] !== $currentUser) {
            echo json_encode([
                'success' => false,
                'message' => '无权限修改其他用户的评估记录'
            ]);
            return;
        }
        
        $stmt = $conn->prepare("
            UPDATE 7S_Management_Evaluation SET 
            arrange = ?, reorganize = ?, clean = ?, cleanliness = ?, 
            quality = ?, secure = ?, save = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ");
        
        $arrange = isset($input['arrange']) ? (int)(bool)$input['arrange'] : 0;
        $reorganize = isset($input['reorganize']) ? (int)(bool)$input['reorganize'] : 0;
        $clean = isset($input['clean']) ? (int)(bool)$input['clean'] : 0;
        $cleanliness = isset($input['cleanliness']) ? (int)(bool)$input['cleanliness'] : 0;
        $quality = isset($input['quality']) ? (int)(bool)$input['quality'] : 0;
        $secure = isset($input['secure']) ? (int)(bool)$input['secure'] : 0;
        $save = isset($input['save']) ? (int)(bool)$input['save'] : 0;
        
        $stmt->bind_param("iiiiiiii", $arrange, $reorganize, $clean, $cleanliness, $quality, $secure, $save, $id);
        $stmt->execute();
        
        echo json_encode([
            'success' => true,
            'message' => '7S管理评估更新成功'
        ]);
    } catch (Exception $e) {
        throw new Exception('Database error: ' . $e->getMessage());
    }
}

function delete7SManagement($id) {
    global $conn;
    
    try {

        $stmt = $conn->prepare("SELECT id FROM 7S_Management_Evaluation WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if (!$result->fetch_assoc()) {
            echo json_encode([
                'success' => false,
                'message' => '7S管理评估记录不存在'
            ]);
            return;
        }
        
        $stmt = $conn->prepare("DELETE FROM 7S_Management_Evaluation WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        
        echo json_encode([
            'success' => true,
            'message' => '7S管理评估删除成功'
        ]);
    } catch (Exception $e) {
        throw new Exception('Database error: ' . $e->getMessage());
    }
}
?>
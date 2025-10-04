<?php


header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => '只允许POST请求'
    ]);
    exit();
}

require_once 'db.php';

try {

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('无效的JSON数据');
    }
    
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    

    if (empty($username) || empty($password)) {
        throw new Exception('用户名和密码不能为空');
    }
    

    $conn = getConnection();
    

    $stmt = $conn->prepare("
        SELECT id, username, password, real_name, permissions, status, last_login
        FROM User 
        WHERE username = ? AND status = 1
    ");
    
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if (!$user) {
        throw new Exception('用户名不存在或账户已被禁用');
    }
    

    if (md5($password) !== $user['password']) {
        throw new Exception('密码错误');
    }
    

    $updateStmt = $conn->prepare("
        UPDATE User 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = ?
    ");
    $updateStmt->bind_param('i', $user['id']);
    $updateStmt->execute();
    

    $permissions = (int)$user['permissions'];
    
    $role = 'engineer1';
    switch ($permissions) {
        case 1:
            // 权限1：根据账号名称中的1、2、3判断是几号工程师
            if (strpos($username, '1') !== false) {
                $role = 'engineer1';
            } elseif (strpos($username, '2') !== false) {
                $role = 'engineer2';
            } elseif (strpos($username, '3') !== false) {
                $role = 'engineer3';
            } else {
                $role = 'engineer1'; // 默认为1号工程师
            }
            break;
        case 2:
            // 权限2：数据恢复工程师
            $role = 'data_recovery_engineer';
            break;
        case 3:
            // 权限3：裁判
            $role = 'referee';
            break;
        case 4:
            // 权限4：管理员
            $role = 'admin';
            break;
        default:
            $role = 'engineer1';
            break;
    }

    $userInfo = [
        'id' => (int)$user['id'],
        'username' => $user['username'],
        'real_name' => $user['real_name'],
        'role' => $role,
        'permissions' => $permissions,
        'last_login' => $user['last_login']
    ];
    

    // 根据权限级别设置角色文本
    switch ($permissions) {
        case 1:
            $roleText = '工程师';
            break;
        case 2:
            $roleText = '数据恢复工程师';
            break;
        case 3:
            $roleText = '裁判';
            break;
        case 4:
            $roleText = '管理员';
            break;
        default:
            $roleText = '工程师';
            break;
    }
    error_log("用户登录成功: {$username} ({$roleText}) - " . date('Y-m-d H:i:s'));
    

    echo json_encode([
        'success' => true,
        'message' => '登录成功',
        'user' => $userInfo
    ]);
    
} catch (Exception $e) {

    error_log("登录失败: " . $e->getMessage() . " - " . date('Y-m-d H:i:s'));
    

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
    
} finally {

    if (isset($conn)) {
        closeConnection($conn);
    }
}
?>
/*
飞控板维修工单系统数据库
 MySQL 8.0 兼容版本 - 更新版本
 
 数据库名称: fcbmwos
 字符集: utf8mb4
 排序规则: utf8mb4_unicode_ci
 MySQL版本: 8.0+
 
 创建日期: 2025-01-16
 更新日期: 2025-01-17
 版本: 2.0 - 与实际生产数据库结构同步
*/

-- 设置字符集和外键检查
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `fcbmwos` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `fcbmwos`;

-- ----------------------------
-- 用户表 - 存储用户信息和权限配置
-- ----------------------------
DROP TABLE IF EXISTS `User`;
CREATE TABLE `User` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '用户ID，主键自增',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名，唯一标识',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户密码，加密存储',
  `real_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '真实姓名',
  `permissions` tinyint NOT NULL DEFAULT '1' COMMENT '用户权限等级：1=工程师，2=队长，3=管理员',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '用户状态：1-启用，0-禁用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `last_login` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_status` (`status`),
  KEY `idx_permissions` (`permissions`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表，存储用户信息和权限配置';

-- ----------------------------
-- 7S管理评价表
-- ----------------------------
DROP TABLE IF EXISTS `7S_Management_Evaluation`;
CREATE TABLE `7S_Management_Evaluation` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` int NOT NULL COMMENT '用户ID，关联user表',
  `user` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `arrange` tinyint(1) NOT NULL DEFAULT '0' COMMENT '整理：0-未完成，1-已完成',
  `reorganize` tinyint(1) NOT NULL DEFAULT '0' COMMENT '整顿：0-未完成，1-已完成',
  `clean` tinyint(1) NOT NULL DEFAULT '0' COMMENT '清扫：0-未完成，1-已完成',
  `cleanliness` tinyint(1) NOT NULL DEFAULT '0' COMMENT '清洁：0-未完成，1-已完成',
  `quality` tinyint(1) NOT NULL DEFAULT '0' COMMENT '素养：0-未完成，1-已完成',
  `secure` tinyint(1) NOT NULL DEFAULT '0' COMMENT '安全：0-未完成，1-已完成',
  `save` tinyint(1) NOT NULL DEFAULT '0' COMMENT '节约：0-未完成，1-已完成',
  `total_score` tinyint GENERATED ALWAYS AS (`arrange` + `reorganize` + `clean` + `cleanliness` + `quality` + `secure` + `save`) STORED COMMENT '总分（计算字段）',
  `evaluation_date` date NOT NULL DEFAULT (CURDATE()) COMMENT '评价日期',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_evaluation_date` (`evaluation_date`),
  KEY `idx_total_score` (`total_score`),
  CONSTRAINT `fk_7s_user_id` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='7S管理评价表';

-- ----------------------------
-- 飞控板维修工单数据表 - 使用实际数据库中的字段名
-- ----------------------------
DROP TABLE IF EXISTS `fcbmwo_date`;
CREATE TABLE `fcbmwo_date` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` int NOT NULL COMMENT '用户ID，关联user表',
  `user` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工单编号（自动生成）',
  `Discovered_a_malfunction` text COLLATE utf8mb4_unicode_ci COMMENT '发现故障描述',
  `Discovered_a_malfunction2` text COLLATE utf8mb4_unicode_ci COMMENT '发现故障描述2',
  `Discovered_a_malfunction3` text COLLATE utf8mb4_unicode_ci COMMENT '发现故障描述3',
  `Test_results` text COLLATE utf8mb4_unicode_ci COMMENT '检测结果',
  `Test_results2` text COLLATE utf8mb4_unicode_ci COMMENT '检测结果2',
  `Test_results3` text COLLATE utf8mb4_unicode_ci COMMENT '检测结果3',
  `Locate_faulty_components` text COLLATE utf8mb4_unicode_ci COMMENT '定位故障元件',
  `Locate_faulty_components2` text COLLATE utf8mb4_unicode_ci COMMENT '定位故障元件2',
  `Locate_faulty_components3` text COLLATE utf8mb4_unicode_ci COMMENT '定位故障元件3',
  `Repair_results` text COLLATE utf8mb4_unicode_ci COMMENT '维修结果',
  `Repair_results2` text COLLATE utf8mb4_unicode_ci COMMENT '维修结果2',
  `Repair_results3` text COLLATE utf8mb4_unicode_ci COMMENT '维修结果3',
  `Optimization_effect` text COLLATE utf8mb4_unicode_ci COMMENT '调优效果',
  `Optimization_effect2` text COLLATE utf8mb4_unicode_ci COMMENT '调优效果2',
  `Optimization_effect3` text COLLATE utf8mb4_unicode_ci COMMENT '调优效果3',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '工单状态：1-进行中，2-已完成，3-已取消',
  `priority` tinyint NOT NULL DEFAULT '2' COMMENT '优先级：1-高，2-中，3-低',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  `work_date` date NOT NULL DEFAULT (CURDATE()) COMMENT '工作日期',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_no` (`work_order_no`),
  KEY `idx_user` (`user`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_work_date` (`work_date`),
  UNIQUE KEY `uk_user_work_date` (`user`, `work_date`),
  CONSTRAINT `fk_fcbmwo_user_id` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='飞控板维修工单数据表';

-- ----------------------------
-- 数据恢复维修工单表 - 使用实际数据库中的字段名
-- ----------------------------
DROP TABLE IF EXISTS `drarwo`;
CREATE TABLE `drarwo` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` int NOT NULL COMMENT '用户ID，关联user表',
  `user` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '工程师用户名',
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工单编号（自动生成）',
  `Discovered_a_malfunction` text COLLATE utf8mb4_unicode_ci COMMENT '发现的故障描述',
  `Reason_for_malfunction` text COLLATE utf8mb4_unicode_ci COMMENT '故障原因分析',
  `Repair_method` text COLLATE utf8mb4_unicode_ci COMMENT '维修方法',
  `Repair_results` text COLLATE utf8mb4_unicode_ci COMMENT '维修结果',
  `Customer_satisfaction` text COLLATE utf8mb4_unicode_ci COMMENT '客户满意度',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '工单状态：1-进行中，2-已完成，3-已取消',
  `priority` tinyint NOT NULL DEFAULT '2' COMMENT '优先级：1-高，2-中，3-低',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  `work_date` date NOT NULL DEFAULT (CURDATE()) COMMENT '工作日期',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_work_order_no` (`work_order_no`),
  KEY `idx_user` (`user`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_work_date` (`work_date`),
  UNIQUE KEY `uk_user_work_date` (`user`, `work_date`),
  CONSTRAINT `fk_drarwo_user_id` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据恢复维修工单表';

-- ----------------------------
-- 系统日志表
-- ----------------------------
DROP TABLE IF EXISTS `system_log`;
CREATE TABLE `system_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` int DEFAULT NULL COMMENT '用户ID',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户名',
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型',
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模块名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '操作描述',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT '用户代理',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_username` (`username`),
  KEY `idx_action` (`action`),
  KEY `idx_module` (`module`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_log_user_id` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统操作日志表';

-- ----------------------------
-- 插入用户数据（保留原始配套数据）
-- ----------------------------
BEGIN;
INSERT INTO `User` (`id`, `username`, `password`, `real_name`, `permissions`, `status`, `created_at`, `updated_at`, `last_login`) VALUES 
(1, '1hgcs', 'e10adc3949ba59abbe56e057f20f883e', '工程师一', 1, 1, '2025-08-15 09:56:03', '2025-08-16 13:01:09', '2025-08-16 13:01:09'),
(2, '2hgcs', 'e10adc3949ba59abbe56e057f20f883e', '工程师二', 1, 1, '2025-08-15 09:56:03', '2025-08-16 08:30:56', '2025-08-16 08:30:56'),
(3, '3hgcs', 'e10adc3949ba59abbe56e057f20f883e', '工程师三', 1, 1, '2025-08-15 09:56:03', '2025-08-15 18:42:02', NULL),
(4, 'dz', 'e10adc3949ba59abbe56e057f20f883e', '队长', 2, 1, '2025-08-15 09:56:03', '2025-08-16 13:06:31', '2025-08-16 13:06:31'),
(5, 'pw', 'e10adc3949ba59abbe56e057f20f883e', '裁判员', 3, 1, '2025-08-15 09:56:03', '2025-08-16 12:56:19', '2025-08-16 12:56:19'),
(6, 'admin', 'e10adc3949ba59abbe56e057f20f883e', '系统管理员', 4, 1, '2025-01-16 00:00:00', '2025-01-16 00:00:00', NULL);
COMMIT;

-- ----------------------------
-- 插入7S管理评价数据（保留原始配套数据）
-- ----------------------------
BEGIN;
INSERT INTO `7S_Management_Evaluation` (`id`, `user_id`, `user`, `arrange`, `reorganize`, `clean`, `cleanliness`, `quality`, `secure`, `save`, `evaluation_date`, `created_at`, `updated_at`) VALUES 
(1, 1, 'engineer1', 0, 0, 0, 0, 0, 0, 0, '2025-08-15', '2025-08-15 17:47:37', '2025-08-16 13:24:15'),
(2, 2, 'engineer2', 0, 0, 0, 0, 0, 0, 0, '2025-08-15', '2025-08-15 17:48:07', '2025-08-15 17:57:10'),
(3, 3, 'engineer3', 0, 0, 0, 0, 0, 0, 0, '2025-08-15', '2025-08-15 17:50:15', '2025-08-15 17:50:15');
COMMIT;

-- ----------------------------
-- 插入飞控板维修工单数据（保留原始配套数据）
-- ----------------------------
BEGIN;
INSERT INTO `fcbmwo_date` (`id`, `user_id`, `user`, `work_order_no`, `Discovered_a_malfunction`, `Discovered_a_malfunction2`, `Test_results`, `Test_results2`, `Locate_faulty_components`, `Locate_faulty_components2`, `Locate_faulty_components3`, `Repair_results`, `Repair_results2`, `Repair_results3`, `Optimization_effect`, `created_at`, `updated_at`) VALUES 
(1, 1, 'engineer1', 'FCBMWO-20250815-0001', '', '', '', '', '', '', '', '', '', '', '', '2025-08-15 12:37:38', '2025-08-16 13:24:45'),
(2, 2, 'engineer2', 'FCBMWO-20250815-0002', '', '', '', '', '', '', '', '', '', '', '', '2025-08-15 12:37:38', '2025-08-16 13:24:45'),
(3, 3, 'engineer3', 'FCBMWO-20250815-0003', '', '', '', '', '', '', '', '', '', '', '', '2025-08-15 12:37:38', '2025-08-16 13:24:45');
COMMIT;

-- ----------------------------
-- 插入数据恢复维修工单数据（保留原始配套数据）
-- ----------------------------
BEGIN;
INSERT INTO `drarwo` (`id`, `user_id`, `user`, `work_order_no`, `Discovered_a_malfunction`, `Reason_for_malfunction`, `Repair_method`, `Repair_results`, `Customer_satisfaction`, `created_at`) VALUES 
(1, 1, 'engineer1', 'DRARWO-20250816-0001', '', '', '', '', '', '2025-08-16 11:38:56'),
(2, 2, 'engineer2', 'DRARWO-20250816-0002', '', '', '', '', '', '2025-08-16 11:38:56'),
(3, 3, 'engineer3', 'DRARWO-20250816-0003', '', '', '', '', '', '2025-08-16 11:38:56');
COMMIT;

-- ----------------------------
-- 创建视图：用户工单统计
-- ----------------------------
CREATE OR REPLACE VIEW `v_user_workorder_stats` AS
SELECT 
    u.id as user_id,
    u.username,
    u.real_name,
    COALESCE(fcb.total_fcb_orders, 0) as fcb_orders,
    COALESCE(dra.total_dra_orders, 0) as dra_orders,
    COALESCE(fcb.total_fcb_orders, 0) + COALESCE(dra.total_dra_orders, 0) as total_orders,
    COALESCE(fcb.completed_fcb_orders, 0) as completed_fcb_orders,
    COALESCE(dra.completed_dra_orders, 0) as completed_dra_orders,
    COALESCE(fcb.completed_fcb_orders, 0) + COALESCE(dra.completed_dra_orders, 0) as total_completed_orders
FROM `User` u
LEFT JOIN (
    SELECT user_id, 
           COUNT(*) as total_fcb_orders,
           SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed_fcb_orders
    FROM fcbmwo_date 
    GROUP BY user_id
) fcb ON u.id = fcb.user_id
LEFT JOIN (
    SELECT user_id, 
           COUNT(*) as total_dra_orders,
           SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed_dra_orders
    FROM drarwo 
    GROUP BY user_id
) dra ON u.id = dra.user_id
WHERE u.status = 1;

-- ----------------------------
-- 创建存储过程：获取用户7S评分
-- ----------------------------
DELIMITER //
CREATE PROCEDURE `GetUser7SScore`(
    IN p_user_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT 
        user,
        AVG(total_score) as avg_score,
        MAX(total_score) as max_score,
        MIN(total_score) as min_score,
        COUNT(*) as evaluation_count
    FROM 7S_Management_Evaluation 
    WHERE user_id = p_user_id 
      AND evaluation_date BETWEEN p_start_date AND p_end_date
    GROUP BY user;
END //
DELIMITER ;

-- ----------------------------
-- 创建触发器：自动生成飞控板维修工单编号（使用实际数据库中的逻辑）
-- ----------------------------
DELIMITER //
CREATE TRIGGER `tr_fcbmwo_work_order_no` 
BEFORE INSERT ON `fcbmwo_date`
FOR EACH ROW
BEGIN
    IF NEW.work_order_no IS NULL OR NEW.work_order_no = '' THEN 
        SET NEW.work_order_no = CONCAT('FCBMWO-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD((SELECT COALESCE(MAX(id), 0) + 1 FROM fcbmwo_date), 4, '0')); 
    END IF; 
END //
DELIMITER ;

-- ----------------------------
-- 创建触发器：自动生成数据恢复维修工单编号（使用实际数据库中的逻辑）
-- ----------------------------
DELIMITER //
CREATE TRIGGER `tr_drarwo_work_order_no` 
BEFORE INSERT ON `drarwo`
FOR EACH ROW
BEGIN
    IF NEW.work_order_no IS NULL OR NEW.work_order_no = '' THEN 
        SET NEW.work_order_no = CONCAT('DRARWO-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD((SELECT COALESCE(MAX(id), 0) + 1 FROM drarwo), 4, '0')); 
    END IF; 
END //
DELIMITER ;

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------
-- 数据库优化建议
-- ----------------------------
/*
1. 定期执行 ANALYZE TABLE 命令更新表统计信息
2. 定期执行 OPTIMIZE TABLE 命令优化表结构
3. 监控慢查询日志，优化性能较差的SQL
4. 定期备份数据库
5. 根据实际使用情况调整 innodb_buffer_pool_size
6. 启用查询缓存以提高读取性能
*/

-- 完成提示
SELECT '飞控板维修工单系统数据库创建完成！（更新版本 v2.0）' as message;
SELECT '默认管理员账号: admin, 密码: 123456' as admin_info;
SELECT '请及时修改默认密码并做好数据库安全配置！' as security_notice;
SELECT '此版本已与生产数据库结构同步，包含work_date字段和正确的字段命名' as update_info;
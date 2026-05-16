-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: stock_pilot
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `pos_transactions`
--

DROP TABLE IF EXISTS `pos_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_transactions` (
  `id` varchar(50) NOT NULL,
  `sale_id` varchar(50) NOT NULL,
  `shift_id` varchar(50) DEFAULT NULL,
  `user_id` varchar(255) NOT NULL,
  `terminal_id` varchar(50) DEFAULT NULL,
  `transaction_type` enum('sale','void','return','refund') DEFAULT 'sale',
  `subtotal` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) DEFAULT '0.00',
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `payment_reference` varchar(255) DEFAULT NULL,
  `customer_count` int DEFAULT '1',
  `transaction_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `void_reason` text,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payment_status` varchar(50) DEFAULT 'completed',
  `payment_details_id` varchar(50) DEFAULT NULL,
  `payment_validated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sale_id` (`sale_id`),
  KEY `idx_shift_id` (`shift_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_terminal_id` (`terminal_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_transaction_time` (`transaction_time`),
  KEY `idx_payment_status` (`payment_status`),
  CONSTRAINT `pos_transactions_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pos_transactions_ibfk_2` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `pos_transactions_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`uid`) ON DELETE CASCADE,
  CONSTRAINT `pos_transactions_ibfk_4` FOREIGN KEY (`terminal_id`) REFERENCES `pos_terminals` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_transactions`
--

LOCK TABLES `pos_transactions` WRITE;
/*!40000 ALTER TABLE `pos_transactions` DISABLE KEYS */;
INSERT INTO `pos_transactions` VALUES ('PT-1767939889694-az70q','SALE-1767939889694-1pwsu',NULL,'98ea7a07-028c-484c-985b-36d250a93997','terminal_default_01','sale',66590.00,7134.64,0.00,66590.00,'CASH',NULL,1,'2026-01-09 06:24:49',NULL,'Tendered: ₱70000.00, Change: ₱3410.00','2026-01-09 06:24:49','2026-01-19 06:28:21','completed',NULL,NULL),('PT-1767940385275-vc5wi','SALE-1767940385275-rc8q2',NULL,'98ea7a07-028c-484c-985b-36d250a93997','terminal_default_01','sale',83010.00,8893.93,0.00,83010.00,'CASH',NULL,1,'2026-01-09 06:33:05',NULL,'Tendered: ₱100000.00, Change: ₱16990.00','2026-01-09 06:33:05','2026-01-19 06:28:21','completed',NULL,NULL),('PT-1767941411185-iemty','SALE-1767941411185-dr5u2',NULL,'98ea7a07-028c-484c-985b-36d250a93997','terminal_default_01','sale',133980.00,14301.43,500.00,133480.00,'CASH',NULL,1,'2026-01-09 06:50:11',NULL,'Tendered: ₱133480.00, Change: ₱0.00','2026-01-09 06:50:11','2026-01-19 06:28:21','completed',NULL,NULL),('PT-1767943536110-tzh91','SALE-1767943536109-emeu3',NULL,'98ea7a07-028c-484c-985b-36d250a93997','terminal_default_01','sale',139980.00,14997.86,0.00,139980.00,'CREDIT CARD',NULL,1,'2026-01-09 07:25:36',NULL,'Tendered: ₱139980.00, Change: ₱0.00','2026-01-09 07:25:36','2026-01-19 06:28:21','completed',NULL,NULL),('PT-1768282201788-yo9yj','SALE-1768282201788-lz3vq',NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',129130.00,13835.36,0.00,129130.00,'CASH',NULL,1,'2026-01-13 05:30:01',NULL,'Tendered: ₱129130.00, Change: ₱0.00','2026-01-13 05:30:01','2026-01-19 06:28:21','completed',NULL,NULL),('PT-1768287046833-xwqpb','SALE-1768287046833-gpub1',NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',66590.00,7134.64,0.00,66590.00,'CASH',NULL,1,'2026-01-13 06:50:46',NULL,'Tendered: ₱66590.00, Change: ₱0.00','2026-01-13 06:50:46','2026-01-19 06:28:21','completed',NULL,NULL),('PT-1768782963006-761tv','SALE-1768782963006-x50ux',NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',140.40,15.04,0.00,140.40,'CASH',NULL,1,'2026-01-19 00:36:03',NULL,'Tendered: ₱141.00, Change: ₱0.60','2026-01-19 00:36:03','2026-01-19 06:28:21','completed','PD-1768782963006-cu6ua','2026-01-19 00:36:03'),('PT-1768788277906-8kf8v','SALE-1768788277906-97d0o','SHIFT-1768788264901-9kizp','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',59990.00,6427.50,0.00,59990.00,'CASH',NULL,1,'2026-01-19 02:04:37',NULL,'Tendered: ₱59990.00, Change: ₱0.00','2026-01-19 02:04:37','2026-01-19 06:28:21','completed','PD-1768788277906-nmiv7','2026-01-19 02:04:37'),('PT-1768788522905-2mib9','SALE-1768788522905-axg75','SHIFT-1768788493595-zlucm','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',59995.00,6428.04,0.00,59995.00,'CASH',NULL,1,'2026-01-19 02:08:42',NULL,'Tendered: ₱59995.00, Change: ₱0.00','2026-01-19 02:08:42','2026-01-19 06:28:21','completed','PD-1768788522905-rnzt7','2026-01-19 02:08:42'),('PT-1768789954824-nktf0','SALE-1768789954824-6zt51','SHIFT-1768789939836-y4kkl','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',120.00,12.86,0.00,120.00,'CASH',NULL,1,'2026-01-19 02:32:34',NULL,'Tendered: ₱120.00, Change: ₱0.00','2026-01-19 02:32:34','2026-01-19 06:28:21','completed','PD-1768789954824-7kqre','2026-01-19 02:32:34'),('PT-1768790554450-26iao','SALE-1768790554450-9rhfl','SHIFT-1768790536402-x6ofx','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',146.25,15.67,0.00,146.25,'CASH',NULL,1,'2026-01-19 02:42:34',NULL,'Tendered: ₱147.00, Change: ₱0.75','2026-01-19 02:42:34','2026-01-19 06:28:21','completed','PD-1768790554450-1k9ea','2026-01-19 02:42:34'),('PT-1768798438713-zr6yg','SALE-1768798438713-0yya0','SHIFT-1768797920940-q97gi','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',12.50,1.34,0.00,12.50,'CASH',NULL,1,'2026-01-19 04:53:58',NULL,'Tendered: ₱13.00, Change: ₱0.50','2026-01-19 04:53:58','2026-01-19 06:28:21','completed','PD-1768798438713-q2jsr','2026-01-19 04:53:58'),('PT-1768800638995-pylpj','SALE-1768800638995-0gonw','SHIFT-1768800602407-91c2q','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',5.00,0.54,0.00,5.00,'CASH',NULL,1,'2026-01-19 05:30:39',NULL,'Tendered: ₱50.00, Change: ₱45.00','2026-01-19 05:30:39','2026-01-19 06:28:21','completed','PD-1768800638995-8kuwd','2026-01-19 05:30:39'),('PT-1768800711928-gdy8s','SALE-1768800711928-ky1db','SHIFT-1768800487905-yjtmn','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',70990.00,7606.07,0.00,70990.00,'CASH',NULL,1,'2026-01-19 05:31:51',NULL,'Tendered: ₱71000.00, Change: ₱10.00','2026-01-19 05:31:51','2026-01-19 06:28:21','completed','PD-1768800711928-j1a6d','2026-01-19 05:31:51'),('PT-1768803406542-cfzky','SALE-1768803406542-3m9ou','SHIFT-1768803197479-mcaj8','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','sale',130.00,13.93,0.00,130.00,'CASH',NULL,1,'2026-01-19 06:16:46',NULL,'Tendered: ₱130.00, Change: ₱0.00','2026-01-19 06:16:46','2026-01-19 06:28:21','completed','PD-1768803406542-ftex6','2026-01-19 06:16:46'),('PT-1768804504057-l0jzf','SALE-1768804504057-kxdn8','SHIFT-1768800487905-yjtmn','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_1768800459814','sale',6590.00,706.07,0.00,6590.00,'CASH',NULL,1,'2026-01-19 06:35:04',NULL,'Tendered: ₱7000.00, Change: ₱410.00','2026-01-19 06:35:04','2026-01-19 06:35:04','completed','PD-1768804504057-va2cd','2026-01-19 06:35:04'),('PT-1769042217725-r32f1','SALE-1769042217725-jal2t','SHIFT-1768964990255-416kl','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_1768800576128','sale',140.40,15.04,0.00,140.40,'CASH',NULL,1,'2026-01-22 00:36:57',NULL,'Tendered: ₱141.00, Change: ₱0.60','2026-01-22 00:36:57','2026-01-22 00:36:57','completed','PD-1769042217725-5alua','2026-01-22 00:36:57');
/*!40000 ALTER TABLE `pos_transactions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-22 18:11:03

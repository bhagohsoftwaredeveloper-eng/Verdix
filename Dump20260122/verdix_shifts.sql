-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: verdix
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
-- Table structure for table `shifts`
--

DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shifts` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `terminal_id` varchar(50) DEFAULT NULL,
  `start_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` timestamp NULL DEFAULT NULL,
  `starting_cash` decimal(10,2) DEFAULT '0.00',
  `expected_cash` decimal(10,2) DEFAULT '0.00',
  `actual_cash` decimal(10,2) DEFAULT '0.00',
  `cash_difference` decimal(10,2) DEFAULT '0.00',
  `cash_denominations` json DEFAULT NULL,
  `status` enum('active','completed','reconciled') DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_terminal_id` (`terminal_id`),
  KEY `idx_status` (`status`),
  KEY `idx_start_time` (`start_time`),
  CONSTRAINT `shifts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`uid`) ON DELETE CASCADE,
  CONSTRAINT `shifts_ibfk_2` FOREIGN KEY (`terminal_id`) REFERENCES `pos_terminals` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shifts`
--

LOCK TABLES `shifts` WRITE;
/*!40000 ALTER TABLE `shifts` DISABLE KEYS */;
INSERT INTO `shifts` VALUES ('SHIFT-1768788264901-9kizp','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','2026-01-19 02:04:24','2026-01-19 02:05:07',1800.00,0.00,61800.00,10.00,NULL,'completed','End shift variance: 10','2026-01-19 02:04:24','2026-01-19 02:05:07'),('SHIFT-1768788493595-zlucm','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','2026-01-19 02:08:13','2026-01-19 02:10:03',1800.00,0.00,61740.00,-55.00,NULL,'completed','End shift variance: -55','2026-01-19 02:08:13','2026-01-19 02:10:03'),('SHIFT-1768789939836-y4kkl','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','2026-01-19 02:32:19','2026-01-19 02:32:58',1700.00,0.00,1820.00,0.00,NULL,'completed','End shift variance: 0','2026-01-19 02:32:19','2026-01-19 02:32:58'),('SHIFT-1768790536402-x6ofx','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','2026-01-19 02:42:16','2026-01-19 02:43:09',1800.00,0.00,1950.00,3.75,'[{\"qty\": 1, \"total\": 50, \"amount\": 50}, {\"qty\": 2, \"total\": 400, \"amount\": 200}, {\"qty\": 1, \"total\": 500, \"amount\": 500}, {\"qty\": 1, \"total\": 1000, \"amount\": 1000}]','completed','End shift variance: 3.75','2026-01-19 02:42:16','2026-01-19 02:43:09'),('SHIFT-1768797920940-q97gi','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','2026-01-19 04:45:20','2026-01-19 04:54:09',0.00,0.00,20.00,7.50,'[{\"qty\": 1, \"total\": 20, \"amount\": 20}]','completed','End shift variance: 7.5','2026-01-19 04:45:20','2026-01-19 04:54:09'),('SHIFT-1768800403223-uemhz','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_default_01','2026-01-19 05:26:43',NULL,0.00,0.00,0.00,0.00,NULL,'active',NULL,'2026-01-19 05:26:43','2026-01-19 05:26:43'),('SHIFT-1768800487905-yjtmn','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_1768800459814','2026-01-19 05:28:07',NULL,0.00,0.00,0.00,0.00,NULL,'active',NULL,'2026-01-19 05:28:07','2026-01-19 05:28:07'),('SHIFT-1768800602407-91c2q','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_1768800576128','2026-01-19 05:30:02',NULL,0.00,0.00,0.00,0.00,NULL,'active',NULL,'2026-01-19 05:30:02','2026-01-19 05:30:02'),('SHIFT-1768802744193-vr18w','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_1768800576128','2026-01-19 06:05:44','2026-01-19 06:06:09',0.00,0.00,0.00,0.00,'[]','completed','End shift variance: 0','2026-01-19 06:05:44','2026-01-19 06:06:09'),('SHIFT-1768803197479-mcaj8','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_1768800576128','2026-01-19 06:13:17','2026-01-19 06:17:21',0.00,0.00,130.00,0.00,'[{\"qty\": 1, \"total\": 10, \"amount\": 10}, {\"qty\": 1, \"total\": 20, \"amount\": 20}, {\"qty\": 1, \"total\": 100, \"amount\": 100}]','completed','End shift variance: 0','2026-01-19 06:13:17','2026-01-19 06:17:21'),('SHIFT-1768807012293-x1rbk','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_1768800576128','2026-01-19 07:16:52',NULL,0.00,0.00,0.00,0.00,NULL,'active',NULL,'2026-01-19 07:16:52','2026-01-19 07:16:52'),('SHIFT-1768964157718-ht1r7','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_1768800576128','2026-01-21 02:55:57',NULL,0.00,0.00,0.00,0.00,NULL,'active',NULL,'2026-01-21 02:55:57','2026-01-21 02:55:57'),('SHIFT-1768964990255-416kl','ac83337e-c14b-4094-8361-1b2e32bfe975','terminal_1768800576128','2026-01-21 03:09:50',NULL,0.00,0.00,0.00,0.00,NULL,'active',NULL,'2026-01-21 03:09:50','2026-01-21 03:09:50');
/*!40000 ALTER TABLE `shifts` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-22 18:11:06

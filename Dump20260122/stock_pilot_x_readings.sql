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
-- Table structure for table `x_readings`
--

DROP TABLE IF EXISTS `x_readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `x_readings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reading_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_date` datetime NOT NULL,
  `shift_start` datetime DEFAULT NULL,
  `shift_end` datetime DEFAULT NULL,
  `terminal_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cashier_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cashier_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gross_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `returns` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discounts` decimal(15,2) NOT NULL DEFAULT '0.00',
  `net_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `vat_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `payment_methods` json DEFAULT NULL,
  `transaction_count` int NOT NULL DEFAULT '0',
  `starting_cash` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cash_sales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cash_in_drawer` decimal(15,2) NOT NULL DEFAULT '0.00',
  `shift_status` enum('active','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reading_number` (`reading_number`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_shift_start` (`shift_start`),
  KEY `idx_shift_end` (`shift_end`),
  KEY `idx_terminal_id` (`terminal_id`),
  KEY `idx_cashier_id` (`cashier_id`),
  KEY `idx_shift_status` (`shift_status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `x_readings`
--

LOCK TABLES `x_readings` WRITE;
/*!40000 ALTER TABLE `x_readings` DISABLE KEYS */;
INSERT INTO `x_readings` VALUES (1,'X-2026-01-13-001','2026-01-13 14:30:00','2026-01-13 09:00:00','2026-01-13 17:00:00','POS-001','John Doe','cashier_001',7200.75,-45.00,-30.00,7125.75,762.38,'[{\"name\": \"Cash\", \"amount\": 3800.0}, {\"name\": \"Credit Card\", \"amount\": 2100.25}, {\"name\": \"GCash\", \"amount\": 1225.5}]',28,5000.00,3800.00,8800.00,'completed','2026-01-13 10:51:58','2026-01-13 10:51:58'),(2,'X-2026-01-13-002','2026-01-13 10:15:00','2026-01-13 06:00:00',NULL,'POS-001','Jane Smith','cashier_002',1250.50,0.00,-15.00,1235.50,132.22,'[{\"name\": \"Cash\", \"amount\": 800.0}, {\"name\": \"Credit Card\", \"amount\": 435.5}]',8,2000.00,800.00,2800.00,'active','2026-01-13 10:51:58','2026-01-13 10:51:58');
/*!40000 ALTER TABLE `x_readings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-22 18:11:09

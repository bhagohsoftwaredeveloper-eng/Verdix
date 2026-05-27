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
-- Table structure for table `z_readings`
--

DROP TABLE IF EXISTS `z_readings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `z_readings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reading_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_date` datetime NOT NULL,
  `terminal_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cashier_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reading_number` (`reading_number`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_terminal_id` (`terminal_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `z_readings`
--

LOCK TABLES `z_readings` WRITE;
/*!40000 ALTER TABLE `z_readings` DISABLE KEYS */;
INSERT INTO `z_readings` VALUES (1,'Z-2026-01-13-001','2026-01-13 23:59:59','POS-001','John Doe',8540.50,-120.00,-55.25,8365.25,896.28,'[{\"name\": \"Cash\", \"amount\": 4500.0}, {\"name\": \"Credit Card\", \"amount\": 2540.5}, {\"name\": \"GCash\", \"amount\": 1324.75}]',42,5000.00,4500.00,9500.00,'2026-01-13 09:10:25','2026-01-13 09:10:25'),(2,'Z-2026-01-12-001','2026-01-12 23:59:59','POS-001','Jane Smith',7230.75,-80.00,-42.50,7108.25,761.16,'[{\"name\": \"Cash\", \"amount\": 3800.0}, {\"name\": \"Credit Card\", \"amount\": 2108.25}, {\"name\": \"GCash\", \"amount\": 1200.0}]',38,5000.00,3800.00,8800.00,'2026-01-13 09:10:25','2026-01-13 09:10:25'),(3,'Z-2026-01-11-001','2026-01-11 23:59:59','POS-002','Bob Johnson',9150.25,-200.00,-75.50,8874.75,950.80,'[{\"name\": \"Cash\", \"amount\": 5200.0}, {\"name\": \"Credit Card\", \"amount\": 2874.75}, {\"name\": \"GCash\", \"amount\": 800.0}]',48,5000.00,5200.00,10200.00,'2026-01-13 09:10:25','2026-01-13 09:10:25');
/*!40000 ALTER TABLE `z_readings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-22 18:11:10

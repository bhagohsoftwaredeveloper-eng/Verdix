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
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `loyalty_points` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `address` text,
  `billing_address` text,
  `discount` decimal(5,2) DEFAULT '0.00',
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `active` tinyint(1) DEFAULT '1',
  `sales_person` varchar(100) DEFAULT NULL,
  `sales_area` varchar(100) DEFAULT NULL,
  `sales_group` varchar(100) DEFAULT NULL,
  `price_level_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_contact_number` (`contact_number`),
  KEY `fk_customer_price_level` (`price_level_id`),
  CONSTRAINT `fk_customer_price_level` FOREIGN KEY (`price_level_id`) REFERENCES `price_levels` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES ('1','Juan Dela Cruz','09171234567','Net 30',0,'2025-12-17 09:25:23','2026-01-13 08:15:39','dsgdfgdfgdfgfdg','asfasfasf',0.00,0.00,1,NULL,NULL,NULL,NULL),('2','Maria Santos','09189876543','Cash',500,'2025-12-17 09:25:23','2026-01-13 08:23:04','asfgsdhgfyhf','fghfghfghfghfghgfjh',0.00,0.00,1,'Jane Smith','south','group1',NULL),('3','Pedro Reyes','09111222333','Net 15',0,'2025-12-17 09:25:23','2026-01-17 09:01:17','tagum','tagum',0.00,0.00,1,NULL,NULL,NULL,NULL),('CUST-QJX6HM7N8','jhazon','09381583922','Net 30',500,'2026-01-13 08:00:20','2026-01-13 08:27:47','compostela','compostelaasfasfasf',0.00,0.00,1,'Jane Smith','north','group1',NULL),('CUST-XX1HSFNVT','carlo','09381583922','Due on receipt',0,'2026-01-22 01:36:02','2026-01-22 01:36:33','tagum','tagum',0.00,0.00,1,NULL,NULL,NULL,NULL),('d0bfdd24-45cc-40e2-9e7e-873557ab6aee','jim','09381583922','Due on receipt',0,'2026-01-22 00:46:00','2026-01-22 01:19:42','tagum','tagum',0.00,0.00,1,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
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

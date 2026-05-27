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
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` varchar(50) NOT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `order_date` date NOT NULL,
  `delivery_date` date DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `delivery_address` text,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping` decimal(10,2) DEFAULT '0.00',
  `warehouse_id` varchar(50) DEFAULT NULL,
  `sales_person_id` varchar(50) DEFAULT NULL,
  `note` text,
  `payment_method` varchar(100) DEFAULT NULL,
  `status` enum('Pending','Paid','Shipped','Delivered','Failed','Returned') DEFAULT 'Pending',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_delivery_date` (`delivery_date`),
  KEY `idx_status` (`status`),
  KEY `idx_reference` (`reference`),
  KEY `idx_warehouse_id` (`warehouse_id`),
  KEY `idx_sales_person_id` (`sales_person_id`),
  CONSTRAINT `fk_sales_orders_sales_person_id` FOREIGN KEY (`sales_person_id`) REFERENCES `sales_persons` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_orders`
--

LOCK TABLES `sales_orders` WRITE;
/*!40000 ALTER TABLE `sales_orders` DISABLE KEYS */;
INSERT INTO `sales_orders` VALUES ('SO-1767009514355','2','2025-12-29',NULL,'SO-427422',NULL,50.00,0.00,'wh_1766805099379','sp_2',NULL,'Cash','Pending',NULL,'2025-12-29 11:58:34','2025-12-29 11:58:34'),('SO-1767919569960','1','2026-01-09',NULL,'SO-804412',NULL,1210.00,0.00,NULL,NULL,NULL,'Cash','Pending',NULL,'2026-01-09 00:46:09','2026-01-09 00:46:09'),('SO-1768541239031','CUST-QJX6HM7N8','2026-01-16',NULL,'SO-057943',NULL,5.00,0.00,'wh_main','sp_2',NULL,'Checks','Pending',NULL,'2026-01-16 05:27:19','2026-01-16 05:27:19');
/*!40000 ALTER TABLE `sales_orders` ENABLE KEYS */;
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

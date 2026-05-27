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
-- Table structure for table `stock_adjustments`
--

DROP TABLE IF EXISTS `stock_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_adjustments` (
  `id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `quantity` int NOT NULL,
  `reason` varchar(255) NOT NULL,
  `new_stock` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `stock_adjustments_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_adjustments`
--

LOCK TABLES `stock_adjustments` WRITE;
/*!40000 ALTER TABLE `stock_adjustments` DISABLE KEYS */;
INSERT INTO `stock_adjustments` VALUES ('adj_1766803478508_96lly0aq4','NES-NES-S236BH-1766803358930',10,'Physical Count',10,'2025-12-27 02:44:38','2025-12-27 02:44:38'),('adj_1766803478522_tyb16u1ja','NES-PRO-Y0FN8S-1766803419794',10,'Physical Count (Auto-adjusted from parent: 10 × 1 = 10)',10,'2025-12-27 02:44:38','2025-12-27 02:44:38'),('adj_1766804192165_9m7tj7o51','NES-BEA-M61BP4-1766803639345',1,'ress',11,'2025-12-27 02:56:32','2025-12-27 02:56:32'),('adj_1766804192175_55lkxywqv','NES-PRO-BK7MH5-1766803689483',12,'ress (Auto-adjusted from parent: 11 × 12 = 132)',132,'2025-12-27 02:56:32','2025-12-27 02:56:32'),('adj_1766805907291_d0x1b9rgd','NES-PRO-VRPNWQ-1766805826607',1,'afafa',241,'2025-12-27 03:25:07','2025-12-27 03:25:07'),('adj_1766805920716_6m0ncnh3y','NES-BEA-WROB81-1766805711639',1,'phys',11,'2025-12-27 03:25:20','2025-12-27 03:25:20'),('adj_1766805920728_730c07k06','NES-PRO-VRPNWQ-1766805826607',23,'phys (Auto-adjusted from parent: 11 × 24 = 264)',264,'2025-12-27 03:25:20','2025-12-27 03:25:20'),('adj_1766806508133_c8fuire1b','UNI-MIL-BIY3DC-1766806483584',10,'physica',10,'2025-12-27 03:35:08','2025-12-27 03:35:08');
/*!40000 ALTER TABLE `stock_adjustments` ENABLE KEYS */;
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

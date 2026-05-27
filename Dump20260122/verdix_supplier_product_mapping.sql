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
-- Table structure for table `supplier_product_mapping`
--

DROP TABLE IF EXISTS `supplier_product_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_product_mapping` (
  `id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `supplier_id` varchar(50) NOT NULL,
  `supplier_sku` varchar(100) DEFAULT NULL,
  `supplier_lead_time` int DEFAULT '0' COMMENT 'Lead time in days',
  `supplier_specific_rop` int DEFAULT '0' COMMENT 'Reorder Point specific to this supplier',
  `supplier_cost` decimal(10,2) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_supplier` (`product_id`,`supplier_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `supplier_product_mapping_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_product_mapping_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_product_mapping`
--

LOCK TABLES `supplier_product_mapping` WRITE;
/*!40000 ALTER TABLE `supplier_product_mapping` DISABLE KEYS */;
INSERT INTO `supplier_product_mapping` VALUES ('spm_1768559303698_r5422','LUC-ODO-IRNTIH-1768384264712','supplier_1766805129431',NULL,7,50,NULL,0,'2026-01-16 10:28:23','2026-01-16 10:28:23'),('spm_1768560594702_glzs5','LUC-ODO-IRNTIH-1768384264712','supplier_1764215002475',NULL,3,25,NULL,0,'2026-01-16 10:49:54','2026-01-16 10:49:54'),('spm_1768560925038_0swf3','prod_iphone15pro','supplier_1764215002475',NULL,7,50,100.00,0,'2026-01-16 10:55:25','2026-01-16 10:55:25'),('spm_1768612109552_z58w5','LOG-TES-LH9SUU-1768611704035','supplier_1766805129431',NULL,5,10,50.00,0,'2026-01-17 01:08:29','2026-01-17 01:08:29'),('spm_1768619009946_q662p','LUC-PRO-X3CHYW-1768384349234','supplier_1766805129431',NULL,8,50,100.00,0,'2026-01-17 03:03:29','2026-01-17 03:03:29');
/*!40000 ALTER TABLE `supplier_product_mapping` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-22 18:11:07

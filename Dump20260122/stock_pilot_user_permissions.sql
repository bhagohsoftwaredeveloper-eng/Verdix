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
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permissions` (
  `id` varchar(50) NOT NULL,
  `user_uid` varchar(255) NOT NULL,
  `permission` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_permission` (`user_uid`,`permission`),
  KEY `idx_user_uid` (`user_uid`),
  KEY `idx_permission` (`permission`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permissions`
--

LOCK TABLES `user_permissions` WRITE;
/*!40000 ALTER TABLE `user_permissions` DISABLE KEYS */;
INSERT INTO `user_permissions` VALUES ('14673f60-cc32-462c-9a1e-5bbd1ed10375','eb25ca1e-ccf2-4c10-a744-d5ac1651ebb5','manage_purchases','2026-01-07 04:48:11','2026-01-07 04:48:11'),('263e2ced-43b1-47c8-9228-f3b483088642','eb25ca1e-ccf2-4c10-a744-d5ac1651ebb5','manage_inventory','2026-01-07 04:48:11','2026-01-07 04:48:11'),('2e49ca3e-3413-4d8c-b5ac-6326a0ff0729','c625d6f3-116e-49de-88d8-b963b47d14de','super_admin','2026-01-07 01:08:31','2026-01-07 01:08:31'),('2fce00ff-97e1-4361-bb73-654c6740f96d','98ea7a07-028c-484c-985b-36d250a93997','access_pos','2026-01-09 09:33:08','2026-01-09 09:33:08'),('62129ec5-c8f9-496f-a0df-aa90d49eac42','eb25ca1e-ccf2-4c10-a744-d5ac1651ebb5','access_pos','2026-01-07 04:48:11','2026-01-07 04:48:11'),('82c93ea4-c7b0-4a57-bd79-66e01842d09a','eb25ca1e-ccf2-4c10-a744-d5ac1651ebb5','view_sales','2026-01-07 04:48:11','2026-01-07 04:48:11'),('a88a7fa8-b53f-4bb1-9879-fadea5edaa85','eb25ca1e-ccf2-4c10-a744-d5ac1651ebb5','view_reports','2026-01-07 04:48:11','2026-01-07 04:48:11'),('bd848335-03f9-402f-9537-c9a7270a22b7','69829f84-469d-4117-9f83-af9707b909c3','super_admin','2026-01-07 04:42:03','2026-01-07 04:42:03'),('dcc2c299-2aa9-4ba1-969b-24749a67260c','eb25ca1e-ccf2-4c10-a744-d5ac1651ebb5','view_dashboard','2026-01-07 04:48:11','2026-01-07 04:48:11'),('ef0652e2-f10d-4a71-b923-8e279337ad87','ac83337e-c14b-4094-8361-1b2e32bfe975','super_admin','2026-01-09 09:48:16','2026-01-09 09:48:16'),('f3f4bfbe-0c6a-4d67-9be8-0fc5e910f50f','0f53fbf7-8afe-439b-b8b3-188ead67ced5','super_admin','2026-01-07 01:04:51','2026-01-07 01:04:51'),('fde4c3ea-450d-4cc8-918b-221559a929c1','eb25ca1e-ccf2-4c10-a744-d5ac1651ebb5','manage_products','2026-01-07 04:48:11','2026-01-07 04:48:11');
/*!40000 ALTER TABLE `user_permissions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-22 18:11:05

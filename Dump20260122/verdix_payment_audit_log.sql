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
-- Table structure for table `payment_audit_log`
--

DROP TABLE IF EXISTS `payment_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_audit_log` (
  `id` varchar(50) NOT NULL,
  `transaction_id` varchar(50) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `error_message` text,
  `details` text,
  `user_id` varchar(50) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_action` (`action`),
  KEY `idx_status` (`status`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_audit_log`
--

LOCK TABLES `payment_audit_log` WRITE;
/*!40000 ALTER TABLE `payment_audit_log` DISABLE KEYS */;
INSERT INTO `payment_audit_log` VALUES ('PAL-1768782963006-961k2','PT-1768782963006-761tv','CASH','initiated','pending',140.40,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 00:36:03'),('PAL-1768782963149-z9p0l','PT-1768782963006-761tv','CASH','processed','success',140.40,NULL,'{\"saleId\":\"SALE-1768782963006-x50ux\",\"invoiceId\":\"INV-1768782963083-z827q\",\"paymentDetailsId\":\"PD-1768782963006-cu6ua\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 00:36:03'),('PAL-1768788277906-5inu4','PT-1768788277906-8kf8v','CASH','initiated','pending',59990.00,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 02:04:37'),('PAL-1768788277971-iypw0','PT-1768788277906-8kf8v','CASH','processed','success',59990.00,NULL,'{\"saleId\":\"SALE-1768788277906-97d0o\",\"invoiceId\":\"INV-1768788277962-ygg6h\",\"paymentDetailsId\":\"PD-1768788277906-nmiv7\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 02:04:37'),('PAL-1768788522905-hpmir','PT-1768788522905-2mib9','CASH','initiated','pending',59995.00,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 02:08:42'),('PAL-1768788522957-3a3gw','PT-1768788522905-2mib9','CASH','processed','success',59995.00,NULL,'{\"saleId\":\"SALE-1768788522905-axg75\",\"invoiceId\":\"INV-1768788522951-8l91j\",\"paymentDetailsId\":\"PD-1768788522905-rnzt7\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 02:08:42'),('PAL-1768789954824-sjpeh','PT-1768789954824-nktf0','CASH','initiated','pending',120.00,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 02:32:34'),('PAL-1768789954880-mqcdt','PT-1768789954824-nktf0','CASH','processed','success',120.00,NULL,'{\"saleId\":\"SALE-1768789954824-6zt51\",\"invoiceId\":\"INV-1768789954875-h00ha\",\"paymentDetailsId\":\"PD-1768789954824-7kqre\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 02:32:34'),('PAL-1768790554450-000zn','PT-1768790554450-26iao','CASH','initiated','pending',146.25,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 02:42:34'),('PAL-1768790554513-lml5r','PT-1768790554450-26iao','CASH','processed','success',146.25,NULL,'{\"saleId\":\"SALE-1768790554450-9rhfl\",\"invoiceId\":\"INV-1768790554510-rj1nl\",\"paymentDetailsId\":\"PD-1768790554450-1k9ea\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 02:42:34'),('PAL-1768798438713-n7u7c','PT-1768798438713-zr6yg','CASH','initiated','pending',12.50,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 04:53:58'),('PAL-1768798438733-r4jjz','PT-1768798438713-zr6yg','CASH','processed','success',12.50,NULL,'{\"saleId\":\"SALE-1768798438713-0yya0\",\"invoiceId\":\"INV-1768798438730-vbwng\",\"paymentDetailsId\":\"PD-1768798438713-q2jsr\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 04:53:58'),('PAL-1768800638995-jwtc7','PT-1768800638995-pylpj','CASH','initiated','pending',5.00,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 05:30:38'),('PAL-1768800639016-s6my1','PT-1768800638995-pylpj','CASH','processed','success',5.00,NULL,'{\"saleId\":\"SALE-1768800638995-0gonw\",\"invoiceId\":\"INV-1768800639007-r15od\",\"paymentDetailsId\":\"PD-1768800638995-8kuwd\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 05:30:39'),('PAL-1768800711928-v7xp4','PT-1768800711928-gdy8s','CASH','initiated','pending',70990.00,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 05:31:51'),('PAL-1768800711933-4tuvk','PT-1768800711928-gdy8s','CASH','processed','success',70990.00,NULL,'{\"saleId\":\"SALE-1768800711928-ky1db\",\"invoiceId\":\"INV-1768800711931-u14ef\",\"paymentDetailsId\":\"PD-1768800711928-j1a6d\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 05:31:51'),('PAL-1768803406542-n2yz5','PT-1768803406542-cfzky','CASH','initiated','pending',130.00,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 06:16:46'),('PAL-1768803406591-30j3j','PT-1768803406542-cfzky','CASH','processed','success',130.00,NULL,'{\"saleId\":\"SALE-1768803406542-3m9ou\",\"invoiceId\":\"INV-1768803406580-t0ry7\",\"paymentDetailsId\":\"PD-1768803406542-ftex6\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 06:16:46'),('PAL-1768804504057-lh573','PT-1768804504057-l0jzf','CASH','initiated','pending',6590.00,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 06:35:04'),('PAL-1768804504102-qwuwx','PT-1768804504057-l0jzf','CASH','processed','success',6590.00,NULL,'{\"saleId\":\"SALE-1768804504057-kxdn8\",\"invoiceId\":\"INV-1768804504068-p3s0g\",\"paymentDetailsId\":\"PD-1768804504057-va2cd\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-19 06:35:04'),('PAL-1769042217725-aoj47','PT-1769042217725-r32f1','CASH','initiated','pending',140.40,NULL,NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-22 00:36:57'),('PAL-1769042217904-uiov3','PT-1769042217725-r32f1','CASH','processed','success',140.40,NULL,'{\"saleId\":\"SALE-1769042217725-jal2t\",\"invoiceId\":\"INV-1769042217795-41evf\",\"paymentDetailsId\":\"PD-1769042217725-5alua\"}','ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,NULL,'2026-01-22 00:36:57');
/*!40000 ALTER TABLE `payment_audit_log` ENABLE KEYS */;
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

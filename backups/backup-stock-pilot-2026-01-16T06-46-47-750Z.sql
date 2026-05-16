-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: stock_pilot
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `stock_pilot`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `stock_pilot` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `stock_pilot`;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` enum('income','expense') NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_account_name` (`name`),
  UNIQUE KEY `unique_account_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES ('account_1765251132577','SALES REVENUE','expense','4000','2025-12-09 03:32:12','2025-12-29 03:11:57'),('account_1765251163219','EXPENSES','income','3000','2025-12-09 03:32:43','2025-12-29 02:52:52'),('account_1766975376027','General Sales','income','5000','2025-12-29 02:29:36','2025-12-29 02:29:36'),('account_1766975401622','General Product Purchased','expense','6000','2025-12-29 02:30:01','2025-12-29 02:30:01'),('account_1766975829472','FREIGHT COLLECTED','expense','8989','2025-12-29 02:37:09','2025-12-29 02:38:10'),('account_1766975873773','FREIGHT PAID','income','7851','2025-12-29 02:37:53','2025-12-29 03:11:42');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES ('brand_1764043787156','LOGITECH','2025-11-25 04:09:47'),('brand_1766803063457','Nescafe','2025-12-27 02:37:43'),('brand_1766804553875','Nestlea','2025-12-27 03:02:33'),('brand_1766804730176','UNILIVER','2025-12-27 03:05:30'),('brand_1768384186189','LUCKYME','2026-01-14 09:49:46');
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('cat_001','Smartphones','2026-01-09 05:41:05'),('cat_003','Peripherals','2026-01-09 05:41:05'),('category_1764043805084','Electronics','2025-11-25 04:10:05'),('category_1766803155712','COFFEE POWDER','2025-12-27 02:39:15'),('category_1766804930709','MILK POWDER','2025-12-27 03:08:50'),('category_1767611527853','FABRIC CON','2026-01-05 11:12:07');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversion_factors`
--

DROP TABLE IF EXISTS `conversion_factors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversion_factors` (
  `id` varchar(100) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `unit` varchar(100) NOT NULL,
  `factor` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `conversion_factors_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversion_factors`
--

LOCK TABLES `conversion_factors` WRITE;
/*!40000 ALTER TABLE `conversion_factors` DISABLE KEYS */;
INSERT INTO `conversion_factors` VALUES ('LUC-ODO-IRNTIH-1768384264712-cf-Packs-1768384264723-ul82d5n9w','LUC-ODO-IRNTIH-1768384264712','Packs',1.00,'2026-01-14 09:51:04'),('LUC-ODO-IRNTIH-1768384264712-cf-Piece-1768384264729-grtphvpi8','LUC-ODO-IRNTIH-1768384264712','Piece',12.00,'2026-01-14 09:51:04'),('LUC-PRO-X3CHYW-1768384349234-cf-Packs-1768384349241-b4s8tbug4','LUC-PRO-X3CHYW-1768384349234','Packs',0.08,'2026-01-14 09:52:29'),('NES-BEA-M61BP4-1766803639345-cf-CASE-1768366362040-925khr118','NES-BEA-M61BP4-1766803639345','CASE',1.00,'2026-01-14 04:52:42'),('NES-BEA-M61BP4-1766803639345-cf-Piece-1768366362044-75s14x4fx','NES-BEA-M61BP4-1766803639345','Piece',12.00,'2026-01-14 04:52:42'),('NES-BEA-WROB81-1766805711639-cf-CASE-1766805711646-h15ywh2yb','NES-BEA-WROB81-1766805711639','CASE',1.00,'2025-12-27 03:21:51'),('NES-BEA-WROB81-1766805711639-cf-Piece-1766805711650-ffu6blst0','NES-BEA-WROB81-1766805711639','Piece',24.00,'2025-12-27 03:21:51'),('NES-NES-S236BH-1766803358930-cf-CASE-1766803358935-ngraojmxx','NES-NES-S236BH-1766803358930','CASE',12.00,'2025-12-27 02:42:38'),('NES-NES-S236BH-1766803358930-cf-Piece-1766803358939-vmdtpwlns','NES-NES-S236BH-1766803358930','Piece',1.00,'2025-12-27 02:42:38'),('NES-PRO-BK7MH5-1766803689483-cf-CASE-1766803689487-5huh3di89','NES-PRO-BK7MH5-1766803689483','CASE',0.08,'2025-12-27 02:48:09'),('NES-PRO-VRPNWQ-1766805826607-cf-CASE-1766805826612-cghx1hose','NES-PRO-VRPNWQ-1766805826607','CASE',0.04,'2025-12-27 03:23:46'),('NES-PRO-Y0FN8S-1766803419794-cf-Piece-1766803443996-f6jn9vs35','NES-PRO-Y0FN8S-1766803419794','Piece',0.08,'2025-12-27 02:44:03'),('UNI-DOW-K8J8JB-1767612582041-cf-Packs-1768377544707-ej9cko8bu','UNI-DOW-K8J8JB-1767612582041','Packs',1.00,'2026-01-14 07:59:04'),('UNI-DOW-K8J8JB-1767612582041-cf-Piece-1768377544710-29q8sfemb','UNI-DOW-K8J8JB-1767612582041','Piece',12.00,'2026-01-14 07:59:04'),('UNI-MIL-BIY3DC-1766806483584-cf-CASE-1766806483591-wna58q50g','UNI-MIL-BIY3DC-1766806483584','CASE',1.00,'2025-12-27 03:34:43'),('UNI-MIL-BIY3DC-1766806483584-cf-Piece-1766806483596-60qpar596','UNI-MIL-BIY3DC-1766806483584','Piece',12.00,'2025-12-27 03:34:43'),('UNI-PRO-647KV4-1767612624853-cf-Packs-1767612624885-30fvqm0hz','UNI-PRO-647KV4-1767612624853','Packs',0.08,'2026-01-05 11:30:24'),('UNI-PRO-I50IQU-1766806545173-cf-CASE-1766806545207-y9l2h7cqa','UNI-PRO-I50IQU-1766806545173','CASE',0.08,'2025-12-27 03:35:45');
/*!40000 ALTER TABLE `conversion_factors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_loyalty`
--

DROP TABLE IF EXISTS `customer_loyalty`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_loyalty` (
  `id` varchar(50) NOT NULL,
  `customer_id` varchar(50) NOT NULL,
  `rfid_code` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `point_setting` varchar(100) DEFAULT NULL,
  `current_points` int DEFAULT '0',
  `last_transaction` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfid_code` (`rfid_code`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_rfid_code` (`rfid_code`),
  KEY `idx_expiry_date` (`expiry_date`),
  CONSTRAINT `customer_loyalty_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_loyalty`
--

LOCK TABLES `customer_loyalty` WRITE;
/*!40000 ALTER TABLE `customer_loyalty` DISABLE KEYS */;
INSERT INTO `customer_loyalty` VALUES ('LOY-1768291236254','CUST-QJX6HM7N8','12345','2027-01-13','poiunts',0,NULL,'2026-01-13 08:00:36','2026-01-13 08:00:36');
/*!40000 ALTER TABLE `customer_loyalty` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_payments`
--

DROP TABLE IF EXISTS `customer_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_payments` (
  `id` varchar(255) NOT NULL,
  `customer_id` varchar(255) NOT NULL,
  `payment_type` varchar(100) NOT NULL,
  `payment_date` datetime NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference` varchar(100) NOT NULL,
  `note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference` (`reference`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_reference` (`reference`),
  CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_payments`
--

LOCK TABLES `customer_payments` WRITE;
/*!40000 ALTER TABLE `customer_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_payments` ENABLE KEYS */;
UNLOCK TABLES;

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
INSERT INTO `customers` VALUES ('1','Juan Dela Cruz','09171234567','Net 30',0,'2025-12-17 09:25:23','2026-01-13 08:15:39','dsgdfgdfgdfgfdg','asfasfasf',0.00,0.00,1,NULL,NULL,NULL,NULL),('2','Maria Santos','09189876543','Cash',500,'2025-12-17 09:25:23','2026-01-13 08:23:04','asfgsdhgfyhf','fghfghfghfghfghgfjh',0.00,0.00,1,'Jane Smith','south','group1',NULL),('3','Pedro Reyes','09111222333','Net 15',0,'2025-12-17 09:25:23','2025-12-17 09:25:23',NULL,NULL,0.00,0.00,1,NULL,NULL,NULL,NULL),('CUST-QJX6HM7N8','jhazon','09381583922','Net 30',500,'2026-01-13 08:00:20','2026-01-13 08:27:47','compostela','compostelaasfasfasf',0.00,0.00,1,'Jane Smith','north','group1',NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loyalty_points_settings`
--

DROP TABLE IF EXISTS `loyalty_points_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loyalty_points_settings` (
  `id` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `base` varchar(50) NOT NULL DEFAULT 'amount',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `equivalent` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_description` (`description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loyalty_points_settings`
--

LOCK TABLES `loyalty_points_settings` WRITE;
/*!40000 ALTER TABLE `loyalty_points_settings` DISABLE KEYS */;
INSERT INTO `loyalty_points_settings` VALUES ('1768290631572','poiunts','amount',500.00,1.00,'2026-01-13 07:50:31','2026-01-13 07:50:31');
/*!40000 ALTER TABLE `loyalty_points_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `timestamp` varchar(50) NOT NULL,
  `executed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'001_initial_schema','2025-01-24_09-22-00','2025-11-26 06:57:59'),(2,'014_alter_customers_table_add_fields','2025-12-10_16-17-00','2025-12-10 08:36:47'),(3,'002_drop_conversion_factor_from_units_of_measure','2025-11-26_13-22-00','2025-12-17 08:47:02'),(4,'003_create_conversion_factors_table','2025-11-26_13-40-00','2025-12-17 08:47:02'),(5,'004_alter_conversion_factors_id_length','2025-11-26_14-46-00','2025-12-17 08:47:02'),(6,'005_remove_is_serialized_from_products','2025-26-11_17-22-00','2025-12-17 08:47:20'),(7,'006_create_suppliers_table','2025-11-27_08-45-00','2025-12-17 08:47:41'),(8,'007_alter_suppliers_table_add_fields','2025-11-27_10-48-00','2025-12-17 08:48:03'),(9,'008_create_stock_adjustments_table','2025-12-04_16-20-00','2025-12-17 08:48:03'),(10,'009_add_account_foreign_keys_to_products','2025-12-09_11-30-00','2025-12-17 08:48:24'),(11,'010_create_stock_movements_table','2025-12-09_14-30-00','2025-12-17 08:48:24'),(12,'011_create_sales_transactions_tables','2025-12-09_17-54-00','2025-12-17 08:48:24'),(13,'012_create_pos_tables','2025-12-10_10-05-00','2025-12-17 08:48:24'),(14,'013_create_sales_orders_table','2025-12-10_11-00-00','2025-12-17 08:48:24'),(15,'015_alter_sales_orders_add_new_fields','2025-12-10_17-03-00','2025-12-17 08:48:44'),(16,'016_alter_customers_table_add_sales_fields','2025-12-12_10-15-00','2025-12-17 08:48:44'),(17,'017_create_loyalty_points_settings_table','2025-12-15_09-03-00','2025-12-17 08:48:44'),(18,'018_create_customer_loyalty_table','2025-12-15_09-22-00','2025-12-17 08:48:44'),(19,'019_create_point_history_table','2025-12-15_15-55-00','2025-12-17 08:48:44'),(20,'020_create_customer_payments_table','2025-12-16_11-50-00','2025-12-17 08:48:45'),(21,'021_create_sales_invoices_table','2025-12-17_16-02-43','2025-12-17 08:48:45'),(22,'022_create_warehouses_table','022','2025-12-18 01:16:51'),(23,'023_add_warehouse_foreign_key_to_products','023','2025-12-18 03:00:43'),(24,'024_alter_sales_invoices_add_sales_person','2025-12-20_08-45-00','2025-12-20 00:45:35'),(25,'025_add_sales_person_foreign_keys','2025-12-20_08-46-00','2025-12-20 00:45:35'),(26,'026_update_warehouse_foreign_key_constraint','026','2025-12-22 03:13:27'),(27,'027_create_purchase_orders_table','2025-12-22_13-55-00','2026-01-05 11:26:36'),(28,'028_drop_account_foreign_keys_from_products','2025-01-05_19-30-00','2026-01-05 11:26:37'),(29,'029_create_user_permissions_table','2025-12-29_12-00-00','2026-01-07 01:15:44'),(30,'030_create_users_table','2025-12-30_12-00-00','2026-01-07 01:16:39'),(31,'031_alter_users_table_remove_email','2025-12-31_12-00-00','2026-01-07 01:26:08'),(32,'032_add_password_to_users_table','2026-01-07_10-00-00','2026-01-13 07:49:43'),(33,'033_alter_loyalty_base_column','2026-01-13_15-55-00','2026-01-13 07:49:43'),(34,'034_create_payment_details_tables','2026-01-15_12-00-00','2026-01-15 05:55:16');
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

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
/*!40000 ALTER TABLE `payment_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_details`
--

DROP TABLE IF EXISTS `payment_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_details` (
  `id` varchar(50) NOT NULL,
  `transaction_id` varchar(50) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `card_type` varchar(50) DEFAULT NULL,
  `card_last_four` varchar(4) DEFAULT NULL,
  `auth_code` varchar(50) DEFAULT NULL,
  `gateway_reference` varchar(100) DEFAULT NULL,
  `wallet_provider` varchar(50) DEFAULT NULL,
  `wallet_reference` varchar(100) DEFAULT NULL,
  `gift_check_number` varchar(50) DEFAULT NULL,
  `gift_check_balance_before` decimal(10,2) DEFAULT NULL,
  `gift_check_balance_after` decimal(10,2) DEFAULT NULL,
  `points_used` decimal(10,2) DEFAULT NULL,
  `points_remaining` decimal(10,2) DEFAULT NULL,
  `points_conversion_rate` decimal(10,4) DEFAULT NULL,
  `amount_tendered` decimal(10,2) DEFAULT NULL,
  `change_given` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `payment_details_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `pos_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_details`
--

LOCK TABLES `payment_details` WRITE;
/*!40000 ALTER TABLE `payment_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES ('pm_1766018515273','Charge',1,'2025-12-18 00:41:55'),('pm_1766018592258','Checks',1,'2025-12-18 00:43:12'),('pm_bank_transfer','Bank Transfer',1,'2025-12-27 02:59:06'),('pm_cash','Cash',1,'2025-12-27 02:59:06'),('pm_check','Check',1,'2025-12-27 02:59:06'),('pm_credit_card','Credit Card',1,'2025-12-27 02:59:06');
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_term_types`
--

DROP TABLE IF EXISTS `payment_term_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_term_types` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_term_types`
--

LOCK TABLES `payment_term_types` WRITE;
/*!40000 ALTER TABLE `payment_term_types` DISABLE KEYS */;
INSERT INTO `payment_term_types` VALUES ('ptt_1768531090297_pgch4ivp8','Cash',1,'2026-01-16 02:38:10','2026-01-16 02:38:10'),('ptt_1768531191830','After No of days',1,'2026-01-16 02:39:51','2026-01-16 02:39:51'),('ptt_1768531558896','After no of Months',1,'2026-01-16 02:45:58','2026-01-16 02:45:58');
/*!40000 ALTER TABLE `payment_term_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_terms`
--

DROP TABLE IF EXISTS `payment_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_terms` (
  `id` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `number_of_days_month` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_description` (`description`),
  KEY `idx_type` (`type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_terms`
--

LOCK TABLES `payment_terms` WRITE;
/*!40000 ALTER TABLE `payment_terms` DISABLE KEYS */;
INSERT INTO `payment_terms` VALUES ('pt_1768531589231','30 days','After No of days','30',1,'2026-01-16 02:46:29','2026-01-16 02:46:29');
/*!40000 ALTER TABLE `payment_terms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `point_history`
--

DROP TABLE IF EXISTS `point_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `point_history` (
  `id` varchar(50) NOT NULL,
  `customer_loyalty_id` varchar(50) NOT NULL,
  `transaction_type` enum('add','remove','purchase','redemption','expiration','adjustment') NOT NULL,
  `points` int NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `transaction_reference` varchar(100) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_loyalty_id` (`customer_loyalty_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `point_history_ibfk_1` FOREIGN KEY (`customer_loyalty_id`) REFERENCES `customer_loyalty` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `point_history`
--

LOCK TABLES `point_history` WRITE;
/*!40000 ALTER TABLE `point_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `point_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pos_terminals`
--

DROP TABLE IF EXISTS `pos_terminals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_terminals` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_terminals`
--

LOCK TABLES `pos_terminals` WRITE;
/*!40000 ALTER TABLE `pos_terminals` DISABLE KEYS */;
/*!40000 ALTER TABLE `pos_terminals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pos_transaction_items`
--

DROP TABLE IF EXISTS `pos_transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pos_transaction_items` (
  `id` varchar(50) NOT NULL,
  `pos_transaction_id` varchar(50) NOT NULL,
  `sale_item_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `line_total` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pos_transaction_id` (`pos_transaction_id`),
  KEY `idx_sale_item_id` (`sale_item_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `pos_transaction_items_ibfk_1` FOREIGN KEY (`pos_transaction_id`) REFERENCES `pos_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pos_transaction_items_ibfk_2` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pos_transaction_items_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_transaction_items`
--

LOCK TABLES `pos_transaction_items` WRITE;
/*!40000 ALTER TABLE `pos_transaction_items` DISABLE KEYS */;
INSERT INTO `pos_transaction_items` VALUES ('PT-1767941411185-iemty-DETAIL-1','PT-1767941411185-iemty','SALE-1767941411185-dr5u2-ITEM-1','prod_macbookairm2','MacBook Air M2 13\"',1.00,59990.00,0.00,0.00,59990.00,'2026-01-09 06:50:11'),('PT-1767941411185-iemty-DETAIL-2','PT-1767941411185-iemty','SALE-1767941411185-dr5u2-ITEM-2','prod_s23ultra','Samsung Galaxy S23 Ultra',1.00,68990.00,0.00,0.00,68990.00,'2026-01-09 06:50:11'),('PT-1767943536110-tzh91-DETAIL-1','PT-1767943536110-tzh91','SALE-1767943536109-emeu3-ITEM-1','prod_iphone15pro','iPhone 15 Pro 256GB',1.00,70990.00,0.00,0.00,70990.00,'2026-01-09 07:25:36'),('PT-1767943536110-tzh91-DETAIL-2','PT-1767943536110-tzh91','SALE-1767943536109-emeu3-ITEM-2','prod_s23ultra','Samsung Galaxy S23 Ultra',1.00,68990.00,0.00,0.00,68990.00,'2026-01-09 07:25:36'),('PT-1768282201788-yo9yj-DETAIL-1','PT-1768282201788-yo9yj','SALE-1768282201788-lz3vq-ITEM-1','prod_macbookairm2','MacBook Air M2 13\"',1.00,59990.00,0.00,0.00,59990.00,'2026-01-13 05:30:02'),('PT-1768282201788-yo9yj-DETAIL-2','PT-1768282201788-yo9yj','SALE-1768282201788-lz3vq-ITEM-2','prod_s23ultra','Samsung Galaxy S23 Ultra',1.00,68990.00,0.00,0.00,68990.00,'2026-01-13 05:30:02'),('PT-1768282201788-yo9yj-DETAIL-3','PT-1768282201788-yo9yj','SALE-1768282201788-lz3vq-ITEM-3','UNI-DOW-K8J8JB-1767612582041','DOWNY BOX 12S',1.00,150.00,0.00,0.00,150.00,'2026-01-13 05:30:02'),('PT-1768287046833-xwqpb-DETAIL-1','PT-1768287046833-xwqpb','SALE-1768287046833-gpub1-ITEM-1','prod_macbookairm2','MacBook Air M2 13\"',1.00,59990.00,0.00,0.00,59990.00,'2026-01-13 06:50:46'),('PT-1768287046833-xwqpb-DETAIL-2','PT-1768287046833-xwqpb','SALE-1768287046833-gpub1-ITEM-2','NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G',1.00,10.00,0.00,0.00,10.00,'2026-01-13 06:50:46'),('PT-1768287046833-xwqpb-DETAIL-3','PT-1768287046833-xwqpb','SALE-1768287046833-gpub1-ITEM-3','prod_mxmaster3s','Logitech MX Master 3S',1.00,6590.00,0.00,0.00,6590.00,'2026-01-13 06:50:46');
/*!40000 ALTER TABLE `pos_transaction_items` ENABLE KEYS */;
UNLOCK TABLES;

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
INSERT INTO `pos_transactions` VALUES ('PT-1767939889694-az70q','SALE-1767939889694-1pwsu',NULL,'98ea7a07-028c-484c-985b-36d250a93997',NULL,'sale',66590.00,7134.64,0.00,66590.00,'CASH',NULL,1,'2026-01-09 06:24:49',NULL,'Tendered: ₱70000.00, Change: ₱3410.00','2026-01-09 06:24:49','2026-01-09 06:24:49','completed',NULL,NULL),('PT-1767940385275-vc5wi','SALE-1767940385275-rc8q2',NULL,'98ea7a07-028c-484c-985b-36d250a93997',NULL,'sale',83010.00,8893.93,0.00,83010.00,'CASH',NULL,1,'2026-01-09 06:33:05',NULL,'Tendered: ₱100000.00, Change: ₱16990.00','2026-01-09 06:33:05','2026-01-09 06:33:05','completed',NULL,NULL),('PT-1767941411185-iemty','SALE-1767941411185-dr5u2',NULL,'98ea7a07-028c-484c-985b-36d250a93997',NULL,'sale',133980.00,14301.43,500.00,133480.00,'CASH',NULL,1,'2026-01-09 06:50:11',NULL,'Tendered: ₱133480.00, Change: ₱0.00','2026-01-09 06:50:11','2026-01-09 06:50:11','completed',NULL,NULL),('PT-1767943536110-tzh91','SALE-1767943536109-emeu3',NULL,'98ea7a07-028c-484c-985b-36d250a93997',NULL,'sale',139980.00,14997.86,0.00,139980.00,'CREDIT CARD',NULL,1,'2026-01-09 07:25:36',NULL,'Tendered: ₱139980.00, Change: ₱0.00','2026-01-09 07:25:36','2026-01-09 07:25:36','completed',NULL,NULL),('PT-1768282201788-yo9yj','SALE-1768282201788-lz3vq',NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,'sale',129130.00,13835.36,0.00,129130.00,'CASH',NULL,1,'2026-01-13 05:30:01',NULL,'Tendered: ₱129130.00, Change: ₱0.00','2026-01-13 05:30:01','2026-01-13 05:30:01','completed',NULL,NULL),('PT-1768287046833-xwqpb','SALE-1768287046833-gpub1',NULL,'ac83337e-c14b-4094-8361-1b2e32bfe975',NULL,'sale',66590.00,7134.64,0.00,66590.00,'CASH',NULL,1,'2026-01-13 06:50:46',NULL,'Tendered: ₱66590.00, Change: ₱0.00','2026-01-13 06:50:46','2026-01-13 06:50:46','completed',NULL,NULL);
/*!40000 ALTER TABLE `pos_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_levels`
--

DROP TABLE IF EXISTS `price_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `price_levels` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_levels`
--

LOCK TABLES `price_levels` WRITE;
/*!40000 ALTER TABLE `price_levels` DISABLE KEYS */;
INSERT INTO `price_levels` VALUES ('level_1768351716956','Wholesale',NULL,0,'2026-01-14 00:48:36','2026-01-14 00:48:36'),('retail-level','Retail','Standard retail price',1,'2026-01-08 01:52:49','2026-01-08 01:52:49');
/*!40000 ALTER TABLE `price_levels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_price_levels`
--

DROP TABLE IF EXISTS `product_price_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_price_levels` (
  `product_id` varchar(50) NOT NULL,
  `price_level_id` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`,`price_level_id`),
  KEY `price_level_id` (`price_level_id`),
  CONSTRAINT `product_price_levels_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_price_levels_ibfk_2` FOREIGN KEY (`price_level_id`) REFERENCES `price_levels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_price_levels`
--

LOCK TABLES `product_price_levels` WRITE;
/*!40000 ALTER TABLE `product_price_levels` DISABLE KEYS */;
INSERT INTO `product_price_levels` VALUES ('LUC-ODO-IRNTIH-1768384264712','retail-level',60.00,'2026-01-14 09:51:04','2026-01-14 09:51:04'),('prod_s23ultra','retail-level',68990.00,'2026-01-14 09:54:43','2026-01-14 09:54:43');
/*!40000 ALTER TABLE `product_price_levels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `additional_description` text,
  `category` varchar(100) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `subcategory` varchar(100) DEFAULT NULL,
  `stock` int DEFAULT '0',
  `reorder_point` int DEFAULT '0',
  `avg_daily_sales` decimal(10,2) DEFAULT '0.00',
  `price` decimal(10,2) NOT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `image_hint` varchar(255) DEFAULT NULL,
  `unit_of_measure` varchar(50) DEFAULT NULL,
  `parent_id` varchar(50) DEFAULT NULL,
  `conversion_factor` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `supplier_id` varchar(50) DEFAULT NULL,
  `income_account` varchar(50) DEFAULT NULL,
  `expense_account` varchar(50) DEFAULT NULL,
  `warehouse_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `parent_id` (`parent_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `fk_products_income_account` (`income_account`),
  KEY `fk_products_expense_account` (`expense_account`),
  KEY `fk_products_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_products_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `products` (`id`),
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES ('LUC-ODO-IRNTIH-1768384264712','ODONG','ODONG',NULL,'COFFEE POWDER','LUCKYME','gaming mice',10,10,0.00,60.00,50.00,'LUC-ODO-IRNTIH','342403809686','https://picsum.photos/seed/LUC-ODO-IRNTIH/400/300','odong','CASE',NULL,1.00,'2026-01-14 09:51:04','2026-01-14 09:51:04','supplier_1764215002475',NULL,NULL,'wh_1766805099379'),('LUC-PRO-X3CHYW-1768384349234','ODONG','ODONG',NULL,'COFFEE POWDER','LUCKYME','gaming mice',119,0,0.00,5.00,4.17,'LUC-PRO-X3CHYW','464962692326',NULL,'odong','Piece','LUC-ODO-IRNTIH-1768384264712',1.00,'2026-01-14 09:52:29','2026-01-16 05:27:19',NULL,NULL,NULL,NULL),('NES-BEA-M61BP4-1766803639345','BEAR BRAND SWACK PACK BOX','BEAR BRAND SWACK PACK BOX',NULL,'COFFEE POWDER','Nescafe','gaming mice',10,10,0.00,240.00,200.00,'NES-BEA-M61BP4','947442439888','https://picsum.photos/seed/NES-BEA-M61BP4/400/300','bear-brand-swack-pack-box','CASE',NULL,1.00,'2025-12-27 02:47:19','2026-01-14 01:54:58','supplier_1764215002475','cmkca1ksg0005iwbkg1134iqd','cmkc9b78b0001iwbk8rcbtej2',NULL),('NES-BEA-WROB81-1766805711639','Bear Brand 300g ','Bear Brand Fortified With Zinc Powdered Milk 300g',NULL,'MILK POWDER','Nestlea',NULL,11,10,0.00,140.40,117.00,'NES-BEA-WROB81','559562610692','https://picsum.photos/seed/NES-BEA-WROB81/400/300','bear-brand-300g-','CASE',NULL,1.00,'2025-12-27 03:21:51','2025-12-27 03:25:20','supplier_1766805129431','account_1765251132577','account_1765251163219',NULL),('NES-NES-S236BH-1766803358930','NESCAFE BOX 35PACK','NESCAFE BOX 35PACK',NULL,'COFFEE POWDER','Nescafe',NULL,7,10,0.00,120.00,100.00,'NES-NES-S236BH','447811249047','https://picsum.photos/seed/NES-NES-S236BH/400/300','nescafe-box-35pack','CASE',NULL,1.00,'2025-12-27 02:42:38','2026-01-09 00:46:10','supplier_1764215002475','account_1765251132577','account_1765251163219',NULL),('NES-PRO-BK7MH5-1766803689483','BEAR BRAND SWAK PACK 35G','BEAR BRAND SWAK PACK 35G',NULL,'COFFEE POWDER','Nescafe','gaming mice',131,0,0.00,20.00,16.67,'NES-PRO-BK7MH5','382698828373',NULL,'bear-brand-swak-pack-35g','Piece','NES-BEA-M61BP4-1766803639345',1.00,'2025-12-27 02:48:09','2026-01-09 06:33:05',NULL,NULL,NULL,NULL),('NES-PRO-VRPNWQ-1766805826607','Bear Brand  300g','Bear Brand Fortified With Zinc Powdered Milk 300g',NULL,'MILK POWDER','Nestlea',NULL,264,0,0.00,5.85,4.88,'NES-PRO-VRPNWQ','559253706091',NULL,'bear-brand-300g','Piece','NES-BEA-WROB81-1766805711639',1.00,'2025-12-27 03:23:46','2025-12-27 03:25:20',NULL,NULL,NULL,NULL),('NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G','NESCAFE STICK 35G',NULL,'COFFEE POWDER','Nescafe','gaming mice',5,0,0.00,10.00,8.33,'NES-PRO-Y0FN8S','857292073332',NULL,'nescafe-stick-35g','Piece','NES-NES-S236BH-1766803358930',1.00,'2025-12-27 02:43:39','2026-01-13 06:50:46',NULL,NULL,NULL,NULL),('prod_iphone15pro','iPhone 15 Pro 256GB','Apple iPhone 15 Pro with 256GB Storage, Titanium Black',NULL,'Smartphones','LOGITECH','gaming mice',13,5,0.00,70990.00,58000.00,'AAPL-PH15P-256','194253701234',NULL,NULL,'Piece',NULL,1.00,'2026-01-09 05:41:05','2026-01-14 07:53:16','supplier_1766805129431','account_1765251132577','account_1765251132577','wh_1766805099379'),('prod_macbookairm2','MacBook Air M2 13\"','Apple MacBook Air with M2 Chip, 8GB RAM, 256GB SSD, Space Gray',NULL,'COFFEE POWDER','LOGITECH',NULL,4,2,0.00,59990.00,49000.00,'AAPL-MBA-M2-256','194253012345',NULL,NULL,'Piece',NULL,1.00,'2026-01-09 05:41:05','2026-01-14 10:09:41',NULL,'account_1765251132577','account_1765251132577','wh_1766805099379'),('prod_mxmaster3s','Logitech MX Master 3S','Logitech MX Master 3S Wireless Performance Mouse',NULL,'Peripherals','Logitech',NULL,23,10,0.00,6590.00,4200.00,'LOGI-MXM3S','097855171234',NULL,NULL,'Piece',NULL,NULL,'2026-01-09 05:41:05','2026-01-13 06:50:46',NULL,'account_1765251132577','account_1765251132577','wh_1766805099379'),('prod_s23ultra','Samsung Galaxy S23 Ultra','Samsung Galaxy S23 Ultra, 12GB RAM, 512GB Storage, Phantom Black',NULL,'Smartphones','Samsung',NULL,7,3,0.00,68990.00,52000.00,'SAMS-S23U-512','8806094761234',NULL,NULL,'Piece',NULL,1.00,'2026-01-09 05:41:05','2026-01-14 09:54:43',NULL,'account_1765251132577','account_1765251132577','wh_1766805099379'),('UNI-DOW-K8J8JB-1767612582041','DOWNY BOX 12S','DOWNY BOX 12S',NULL,'FABRIC CON','UNILIVER','gaming mice',8,5,0.00,150.00,100.00,'UNI-DOW-K8J8JB','912015365994','https://picsum.photos/seed/UNI-DOW-K8J8JB/400/300','downy-box-12s','CASE',NULL,1.00,'2026-01-05 11:29:42','2026-01-14 07:11:57','supplier_1764215002475','cmjqray2200008cbktxyoaavy','cmjqs9s6v00048cbkppvihkuq','wh_1766805099379'),('UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','MILO® Powder 1kg',NULL,'MILK POWDER','UNILIVER',NULL,6,10,0.00,600.00,500.00,'UNI-MIL-BIY3DC','183837634003','https://picsum.photos/seed/UNI-MIL-BIY3DC/400/300','milo-powder-1kg','CASE',NULL,1.00,'2025-12-27 03:34:43','2026-01-09 00:46:10','supplier_1766805129431','account_1765251132577','account_1765251163219',NULL),('UNI-PRO-647KV4-1767612624853','DOWNY 12G','DOWNY 12G',NULL,'FABRIC CON','UNILIVER',NULL,96,0,0.00,12.50,8.33,'UNI-PRO-647KV4','281226120524',NULL,'downy-12g','Piece','UNI-DOW-K8J8JB-1767612582041',1.00,'2026-01-05 11:30:24','2026-01-13 05:30:01',NULL,NULL,NULL,NULL),('UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','MILO® Powder 1kg',NULL,'MILK POWDER','UNILIVER',NULL,72,0,0.00,50.00,41.67,'UNI-PRO-I50IQU','604955742674',NULL,'milo®-powder-1kg','Piece','UNI-MIL-BIY3DC-1766806483584',1.00,'2025-12-27 03:35:45','2026-01-09 00:46:10',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `id` varchar(50) NOT NULL,
  `purchase_order_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchase_order_id` (`purchase_order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` varchar(50) NOT NULL,
  `supplier_id` varchar(50) NOT NULL,
  `supplier_name` varchar(255) NOT NULL,
  `date` datetime NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_method` varchar(100) DEFAULT NULL,
  `status` enum('Pending','Approved','Paid','Shipped','Received','Failed') DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_date` (`date`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_method` (`payment_method`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_items` (
  `id` varchar(50) NOT NULL,
  `sale_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sale_id` (`sale_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
INSERT INTO `sale_items` VALUES ('sale_actual_001_prod_iphone15pro','sale_actual_001','prod_iphone15pro','iPhone 15 Pro 256GB',1,70990.00,'2026-01-09 05:50:37'),('sale_actual_001_prod_mxmaster3s','sale_actual_001','prod_mxmaster3s','Logitech MX Master 3S',2,6590.00,'2026-01-09 05:50:37'),('sale_actual_002_prod_macbookairm2','sale_actual_002','prod_macbookairm2','MacBook Air M2 13\"',1,59990.00,'2026-01-09 05:50:37'),('sale_actual_003_prod_s23ultra','sale_actual_003','prod_s23ultra','Samsung Galaxy S23 Ultra',1,68990.00,'2026-01-09 05:50:37'),('SALE-1767939889694-1pwsu-ITEM-1','SALE-1767939889694-1pwsu','prod_macbookairm2','MacBook Air M2 13\"',1,59990.00,'2026-01-09 06:24:49'),('SALE-1767939889694-1pwsu-ITEM-2','SALE-1767939889694-1pwsu','NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G',1,10.00,'2026-01-09 06:24:49'),('SALE-1767939889694-1pwsu-ITEM-3','SALE-1767939889694-1pwsu','prod_mxmaster3s','Logitech MX Master 3S',1,6590.00,'2026-01-09 06:24:49'),('SALE-1767940385275-rc8q2-ITEM-1','SALE-1767940385275-rc8q2','prod_iphone15pro','iPhone 15 Pro 256GB',1,70990.00,'2026-01-09 06:33:05'),('SALE-1767940385275-rc8q2-ITEM-3','SALE-1767940385275-rc8q2','NES-PRO-BK7MH5-1766803689483','BEAR BRAND SWAK PACK 35G',1,20.00,'2026-01-09 06:33:05'),('SALE-1767941411185-dr5u2-ITEM-1','SALE-1767941411185-dr5u2','prod_macbookairm2','MacBook Air M2 13\"',1,59990.00,'2026-01-09 06:50:11'),('SALE-1767941411185-dr5u2-ITEM-2','SALE-1767941411185-dr5u2','prod_s23ultra','Samsung Galaxy S23 Ultra',1,68990.00,'2026-01-09 06:50:11'),('SALE-1767943536109-emeu3-ITEM-1','SALE-1767943536109-emeu3','prod_iphone15pro','iPhone 15 Pro 256GB',1,70990.00,'2026-01-09 07:25:36'),('SALE-1767943536109-emeu3-ITEM-2','SALE-1767943536109-emeu3','prod_s23ultra','Samsung Galaxy S23 Ultra',1,68990.00,'2026-01-09 07:25:36'),('SALE-1768282201788-lz3vq-ITEM-1','SALE-1768282201788-lz3vq','prod_macbookairm2','MacBook Air M2 13\"',1,59990.00,'2026-01-13 05:30:01'),('SALE-1768282201788-lz3vq-ITEM-2','SALE-1768282201788-lz3vq','prod_s23ultra','Samsung Galaxy S23 Ultra',1,68990.00,'2026-01-13 05:30:01'),('SALE-1768282201788-lz3vq-ITEM-3','SALE-1768282201788-lz3vq','UNI-DOW-K8J8JB-1767612582041','DOWNY BOX 12S',1,150.00,'2026-01-13 05:30:01'),('SALE-1768287046833-gpub1-ITEM-1','SALE-1768287046833-gpub1','prod_macbookairm2','MacBook Air M2 13\"',1,59990.00,'2026-01-13 06:50:46'),('SALE-1768287046833-gpub1-ITEM-2','SALE-1768287046833-gpub1','NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G',1,10.00,'2026-01-13 06:50:46'),('SALE-1768287046833-gpub1-ITEM-3','SALE-1768287046833-gpub1','prod_mxmaster3s','Logitech MX Master 3S',1,6590.00,'2026-01-13 06:50:46');
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_areas`
--

DROP TABLE IF EXISTS `sales_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_areas` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_areas`
--

LOCK TABLES `sales_areas` WRITE;
/*!40000 ALTER TABLE `sales_areas` DISABLE KEYS */;
INSERT INTO `sales_areas` VALUES ('area_1','North','Northern Region',1,'2026-01-13 09:03:11','2026-01-13 09:03:11'),('area_1768295964695','sales',NULL,1,'2026-01-13 09:19:24','2026-01-13 09:19:24'),('area_2','South','Southern Region',1,'2026-01-13 09:03:11','2026-01-13 09:03:11');
/*!40000 ALTER TABLE `sales_areas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_groups`
--

DROP TABLE IF EXISTS `sales_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_groups` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_groups`
--

LOCK TABLES `sales_groups` WRITE;
/*!40000 ALTER TABLE `sales_groups` DISABLE KEYS */;
INSERT INTO `sales_groups` VALUES ('group_1','Group A','High Value Customers',1,'2026-01-13 09:15:02','2026-01-13 09:15:02'),('group_2','Group B','Regular Customers',1,'2026-01-13 09:15:02','2026-01-13 09:15:02'),('group_3','Group C','New Customers',1,'2026-01-13 09:15:02','2026-01-13 09:15:02');
/*!40000 ALTER TABLE `sales_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_invoice_items`
--

DROP TABLE IF EXISTS `sales_invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_invoice_items` (
  `id` varchar(50) NOT NULL,
  `sales_invoice_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_invoice_id` (`sales_invoice_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `sales_invoice_items_ibfk_1` FOREIGN KEY (`sales_invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_invoice_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_invoice_items`
--

LOCK TABLES `sales_invoice_items` WRITE;
/*!40000 ALTER TABLE `sales_invoice_items` DISABLE KEYS */;
INSERT INTO `sales_invoice_items` VALUES ('inv_1766989513009_lgrejlzee_item_1','inv_1766989513009_lgrejlzee','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg',1,50.00,'2025-12-29 06:25:13'),('inv_1766991015035_nv7e010f2_item_1','inv_1766991015035_nv7e010f2','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg',1,50.00,'2025-12-29 06:50:15'),('inv_1766991918676_hdq2zojih_item_1','inv_1766991918676_hdq2zojih','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg',1,600.00,'2025-12-29 07:05:18'),('INV-1767941411197-tpqyi-ITEM-1','INV-1767941411197-tpqyi','prod_macbookairm2','MacBook Air M2 13\"',1,59990.00,'2026-01-09 06:50:11'),('INV-1767941411197-tpqyi-ITEM-2','INV-1767941411197-tpqyi','prod_s23ultra','Samsung Galaxy S23 Ultra',1,68990.00,'2026-01-09 06:50:11'),('INV-1767943536120-qol8j-ITEM-1','INV-1767943536120-qol8j','prod_iphone15pro','iPhone 15 Pro 256GB',1,70990.00,'2026-01-09 07:25:36'),('INV-1767943536120-qol8j-ITEM-2','INV-1767943536120-qol8j','prod_s23ultra','Samsung Galaxy S23 Ultra',1,68990.00,'2026-01-09 07:25:36'),('INV-1768282201945-v7z1h-ITEM-1','INV-1768282201945-v7z1h','prod_macbookairm2','MacBook Air M2 13\"',1,59990.00,'2026-01-13 05:30:02'),('INV-1768282201945-v7z1h-ITEM-2','INV-1768282201945-v7z1h','prod_s23ultra','Samsung Galaxy S23 Ultra',1,68990.00,'2026-01-13 05:30:02'),('INV-1768282201945-v7z1h-ITEM-3','INV-1768282201945-v7z1h','UNI-DOW-K8J8JB-1767612582041','DOWNY BOX 12S',1,150.00,'2026-01-13 05:30:02'),('INV-1768287046853-jj6io-ITEM-1','INV-1768287046853-jj6io','prod_macbookairm2','MacBook Air M2 13\"',1,59990.00,'2026-01-13 06:50:46'),('INV-1768287046853-jj6io-ITEM-2','INV-1768287046853-jj6io','NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G',1,10.00,'2026-01-13 06:50:46'),('INV-1768287046853-jj6io-ITEM-3','INV-1768287046853-jj6io','prod_mxmaster3s','Logitech MX Master 3S',1,6590.00,'2026-01-13 06:50:46');
/*!40000 ALTER TABLE `sales_invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_invoices`
--

DROP TABLE IF EXISTS `sales_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_invoices` (
  `id` varchar(50) NOT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `sales_person_id` varchar(50) DEFAULT NULL,
  `status` enum('Paid','Pending','Failed','Shipped','Delivered','Returned') DEFAULT 'Pending',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_invoice_date` (`invoice_date`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_sales_person_id` (`sales_person_id`),
  CONSTRAINT `fk_sales_invoices_sales_person_id` FOREIGN KEY (`sales_person_id`) REFERENCES `sales_persons` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_invoices_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_invoices`
--

LOCK TABLES `sales_invoices` WRITE;
/*!40000 ALTER TABLE `sales_invoices` DISABLE KEYS */;
INSERT INTO `sales_invoices` VALUES ('inv_1766989513009_lgrejlzee','1','2025-12-29','2026-01-28',50.00,'Charge',NULL,'Pending',NULL,'2025-12-29 06:25:13','2025-12-29 06:25:13'),('inv_1766991015035_nv7e010f2','1','2025-12-29','2026-01-28',50.00,'Charge',NULL,'Pending',NULL,'2025-12-29 06:50:15','2025-12-29 06:50:15'),('inv_1766991918676_hdq2zojih','1','2025-12-29','2026-01-28',600.00,'Charge',NULL,'Pending',NULL,'2025-12-29 07:05:18','2025-12-29 07:05:18'),('INV-1767941411197-tpqyi',NULL,'2026-01-09','2026-01-09',133480.00,'CASH',NULL,'Paid','POS Sale','2026-01-09 06:50:11','2026-01-09 06:50:11'),('INV-1767943536120-qol8j',NULL,'2026-01-09','2026-01-09',139980.00,'CREDIT CARD',NULL,'Paid','POS Sale','2026-01-09 07:25:36','2026-01-09 07:25:36'),('INV-1768282201945-v7z1h',NULL,'2026-01-13','2026-01-13',129130.00,'CASH',NULL,'Paid','POS Sale','2026-01-13 05:30:01','2026-01-13 05:30:01'),('INV-1768287046853-jj6io',NULL,'2026-01-13','2026-01-13',66590.00,'CASH',NULL,'Paid','POS Sale','2026-01-13 06:50:46','2026-01-13 06:50:46');
/*!40000 ALTER TABLE `sales_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_items`
--

DROP TABLE IF EXISTS `sales_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_items` (
  `id` varchar(50) NOT NULL,
  `sales_order_id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_order_id` (`sales_order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `sales_order_items_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order_items`
--

LOCK TABLES `sales_order_items` WRITE;
/*!40000 ALTER TABLE `sales_order_items` DISABLE KEYS */;
INSERT INTO `sales_order_items` VALUES ('SOI-1767009514364-1-hokgm','SO-1767009514355','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg',1,50.00,'2025-12-29 11:58:34'),('SOI-1767919569982-1-668ki','SO-1767919569960','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg',2,50.00,'2026-01-09 00:46:09'),('SOI-1767919570003-2-mybw5','SO-1767919569960','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg',1,600.00,'2026-01-09 00:46:10'),('SOI-1767919570011-3-6vkom','SO-1767919569960','NES-NES-S236BH-1766803358930','NESCAFE BOX 35PACK',3,120.00,'2026-01-09 00:46:10'),('SOI-1767919570016-4-cqej0','SO-1767919569960','UNI-DOW-K8J8JB-1767612582041','DOWNY BOX 12S',1,150.00,'2026-01-09 00:46:10'),('SOI-1768541239049-1-d30oy','SO-1768541239031','LUC-PRO-X3CHYW-1768384349234','ODONG',1,5.00,'2026-01-16 05:27:19');
/*!40000 ALTER TABLE `sales_order_items` ENABLE KEYS */;
UNLOCK TABLES;

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

--
-- Table structure for table `sales_persons`
--

DROP TABLE IF EXISTS `sales_persons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_persons` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_persons`
--

LOCK TABLES `sales_persons` WRITE;
/*!40000 ALTER TABLE `sales_persons` DISABLE KEYS */;
INSERT INTO `sales_persons` VALUES ('sp_1','John Doe','+1-555-0101',1,'2025-12-22 02:31:52','2025-12-22 02:31:52'),('sp_2','Jane Smith','+1-555-0102',1,'2025-12-22 02:31:52','2025-12-22 02:31:52');
/*!40000 ALTER TABLE `sales_persons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_transactions`
--

DROP TABLE IF EXISTS `sales_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_transactions` (
  `id` varchar(50) NOT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `status` enum('Paid','Pending','Failed','Shipped','Delivered','Returned') DEFAULT 'Pending',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_date` (`date`),
  KEY `idx_invoice_date` (`invoice_date`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_method` (`payment_method`),
  CONSTRAINT `sales_transactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_transactions`
--

LOCK TABLES `sales_transactions` WRITE;
/*!40000 ALTER TABLE `sales_transactions` DISABLE KEYS */;
INSERT INTO `sales_transactions` VALUES ('sale_001','1','2024-11-15','2024-11-15',NULL,150.00,'Credit Card','Paid',NULL,'2025-12-10 01:58:12','2025-12-17 09:25:23'),('sale_002','2','2024-11-14','2024-11-14',NULL,45.00,'Cash','Paid',NULL,'2025-12-10 01:58:12','2025-12-17 09:25:23'),('sale_003',NULL,'2024-11-13','2024-11-13',NULL,165.00,'Bank Transfer','Pending',NULL,'2025-12-10 01:58:12','2025-12-20 01:20:46'),('sale_actual_001','3','2026-01-08','2026-01-08',NULL,84170.00,'Cash','Paid',NULL,'2026-01-09 05:50:37','2026-01-09 05:50:37'),('sale_actual_002','3','2026-01-09','2026-01-09',NULL,64990.00,'Cash','Paid',NULL,'2026-01-09 05:50:37','2026-01-09 05:50:37'),('sale_actual_003','3','2026-01-09','2026-01-09',NULL,73490.00,'Cash','Paid',NULL,'2026-01-09 05:50:37','2026-01-09 05:50:37'),('SALE-1767939889694-1pwsu',NULL,'2026-01-09','2026-01-09',NULL,66590.00,'CASH','Paid','POS Sale','2026-01-09 06:24:49','2026-01-09 06:24:49'),('SALE-1767940385275-rc8q2',NULL,'2026-01-09','2026-01-09',NULL,83010.00,'CASH','Paid','POS Sale','2026-01-09 06:33:05','2026-01-09 06:33:05'),('SALE-1767941411185-dr5u2',NULL,'2026-01-09','2026-01-09',NULL,133480.00,'CASH','Paid','POS Sale','2026-01-09 06:50:11','2026-01-09 06:50:11'),('SALE-1767943536109-emeu3',NULL,'2026-01-09','2026-01-09',NULL,139980.00,'CREDIT CARD','Paid','POS Sale','2026-01-09 07:25:36','2026-01-09 07:25:36'),('SALE-1768282201788-lz3vq',NULL,'2026-01-13','2026-01-13',NULL,129130.00,'CASH','Paid','POS Sale','2026-01-13 05:30:01','2026-01-13 05:30:01'),('SALE-1768287046833-gpub1',NULL,'2026-01-13','2026-01-13',NULL,66590.00,'CASH','Paid','POS Sale','2026-01-13 06:50:46','2026-01-13 06:50:46');
/*!40000 ALTER TABLE `sales_transactions` ENABLE KEYS */;
UNLOCK TABLES;

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
/*!40000 ALTER TABLE `shifts` ENABLE KEYS */;
UNLOCK TABLES;

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

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `movement_type` enum('sale','purchase','adjustment','return','transfer','sales_order') NOT NULL,
  `quantity_change` int NOT NULL,
  `previous_stock` int NOT NULL,
  `new_stock` int NOT NULL,
  `reference_id` varchar(50) DEFAULT NULL,
  `reference_type` enum('sale','purchase','adjustment','return','transfer','sales_order') DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_movement_type` (`movement_type`),
  KEY `idx_reference_id` (`reference_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES ('229d6171-8ab2-446d-ace9-c0d3cc11ec70','NES-PRO-VRPNWQ-1766805826607','Bear Brand  300g','adjustment',1,240,241,'adj_1766805907291_d0x1b9rgd','adjustment','afafa','2025-12-27 03:25:07','2025-12-27 03:25:07'),('29585d9c-6f3a-4fdd-8f42-461a86c61758','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','adjustment',10,0,10,'adj_1766806508133_c8fuire1b','adjustment','physica','2025-12-27 03:35:08','2025-12-27 03:35:08'),('8b940c49-7bd5-40d9-bd80-07be3e5923bf','NES-PRO-VRPNWQ-1766805826607','Bear Brand  300g','adjustment',23,241,264,'adj_1766805920728_730c07k06','adjustment','phys (Auto-adjusted from parent: 11 × 24 = 264)','2025-12-27 03:25:20','2025-12-27 03:25:20'),('8b97b68e-a375-486e-8645-8d748a42e47c','NES-PRO-BK7MH5-1766803689483','BEAR BRAND SWAK PACK 35G','adjustment',12,120,132,'adj_1766804192175_55lkxywqv','adjustment','ress (Auto-adjusted from parent: 11 × 12 = 132)','2025-12-27 02:56:32','2025-12-27 02:56:32'),('92bb2297-0f14-4d3b-87c6-b66633835702','NES-BEA-M61BP4-1766803639345','BEAR BRAND SWACK PACK BOX','adjustment',1,10,11,'adj_1766804192165_9m7tj7o51','adjustment','ress','2025-12-27 02:56:32','2025-12-27 02:56:32'),('a4bfab34-f319-4a3a-8432-31906cf3c694','NES-NES-S236BH-1766803358930','NESCAFE BOX 35PACK','adjustment',10,0,10,'adj_1766803478508_96lly0aq4','adjustment','Physical Count','2025-12-27 02:44:38','2025-12-27 02:44:38'),('db739cbf-7229-4ad7-88b6-9be414347f01','NES-BEA-WROB81-1766805711639','Bear Brand 300g ','adjustment',1,10,11,'adj_1766805920716_6m0ncnh3y','adjustment','phys','2025-12-27 03:25:20','2025-12-27 03:25:20'),('dc391a5b-8373-4644-a597-d49c2a94222a','NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G','adjustment',10,0,10,'adj_1766803478522_tyb16u1ja','adjustment','Physical Count (Auto-adjusted from parent: 10 × 1 = 10)','2025-12-27 02:44:38','2025-12-27 02:44:38'),('mov_1766989513025_0_babrv','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sale',-1,120,119,'inv_1766989513009_lgrejlzee','sale','Sales Invoice: INV-983915','2025-12-29 06:25:13','2025-12-29 06:25:13'),('mov_1766991015050_0_3584_9qd2v','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','sale',0,10,9,'inv_1766991015035_nv7e010f2','sale','Sales Invoice: INV-861940 (Sync from MILO® Powder 1kg)','2025-12-29 06:50:15','2025-12-29 06:50:15'),('mov_1766991015052_0_5173_ow3sq','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sale',-1,119,118,'inv_1766991015035_nv7e010f2','sale','Sales Invoice: INV-861940 (Sync from MILO® Powder 1kg)','2025-12-29 06:50:15','2025-12-29 06:50:15'),('mov_1766991918684_0_3584_3ahxe','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','sale',-1,9,8,'inv_1766991918676_hdq2zojih','sale','Sales Invoice: INV-306492 (Sync from MILO Powder 1kg)','2025-12-29 07:05:18','2025-12-29 07:05:18'),('mov_1766991918685_0_5173_zjcrs','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sale',-12,118,106,'inv_1766991918676_hdq2zojih','sale','Sales Invoice: INV-306492 (Sync from MILO Powder 1kg)','2025-12-29 07:05:18','2025-12-29 07:05:18'),('mov_so_1766993825595_0_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','sales_order',0,8,7,'SO-1766993825551','sales_order','Sales Order: SO-088360 (Sync from MILO® Powder 1kg)','2025-12-29 07:37:05','2025-12-29 07:37:05'),('mov_so_1766993825596_0_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sales_order',-1,106,105,'SO-1766993825551','sales_order','Sales Order: SO-088360 (Sync from MILO® Powder 1kg)','2025-12-29 07:37:05','2025-12-29 07:37:05'),('mov_so_1766994578104_0_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','sales_order',0,7,6,'SO-1766994578067','sales_order','Sales Order: SO-982736 (Sync from MILO® Powder 1kg)','2025-12-29 07:49:38','2025-12-29 07:49:38'),('mov_so_1766994578106_0_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sales_order',-1,106,105,'SO-1766994578067','sales_order','Sales Order: SO-982736 (Sync from MILO® Powder 1kg)','2025-12-29 07:49:38','2025-12-29 07:49:38'),('mov_so_1766994711043_0_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','sales_order',0,6,5,'SO-1766994711036','sales_order','Sales Order: SO-338008 (Sync from MILO® Powder 1kg)','2025-12-29 07:51:51','2025-12-29 07:51:51'),('mov_so_1766994711048_0_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sales_order',-1,106,105,'SO-1766994711036','sales_order','Sales Order: SO-338008 (Sync from MILO® Powder 1kg)','2025-12-29 07:51:51','2025-12-29 07:51:51'),('mov_so_1766995348992_0_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','sales_order',3,5,8,'SO-1766995348980','sales_order','Sales Order: SO-931885 (Sync from Anchor: MILO® Powder 1kg)','2025-12-29 08:02:28','2025-12-29 08:02:28'),('mov_so_1766995348994_0_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sales_order',-1,106,105,'SO-1766995348980','sales_order','Sales Order: SO-931885 (Sync from Anchor: MILO® Powder 1kg)','2025-12-29 08:02:28','2025-12-29 08:02:28'),('mov_so_1766995439729_0_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sales_order',-1,106,105,'SO-1766995439721','sales_order','Sales Order: SO-307179 (Sync from Anchor: MILO® Powder 1kg)','2025-12-29 08:03:59','2025-12-29 08:03:59'),('mov_so_1766995682292_0_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','sales_order',-1,8,7,'SO-1766995682281','sales_order','Sales Order: SO-531452 (Sync from Anchor: MILO Powder 1kg)','2025-12-29 08:08:02','2025-12-29 08:08:02'),('mov_so_1766995682294_0_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sales_order',-22,106,84,'SO-1766995682281','sales_order','Sales Order: SO-531452 (Sync from Anchor: MILO Powder 1kg)','2025-12-29 08:08:02','2025-12-29 08:08:02'),('mov_so_1767009514372_0_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','sales_order',-1,8,7,'SO-1767009514355','sales_order','Sales Order: SO-427422 (Sync from Anchor: MILO® Powder 1kg)','2025-12-29 11:58:34','2025-12-29 11:58:34'),('mov_so_1767009514381_0_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sales_order',-1,96,95,'SO-1767009514355','sales_order','Sales Order: SO-427422 (Sync from Anchor: MILO® Powder 1kg)','2025-12-29 11:58:34','2025-12-29 11:58:34'),('mov_so_1767919569995_0_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sales_order',-2,95,93,'SO-1767919569960','sales_order','Sales Order: SO-804412 (Sync from Anchor: MILO® Powder 1kg)','2026-01-09 00:46:09','2026-01-09 00:46:09'),('mov_so_1767919570009_1_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','sales_order',-1,7,6,'SO-1767919569960','sales_order','Sales Order: SO-804412 (Sync from Anchor: MILO Powder 1kg)','2026-01-09 00:46:10','2026-01-09 00:46:10'),('mov_so_1767919570011_1_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','sales_order',-21,93,72,'SO-1767919569960','sales_order','Sales Order: SO-804412 (Sync from Anchor: MILO Powder 1kg)','2026-01-09 00:46:10','2026-01-09 00:46:10'),('mov_so_1767919570013_2_8930','NES-NES-S236BH-1766803358930','NESCAFE BOX 35PACK','sales_order',-3,10,7,'SO-1767919569960','sales_order','Sales Order: SO-804412 (Sync from Anchor: NESCAFE BOX 35PACK)','2026-01-09 00:46:10','2026-01-09 00:46:10'),('mov_so_1767919570015_2_9794','NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G','sales_order',-3,10,7,'SO-1767919569960','sales_order','Sales Order: SO-804412 (Sync from Anchor: NESCAFE BOX 35PACK)','2026-01-09 00:46:10','2026-01-09 00:46:10'),('mov_so_1767919570018_3_2041','UNI-DOW-K8J8JB-1767612582041','DOWNY BOX 12S','sales_order',-1,10,9,'SO-1767919569960','sales_order','Sales Order: SO-804412 (Sync from Anchor: DOWNY BOX 12S)','2026-01-09 00:46:10','2026-01-09 00:46:10'),('mov_so_1767919570019_3_4853','UNI-PRO-647KV4-1767612624853','DOWNY 12G','sales_order',-12,120,108,'SO-1767919569960','sales_order','Sales Order: SO-804412 (Sync from Anchor: DOWNY BOX 12S)','2026-01-09 00:46:10','2026-01-09 00:46:10'),('mov_so_1768541239065_0_9234','LUC-PRO-X3CHYW-1768384349234','ODONG','sales_order',-1,120,119,'SO-1768541239031','sales_order','Sales Order: SO-057943 (Sync from Anchor: ODONG)','2026-01-16 05:27:19','2026-01-16 05:27:19'),('mov_so_rev_1766994547890_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','adjustment',0,7,7,'SO-1766993825551','sales_order','Reversal of Sales Order: SO-1766993825551 (Sync back for MILO® Powder 1kg)','2025-12-29 07:49:07','2025-12-29 07:49:07'),('mov_so_rev_1766994547893_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','adjustment',1,105,106,'SO-1766993825551','sales_order','Reversal of Sales Order: SO-1766993825551 (Sync back for MILO® Powder 1kg)','2025-12-29 07:49:07','2025-12-29 07:49:07'),('mov_so_rev_1766994599729_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','adjustment',0,6,6,'SO-1766994578067','sales_order','Reversal of Sales Order: SO-1766994578067 (Sync back for MILO® Powder 1kg)','2025-12-29 07:49:59','2025-12-29 07:49:59'),('mov_so_rev_1766994599731_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','adjustment',1,105,106,'SO-1766994578067','sales_order','Reversal of Sales Order: SO-1766994578067 (Sync back for MILO® Powder 1kg)','2025-12-29 07:49:59','2025-12-29 07:49:59'),('mov_so_rev_1766994740738_3584','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','adjustment',0,5,5,'SO-1766994711036','sales_order','Reversal of Sales Order: SO-1766994711036 (Sync back for MILO® Powder 1kg)','2025-12-29 07:52:20','2025-12-29 07:52:20'),('mov_so_rev_1766994740739_5173','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','adjustment',1,105,106,'SO-1766994711036','sales_order','Reversal of Sales Order: SO-1766994711036 (Sync back for MILO® Powder 1kg)','2025-12-29 07:52:20','2025-12-29 07:52:20'),('mov_so_rev_1766995412748_5173_zo37','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','adjustment',1,105,106,'SO-1766995348980','sales_order','Reversal of Sales Order: SO-1766995348980 (Sync from Anchor: MILO® Powder 1kg)','2025-12-29 08:03:32','2025-12-29 08:03:32'),('mov_so_rev_1766995461552_5173_nqg5','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','adjustment',1,105,106,'SO-1766995439721','sales_order','Reversal of Sales Order: SO-1766995439721 (Sync from Anchor: MILO® Powder 1kg)','2025-12-29 08:04:21','2025-12-29 08:04:21'),('mov_so_rev_1766995707158_3584_h2dg','UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','adjustment',1,7,8,'SO-1766995682281','sales_order','Reversal of Sales Order: SO-1766995682281 (Sync from Anchor: MILO Powder 1kg)','2025-12-29 08:08:27','2025-12-29 08:08:27'),('mov_so_rev_1766995707164_5173_e3dp','UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','adjustment',12,84,96,'SO-1766995682281','sales_order','Reversal of Sales Order: SO-1766995682281 (Sync from Anchor: MILO Powder 1kg)','2025-12-29 08:08:27','2025-12-29 08:08:27'),('MOV-1767939889703-0-irm2','prod_macbookairm2','MacBook Air M2 13\"','sale',-1,8,7,'SALE-1767939889694-1pwsu','sale','POS Sale: SALE-1767939889694-1pwsu','2026-01-09 06:24:49','2026-01-09 06:24:49'),('MOV-1767939889707-1-9794','NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G','sale',-1,7,6,'SALE-1767939889694-1pwsu','sale','POS Sale: SALE-1767939889694-1pwsu','2026-01-09 06:24:49','2026-01-09 06:24:49'),('MOV-1767939889711-2-er3s','prod_mxmaster3s','Logitech MX Master 3S','sale',-1,25,24,'SALE-1767939889694-1pwsu','sale','POS Sale: SALE-1767939889694-1pwsu','2026-01-09 06:24:49','2026-01-09 06:24:49'),('MOV-1767940385316-0-5pro','prod_iphone15pro','iPhone 15 Pro 256GB','sale',-1,15,14,'SALE-1767940385275-rc8q2','sale','POS Sale: SALE-1767940385275-rc8q2','2026-01-09 06:33:05','2026-01-09 06:33:05'),('MOV-1767940385321-2-9345','NES-BEA-M61BP4-1766803639345','BEAR BRAND SWACK PACK BOX','sale',-1,11,10,'SALE-1767940385275-rc8q2','sale','POS Sale: SALE-1767940385275-rc8q2','2026-01-09 06:33:05','2026-01-09 06:33:05'),('MOV-1767940385322-2-9483','NES-PRO-BK7MH5-1766803689483','BEAR BRAND SWAK PACK 35G','sale',-1,132,131,'SALE-1767940385275-rc8q2','sale','POS Sale: SALE-1767940385275-rc8q2','2026-01-09 06:33:05','2026-01-09 06:33:05'),('MOV-1767941411192-0-irm2','prod_macbookairm2','MacBook Air M2 13\"','sale',-1,7,6,'SALE-1767941411185-dr5u2','sale','POS Sale: SALE-1767941411185-dr5u2','2026-01-09 06:50:11','2026-01-09 06:50:11'),('MOV-1767941411194-1-ltra','prod_s23ultra','Samsung Galaxy S23 Ultra','sale',-1,10,9,'SALE-1767941411185-dr5u2','sale','POS Sale: SALE-1767941411185-dr5u2','2026-01-09 06:50:11','2026-01-09 06:50:11'),('MOV-1767943536115-0-5pro','prod_iphone15pro','iPhone 15 Pro 256GB','sale',-1,14,13,'SALE-1767943536109-emeu3','sale','POS Sale: SALE-1767943536109-emeu3','2026-01-09 07:25:36','2026-01-09 07:25:36'),('MOV-1767943536119-1-ltra','prod_s23ultra','Samsung Galaxy S23 Ultra','sale',-1,9,8,'SALE-1767943536109-emeu3','sale','POS Sale: SALE-1767943536109-emeu3','2026-01-09 07:25:36','2026-01-09 07:25:36'),('MOV-1768282201911-0-irm2','prod_macbookairm2','MacBook Air M2 13\"','sale',-1,6,5,'SALE-1768282201788-lz3vq','sale','POS Sale: SALE-1768282201788-lz3vq','2026-01-13 05:30:01','2026-01-13 05:30:01'),('MOV-1768282201936-1-ltra','prod_s23ultra','Samsung Galaxy S23 Ultra','sale',-1,8,7,'SALE-1768282201788-lz3vq','sale','POS Sale: SALE-1768282201788-lz3vq','2026-01-13 05:30:01','2026-01-13 05:30:01'),('MOV-1768282201943-2-2041','UNI-DOW-K8J8JB-1767612582041','DOWNY BOX 12S','sale',-1,9,8,'SALE-1768282201788-lz3vq','sale','POS Sale: SALE-1768282201788-lz3vq','2026-01-13 05:30:01','2026-01-13 05:30:01'),('MOV-1768282201944-2-4853','UNI-PRO-647KV4-1767612624853','DOWNY 12G','sale',-12,108,96,'SALE-1768282201788-lz3vq','sale','POS Sale: SALE-1768282201788-lz3vq','2026-01-13 05:30:01','2026-01-13 05:30:01'),('MOV-1768287046844-0-irm2','prod_macbookairm2','MacBook Air M2 13\"','sale',-1,5,4,'SALE-1768287046833-gpub1','sale','POS Sale: SALE-1768287046833-gpub1','2026-01-13 06:50:46','2026-01-13 06:50:46'),('MOV-1768287046849-1-9794','NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G','sale',-1,6,5,'SALE-1768287046833-gpub1','sale','POS Sale: SALE-1768287046833-gpub1','2026-01-13 06:50:46','2026-01-13 06:50:46'),('MOV-1768287046851-2-er3s','prod_mxmaster3s','Logitech MX Master 3S','sale',-1,24,23,'SALE-1768287046833-gpub1','sale','POS Sale: SALE-1768287046833-gpub1','2026-01-13 06:50:46','2026-01-13 06:50:46');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subcategories`
--

DROP TABLE IF EXISTS `subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subcategories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subcategories`
--

LOCK TABLES `subcategories` WRITE;
/*!40000 ALTER TABLE `subcategories` DISABLE KEYS */;
INSERT INTO `subcategories` VALUES ('subcategory_1764043863209','gaming mice','2025-11-25 04:11:03');
/*!40000 ALTER TABLE `subcategories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `address` text,
  `payment_terms` varchar(100) DEFAULT NULL,
  `markup_percentage` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES ('supplier_1764215002475','A BS','324235235','2025-11-27 03:43:22','2025-11-27 03:43:22','SAFAFA','NET 30',20.00),('supplier_1766805129431','UNILIVER','09381583922','2025-12-27 03:12:09','2025-12-27 03:12:09','TAGUM','Net 30',20.00);
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_references`
--

DROP TABLE IF EXISTS `transaction_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_references` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order` varchar(50) DEFAULT NULL,
  `purchase_order` varchar(50) DEFAULT NULL,
  `sales_delivery` varchar(50) DEFAULT NULL,
  `payment_to_supplier` varchar(50) DEFAULT NULL,
  `sales_invoice` varchar(50) DEFAULT NULL,
  `customer_payment` varchar(50) DEFAULT NULL,
  `delivery_receipt` varchar(50) DEFAULT NULL,
  `stock_adjustment` varchar(50) DEFAULT NULL,
  `sales_hold` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_references`
--

LOCK TABLES `transaction_references` WRITE;
/*!40000 ALTER TABLE `transaction_references` DISABLE KEYS */;
INSERT INTO `transaction_references` VALUES (1,'2944','53','2832','34','2974','63','1','106','5','2026-01-16 01:44:39','2026-01-16 01:44:39');
/*!40000 ALTER TABLE `transaction_references` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `units_of_measure`
--

DROP TABLE IF EXISTS `units_of_measure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units_of_measure` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `abbreviation` varchar(10) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `units_of_measure`
--

LOCK TABLES `units_of_measure` WRITE;
/*!40000 ALTER TABLE `units_of_measure` DISABLE KEYS */;
INSERT INTO `units_of_measure` VALUES ('unit_1764127824080','Piece','pc','2025-11-26 03:30:24'),('unit_1764136414532','CASE','cs','2025-11-26 05:53:34'),('unit_1764315558927','Packs','pcks','2025-11-28 07:39:18'),('unit_1766805147035','Gallon','gal','2025-12-27 03:12:27'),('unit_1766805309819','Kilogram','kg','2025-12-27 03:15:09'),('uom_hr','Hour','hr','2026-01-09 05:41:05'),('uom_srv','Service','srv','2026-01-09 05:41:05');
/*!40000 ALTER TABLE `units_of_measure` ENABLE KEYS */;
UNLOCK TABLES;

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

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `uid` varchar(255) NOT NULL,
  `username` varchar(100) NOT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `disabled` tinyint(1) DEFAULT '0',
  `creation_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `password` varchar(255) NOT NULL,
  `user_type` varchar(50) DEFAULT 'User',
  PRIMARY KEY (`uid`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_disabled` (`disabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('69829f84-469d-4117-9f83-af9707b909c3','jhazon','jhazon','',0,'2026-01-07 04:42:03','2026-01-07 04:42:03','2026-01-07 04:42:03','admin123','User'),('98ea7a07-028c-484c-985b-36d250a93997','staff','staff','',0,'2026-01-07 06:24:24','2026-01-07 06:24:24','2026-01-09 09:33:08','$2b$10$brNpQl54EhZtO.v66TD7NOJh3eCmTu1B6l5c9zYncqvQ1judnld36','Cashier'),('ac83337e-c14b-4094-8361-1b2e32bfe975','admin','admin','',0,'2026-01-07 04:47:41','2026-01-07 04:47:41','2026-01-09 09:48:16','$2b$10$YqHiqao5I0kf8Om.IUdKO.9RKFYiZ/dPLGQdz33WH6i/OJ.JKruIy','Admin'),('eb25ca1e-ccf2-4c10-a744-d5ac1651ebb5','lucio','lucio','',0,'2026-01-07 04:48:11','2026-01-07 04:48:11','2026-01-07 04:48:11','admin123','User');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
INSERT INTO `warehouses` VALUES ('wh_1766805099379','BODEGA','TAGUM',1,'2025-12-27 03:11:39','2025-12-27 03:11:39'),('wh_main','Main Warehouse','Building A, Floor 1',1,'2025-12-22 02:02:30','2025-12-22 02:02:30');
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;

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

-- Dump completed on 2026-01-16 14:46:48

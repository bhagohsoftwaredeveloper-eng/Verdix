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
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'001_initial_schema','2025-01-24_09-22-00','2025-11-26 06:57:59'),(2,'014_alter_customers_table_add_fields','2025-12-10_16-17-00','2025-12-10 08:36:47'),(3,'002_drop_conversion_factor_from_units_of_measure','2025-11-26_13-22-00','2025-12-17 08:47:02'),(4,'003_create_conversion_factors_table','2025-11-26_13-40-00','2025-12-17 08:47:02'),(5,'004_alter_conversion_factors_id_length','2025-11-26_14-46-00','2025-12-17 08:47:02'),(6,'005_remove_is_serialized_from_products','2025-26-11_17-22-00','2025-12-17 08:47:20'),(7,'006_create_suppliers_table','2025-11-27_08-45-00','2025-12-17 08:47:41'),(8,'007_alter_suppliers_table_add_fields','2025-11-27_10-48-00','2025-12-17 08:48:03'),(9,'008_create_stock_adjustments_table','2025-12-04_16-20-00','2025-12-17 08:48:03'),(10,'009_add_account_foreign_keys_to_products','2025-12-09_11-30-00','2025-12-17 08:48:24'),(11,'010_create_stock_movements_table','2025-12-09_14-30-00','2025-12-17 08:48:24'),(12,'011_create_sales_transactions_tables','2025-12-09_17-54-00','2025-12-17 08:48:24'),(13,'012_create_pos_tables','2025-12-10_10-05-00','2025-12-17 08:48:24'),(14,'013_create_sales_orders_table','2025-12-10_11-00-00','2025-12-17 08:48:24'),(15,'015_alter_sales_orders_add_new_fields','2025-12-10_17-03-00','2025-12-17 08:48:44'),(16,'016_alter_customers_table_add_sales_fields','2025-12-12_10-15-00','2025-12-17 08:48:44'),(17,'017_create_loyalty_points_settings_table','2025-12-15_09-03-00','2025-12-17 08:48:44'),(18,'018_create_customer_loyalty_table','2025-12-15_09-22-00','2025-12-17 08:48:44'),(19,'019_create_point_history_table','2025-12-15_15-55-00','2025-12-17 08:48:44'),(20,'020_create_customer_payments_table','2025-12-16_11-50-00','2025-12-17 08:48:45'),(21,'021_create_sales_invoices_table','2025-12-17_16-02-43','2025-12-17 08:48:45'),(22,'022_create_warehouses_table','022','2025-12-18 01:16:51'),(23,'023_add_warehouse_foreign_key_to_products','023','2025-12-18 03:00:43'),(24,'024_alter_sales_invoices_add_sales_person','2025-12-20_08-45-00','2025-12-20 00:45:35'),(25,'025_add_sales_person_foreign_keys','2025-12-20_08-46-00','2025-12-20 00:45:35'),(26,'026_update_warehouse_foreign_key_constraint','026','2025-12-22 03:13:27'),(27,'027_create_purchase_orders_table','2025-12-22_13-55-00','2026-01-05 11:26:36'),(28,'028_drop_account_foreign_keys_from_products','2025-01-05_19-30-00','2026-01-05 11:26:37'),(29,'029_create_user_permissions_table','2025-12-29_12-00-00','2026-01-07 01:15:44'),(30,'030_create_users_table','2025-12-30_12-00-00','2026-01-07 01:16:39'),(31,'031_alter_users_table_remove_email','2025-12-31_12-00-00','2026-01-07 01:26:08'),(32,'032_add_password_to_users_table','2026-01-07_10-00-00','2026-01-13 07:49:43'),(33,'033_alter_loyalty_base_column','2026-01-13_15-55-00','2026-01-13 07:49:43'),(34,'034_create_payment_details_tables','2026-01-15_12-00-00','2026-01-15 05:55:16'),(35,'035_create_pos_settings_table','2026-01-15_15-27-00','2026-01-16 09:43:06'),(36,'036_create_supplier_product_mapping','2026-01-16_09-43-06','2026-01-16 09:43:06'),(37,'037_alter_pos_settings_add_contact_fields','2026-01-17_11-46-00','2026-01-17 03:46:36'),(38,'038_create_supplier_payments_table','2026-01-17_12-35-00','2026-01-17 05:48:52'),(39,'039_alter_suppliers_add_details','2026-01-17_13-05-00','2026-01-17 05:48:53');
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
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

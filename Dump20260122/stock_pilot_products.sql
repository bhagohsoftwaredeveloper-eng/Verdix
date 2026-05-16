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
INSERT INTO `products` VALUES ('LOG-TES-LH9SUU-1768611704035','Test Product With Sup 2plier','Test description',NULL,'Peripherals','LOGITECH',NULL,0,0,0.00,100.00,NULL,'LOG-TES-LH9SUU',NULL,'https://picsum.photos/seed/LOG-TES-LH9SUU/400/300','test-product-with-sup-2plier','Piece',NULL,1.00,'2026-01-17 01:01:44','2026-01-17 01:01:44',NULL,NULL,NULL,NULL),('LOG-TES-T4DCHJ-1768611558481','Test Product With Supplier','Test description',NULL,'Peripherals','LOGITECH',NULL,0,0,0.00,50.00,NULL,'LOG-TES-T4DCHJ',NULL,'https://picsum.photos/seed/LOG-TES-T4DCHJ/400/300','test-product-with-supplier','Piece',NULL,1.00,'2026-01-17 00:59:18','2026-01-17 03:09:24',NULL,NULL,NULL,NULL),('LUC-ODO-IRNTIH-1768384264712','ODONG','ODONG',NULL,'COFFEE POWDER','LUCKYME','gaming mice',10,10,0.00,60.00,50.00,'LUC-ODO-IRNTIH','342403809686','https://picsum.photos/seed/LUC-ODO-IRNTIH/400/300','odong','CASE',NULL,1.00,'2026-01-14 09:51:04','2026-01-14 09:51:04','supplier_1764215002475',NULL,NULL,'wh_1766805099379'),('LUC-PRO-X3CHYW-1768384349234','ODONG','ODONG',NULL,'COFFEE POWDER','LUCKYME','gaming mice',117,0,0.00,5.00,4.17,'LUC-PRO-X3CHYW','464962692326',NULL,'odong','Piece','LUC-ODO-IRNTIH-1768384264712',1.00,'2026-01-14 09:52:29','2026-01-19 05:30:39',NULL,NULL,NULL,NULL),('NES-BEA-M61BP4-1766803639345','BEAR BRAND SWACK PACK BOX','BEAR BRAND SWACK PACK BOX',NULL,'COFFEE POWDER','Nescafe','gaming mice',10,10,0.00,240.00,200.00,'NES-BEA-M61BP4','947442439888','https://picsum.photos/seed/NES-BEA-M61BP4/400/300','bear-brand-swack-pack-box','CASE',NULL,1.00,'2025-12-27 02:47:19','2026-01-14 01:54:58','supplier_1764215002475','cmkca1ksg0005iwbkg1134iqd','cmkc9b78b0001iwbk8rcbtej2',NULL),('NES-BEA-WROB81-1766805711639','Bear Brand 300g ','Bear Brand Fortified With Zinc Powdered Milk 300g',NULL,'MILK POWDER','Nestlea',NULL,7,10,0.00,140.40,117.00,'NES-BEA-WROB81','559562610692','https://picsum.photos/seed/NES-BEA-WROB81/400/300','bear-brand-300g-','CASE',NULL,1.00,'2025-12-27 03:21:51','2026-01-22 00:36:57','supplier_1766805129431','account_1765251132577','account_1765251163219',NULL),('NES-NES-S236BH-1766803358930','NESCAFE BOX 35PACK','NESCAFE BOX 35PACK',NULL,'COFFEE POWDER','Nescafe',NULL,5,10,0.00,120.00,100.00,'NES-NES-S236BH','447811249047','https://picsum.photos/seed/NES-NES-S236BH/400/300','nescafe-box-35pack','CASE',NULL,1.00,'2025-12-27 02:42:38','2026-01-19 06:16:46','supplier_1764215002475','account_1765251132577','account_1765251163219',NULL),('NES-PRO-BK7MH5-1766803689483','BEAR BRAND SWAK PACK 35G','BEAR BRAND SWAK PACK 35G',NULL,'COFFEE POWDER','Nescafe','gaming mice',131,0,0.00,20.00,16.67,'NES-PRO-BK7MH5','382698828373',NULL,'bear-brand-swak-pack-35g','Piece','NES-BEA-M61BP4-1766803639345',1.00,'2025-12-27 02:48:09','2026-01-09 06:33:05',NULL,NULL,NULL,NULL),('NES-PRO-VRPNWQ-1766805826607','Bear Brand  300g','Bear Brand Fortified With Zinc Powdered Milk 300g',NULL,'MILK POWDER','Nestlea',NULL,168,0,0.00,5.85,4.88,'NES-PRO-VRPNWQ','559253706091',NULL,'bear-brand-300g','Piece','NES-BEA-WROB81-1766805711639',1.00,'2025-12-27 03:23:46','2026-01-22 00:36:57',NULL,NULL,NULL,NULL),('NES-PRO-Y0FN8S-1766803419794','NESCAFE STICK 35G','NESCAFE STICK 35G',NULL,'COFFEE POWDER','Nescafe','gaming mice',5,0,0.00,10.00,8.33,'NES-PRO-Y0FN8S','857292073332',NULL,'nescafe-stick-35g','Piece','NES-NES-S236BH-1766803358930',1.00,'2025-12-27 02:43:39','2026-01-19 06:16:46',NULL,NULL,NULL,NULL),('prod_iphone15pro','iPhone 15 Pro 256GB','Apple iPhone 15 Pro with 256GB Storage, Titanium Black',NULL,'Smartphones','LOGITECH','gaming mice',12,5,0.00,70990.00,58000.00,'AAPL-PH15P-256','194253701234',NULL,NULL,'Piece',NULL,1.00,'2026-01-09 05:41:05','2026-01-19 05:31:51','supplier_1766805129431','account_1765251132577','account_1765251132577','wh_1766805099379'),('prod_macbookairm2','MacBook Air M2 13\"','Apple MacBook Air with M2 Chip, 8GB RAM, 256GB SSD, Space Gray',NULL,'COFFEE POWDER','LOGITECH',NULL,2,2,0.00,59990.00,49000.00,'AAPL-MBA-M2-256','194253012345',NULL,NULL,'Piece',NULL,1.00,'2026-01-09 05:41:05','2026-01-19 02:08:42',NULL,'account_1765251132577','account_1765251132577','wh_1766805099379'),('prod_mxmaster3s','Logitech MX Master 3S','Logitech MX Master 3S Wireless Performance Mouse',NULL,'Peripherals','Logitech',NULL,21,10,0.00,6590.00,4200.00,'LOGI-MXM3S','097855171234',NULL,NULL,'Piece',NULL,NULL,'2026-01-09 05:41:05','2026-01-19 06:35:04',NULL,'account_1765251132577','account_1765251132577','wh_1766805099379'),('prod_s23ultra','Samsung Galaxy S23 Ultra','Samsung Galaxy S23 Ultra, 12GB RAM, 512GB Storage, Phantom Black',NULL,'Smartphones','Samsung',NULL,7,3,0.00,68990.00,52000.00,'SAMS-S23U-512','8806094761234',NULL,NULL,'Piece',NULL,1.00,'2026-01-09 05:41:05','2026-01-14 09:54:43',NULL,'account_1765251132577','account_1765251132577','wh_1766805099379'),('UNI-DOW-K8J8JB-1767612582041','DOWNY BOX 12S','DOWNY BOX 12S',NULL,'FABRIC CON','UNILIVER','gaming mice',8,5,0.00,150.00,100.00,'UNI-DOW-K8J8JB','912015365994','https://picsum.photos/seed/UNI-DOW-K8J8JB/400/300','downy-box-12s','CASE',NULL,1.00,'2026-01-05 11:29:42','2026-01-14 07:11:57','supplier_1764215002475','cmjqray2200008cbktxyoaavy','cmjqs9s6v00048cbkppvihkuq','wh_1766805099379'),('UNI-MIL-BIY3DC-1766806483584','MILO Powder 1kg','MILO® Powder 1kg',NULL,'MILK POWDER','UNILIVER',NULL,6,10,0.00,600.00,500.00,'UNI-MIL-BIY3DC','183837634003','https://picsum.photos/seed/UNI-MIL-BIY3DC/400/300','milo-powder-1kg','CASE',NULL,1.00,'2025-12-27 03:34:43','2026-01-09 00:46:10','supplier_1766805129431','account_1765251132577','account_1765251163219',NULL),('UNI-PRO-647KV4-1767612624853','DOWNY 12G','DOWNY 12G',NULL,'FABRIC CON','UNILIVER',NULL,95,0,0.00,12.50,8.33,'UNI-PRO-647KV4','281226120524',NULL,'downy-12g','Piece','UNI-DOW-K8J8JB-1767612582041',1.00,'2026-01-05 11:30:24','2026-01-19 04:53:58',NULL,NULL,NULL,NULL),('UNI-PRO-I50IQU-1766806545173','MILO® Powder 1kg','MILO® Powder 1kg',NULL,'MILK POWDER','UNILIVER',NULL,72,0,0.00,50.00,41.67,'UNI-PRO-I50IQU','604955742674',NULL,'milo®-powder-1kg','Piece','UNI-MIL-BIY3DC-1766806483584',1.00,'2025-12-27 03:35:45','2026-01-09 00:46:10',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
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

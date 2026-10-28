-- Sample data for local development.
-- Run AFTER "alembic upgrade head". Running it twice causes duplicate-key errors.

INSERT INTO categories (id, name) VALUES
(1, 'Turntables'),
(2, 'Vinyl Records'),
(3, 'CDs'),
(4, 'Headphones'),
(5, 'Speakers'),
(6, 'Accessories');

INSERT INTO products (name, model, serial_number, description, quantity_in_stock, price, cost, warranty_status, distributor, sold_count, category_id) VALUES
-- Turntables
('Audio-Technica AT-LP60X', 'AT-LP60X-BK', 'SN-TT-0001', 'Fully automatic belt-drive turntable with built-in phono preamp', 12, 249.99, 125.00, '2 years', 'Harmony Audio Distribution', 48, 1),
('Audio-Technica AT-LP120XUSB', 'AT-LP120XUSB', 'SN-TT-0002', 'Direct-drive manual turntable with USB output for digitizing vinyl', 6, 449.99, 230.00, '2 years', 'Harmony Audio Distribution', 21, 1),
('Pro-Ject Debut Carbon EVO', 'DEBUT-EVO', 'SN-TT-0003', 'Audiophile belt-drive turntable with carbon fiber tonearm', 4, 599.00, 320.00, '3 years', 'Vinyl Line Imports', 14, 1),
('Rega Planar 1', 'PLANAR-1', 'SN-TT-0004', 'Minimalist belt-drive turntable, plug and play setup', 0, 529.00, 280.00, '2 years', 'Vinyl Line Imports', 9, 1),
('Sony PS-LX310BT', 'PS-LX310BT', 'SN-TT-0005', 'Automatic turntable with Bluetooth connectivity', 10, 279.99, 140.00, '1 year', 'SoundWave Trading', 33, 1),

-- Vinyl Records
('Miles Davis - Kind of Blue', 'LP-KOB-180', 'SN-VR-0001', 'Classic jazz album on 180g vinyl', 25, 34.99, 15.00, 'No warranty', 'Groove Records Distribution', 95, 2),
('Pink Floyd - The Dark Side of the Moon', 'LP-DSOTM-50', 'SN-VR-0002', 'Progressive rock album, 50th anniversary remaster', 18, 39.99, 18.00, 'No warranty', 'Groove Records Distribution', 120, 2),
('Fleetwood Mac - Rumours', 'LP-RUM-01', 'SN-VR-0003', 'Classic rock album on standard black vinyl', 0, 32.99, 15.00, 'No warranty', 'Groove Records Distribution', 77, 2),
('Barış Manço - Dağlar Dağlar', 'LP-BM-DD', 'SN-VR-0004', 'Anatolian rock compilation on vinyl', 14, 29.99, 13.00, 'No warranty', 'Anadolu Plak', 52, 2),
('Daft Punk - Random Access Memories', 'LP-RAM-2X', 'SN-VR-0005', 'Electronic album on double vinyl', 9, 44.99, 21.00, 'No warranty', 'Groove Records Distribution', 63, 2),
('Sezen Aksu - Firuze', 'LP-SA-FRZ', 'SN-VR-0006', 'Turkish pop classic, remastered vinyl edition', 11, 31.99, 14.00, 'No warranty', 'Anadolu Plak', 41, 2),

-- CDs
('The Beatles - Abbey Road', 'CD-AR-2019', 'SN-CD-0001', 'Classic rock album, 2019 remix on CD', 30, 14.99, 6.00, 'No warranty', 'Groove Records Distribution', 58, 3),
('Norah Jones - Come Away with Me', 'CD-CAWM', 'SN-CD-0002', 'Jazz and pop vocal album on CD', 22, 12.99, 5.50, 'No warranty', 'Groove Records Distribution', 36, 3),
('Tarkan - Karma', 'CD-TK-KRM', 'SN-CD-0003', 'Turkish pop album on CD', 0, 11.99, 5.00, 'No warranty', 'Anadolu Plak', 44, 3),
('Adele - 21', 'CD-ADL-21', 'SN-CD-0004', 'Pop and soul album on CD', 27, 13.99, 6.00, 'No warranty', 'Groove Records Distribution', 70, 3),
('Metallica - Metallica', 'CD-MET-BLK', 'SN-CD-0005', 'Heavy metal album, remastered CD', 15, 15.99, 7.00, 'No warranty', 'Groove Records Distribution', 29, 3),

-- Headphones
('Sony WH-1000XM5', 'WH1000XM5-B', 'SN-HP-0001', 'Wireless over-ear headphones with active noise cancelling', 8, 399.99, 210.00, '2 years', 'SoundWave Trading', 88, 4),
('Audio-Technica ATH-M50x', 'ATH-M50X', 'SN-HP-0002', 'Closed-back studio monitor headphones', 16, 169.00, 85.00, '2 years', 'Harmony Audio Distribution', 67, 4),
('Sennheiser HD 600', 'HD600', 'SN-HP-0003', 'Open-back reference headphones for critical listening', 5, 399.00, 200.00, '2 years', 'Clear Sound Imports', 25, 4),
('Apple AirPods Pro (2nd gen)', 'AIRPODS-PRO2', 'SN-HP-0004', 'Wireless in-ear earbuds with noise cancelling', 0, 249.00, 150.00, '1 year', 'SoundWave Trading', 102, 4),
('JBL Tune 510BT', 'TUNE510BT', 'SN-HP-0005', 'Affordable wireless on-ear Bluetooth headphones', 35, 49.99, 22.00, '1 year', 'SoundWave Trading', 74, 4),

-- Speakers
('Edifier R1280T', 'R1280T', 'SN-SP-0001', 'Powered bookshelf speakers, ideal for turntables', 13, 129.99, 65.00, '2 years', 'Clear Sound Imports', 46, 5),
('Klipsch R-51PM', 'R-51PM', 'SN-SP-0002', 'Powered bookshelf speakers with phono input and Bluetooth', 7, 499.00, 260.00, '2 years', 'Clear Sound Imports', 18, 5),
('Marshall Stanmore III', 'STANMORE-III', 'SN-SP-0003', 'Bluetooth home speaker with vintage design', 9, 379.99, 195.00, '2 years', 'SoundWave Trading', 31, 5),
('JBL Charge 5', 'CHARGE5', 'SN-SP-0004', 'Portable waterproof Bluetooth speaker', 20, 179.99, 90.00, '1 year', 'SoundWave Trading', 59, 5),
('Yamaha NS-6490', 'NS-6490', 'SN-SP-0005', 'Passive 3-way bookshelf speaker pair', 4, 199.00, 100.00, '2 years', 'Harmony Audio Distribution', 12, 5),

-- Accessories
('Audio-Technica AT-VM95E Cartridge', 'AT-VM95E', 'SN-AC-0001', 'Replacement turntable cartridge with elliptical stylus', 15, 69.00, 34.00, '1 year', 'Harmony Audio Distribution', 27, 6),
('Vinyl Record Cleaning Kit', 'CLEAN-KIT-1', 'SN-AC-0002', 'Brush, cleaning fluid and microfiber cloth for vinyl care', 40, 24.99, 10.00, 'No warranty', 'Vinyl Line Imports', 81, 6),
('Anti-Static Inner Sleeves (50 pack)', 'SLEEVE-50', 'SN-AC-0003', 'Protective inner sleeves for 12-inch records', 60, 14.99, 6.00, 'No warranty', 'Vinyl Line Imports', 66, 6),
('Wooden Vinyl Storage Crate', 'CRATE-W80', 'SN-AC-0004', 'Holds up to 80 records, solid wood', 10, 59.99, 28.00, 'No warranty', 'Vinyl Line Imports', 19, 6);

INSERT INTO categories 
    (name) 
VALUES
    ('Turntables'),
    ('Vinyl Records'),
    ('CDs'),
    ('Headphones'),
    ('Speakers');


INSERT INTO products
    (name, model, serial_number, description, quantity_in_stock, price, warranty_status, distributor, sold_count, category_id)
    VALUES
    ('Classic Turntable', 'CT-100', 'SN-TT-0001', 'Belt-drive vinyl player with built-in preamp', 5, 249.99, '2 years', 'Harmony Audio', 10, 1),
    ('Bluetooth Turntable', 'BT-200', 'SN-TT-0002', 'Automatic turntable with Bluetooth output', 0, 279.99, '1 year', 'SoundWave Trading', 25, 1),
    ('Kind of Blue', 'LP-KOB', 'SN-VR-0001', 'Miles Davis jazz album on vinyl', 20, 34.99, 'No warranty', 'Groove Records', 95, 2),
    ('The Dark Side of the Moon', 'LP-DSOTM', 'SN-VR-0002', 'Pink Floyd rock album on vinyl', 12, 39.99, 'No warranty', 'Groove Records', 120, 2),
    ('Jazz Classics CD', 'CD-JC', 'SN-CD-0001', 'Best jazz songs on CD', 15, 12.99, 'No warranty', 'Groove Records', 40, 3),
    ('Wireless Headphones', 'WH-500', 'SN-HP-0001', 'Bluetooth noise cancelling headphones', 0, 199.99, '1 year', 'SoundWave Trading', 30, 4),
    ('Studio Headphones', 'SH-300', 'SN-HP-0002', 'Closed-back headphones for studio use', 8, 149.99, '2 years', 'Harmony Audio', 55, 4),
    ('Bookshelf Speakers', 'BS-80', 'SN-SP-0001', 'Powered speakers, ideal for turntables', 6, 129.99, '2 years', 'Clear Sound', 20, 5);

    
INSERT INTO roles
    (name)
VALUES
    ('Customer'),('Sales Manager'),('Product Manager'),('Support Agent');
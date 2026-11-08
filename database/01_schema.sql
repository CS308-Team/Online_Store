CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE products (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(200)   NOT NULL,
    model             VARCHAR(100)   NOT NULL,
    serial_number     VARCHAR(100)   NOT NULL UNIQUE,
    description       TEXT           NOT NULL,
    quantity_in_stock INT            NOT NULL DEFAULT 0,
    price             DECIMAL(10, 2) NOT NULL,
    warranty_status   VARCHAR(100)   NOT NULL,
    distributor       VARCHAR(200)   NOT NULL,
    sold_count        INT            NOT NULL DEFAULT 0,
    category_id       INT            NOT NULL, -- this line is for linking products to categories
    FOREIGN KEY (category_id) REFERENCES categories(id) -- we made category_id product's foreign key 
);

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    tax_id        VARCHAR(20)  NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    home_address  TEXT         NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INT          NOT NULL DEFAULT 1,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE orders (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT            NOT NULL,
    total_price      DECIMAL(10, 2) NOT NULL,
    status           VARCHAR(20)    NOT NULL DEFAULT 'processing',
    card_last4       CHAR(4)        NOT NULL,
    delivery_address TEXT           NOT NULL,
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)  -- orders should be connected to user 
);

CREATE TABLE order_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT            NOT NULL,
    product_id INT            NOT NULL,
    quantity   INT            NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id), -- order items should be connected to oder 
    FOREIGN KEY (product_id) REFERENCES products(id)  -- order items should be connected to product number
);

CREATE TABLE cart_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    product_id INT NOT NULL,
    quantity   INT NOT NULL,
    FOREIGN KEY (user_id)    REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE (user_id, product_id)
);
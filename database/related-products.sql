USE ProductsApplication;

CREATE TABLE IF NOT EXISTS related_products (
    product_id VARCHAR(36) NOT NULL,
    similar_product_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (product_id, similar_product_id),
    CONSTRAINT fk_related_products_product
        FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT fk_related_products_similar_product
        FOREIGN KEY (similar_product_id) REFERENCES products(product_id),
    CONSTRAINT chk_related_products_not_self
        CHECK (product_id <> similar_product_id)
);

import pymysql
import sys
import time

def get_connection():
    return pymysql.connect(
            host = "localhost",
            port=3308,
            user="store",
            password="store",
            database="store",
            cursorclass=pymysql.cursors.DictCursor,
    )

def read_stock(cursor):
    cursor.execute("SELECT quantity_in_stock FROM products " \
    "WHERE id = %s FOR UPDATE", (1,))
    return cursor.fetchone()["quantity_in_stock"]


def buy(buyer_name):
    connection = get_connection()

    with connection.cursor() as cursor:
        connection.begin()

        stock = read_stock(cursor)
        print(f"{buyer_name}: stock is {stock}")

        if(stock >= 1) :
            print(f"{buyer_name}: paying... (10 seconds)")
            time.sleep(10)
            cursor.execute("UPDATE products SET quantity_in_stock = quantity_in_stock - 1 " \
            "WHERE id = %s" , (1,))
            connection.commit()
            print("Stock after COMMIT:", read_stock(cursor))
        else:
            print(f"{buyer_name}: out of stock, order rejected")
            connection.rollback() 
    connection.close()

buy(sys.argv[1])
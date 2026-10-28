# Online_Store
Online store web application developed for CS 308 Software Engineering at Sabancı University.

## Running locally

### Requirements
- Docker Desktop (must be open)
- Python 3.10+
- Git

### 1. Start the database (from the repository root)
```bash
docker compose up -d
docker ps   # the mysql container should be listed
```

### 2. Set up the backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head            # creates the tables
```

### 3. Load sample products (from the repository root, only once)
```bash
cd ..
docker compose exec -T db mysql -ustore -pstore store < backend/seed/seed.sql
```

### 4. Run the API
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

### 5. Run the tests
```bash
cd backend
python -m pytest -v
```

### Resetting the database
```bash
docker compose down -v          # deletes all data
docker compose up -d
```
Then repeat steps 2 (alembic upgrade head) and 3.

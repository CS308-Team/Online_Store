#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Fri Nov 20 11:35:06 2026

@author: yasinyilmaz
"""

# SHOP-84: checkout and order endpoints need a valid JWT (401 otherwise)
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from main import JWT_ALGORITHM, JWT_SECRET, app, create_access_token

client = TestClient(app)

PROTECTED = [("post", "/payment"), ("post", "/orders"), ("get", "/orders")]


def call(method, path, headers=None):
    if method == "post":
        return client.post(path, json={}, headers=headers or {})
    return client.get(path, headers=headers or {})


def test_no_token_returns_401():
    for method, path in PROTECTED:
        assert call(method, path).status_code == 401, path


def test_garbage_token_returns_401():
    for method, path in PROTECTED:
        r = call(method, path, {"Authorization": "Bearer not-a-real-token"})
        assert r.status_code == 401, path


def test_token_signed_with_wrong_secret_returns_401():
    fake = jwt.encode({"sub": "1", "role": "Customer"}, "wrong-secret", algorithm=JWT_ALGORITHM)
    for method, path in PROTECTED:
        r = call(method, path, {"Authorization": f"Bearer {fake}"})
        assert r.status_code == 401, path


def test_expired_token_returns_401():
    expired = jwt.encode(
        {"sub": "1", "role": "Customer",
         "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )
    for method, path in PROTECTED:
        r = call(method, path, {"Authorization": f"Bearer {expired}"})
        assert r.status_code == 401, path


def test_valid_token_gets_past_auth():
    token = create_access_token(1, "Customer")
    r = client.post("/payment", headers={"Authorization": f"Bearer {token}"}, json={
        "card_holder": "Test User", "card_number": "4111111111111111",
        "expiry_month": 12, "expiry_year": 2028, "cvv": "123",
    })
    assert r.status_code == 200
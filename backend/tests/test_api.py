from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from app.main import app


def equal_body(amount="100.00", members=("alice", "bob", "carol"), paid_by="alice"):
    return {
        "description": "Dinner",
        "paid_by": paid_by,
        "amount": amount,
        "split": {"type": "equal", "members": list(members)},
    }


def post_expense(client, user, body, group_id=1, key=None):
    headers = {"X-User": user}
    if key:
        headers["Idempotency-Key"] = key
    return client.post(f"/groups/{group_id}/expenses", json=body, headers=headers)


def get_balances(client, user, group_id=1):
    return client.get(f"/groups/{group_id}/balances", headers={"X-User": user}).json()


# --- required case 1 ---------------------------------------------------------
def test_equal_split_100_among_three_and_balances_sum_to_zero(client):
    response = post_expense(client, "alice", equal_body("100.00"))

    assert response.status_code == 201
    shares = {s["username"]: s["amount"] for s in response.json()["shares"]}
    assert shares == {"alice": "33.34", "bob": "33.33", "carol": "33.33"}

    result = get_balances(client, "alice")
    balances = {b["username"]: b["balance"] for b in result["balances"]}
    assert balances == {"alice": "66.66", "bob": "-33.33", "carol": "-33.33"}
    assert result["total"] == "0.00"


# --- required case 2 ---------------------------------------------------------
def test_exact_split_not_matching_amount_is_rejected(client):
    body = {
        "description": "Taxi",
        "paid_by": "bob",
        "amount": "100.00",
        "split": {"type": "exact", "shares": {"alice": "50.00", "bob": "40.00"}},
    }
    response = post_expense(client, "bob", body)

    assert response.status_code == 422
    assert "add up" in response.json()["error"]["message"]
    assert client.get("/groups/1/expenses", headers={"X-User": "bob"}).json() == []


# --- required case 3 ---------------------------------------------------------
def test_amount_with_three_decimals_is_rejected(client):
    response = post_expense(client, "alice", equal_body("10.005"))

    assert response.status_code == 422
    assert "2 decimal places" in response.json()["error"]["message"]


def test_zero_and_negative_amounts_are_rejected(client):
    for bad in ("0.00", "-5.00"):
        assert post_expense(client, "alice", equal_body(bad)).status_code == 422


# --- required case 4 ---------------------------------------------------------
def test_repeated_idempotency_key_creates_only_one_expense(client):
    first = post_expense(client, "alice", equal_body(), key="same-key")
    second = post_expense(client, "alice", equal_body(), key="same-key")

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    listing = client.get("/groups/1/expenses", headers={"X-User": "alice"}).json()
    assert len(listing) == 1


def test_idempotency_key_holds_for_concurrent_requests(client):
    def send(_):
        # one client per thread keeps the threads fully independent
        return post_expense(
            TestClient(app), "alice", equal_body("90.00"), key="race-key"
        )

    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(send, range(8)))

    assert all(r.status_code in (200, 201) for r in responses)
    assert sum(r.status_code == 201 for r in responses) == 1
    assert len({r.json()["id"] for r in responses}) == 1
    listing = client.get("/groups/1/expenses", headers={"X-User": "alice"}).json()
    assert len(listing) == 1


# --- required case 5 ---------------------------------------------------------
def test_alice_can_neither_read_nor_write_group_2(client):
    alice = {"X-User": "alice"}

    assert client.get("/groups/2", headers=alice).status_code == 404
    assert client.get("/groups/2/expenses", headers=alice).status_code == 404
    assert client.get("/groups/2/balances", headers=alice).status_code == 404
    write = post_expense(client, "alice", equal_body(members=("bob", "dan")), 2)
    assert write.status_code == 404

    # nothing was written: a real member of group 2 sees an empty list
    assert client.get("/groups/2/expenses", headers={"X-User": "bob"}).json() == []


# --- required case 6 ---------------------------------------------------------
def test_only_the_payer_can_delete_an_expense(client):
    created = post_expense(client, "alice", equal_body("100.00")).json()
    url = f"/groups/1/expenses/{created['id']}"

    denied = client.delete(url, headers={"X-User": "bob"})
    assert denied.status_code == 403
    assert len(client.get("/groups/1/expenses", headers={"X-User": "bob"}).json()) == 1

    assert client.delete(url, headers={"X-User": "alice"}).status_code == 204
    assert client.get("/groups/1/expenses", headers={"X-User": "bob"}).json() == []


# --- extra rules -------------------------------------------------------------
def test_deleted_expense_is_excluded_from_balances(client):
    created = post_expense(client, "alice", equal_body("100.00")).json()
    client.delete(f"/groups/1/expenses/{created['id']}", headers={"X-User": "alice"})

    result = get_balances(client, "alice")
    assert all(b["balance"] == "0.00" for b in result["balances"])
    assert result["total"] == "0.00"


def test_payer_and_split_members_must_belong_to_the_group(client):
    outsider_payer = post_expense(client, "alice", equal_body(paid_by="dan"))
    assert outsider_payer.status_code == 422

    outsider_member = post_expense(
        client, "alice", equal_body(members=("alice", "dan"))
    )
    assert outsider_member.status_code == 422
    assert "dan" in outsider_member.json()["error"]["message"]


def test_missing_or_unknown_user_is_unauthorized(client):
    assert client.get("/groups").status_code == 401
    assert client.get("/groups", headers={"X-User": "mallory"}).status_code == 401

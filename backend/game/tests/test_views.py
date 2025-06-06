import datetime
from unittest.mock import patch

import pytest
from django.test import Client
from ecdsa import SECP256k1, SigningKey
from rest_framework import status
from rest_framework.test import APIClient

from game.models import Challenge, ChallengeSentinel, Save


@pytest.fixture
def setup_challenges():
    # Create sentinel
    ChallengeSentinel.objects.create()

    # Create test challenges
    challenge1 = Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    )
    challenge2 = Challenge.objects.create(
        p2pkh_address="1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
        public_key="02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",
        explorer_link="https://blockchair.com/bitcoin/address/1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
    )
    return challenge1, challenge2


@pytest.mark.django_db(transaction=True)
def test_get_daily_challenge_new(setup_challenges):
    client = Client()
    response = client.get("/api/daily/")
    assert response.status_code == status.HTTP_200_OK

    # Check that a challenge was activated
    active_challenges = Challenge.objects.filter(active=True)
    assert active_challenges.count() == 1

    active_challenge = active_challenges.first()
    assert active_challenge.active_date == datetime.date.today()


@pytest.mark.django_db(transaction=True)
def test_get_daily_challenge_existing_active(setup_challenges):
    challenge1, challenge2 = setup_challenges
    client = Client()
    # Activate a challenge manually
    today = datetime.date.today()
    challenge1.active = True
    challenge1.active_date = today
    challenge1.save()

    response = client.get("/api/daily/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["uuid"] == str(challenge1.uuid)


@pytest.mark.django_db(transaction=True)
@patch("game.views.datetime")
def test_challenge_expiration(mock_datetime, setup_challenges):
    challenge1, challenge2 = setup_challenges
    client = Client()
    # Set up an active challenge from yesterday
    yesterday = datetime.date(2024, 1, 1)
    today = datetime.date(2024, 1, 2)

    challenge1.active = True
    challenge1.active_date = yesterday
    challenge1.save()

    # Mock today's date
    mock_datetime.date.today.return_value = today

    response = client.get("/api/daily/")
    assert response.status_code == status.HTTP_200_OK

    # Check that old challenge was deactivated
    challenge1.refresh_from_db()
    assert not challenge1.active

    # Check that a new challenge was activated
    active_challenges = Challenge.objects.filter(active=True, active_date=today)
    assert active_challenges.count() == 1


@pytest.mark.django_db(transaction=True)
def test_no_challenges_available(setup_challenges):
    client = Client()
    # Mark all challenges as used
    Challenge.objects.all().update(active_date=datetime.date.today())

    with pytest.raises(RuntimeError):
        client.get("/api/daily/")


@pytest.fixture
def challenge():
    return Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    )


@pytest.mark.django_db
def test_retrieve_challenge(challenge):
    client = APIClient()
    response = client.get(f"/api/challenges/{challenge.uuid}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["uuid"] == str(challenge.uuid)


@pytest.fixture
def active_challenge():
    ChallengeSentinel.objects.create()
    return Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        active=True,
        active_date=datetime.date.today(),
    )


@pytest.fixture
def solution_data(active_challenge):
    # Generate valid test data
    signing_key = SigningKey.generate(curve=SECP256k1)
    public_key_hex = signing_key.verifying_key.to_string("compressed").hex()
    message = bytearray.fromhex(public_key_hex) + active_challenge.uuid.bytes
    signature = signing_key.sign(message).hex()
    return {
        "public_key": public_key_hex,
        "signature": signature,
        "signing_key": signing_key,
    }


@pytest.mark.django_db
def test_create_solution_success(active_challenge, solution_data):
    client = APIClient()
    data = {
        "public_key": solution_data["public_key"],
        "signature": solution_data["signature"],
    }
    response = client.post(
        f"/api/challenges/{active_challenge.uuid}/solution/", data, format="json"
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert "uuid" in response.json()


@pytest.mark.django_db
def test_create_solution_inactive_challenge(active_challenge, solution_data):
    client = APIClient()
    active_challenge.active = False
    active_challenge.save()

    data = {
        "public_key": solution_data["public_key"],
        "signature": solution_data["signature"],
    }
    response = client.post(
        f"/api/challenges/{active_challenge.uuid}/solution/", data, format="json"
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.fixture
def test_challenge():
    """Create a test challenge for save tests"""
    return Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        active=True,
        active_date=datetime.date.today(),
    )


@pytest.mark.django_db
def test_create_save_success(test_challenge):
    """Test successful save creation"""
    client = APIClient()
    data = {
        "public_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    }

    response = client.post(
        f"/api/challenges/{test_challenge.uuid}/save/", data, format="json"
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert "uuid" in response.data
    assert response.data["public_key"] == data["public_key"]
    assert str(response.data["challenge"]) == str(test_challenge.uuid)

    # Verify save was created in database
    save = Save.objects.get(uuid=response.data["uuid"])
    assert save.public_key == data["public_key"]
    assert save.challenge == test_challenge


@pytest.mark.django_db
def test_create_save_inactive_challenge():
    """Test save creation for inactive challenge (should still work)"""
    inactive_challenge = Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        active=False,  # Inactive challenge
    )

    client = APIClient()
    data = {
        "public_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    }

    response = client.post(
        f"/api/challenges/{inactive_challenge.uuid}/save/", data, format="json"
    )

    # Should still work for inactive challenges (unlike solutions)
    assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
def test_create_save_invalid_public_key(test_challenge):
    """Test save creation with invalid public key"""
    client = APIClient()

    test_cases = [
        {"public_key": "invalid_key"},
        {"public_key": "12345"},
        {"public_key": ""},
        {"public_key": "gg" + "0" * 64},
    ]

    for data in test_cases:
        response = client.post(
            f"/api/challenges/{test_challenge.uuid}/save/", data, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "public_key" in response.data


@pytest.mark.django_db
def test_create_save_nonexistent_challenge():
    """Test save creation for nonexistent challenge"""
    client = APIClient()
    fake_uuid = "12345678-1234-1234-1234-123456789012"
    data = {
        "public_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    }

    response = client.post(f"/api/challenges/{fake_uuid}/save/", data, format="json")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_create_save_duplicate_allowed(test_challenge):
    """Test that duplicate saves are allowed"""
    client = APIClient()
    data = {
        "public_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    }

    # Create first save
    response1 = client.post(
        f"/api/challenges/{test_challenge.uuid}/save/", data, format="json"
    )
    assert response1.status_code == status.HTTP_201_CREATED

    # Create duplicate save (should be allowed)
    response2 = client.post(
        f"/api/challenges/{test_challenge.uuid}/save/", data, format="json"
    )
    assert response2.status_code == status.HTTP_201_CREATED

    # Should have different UUIDs
    assert response1.data["uuid"] != response2.data["uuid"]

    # Verify both saves exist in database
    saves = Save.objects.filter(public_key=data["public_key"], challenge=test_challenge)
    assert saves.count() == 2


@pytest.mark.django_db
def test_save_different_valid_public_keys(test_challenge):
    """Test saving different valid public keys"""
    client = APIClient()

    valid_keys = [
        "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",  # Generator point
        "03c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",  # Another valid point
        "02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",  # Another valid point
    ]

    for public_key in valid_keys:
        data = {"public_key": public_key}
        response = client.post(
            f"/api/challenges/{test_challenge.uuid}/save/", data, format="json"
        )
        assert (
            response.status_code == status.HTTP_201_CREATED
        ), f"Failed for key: {public_key}"
        assert response.data["public_key"] == public_key

    # Verify all saves were created
    assert Save.objects.filter(challenge=test_challenge).count() == len(valid_keys)

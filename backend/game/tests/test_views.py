import datetime
from unittest.mock import patch

import pytest
from django.test import Client, TransactionTestCase
from ecdsa import SECP256k1, SigningKey
from rest_framework import status
from rest_framework.test import APIClient

from game.models import Challenge, ChallengeSentinel


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
def guess_data(active_challenge):
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
def test_create_guess_success(active_challenge, guess_data):
    client = APIClient()
    data = {
        "public_key": guess_data["public_key"],
        "signature": guess_data["signature"],
    }
    response = client.post(
        f"/api/challenges/{active_challenge.uuid}/guess/", data, format="json"
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert "uuid" in response.json()


@pytest.mark.django_db
def test_create_guess_inactive_challenge(active_challenge, guess_data):
    client = APIClient()
    active_challenge.active = False
    active_challenge.save()

    data = {
        "public_key": guess_data["public_key"],
        "signature": guess_data["signature"],
    }
    response = client.post(
        f"/api/challenges/{active_challenge.uuid}/guess/", data, format="json"
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_guess_limit_enforcement(active_challenge):
    from project.settings import MAX_GUESSES

    client = APIClient()
    # Make MAX_GUESSES + 1 requests
    for i in range(MAX_GUESSES + 1):
        # Generate new signature for each request
        signing_key = SigningKey.generate(curve=SECP256k1)
        public_key = signing_key.verifying_key.to_string("compressed").hex()
        message = bytearray.fromhex(public_key) + active_challenge.uuid.bytes
        signature = signing_key.sign(message).hex()

        data = {
            "public_key": public_key,
            "signature": signature,
        }

        response = client.post(
            f"/api/challenges/{active_challenge.uuid}/guess/", data, format="json"
        )

        if i < MAX_GUESSES:
            assert response.status_code == status.HTTP_201_CREATED
        else:
            assert response.status_code == status.HTTP_403_FORBIDDEN

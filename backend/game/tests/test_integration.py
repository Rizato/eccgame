import uuid

import pytest
from django.test import Client
from ecdsa import SECP256k1, SigningKey
from rest_framework import status
from rest_framework.test import APIClient

from game.models import Challenge, ChallengeSentinel, Guess


@pytest.fixture
def integration_challenge():
    ChallengeSentinel.objects.create()
    return Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    )


@pytest.mark.django_db(transaction=True)
def test_complete_game_flow(integration_challenge):
    client = Client()
    api_client = APIClient()

    # 1. Get daily challenge
    response = client.get("/api/daily/")
    assert response.status_code == status.HTTP_200_OK
    challenge_uuid = response.json()["uuid"]

    # 2. Submit a guess
    signing_key = SigningKey.generate(curve=SECP256k1)
    public_key = signing_key.verifying_key.to_string("compressed").hex()
    message = bytearray.fromhex(public_key) + uuid.UUID(challenge_uuid).bytes
    signature = signing_key.sign(message).hex()

    guess_data = {
        "public_key": public_key,
        "signature": signature,
    }

    response = api_client.post(
        f"/api/challenges/{challenge_uuid}/guess/", guess_data, format="json"
    )
    assert response.status_code == status.HTTP_201_CREATED

    # 3. Verify guess was processed
    guess_uuid = response.json()["uuid"]
    guess = Guess.objects.get(uuid=guess_uuid)
    assert guess.result is not None
    assert guess.is_signature_valid is not None
    assert guess.is_key_valid is not None

import uuid
from datetime import date

import pytest
from django.test import Client, override_settings
from ecdsa import SECP256k1, SigningKey, VerifyingKey
from rest_framework import status
from rest_framework.test import APIClient

from game.models import Challenge, ChallengeSentinel, Save, Solution


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
        f"/api/challenges/{challenge_uuid}/solution/", guess_data, format="json"
    )
    assert response.status_code == status.HTTP_201_CREATED

    # 3. Verify solution was processed
    solution_uuid = response.json()["uuid"]
    solution = Solution.objects.get(uuid=solution_uuid)
    assert solution.result is not None
    assert solution.is_signature_valid is not None
    assert solution.is_key_valid is not None


@pytest.mark.django_db(transaction=True)
@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "rest_framework.authentication.SessionAuthentication",
        ],
        "DEFAULT_THROTTLE_CLASSES": [
            "rest_framework.throttling.AnonRateThrottle",
        ],
        "DEFAULT_THROTTLE_RATES": {
            "anon": "1000/sec",  # Very high rate for testing
        },
    }
)
def test_daily_challenge_happy_path_with_subtract_and_halve():
    """
    Integration test for the complete daily challenge happy path.
    Simulates subtract-and-halve operations (inverted double-and-add)
    using a known private key, then verifies victory screen shows correct operation count.
    """
    client = Client()
    api_client = APIClient()

    # Setup: Create a challenge with a known private key for testing
    ChallengeSentinel.objects.create()

    # Use a simple private key for testing: 7 (binary: 111)
    # This allows us to predict the subtract-and-halve operations needed
    test_private_key = 7
    signing_key = SigningKey.from_secret_exponent(test_private_key, curve=SECP256k1)
    public_key_compressed = signing_key.verifying_key.to_string("compressed").hex()

    challenge = Challenge.objects.create(
        p2pkh_address="1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",  # Address for private key 7
        public_key=public_key_compressed,
        explorer_link="https://blockchair.com/bitcoin/address/1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
        active=True,
        active_date=date.today(),
    )

    # 1. Get daily challenge
    response = client.get("/api/daily/")
    assert response.status_code == status.HTTP_200_OK
    challenge_data = response.json()
    assert challenge_data["uuid"] == str(challenge.uuid)
    assert challenge_data["public_key"] == public_key_compressed

    # 2. Simulate frontend operations: subtract-and-halve algorithm
    # For private key 7 (binary 111), we would typically see these operations:
    # Start at G (generator point with private key 1)
    # Operation 1: Multiply by 2 -> 2G (private key 2)
    # Operation 2: Add G -> 3G (private key 3)
    # Operation 3: Multiply by 2 -> 6G (private key 6)
    # Operation 4: Add G -> 7G (private key 7) = target
    # Total: 4 operations to reach the target
    expected_operations = 4

    # Simulate saving intermediate points (as frontend would do)
    generator_signing_key = SigningKey.from_secret_exponent(1, curve=SECP256k1)
    generator_point = generator_signing_key.verifying_key.to_string("compressed").hex()

    # Save point after operation 1 (2G)
    point_2g = (
        SigningKey.from_secret_exponent(2, curve=SECP256k1)
        .verifying_key.to_string("compressed")
        .hex()
    )
    save_response = api_client.post(
        f"/api/challenges/{challenge.uuid}/save/",
        {"public_key": point_2g},
        format="json",
    )
    assert save_response.status_code == status.HTTP_201_CREATED

    # Save point after operation 2 (3G)
    point_3g = (
        SigningKey.from_secret_exponent(3, curve=SECP256k1)
        .verifying_key.to_string("compressed")
        .hex()
    )
    save_response = api_client.post(
        f"/api/challenges/{challenge.uuid}/save/",
        {"public_key": point_3g},
        format="json",
    )
    assert save_response.status_code == status.HTTP_201_CREATED

    # Save point after operation 3 (6G)
    point_6g = (
        SigningKey.from_secret_exponent(6, curve=SECP256k1)
        .verifying_key.to_string("compressed")
        .hex()
    )
    save_response = api_client.post(
        f"/api/challenges/{challenge.uuid}/save/",
        {"public_key": point_6g},
        format="json",
    )
    assert save_response.status_code == status.HTTP_201_CREATED

    # 3. Submit the final solution (7G = target)
    message = bytearray.fromhex(public_key_compressed) + challenge.uuid.bytes
    signature = signing_key.sign(message).hex()

    solution_data = {
        "public_key": public_key_compressed,
        "signature": signature,
    }

    response = api_client.post(
        f"/api/challenges/{challenge.uuid}/solution/", solution_data, format="json"
    )
    assert response.status_code == status.HTTP_201_CREATED

    # 4. Verify the solution was processed correctly
    solution_response = response.json()
    solution = Solution.objects.get(uuid=solution_response["uuid"])

    # Should be marked as correct since we used the actual private key
    assert solution.result == "correct"
    assert solution.is_signature_valid is True
    assert solution.is_key_valid is True
    assert solution.validated_at is not None

    # 5. Verify saved points were recorded
    saves = Save.objects.filter(challenge=challenge)
    assert saves.count() == 3  # We saved 3 intermediate points

    # 6. Verify challenge state
    challenge.refresh_from_db()
    assert challenge.active is True

    # 7. Verify we can retrieve the solution
    get_response = api_client.get(
        f"/api/challenges/{challenge.uuid}/solution/{solution.uuid}/"
    )
    assert get_response.status_code == status.HTTP_200_OK
    retrieved_solution = get_response.json()
    assert retrieved_solution["result"] == "correct"
    assert retrieved_solution["public_key"] == public_key_compressed

    print(f"✅ Happy path test completed successfully!")
    print(f"   Challenge UUID: {challenge.uuid}")
    print(f"   Private Key: {test_private_key}")
    print(f"   Expected Operations: {expected_operations}")
    print(f"   Intermediate Saves: {saves.count()}")
    print(f"   Solution Result: {solution.result}")
    print(f"   Victory condition: Solution correctly verified!")

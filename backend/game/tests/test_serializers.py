import pytest
from ecdsa import SECP256k1, SigningKey

from game.models import Challenge, Metadata, Save, Solution
from game.serializers import ChallengeSerializer, SaveSerializer, SolutionSerializer


@pytest.fixture
def challenge_with_metadata():
    challenge = Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    )
    Metadata.objects.create(name="test_tag", challenge=challenge)
    return challenge


@pytest.mark.django_db
def test_challenge_serialization(challenge_with_metadata, rf):
    # Use RequestFactory to create a mock request
    request = rf.get("/")
    serializer = ChallengeSerializer(
        challenge_with_metadata, context={"request": request}
    )
    data = serializer.data

    assert str(data["uuid"]) == str(challenge_with_metadata.uuid)
    assert data["p2pkh_address"] == challenge_with_metadata.p2pkh_address
    assert data["public_key"] == challenge_with_metadata.public_key
    assert data["explorer_link"] == challenge_with_metadata.explorer_link
    assert len(data["metadata"]) == 1
    assert data["metadata"][0]["name"] == "test_tag"


@pytest.fixture
def solution_serializer_data():
    challenge = Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    )

    # Generate valid test data
    signing_key = SigningKey.generate(curve=SECP256k1)
    public_key_hex = signing_key.verifying_key.to_string("compressed").hex()
    message = bytearray.fromhex(public_key_hex) + challenge.uuid.bytes
    signature = signing_key.sign(message).hex()

    return {
        "challenge": challenge,
        "signing_key": signing_key,
        "public_key_hex": public_key_hex,
        "signature": signature,
    }


@pytest.mark.django_db
def test_valid_solution_data(solution_serializer_data):
    data = {
        "public_key": solution_serializer_data["public_key_hex"],
        "signature": solution_serializer_data["signature"],
    }
    serializer = SolutionSerializer(data=data)
    # Test that the data validates the basic structure
    assert serializer.is_valid()


@pytest.mark.django_db
def test_validate_key_method(solution_serializer_data):
    # Test the validate_key method directly
    serializer = SolutionSerializer()
    # Valid key should not raise exception
    result = serializer.validate_key(solution_serializer_data["public_key_hex"])
    assert result == solution_serializer_data["public_key_hex"]


@pytest.mark.django_db
def test_invalid_public_key_validation():
    serializer = SolutionSerializer()
    # Invalid key should raise ValidationError
    with pytest.raises(Exception):
        serializer.validate_key("invalid_key")


@pytest.mark.django_db
def test_invalid_signature_length(solution_serializer_data):
    data = {
        "public_key": solution_serializer_data["public_key_hex"],
        "signature": "short",
    }
    serializer = SolutionSerializer(data=data)
    assert not serializer.is_valid()
    assert "signature" in serializer.errors


@pytest.mark.django_db
def test_invalid_signature_hex(solution_serializer_data):
    data = {
        "public_key": solution_serializer_data["public_key_hex"],
        "signature": "g" * 128,  # Invalid hex characters
    }
    serializer = SolutionSerializer(data=data)
    assert not serializer.is_valid()
    assert "signature" in serializer.errors


@pytest.fixture
def sample_challenge_for_save():
    return Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    )


@pytest.mark.django_db
def test_save_serializer_valid_data(sample_challenge_for_save):
    """Test SaveSerializer with valid data"""
    data = {
        "public_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    }

    serializer = SaveSerializer(data=data)
    assert serializer.is_valid(), f"Validation errors: {serializer.errors}"

    # Test that we can save the serializer
    save_instance = serializer.save(challenge=sample_challenge_for_save)
    assert save_instance.public_key == data["public_key"]
    assert save_instance.challenge == sample_challenge_for_save


@pytest.mark.django_db
def test_save_serializer_serialization(sample_challenge_for_save):
    """Test SaveSerializer serialization of existing instance"""
    save = Save.objects.create(
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        challenge=sample_challenge_for_save,
    )

    serializer = SaveSerializer(save)
    data = serializer.data

    assert str(data["uuid"]) == str(save.uuid)
    assert data["public_key"] == save.public_key
    assert str(data["challenge"]) == str(save.challenge.uuid)
    assert "created_at" in data


@pytest.mark.django_db
def test_save_serializer_invalid_public_key():
    """Test SaveSerializer with invalid public key"""
    test_cases = [
        {"public_key": "invalid_key", "error": "Invalid public key"},
        {"public_key": "12345", "error": "Too short"},
        {"public_key": "gg" + "0" * 64, "error": "Invalid hex"},
        {"public_key": "", "error": "Empty key"},
        {"public_key": "0" * 65, "error": "Wrong length odd"},
        {"public_key": "0" * 67, "error": "Wrong length"},
    ]

    for case in test_cases:
        data = {"public_key": case["public_key"]}
        serializer = SaveSerializer(data=data)
        assert not serializer.is_valid(), f"Should fail for: {case['error']}"
        assert (
            "public_key" in serializer.errors
        ), f"Should have public_key error for: {case['error']}"


@pytest.mark.django_db
def test_save_serializer_valid_compressed_public_keys():
    """Test SaveSerializer with various valid compressed public keys"""
    valid_keys = [
        "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",  # Generator point
        "03c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",  # Another valid point
        "02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",  # Another valid point
    ]

    for public_key in valid_keys:
        data = {"public_key": public_key}
        serializer = SaveSerializer(data=data)
        assert (
            serializer.is_valid()
        ), f"Should be valid: {public_key}, errors: {serializer.errors}"


@pytest.mark.django_db
def test_save_serializer_uncompressed_public_key_invalid():
    """Test that uncompressed public keys are rejected"""
    # Uncompressed version of generator point (starts with 04, 65 bytes = 130 hex chars)
    uncompressed_key = "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8"

    data = {"public_key": uncompressed_key}
    serializer = SaveSerializer(data=data)
    assert not serializer.is_valid()
    assert "public_key" in serializer.errors


@pytest.mark.django_db
def test_save_serializer_read_only_fields(sample_challenge_for_save):
    """Test that read-only fields cannot be set through serializer"""
    data = {
        "public_key": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        "uuid": "12345678-1234-1234-1234-123456789012",  # Try to set read-only field
        "challenge": str(sample_challenge_for_save.uuid),  # Try to set read-only field
        "created_at": "2023-01-01T00:00:00Z",  # Try to set read-only field
    }

    serializer = SaveSerializer(data=data)
    assert serializer.is_valid()

    save_instance = serializer.save(challenge=sample_challenge_for_save)

    # Read-only fields should not be affected by the input data
    assert str(save_instance.uuid) != data["uuid"]  # UUID should be auto-generated
    assert (
        save_instance.challenge == sample_challenge_for_save
    )  # Set via save() parameter
    assert (
        save_instance.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") != data["created_at"]
    )  # Auto-set

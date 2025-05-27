import pytest
from ecdsa import SECP256k1, SigningKey

from game.models import Challenge, Metadata
from game.serializers import ChallengeSerializer, GuessSerializer


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
def guess_serializer_data():
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
def test_valid_guess_data(guess_serializer_data):
    data = {
        "public_key": guess_serializer_data["public_key_hex"],
        "signature": guess_serializer_data["signature"],
    }
    serializer = GuessSerializer(data=data)
    # Test that the data validates the basic structure
    assert serializer.is_valid()


@pytest.mark.django_db
def test_validate_key_method(guess_serializer_data):
    # Test the validate_key method directly
    serializer = GuessSerializer()
    # Valid key should not raise exception
    result = serializer.validate_key(guess_serializer_data["public_key_hex"])
    assert result == guess_serializer_data["public_key_hex"]


@pytest.mark.django_db
def test_invalid_public_key_validation():
    serializer = GuessSerializer()
    # Invalid key should raise ValidationError
    with pytest.raises(Exception):
        serializer.validate_key("invalid_key")


@pytest.mark.django_db
def test_invalid_signature_length(guess_serializer_data):
    data = {
        "public_key": guess_serializer_data["public_key_hex"],
        "signature": "short",
    }
    serializer = GuessSerializer(data=data)
    assert not serializer.is_valid()
    assert "signature" in serializer.errors


@pytest.mark.django_db
def test_invalid_signature_hex(guess_serializer_data):
    data = {
        "public_key": guess_serializer_data["public_key_hex"],
        "signature": "g" * 128,  # Invalid hex characters
    }
    serializer = GuessSerializer(data=data)
    assert not serializer.is_valid()
    assert "signature" in serializer.errors

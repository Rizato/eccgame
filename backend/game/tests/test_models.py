import datetime
import uuid

import pytest
from ecdsa import SECP256k1, SigningKey

from game.models import Challenge, ChallengeSentinel, Guess, Metadata


@pytest.fixture
def sample_challenge():
    return Challenge.objects.create(
        p2pkh_address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        explorer_link="https://blockchair.com/bitcoin/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    )


@pytest.mark.django_db
def test_challenge_creation(sample_challenge):
    assert isinstance(sample_challenge.uuid, uuid.UUID)
    assert sample_challenge.p2pkh_address == "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    assert (
        sample_challenge.public_key
        == "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
    )
    assert not sample_challenge.active
    assert sample_challenge.active_date is None


@pytest.mark.django_db
def test_sentinel_creation():
    sentinel = ChallengeSentinel.objects.create()
    assert sentinel.updated_at is not None
    assert sentinel.updated_at == datetime.date.today()


@pytest.mark.django_db
def test_metadata_creation(sample_challenge):
    metadata = Metadata.objects.create(name="test_tag", challenge=sample_challenge)
    assert metadata.name == "test_tag"
    assert metadata.challenge == sample_challenge
    assert metadata in sample_challenge.metadata.all()


@pytest.fixture
def guess_test_data(sample_challenge):
    # Generate a valid private key and signature for testing
    signing_key = SigningKey.generate(curve=SECP256k1)
    verifying_key = signing_key.verifying_key
    public_key_hex = verifying_key.to_string("compressed").hex()

    # Create signature: public_key + challenge_uuid
    message = bytearray.fromhex(public_key_hex) + sample_challenge.uuid.bytes
    signature = signing_key.sign(message).hex()

    return {
        "challenge": sample_challenge,
        "signing_key": signing_key,
        "public_key_hex": public_key_hex,
        "signature": signature,
    }


@pytest.mark.django_db
def test_guess_creation(guess_test_data):
    data = guess_test_data
    guess = Guess.objects.create(
        public_key=data["public_key_hex"],
        challenge=data["challenge"],
        signature=data["signature"],
    )
    assert isinstance(guess.uuid, uuid.UUID)
    assert guess.public_key == data["public_key_hex"]
    assert guess.challenge == data["challenge"]
    assert guess.result is None


@pytest.mark.django_db
def test_evaluate_key_correct(guess_test_data):
    data = guess_test_data
    # Use the same public key as the challenge
    guess = Guess.objects.create(
        public_key=data["challenge"].public_key,
        challenge=data["challenge"],
        signature=data["signature"],
    )
    guess.evaluate_key()
    assert guess.result == "correct"
    assert guess.is_key_valid


@pytest.mark.django_db
def test_evaluate_key_incorrect(guess_test_data):
    data = guess_test_data
    # Test with a different valid key (should be incorrect)
    different_signing_key = SigningKey.generate(curve=SECP256k1)
    different_public_key = different_signing_key.verifying_key.to_string(
        "compressed"
    ).hex()

    guess = Guess.objects.create(
        public_key=different_public_key,
        challenge=data["challenge"],
        signature=data["signature"],
    )
    guess.evaluate_key()
    assert guess.result == "incorrect"
    assert guess.is_key_valid


@pytest.mark.django_db
def test_evaluate_key_invalid(guess_test_data):
    data = guess_test_data
    invalid_key = "invalid_public_key"
    guess = Guess.objects.create(
        public_key=invalid_key,
        challenge=data["challenge"],
        signature=data["signature"],
    )
    guess.evaluate_key()
    assert guess.result == "incorrect"
    assert not guess.is_key_valid
    assert guess.validated_at is not None


@pytest.mark.django_db
def test_verify_valid_signature(guess_test_data):
    data = guess_test_data
    guess = Guess.objects.create(
        public_key=data["public_key_hex"],
        challenge=data["challenge"],
        signature=data["signature"],
    )
    guess.verify()
    assert guess.is_signature_valid
    assert guess.validated_at is not None


@pytest.mark.django_db
def test_verify_invalid_signature(guess_test_data):
    data = guess_test_data
    invalid_signature = "a" * 128  # Invalid signature
    guess = Guess.objects.create(
        public_key=data["public_key_hex"],
        challenge=data["challenge"],
        signature=invalid_signature,
    )
    guess.verify()
    assert not guess.is_signature_valid
    assert guess.validated_at is not None

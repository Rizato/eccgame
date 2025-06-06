import datetime
import uuid

import pytest
from ecdsa import SECP256k1, SigningKey

from game.models import Challenge, ChallengeSentinel, Metadata, Save, Solution


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
def solution_test_data(sample_challenge):
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
def test_solution_creation(solution_test_data):
    data = solution_test_data
    solution = Solution.objects.create(
        public_key=data["public_key_hex"],
        challenge=data["challenge"],
        signature=data["signature"],
    )
    assert isinstance(solution.uuid, uuid.UUID)
    assert solution.public_key == data["public_key_hex"]
    assert solution.challenge == data["challenge"]
    assert solution.result is None


@pytest.mark.django_db
def test_evaluate_key_correct(solution_test_data):
    data = solution_test_data
    # Use the same public key as the challenge
    solution = Solution.objects.create(
        public_key=data["challenge"].public_key,
        challenge=data["challenge"],
        signature=data["signature"],
    )
    solution.evaluate_key()
    assert solution.result == "correct"
    assert solution.is_key_valid


@pytest.mark.django_db
def test_evaluate_key_incorrect(solution_test_data):
    data = solution_test_data
    # Test with a different valid key (should be incorrect)
    different_signing_key = SigningKey.generate(curve=SECP256k1)
    different_public_key = different_signing_key.verifying_key.to_string(
        "compressed"
    ).hex()

    solution = Solution.objects.create(
        public_key=different_public_key,
        challenge=data["challenge"],
        signature=data["signature"],
    )
    solution.evaluate_key()
    assert solution.result == "incorrect"
    assert solution.is_key_valid


@pytest.mark.django_db
def test_evaluate_key_invalid(solution_test_data):
    data = solution_test_data
    invalid_key = "invalid_public_key"
    solution = Solution.objects.create(
        public_key=invalid_key,
        challenge=data["challenge"],
        signature=data["signature"],
    )
    solution.evaluate_key()
    assert solution.result == "incorrect"
    assert not solution.is_key_valid
    assert solution.validated_at is not None


@pytest.mark.django_db
def test_verify_valid_signature(solution_test_data):
    data = solution_test_data
    solution = Solution.objects.create(
        public_key=data["public_key_hex"],
        challenge=data["challenge"],
        signature=data["signature"],
    )
    solution.verify()
    assert solution.is_signature_valid
    assert solution.validated_at is not None


@pytest.mark.django_db
def test_verify_invalid_signature(solution_test_data):
    data = solution_test_data
    invalid_signature = "a" * 128  # Invalid signature
    solution = Solution.objects.create(
        public_key=data["public_key_hex"],
        challenge=data["challenge"],
        signature=invalid_signature,
    )
    solution.verify()
    assert not solution.is_signature_valid
    assert solution.validated_at is not None


@pytest.mark.django_db
def test_save_creation(sample_challenge):
    """Test basic Save model creation"""
    save = Save.objects.create(
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        challenge=sample_challenge,
    )
    assert isinstance(save.uuid, uuid.UUID)
    assert (
        save.public_key
        == "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
    )
    assert save.challenge == sample_challenge
    assert save.created_at is not None


@pytest.mark.django_db
def test_save_relationship_with_challenge(sample_challenge):
    """Test the relationship between Save and Challenge"""
    save1 = Save.objects.create(
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        challenge=sample_challenge,
    )
    save2 = Save.objects.create(
        public_key="03c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",
        challenge=sample_challenge,
    )

    # Test that saves are accessible through the challenge
    assert save1 in sample_challenge.saves.all()
    assert save2 in sample_challenge.saves.all()
    assert sample_challenge.saves.count() == 2


@pytest.mark.django_db
def test_save_duplicate_public_keys_allowed(sample_challenge):
    """Test that duplicate public keys are allowed (for pattern analysis)"""
    public_key = "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"

    # Create multiple saves with same public key
    save1 = Save.objects.create(
        public_key=public_key,
        challenge=sample_challenge,
    )
    save2 = Save.objects.create(
        public_key=public_key,
        challenge=sample_challenge,
    )

    # Both should be created successfully
    assert save1.public_key == save2.public_key
    assert save1.uuid != save2.uuid  # Different UUIDs
    assert Save.objects.filter(public_key=public_key).count() == 2


@pytest.mark.django_db
def test_save_cascade_delete(sample_challenge):
    """Test that saves are deleted when challenge is deleted"""
    save = Save.objects.create(
        public_key="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        challenge=sample_challenge,
    )

    save_id = save.uuid
    challenge_id = sample_challenge.uuid

    # Delete the challenge
    sample_challenge.delete()

    # Save should also be deleted
    assert not Save.objects.filter(uuid=save_id).exists()
    assert not Challenge.objects.filter(uuid=challenge_id).exists()

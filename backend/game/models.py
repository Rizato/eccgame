import uuid

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as translate_lazy
from ecdsa import (
    BadDigestError,
    BadSignatureError,
    MalformedPointError,
    SECP256k1,
    VerifyingKey,
)


class Metadata(models.Model):
    """
    Individual tags that can be applied to a challenge
    """

    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


# Create your models here
class Challenge(models.Model):
    """
    A challenge for any given day
    """

    uuid = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)
    public_key = models.CharField(max_length=66)
    metadata = models.ManyToManyField(Metadata, related_name="metadata")
    explorer_link = models.URLField()
    active = models.BooleanField(default=False)
    active_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Guess(models.Model):
    """
    Represents a guess for a particular challenge
    """

    class ResultChoices(models.TextChoices):
        CORRECT = "correct", translate_lazy("Correct")
        INCORRECT = "incorrect", translate_lazy("Incorrect")
        NEGATED = "negated", translate_lazy("Negated")

    # TODO Always check if a public key is in the challenge table during a guess
    # TODO Guesses must be SIGNED! That is how they prove they got the key correct
    uuid = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)
    public_key = models.CharField(max_length=66)
    # Checks if the key is even a point on the ecc curve
    challenge = models.ForeignKey(
        Challenge, on_delete=models.CASCADE, related_name="challenge"
    )
    result = models.CharField(choices=ResultChoices, null=True, blank=True)
    signature = models.CharField(max_length=128)  # raw hex signature
    is_signature_valid = models.BooleanField(null=True, blank=True)
    is_key_valid = models.BooleanField(null=True, blank=True)
    validated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def evaluate_key(self):
        # Load keys of target and self, compare x value
        challenge = VerifyingKey.from_string(
            bytearray.fromhex(self.challenge.public_key), curve=SECP256k1
        )
        updates = ["result", "is_key_valid"]
        try:
            guess = VerifyingKey.from_string(
                bytearray.fromhex(self.public_key), curve=SECP256k1, validate_point=True
            )
            self.is_key_valid = True
            if challenge.pubkey == guess.pubkey:
                self.result = "correct"
            elif challenge.pubkey.x() == guess.pubkey.x():
                self.result = "negated"
            else:
                self.result = "incorrect"
        except (ValueError, MalformedPointError):
            self.result = "incorrect"
            self.is_key_valid = False
            self.validated_at = timezone.now()
            updates.append("validated_at")
        finally:
            self.save(update_fields=updates)

    def verify(self):
        vk = VerifyingKey.from_string(
            bytearray.fromhex(self.public_key), curve=SECP256k1
        )
        try:
            message = bytearray.fromhex(self.public_key) + self.challenge.uuid.bytes
            vk.verify(
                self.signature, message, allow_truncate=False
            )  # Returns true, or throws exception
            self.is_signature_valid = True
        except (ValueError, BadSignatureError, BadDigestError) as e:
            self.is_signature_valid = False
        finally:
            self.validated_at = timezone.now()
            self.save(update_fields=["is_signature_valid", "validated_at"])

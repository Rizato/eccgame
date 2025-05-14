import uuid

from django.db import models

class PublicKey(models.Model):
    """
    PublicKey represents a point on an elliptic curve
    """
    x = models.BigIntegerField()
    y = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


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
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, blank=True, unique=True)
    public_key = models.ForeignKey(PublicKey, on_delete=models.CASCADE, related_name='public_key')
    metadata = models.ManyToManyField(Metadata, related_name='metadata')
    explorer_link = models.URLField()
    # TODO Validate that this target is active when guessing
    active = models.BooleanField(default=False)
    used_on = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Guess(models.Model):
    """
    Represents a guess for a particular challenge
    """
    # TODO Always check if a public key is in the challenge table during a guess
    # TODO Guesses must be SIGNED! That is how they prove they got the key correct
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, blank=True, unique=True)
    submitted_key = models.ForeignKey(PublicKey, on_delete=models.CASCADE, related_name='submitted_key')
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, to_field="uuid", related_name='challenge')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

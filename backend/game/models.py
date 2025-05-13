import uuid

from django.db import models

class PublicKey(models.Model):
    """
    PublicKey represents a point on an elliptic curve
    """
    x = models.BigIntegerField(editable=False)
    y = models.BigIntegerField(editable=False)
    private_key = models.BigIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Metadata(models.Model):
    """
    Individual tags that can be applied to a target
    """
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# Create your models here
class Target(models.Model):
    """
    A target for any given day
    """
    public_key = models.ForeignKey(PublicKey, on_delete=models.CASCADE, related_name='public_key')
    metadata = models.ManyToManyField(Metadata, related_name='metadata')
    explorer_link = models.URLField()
    half = models.ForeignKey(PublicKey, on_delete=models.SET_NULL, null=True, blank=True, related_name='half')
    double = models.ForeignKey(PublicKey, on_delete=models.SET_NULL, null=True, blank=True, related_name='double')
    used_on = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Guess(models.Model):
    """
    Represents a guess for a particular target
    """
    # TODO Always check if a public key is in the target table during a guess
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, blank=True, unique=True)
    submitted_key = models.BigIntegerField()
    target = models.ForeignKey(Target, on_delete=models.CASCADE, related_name='target')
    distance = models.ForeignKey(PublicKey, on_delete=models.SET_NULL, null=True, blank=True, related_name='distance')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

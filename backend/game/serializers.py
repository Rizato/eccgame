from ecdsa import MalformedPointError, SECP256k1, VerifyingKey
from rest_framework import serializers

from game.models import Challenge, Guess, Metadata


class MetaDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metadata
        fields = ("name",)


class ChallengeSerializer(serializers.ModelSerializer):
    metadata = MetaDataSerializer(many=True)
    showHalf = serializers.BooleanField(default=False)
    showDouble = serializers.BooleanField(default=False)
    showGraph = serializers.BooleanField(default=False)
    showPlaypen = serializers.BooleanField(default=False)
    guesses = serializers.IntegerField(default=0)

    class Meta:
        model = Challenge
        fields = (
            "uuid",
            "p2pkh_address",
            "metadata",
            "explorer_link",
            "public_key",
            "showHalf",
            "showDouble",
            "showGraph",
            "showPlaypen",
            "guesses",
            "active",
            "active_date",
        )


class GuessSerializer(serializers.ModelSerializer):
    public_key = serializers.CharField(max_length=66)  # 9.62 compressed
    challenge = serializers.PrimaryKeyRelatedField(
        queryset=Challenge.objects.filter(active=True)
    )
    signature = serializers.CharField(max_length=128)  # hex string of signature data

    def validate_key(self, value):
        try:
            VerifyingKey.from_string(
                bytearray.fromhex(value), curve=SECP256k1, validate_point=True
            )
        except (ValueError, MalformedPointError):
            raise serializers.ValidationError(
                "Public Key must be valid a ANSI x9.62 public key as a hexadecimal string"
            )

        return value

    def validate_signature(self, value):
        """
        Validate that the signature appears to look like a signature, not doing any verification
        """
        if len(value) != 128:
            raise serializers.ValidationError("Must be a 128 characters")
        return self._validate_hex(value)

    @staticmethod
    def _validate_hex(value):
        try:
            bytearray.fromhex(value)
        except ValueError:
            raise serializers.ValidationError("Invalid hexadecimal number")
        return value

    class Meta:
        model = Guess
        fields = (
            "public_key",
            "challenge",
            "signature",
            "result",
            "is_signature_valid",
            "is_key_valid",
            "validated_at",
        )
        read_only_fields = (
            "result",
            "is_signature_valid",
            "is_key_valid",
            "validated_at",
        )

from rest_framework import serializers

from backend.game.models import Challenge, Guess, Metadata, PublicKey


class PublicKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicKey
        fields = (
            "x",
            "y",
        )


class MetaDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metadata
        fields = ("name",)


class ChallengeSerializer(serializers.ModelSerializer):
    metadata = MetaDataSerializer(many=True)

    class Meta:
        model = Challenge
        fields = (
            "uuid",
            "public_key",
            "metadata",
            "explorer_link",
            "active",
            "active_date",
        )


class GuessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guess
        fields = (
            "uuid",
            "submitted_key",
            "challenge",
        )

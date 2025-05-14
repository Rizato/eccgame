from rest_framework import generics

from backend.game.models import Challenge, Guess, Metadata
from backend.game.serializers import (
    ChallengeSerializer,
    GuessSerializer,
    MetaDataSerializer,
)


class ChallengeList(generics.CreateAPIView):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer


class ChallengeDetail(generics.RetrieveAPIView):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer


class MetadataList(generics.ListCreateAPIView):
    queryset = Metadata.objects.all()
    serializer_class = MetaDataSerializer


class MetadataDetail(generics.RetrieveAPIView):
    queryset = Metadata.objects.all()
    serializer_class = MetaDataSerializer


class GuessList(generics.ListCreateAPIView):
    queryset = Guess.objects.all()
    serializer_class = GuessSerializer


class GuessDetail(generics.RetrieveAPIView):
    queryset = Guess.objects.all()
    serializer_class = GuessSerializer

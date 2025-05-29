import datetime

from django.conf import settings
from django.db import transaction
from rest_framework import status, views, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from game.models import Challenge, ChallengeSentinel, Guess
from game.serializers import ChallengeSerializer, GuessSerializer


class DailyChallengeView(views.APIView):
    """
    The current daily challenge, updates lazily
    """

    throttle_classes = [AnonRateThrottle]

    def get(self, request, *args, **kwargs) -> Response:
        challenge = self.get_or_create_daily_challenge()
        serializer = ChallengeSerializer(challenge, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @transaction.atomic()
    def get_or_create_daily_challenge(self) -> Challenge:
        # TODO Check Cache
        sentinel = ChallengeSentinel.objects.select_for_update().first()
        today = datetime.date.today()
        # Return active challenge if found, and still valid
        active = Challenge.objects.select_for_update().filter(active=True).first()
        if active and active.active_date == today:
            # TODO Ensure only one active at a time at the DB level
            return active

        # deactivate if passed expiration
        if active:
            active.active = False
            active.save(update_fields=("active",))

        # TODO Select from curated keys first
        # Get a new active challenge (randomly selected)
        challenge = (
            Challenge.objects.filter(active=False, active_date=None)
            .order_by("?")
            .first()
        )
        if not challenge:
            raise RuntimeError("No challenges available")

        challenge.active_date = today
        challenge.active = True
        challenge.save(
            update_fields=(
                "active_date",
                "active",
            )
        )

        # Save sentinel and release lock
        sentinel.save(update_fields=("updated_at",))

        return challenge


# TODO Drip feed information with each guess client side
# Order: p2pkh, public key, half, double, graph, playpen
class ChallengeViewSet(viewsets.GenericViewSet, RetrieveModelMixin):
    """
    A Challenge Wallet
    """

    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    throttle_classes = [AnonRateThrottle]
    lookup_field = "uuid"


class GuessViewSet(viewsets.GenericViewSet, CreateModelMixin, RetrieveModelMixin):
    """
    Guesses for any challenge
    """

    serializer_class = GuessSerializer
    throttle_classes = [AnonRateThrottle]
    lookup_field = "uuid"

    def get_queryset(self):
        return Guess.objects.filter(challenge=self.kwargs["challenge_uuid"])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Enforce guess limits per user per challenge
        self.enforce_guess_limit(request, self.kwargs["challenge_uuid"])

        # Calls perform_create, and update
        self.perform_create(serializer)
        # Serializer instance is set by serializer.save(), which is before we update fields
        serializer.instance.refresh_from_db()

        # From CreateModelMixin
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def enforce_guess_limit(self, request, challenge_uuid):
        request.session.setdefault("guesses", {})
        guesses = request.session["guesses"].get(challenge_uuid, 0)
        if guesses >= settings.MAX_GUESSES:
            raise PermissionDenied(
                "You have already submitted the maximum number of guesses for this challenge."
            )
        # Update count and mark modified
        request.session["guesses"][challenge_uuid] = guesses + 1
        request.session.modified = True

    def perform_create(self, serializer):
        challenge_uuid = self.kwargs["challenge_uuid"]
        challenge = get_object_or_404(Challenge, uuid=challenge_uuid)

        # Ensure challenge is active
        if not challenge.active:
            raise PermissionDenied(f"Challenge {challenge.uuid} is not active")

        guess = serializer.save(challenge=challenge)
        guess.evaluate_key()
        # TODO Defer verification until later
        guess.verify()

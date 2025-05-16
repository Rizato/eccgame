import datetime

import settings
from django.db import transaction
from rest_framework import status, views, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from backend.game.models import Challenge, ChallengeSentinel, Guess
from backend.game.serializers import ChallengeSerializer, GuessSerializer


class ChallengeView(views.APIView):
    """
    Class-based view to get the current daily challenge.
    This updates the challenge lazily upon first request of the day
    """

    throttle_classes = [AnonRateThrottle]

    def get(self, request, *args, **kwargs) -> Response:
        challenge = self.get_or_create_daily_challenge()
        return Response(ChallengeSerializer(challenge).data, status=status.HTTP_200_OK)

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


class GuessView(viewsets.GenericViewSet, CreateModelMixin, RetrieveModelMixin):
    queryset = Guess.objects.all()
    serializer_class = GuessSerializer
    throttle_classes = [AnonRateThrottle]
    lookup_field = "uuid"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Ensure challenge is active
        challenge = serializer.validated_data["challenge"]
        if not challenge.active:
            raise PermissionDenied(f"Challenge {challenge.uuid} is not active")

        # Enforce guess limits per user per challenge
        self.enforce_guess_limit(request, challenge.uuid)

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
        if guesses > settings.MAX_GUESSES:
            raise PermissionDenied(
                "You have already submitted the maximum number of guesses for this challenge."
            )
        # Update count and mark modified
        request.session["guesses"][challenge_uuid] = guesses + 1
        request.session.modified = True

    def perform_create(self, serializer):
        guess = serializer.save()
        guess.evaluate_key()
        # TODO Defer verification until later
        guess.verify()

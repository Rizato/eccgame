import settings
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.mixins import CreateModelMixin, RetrieveModelMixin
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from backend.game.models import Guess
from backend.game.serializers import GuessSerializer


class GuessView(viewsets.GenericViewSet, CreateModelMixin, RetrieveModelMixin):
    queryset = Guess.objects.all()
    serializer_class = GuessSerializer
    throttle_classes = [AnonRateThrottle]

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

    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

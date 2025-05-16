from django.urls import include, path
from rest_framework import routers

from backend.game.views import DailyChallengeView, GuessViewSet

router = routers.SimpleRouter()
router.register(r"guesses", GuessViewSet)

urlpatterns = [
    path("daily/", DailyChallengeView.as_view()),
    path("", include(router.urls)),
]

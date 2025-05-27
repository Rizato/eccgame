from django.urls import include, path
from rest_framework import routers

from game.views import ChallengeViewSet, DailyChallengeView, GuessViewSet

router = routers.SimpleRouter()
router.register(r"guesses", GuessViewSet)
router.register(r"challenges", ChallengeViewSet)

urlpatterns = [
    path("daily/", DailyChallengeView.as_view()),
    path("", include(router.urls)),
]

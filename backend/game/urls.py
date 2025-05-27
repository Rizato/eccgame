from django.urls import include, path
from rest_framework_nested import routers

from game.views import ChallengeViewSet, DailyChallengeView, GuessViewSet

router = routers.SimpleRouter()
router.register(r"challenges", ChallengeViewSet)

challenges_router = routers.NestedSimpleRouter(
    router, r"challenges", lookup="challenge"
)
challenges_router.register(r"guess", GuessViewSet, basename="challenge-guesses")


urlpatterns = [
    path("daily/", DailyChallengeView.as_view()),
    path("", include(router.urls)),
    path(r"", include(challenges_router.urls)),
]

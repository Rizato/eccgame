from django.urls import include, path
from rest_framework_nested import routers

from game.views import ChallengeViewSet, DailyChallengeView, GuessViewSet, SaveViewSet

router = routers.SimpleRouter()
router.register(r"challenges", ChallengeViewSet)

challenges_router = routers.NestedSimpleRouter(
    router, r"challenges", lookup="challenge"
)
challenges_router.register(r"guess", GuessViewSet, basename="challenge-guesses")
challenges_router.register(r"save", SaveViewSet, basename="challenge-saves")


urlpatterns = [
    path("daily/", DailyChallengeView.as_view()),
    path("", include(router.urls)),
    path(r"", include(challenges_router.urls)),
]

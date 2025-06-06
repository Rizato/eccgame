from django.urls import include, path
from rest_framework_nested import routers

from game.views import (
    ChallengeViewSet,
    DailyChallengeView,
    SaveViewSet,
    SolutionViewSet,
)

router = routers.SimpleRouter()
router.register(r"challenges", ChallengeViewSet)

challenges_router = routers.NestedSimpleRouter(
    router, r"challenges", lookup="challenge"
)
challenges_router.register(r"solution", SolutionViewSet, basename="challenge-solutions")
challenges_router.register(r"save", SaveViewSet, basename="challenge-saves")


urlpatterns = [
    path("daily/", DailyChallengeView.as_view()),
    path("", include(router.urls)),
    path(r"", include(challenges_router.urls)),
]

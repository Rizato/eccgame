from django.urls import path
from rest_framework.urlpatterns import format_suffix_patterns

from backend.game import views

urlpatterns = [
    path("challenges/", views.ChallengeList.as_view()),
    # TODO route by uuid
    path("challenges/<int:pk>/", views.ChallengeDetail.as_view()),
    # TODO Add daily challenge path
    path("metadata/", views.MetadataList.as_view()),
    path("metadata/<int:pk>", views.MetadataDetail.as_view()),
    path("guess/", views.GuessList.as_view()),
    # TODO route by uuid
    path("guess/<int:pk>", views.GuessDetail.as_view()),
]

urlpatterns = format_suffix_patterns(urlpatterns)

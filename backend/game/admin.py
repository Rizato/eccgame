from django.contrib import admin

from game.models import Challenge, Guess, Save

# Register your models here.
admin.site.register(Challenge)
admin.site.register(Guess)
admin.site.register(Save)

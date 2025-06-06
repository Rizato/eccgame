from django.contrib import admin

from game.models import Challenge, Save, Solution

# Register your models here.
admin.site.register(Challenge)
admin.site.register(Solution)
admin.site.register(Save)

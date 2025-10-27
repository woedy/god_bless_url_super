from django.contrib import admin

from .models import Click, Link


@admin.register(Link)
class LinkAdmin(admin.ModelAdmin):
    list_display = ("code", "target_url", "is_active", "click_count", "created_at")
    search_fields = ("code", "target_url")
    list_filter = ("is_active", "created_at")


@admin.register(Click)
class ClickAdmin(admin.ModelAdmin):
    list_display = ("link", "ts", "ip", "referrer")
    search_fields = ("link__code", "ip", "referrer")
    list_filter = ("ts",)

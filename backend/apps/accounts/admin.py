from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Business, Subscription, BusinessUser


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display  = ['name', 'email', 'owner_name', 'phone', 'is_active', 'created_at']
    list_filter   = ['is_active']
    search_fields = ['name', 'email', 'owner_name']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display  = ['business', 'plan', 'status', 'start_date', 'end_date', 'days_remaining', 'price']
    list_filter   = ['status', 'plan']
    search_fields = ['business__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(BusinessUser)
class BusinessUserAdmin(UserAdmin):
    list_display  = ['username', 'email', 'business', 'role', 'is_active']
    list_filter   = ['role', 'is_active', 'business']
    search_fields = ['username', 'email', 'business__name']

    # Agregar los campos custom al formulario de edición
    fieldsets = UserAdmin.fieldsets + (
        ('Negocio y Rol', {'fields': ('business', 'role', 'phone')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Negocio y Rol', {'fields': ('business', 'role', 'phone')}),
    )
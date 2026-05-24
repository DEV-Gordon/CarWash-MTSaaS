from django.contrib import admin
from .models import Client, Vehicle, Employee, WashService, Appointment


class VehicleInline(admin.TabularInline):
    model  = Vehicle
    extra  = 0  # no muestra filas vacías extra


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display  = ['full_name', 'phone', 'email', 'business', 'is_active', 'created_at']
    list_filter   = ['is_active', 'business']
    search_fields = ['first_name', 'last_name', 'phone', 'email']
    inlines       = [VehicleInline]  # muestra los vehículos dentro del cliente


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display  = ['plate', 'brand', 'model', 'year', 'color', 'client']
    search_fields = ['plate', 'brand', 'model', 'client__first_name', 'client__last_name']


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display  = ['full_name', 'phone', 'email', 'business', 'is_active', 'hire_date']
    list_filter   = ['is_active', 'business']
    search_fields = ['first_name', 'last_name', 'phone']


@admin.register(WashService)
class WashServiceAdmin(admin.ModelAdmin):
    list_display  = ['name', 'price', 'duration_minutes', 'business', 'is_active']
    list_filter   = ['is_active', 'business']
    search_fields = ['name']


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display  = ['id', 'vehicle', 'employee', 'scheduled_at', 'status', 'total_price', 'business']
    list_filter   = ['status', 'business']
    search_fields = ['vehicle__plate', 'vehicle__client__first_name']
    readonly_fields = ['total_price', 'created_at', 'updated_at']
    filter_horizontal = ['services']  # selector visual para ManyToMany
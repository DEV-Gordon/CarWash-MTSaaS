from rest_framework import serializers
from .models import Client, Vehicle, Employee, WashService, Appointment


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'client', 'brand', 'model', 'year', 'plate', 'color', 'notes']
        read_only_fields = ['id']


class ClientSerializer(serializers.ModelSerializer):
    vehicles = VehicleSerializer(many=True, read_only=True)
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Client
        fields = [
            'id', 'business', 'first_name', 'last_name', 'full_name',
            'email', 'phone', 'notes', 'is_active', 'created_at', 'vehicles',
        ]
        read_only_fields = ['id', 'business', 'created_at']


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Employee
        fields = [
            'id', 'business', 'first_name', 'last_name', 'full_name',
            'phone', 'email', 'is_active', 'hire_date',
        ]
        read_only_fields = ['id', 'business']


class WashServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WashService
        fields = [
            'id', 'business', 'name', 'description',
            'price', 'duration_minutes', 'is_active',
        ]
        read_only_fields = ['id', 'business']


class AppointmentSerializer(serializers.ModelSerializer):
    services_detail = WashServiceSerializer(source='services', many=True, read_only=True)
    vehicle_detail = VehicleSerializer(source='vehicle', read_only=True)
    employee_detail = EmployeeSerializer(source='employee', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    client_name = serializers.CharField(
        source='vehicle.client.full_name', read_only=True
    )

    class Meta:
        model = Appointment
        fields = [
            'id', 'business', 'vehicle', 'vehicle_detail',
            'employee', 'employee_detail', 'services', 'services_detail',
            'scheduled_at', 'status', 'status_display',
            'notes', 'total_price', 'client_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'business', 'total_price', 'created_at', 'updated_at']

    def create(self, validated_data):
        services = validated_data.pop('services', [])
        appointment = Appointment.objects.create(**validated_data)
        appointment.services.set(services)
        appointment.calculate_total()
        return appointment

    def update(self, instance, validated_data):
        services = validated_data.pop('services', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if services is not None:
            instance.services.set(services)
            instance.calculate_total()
        return instance


class DashboardStatsSerializer(serializers.Serializer):
    """Aggregate stats for the business dashboard."""
    total_clients = serializers.IntegerField()
    total_vehicles = serializers.IntegerField()
    total_employees = serializers.IntegerField()
    appointments_today = serializers.IntegerField()
    appointments_pending = serializers.IntegerField()
    appointments_done_this_month = serializers.IntegerField()
    revenue_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)

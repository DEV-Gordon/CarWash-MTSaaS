from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Q
from .models import Client, Vehicle, Employee, WashService, Appointment
from .serializers import (
    ClientSerializer, VehicleSerializer, EmployeeSerializer,
    WashServiceSerializer, AppointmentSerializer, DashboardStatsSerializer,
)


class BusinessFilterMixin:
    """Limit all querysets to the authenticated user's business."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(business=self.request.user.business)

    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)


# Clients views

class ClientListCreateView(BusinessFilterMixin, generics.ListCreateAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'phone', 'email']
    ordering_fields = ['last_name', 'created_at']


class ClientDetailView(BusinessFilterMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer


# Vehicles views

class VehicleListCreateView(BusinessFilterMixin, generics.ListCreateAPIView):
    serializer_class = VehicleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['plate', 'brand', 'model', 'client__first_name', 'client__last_name']

    def get_queryset(self):
        qs = Vehicle.objects.filter(client__business=self.request.user.business)
        client_id = self.request.query_params.get('client')
        if client_id:
            qs = qs.filter(client_id=client_id)
        return qs

    def perform_create(self, serializer):
        serializer.save()


class VehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Vehicle.objects.filter(client__business=self.request.user.business)


# Employees views

class EmployeeListCreateView(BusinessFilterMixin, generics.ListCreateAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'phone']


class EmployeeDetailView(BusinessFilterMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer


# Wash Services views 

class WashServiceListCreateView(BusinessFilterMixin, generics.ListCreateAPIView):
    queryset = WashService.objects.all()
    serializer_class = WashServiceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class WashServiceDetailView(BusinessFilterMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = WashService.objects.all()
    serializer_class = WashServiceSerializer


# Appointments views

class AppointmentListCreateView(BusinessFilterMixin, generics.ListCreateAPIView):
    queryset = Appointment.objects.select_related('vehicle', 'employee').prefetch_related('services')
    serializer_class = AppointmentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['vehicle__plate', 'vehicle__client__first_name', 'vehicle__client__last_name']
    ordering_fields = ['scheduled_at', 'status', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        date_filter = self.request.query_params.get('date')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if date_filter:
            qs = qs.filter(scheduled_at__date=date_filter)
        return qs


class AppointmentDetailView(BusinessFilterMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Appointment.objects.select_related('vehicle', 'employee').prefetch_related('services')
    serializer_class = AppointmentSerializer


# Dashboard view

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    # Provides aggregated statistics for the dashboard, including total clients, vehicles, employees, today's appointments, pending appointments, 
    # completed appointments this month, and revenue this month. It filters data based on the authenticated user's business and returns the results 
    # in a structured format for display on the dashboard.
    
    def get(self, request):
        business = request.user.business
        now = timezone.now()
        today = now.date()

        clients_qs = Client.objects.filter(business=business, is_active=True)
        vehicles_qs = Vehicle.objects.filter(client__business=business)
        employees_qs = Employee.objects.filter(business=business, is_active=True)
        appts_qs = Appointment.objects.filter(business=business)

        revenue = appts_qs.filter(
            status=Appointment.STATUS_DONE,
            scheduled_at__year=now.year,
            scheduled_at__month=now.month,
        ).aggregate(total=Sum('total_price'))['total'] or 0

        data = {
            'total_clients': clients_qs.count(),
            'total_vehicles': vehicles_qs.count(),
            'total_employees': employees_qs.count(),
            'appointments_today': appts_qs.filter(scheduled_at__date=today).count(),
            'appointments_pending': appts_qs.filter(
                status__in=[Appointment.STATUS_PENDING, Appointment.STATUS_IN_PROGRESS]
            ).count(),
            'appointments_done_this_month': appts_qs.filter(
                status=Appointment.STATUS_DONE,
                scheduled_at__year=now.year,
                scheduled_at__month=now.month,
            ).count(),
            'revenue_this_month': revenue,
        }
        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)

from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/',              views.DashboardView.as_view(),              name='dashboard'),
    # Endpoint to clients
    path('clients/',                views.ClientListCreateView.as_view(),       name='client-list'),
    path('clients/<int:pk>/',       views.ClientDetailView.as_view(),           name='client-detail'),
    # Endpoint to vehicles
    path('vehicles/',               views.VehicleListCreateView.as_view(),      name='vehicle-list'),
    path('vehicles/<int:pk>/',      views.VehicleDetailView.as_view(),          name='vehicle-detail'),
    # Endpoint to employees
    path('employees/',              views.EmployeeListCreateView.as_view(),     name='employee-list'),
    path('employees/<int:pk>/',     views.EmployeeDetailView.as_view(),         name='employee-detail'),
    # Endpoint to services
    path('services/',               views.WashServiceListCreateView.as_view(),  name='service-list'),
    path('services/<int:pk>/',      views.WashServiceDetailView.as_view(),      name='service-detail'),
    # Appointments
    path('appointments/',           views.AppointmentListCreateView.as_view(),  name='appointment-list'),
    path('appointments/<int:pk>/',  views.AppointmentDetailView.as_view(),      name='appointment-detail'),
]

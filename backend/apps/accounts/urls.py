from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('login/',         views.LoginView.as_view(),               name='auth-login'),     # Login endpoint for user authentication, returns JWT tokens.
    path('refresh/',       TokenRefreshView.as_view(),              name='auth-refresh'),   # Endpoint to refresh JWT tokens, allowing users to obtain a new access token using a valid refresh token.  
    path('register/',      views.RegisterView.as_view(),            name='auth-register'),  # Registration endpoint for creating new user accounts, allowing businesses to sign up and create their profiles.
    path('me/',            views.MeView.as_view(),                  name='auth-me'),        # Endpoint to retrieve and update the authenticated user's profile information, allowing users to view and edit their own details.
    path('business/',      views.BusinessDetailView.as_view(),      name='auth-business'),  # Endpoint to retrieve and update the authenticated user's business information, allowing users to manage their business details and subscription status.
    path('users/',         views.UserListView.as_view(),            name='auth-users'),     # Endpoint to list all users associated with the authenticated user's business, allowing admins to view and manage their team members.
    path('subscription/',  views.SubscriptionDetailView.as_view(),  name='auth-subscription'), # Endpoint to retrieve the current subscription status and details for the authenticated user's business, allowing users to check their subscription information.
    path('subscription/renew/', views.RenewSubscriptionView.as_view(), name='auth-subscription-renew'), # Endpoint to renew the current subscription for the authenticated user's business, allowing users to extend their subscription period.
]

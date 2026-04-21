from django.utils import timezone  
  
class UpdateLastAccessMiddleware:  
    def __init__(self, get_response):  
        self.get_response = get_response  
  
    def __call__(self, request):  
        if request.user.is_authenticated:  
            request.user.last_access = timezone.now()  
            request.user.save(update_fields=['last_access'])  
        response = self.get_response(request)  
        return response 
